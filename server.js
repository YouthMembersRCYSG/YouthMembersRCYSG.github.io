const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const moment = require('moment');
// Load environment variables from .env when available
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple request logger to aid debugging (prints method and URL)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} => ${req.method} ${req.originalUrl}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
});

// MongoDB Connection with enhanced SSL and error handling
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/volunteer_management';

const connectToMongoDB = async () => {
    try {
        const connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };

        // Add SSL options for Atlas connections
        if (mongoUri.includes('mongodb+srv') || mongoUri.includes('mongodb.net')) {
            connectionOptions.ssl = true;
            connectionOptions.sslValidate = false; // Temporarily disable SSL validation
            connectionOptions.tlsAllowInvalidCertificates = true;
            connectionOptions.retryWrites = true;
            connectionOptions.w = 'majority';
            connectionOptions.serverSelectionTimeoutMS = 5000;
            connectionOptions.socketTimeoutMS = 45000;
        }

        await mongoose.connect(mongoUri, connectionOptions);
        console.log('✅ Connected to MongoDB successfully');
        
        // Test the connection
        await mongoose.connection.db.admin().ping();
        console.log('✅ MongoDB ping successful');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        
        // Fallback to local MongoDB if Atlas fails
        if (mongoUri.includes('mongodb+srv')) {
            console.log('🔄 Attempting fallback to local MongoDB...');
            try {
                await mongoose.connect('mongodb://localhost:27017/volunteer_management', {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });
                console.log('✅ Connected to local MongoDB as fallback');
            } catch (localError) {
                console.error('❌ Local MongoDB connection also failed:', localError.message);
                console.log('ℹ️  Please ensure MongoDB is installed locally or fix Atlas connection');
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
};

// Initialize MongoDB connection
connectToMongoDB();

const db = mongoose.connection;
db.on('error', (error) => {
    console.error('❌ MongoDB connection error:', error);
});
db.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});
db.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
});

// Volunteer Schema
const volunteerSchema = new mongoose.Schema({
    serialNumber: { type: Number, unique: true },
    district: { type: String, required: true },
    eventName: { type: String, required: true },
    eventId: { type: String, required: true },
    eventFormat: { type: String, required: true },
    details: { type: String },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobileNo: { type: String, required: true },
    role: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    hoursVolunteered: { type: Number, required: true },
    attendance: { type: String, enum: ['registered', 'attended', 'no show'], default: 'registered' },
    remarks: { type: String, enum: ['', 'Warning', 'Blacklist'], default: '' },
    volunteerShirtTaken: { type: Boolean, default: false },
    shirtSize: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-increment serial number with atomic operation
volunteerSchema.pre('save', async function(next) {
    console.log('Pre-save hook called for volunteer:', this.name);
    if (this.isNew) {
        console.log('Creating new volunteer, generating serialNumber...');
        try {
            // Simple approach: find the highest serial number and increment
            const lastVolunteer = await Volunteer.findOne().sort({ serialNumber: -1 });
            this.serialNumber = lastVolunteer ? lastVolunteer.serialNumber + 1 : 1;
            console.log('Generated serialNumber:', this.serialNumber);
        } catch (error) {
            console.log('Error generating serialNumber:', error.message);
            this.serialNumber = Math.floor(Math.random() * 10000) + 1; // Fallback random number
        }
    }
    this.updatedAt = new Date();
    next();
});

const Volunteer = mongoose.model('Volunteer', volunteerSchema);

// Routes

// File upload/decrypt endpoint dependencies
const multer = require('multer');
const { execFile } = require('child_process');
const XLSX = require('xlsx');

// Multer setup for temp uploads
const upload = multer({ dest: path.join(__dirname, 'tmp_uploads') });

// Helper to run msoffcrypto-tool to decrypt an office file using password
async function decryptOfficeFile(inputPath, outputPath, password) {
    return new Promise((resolve, reject) => {
        // Use msoffcrypto-tool CLI which must be installed on the host
        const args = ['-p', password, inputPath, outputPath];
        execFile('msoffcrypto-tool', args, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(stderr || stdout || error.message));
            }
            resolve();
        });
    });
}

// Endpoint: Accept encrypted Excel and password, return parsed sheet data
app.post('/api/unlock-and-parse', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const password = req.body.password || '';
        const inputPath = req.file.path;
        const outputPath = path.join(path.dirname(inputPath), `${req.file.filename}_decrypted.xlsx`);

        try {
            await decryptOfficeFile(inputPath, outputPath, password);
        } catch (err) {
            // Clean up upload
            try { fs.unlinkSync(inputPath); } catch (e) {}
            return res.status(400).json({ error: 'Decryption failed: ' + err.message });
        }

        // Parse decrypted workbook using SheetJS on server
        try {
            const workbook = XLSX.readFile(outputPath, { cellDates: true });
            const sheets = workbook.SheetNames.map(name => {
                const ws = workbook.Sheets[name];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                return { name, rows };
            });

            // Clean up temp files
            try { fs.unlinkSync(inputPath); } catch (e) {}
            try { fs.unlinkSync(outputPath); } catch (e) {}

            return res.json({ sheets });
        } catch (err) {
            // Clean up and report
            try { fs.unlinkSync(inputPath); } catch (e) {}
            try { fs.unlinkSync(outputPath); } catch (e) {}
            return res.status(500).json({ error: 'Failed to parse decrypted workbook: ' + err.message });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Backwards-compatibility / typo safety: redirect only exact singular '/api/volunteer'
// or paths that start with '/api/volunteer/' to '/api/volunteers' (preserve method)
// This avoids matching '/api/volunteers' and causing redirect loops.
app.all(/^\/api\/volunteer(?=\/|$)/, (req, res) => {
    const corrected = req.originalUrl.replace(/^\/api\/volunteer(?=\/|$)/, '/api/volunteers');
    console.log(`Redirecting ${req.method} ${req.originalUrl} -> ${corrected}`);
    return res.redirect(307, corrected);
});

// Get all volunteers
app.get('/api/volunteers', async (req, res) => {
    try {
        const { eventId } = req.query;
        let filter = {};
        
        if (eventId) {
            filter.eventId = eventId;
        }
        
        const volunteers = await Volunteer.find(filter).sort({ serialNumber: 1 });
        res.json(volunteers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search volunteers by name, email, or mobile
app.get('/api/volunteers/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        // Input validation
        if (!query || query.trim().length < 2) {
            return res.json([]);
        }
        
        const sanitizedQuery = query.trim();
        
        const volunteers = await Volunteer.find({
            $or: [
                { name: { $regex: sanitizedQuery, $options: 'i' } },
                { email: { $regex: sanitizedQuery, $options: 'i' } },
                { mobileNo: { $regex: sanitizedQuery, $options: 'i' } }
            ]
        }).sort({ updatedAt: -1 }).limit(10);
        res.json(volunteers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new volunteer
app.post('/api/volunteers', async (req, res) => {
    try {
    const volunteerData = req.body;
    // Debug logging to confirm request arrives and payload
    console.log('POST /api/volunteers payload:', JSON.stringify(volunteerData));
        
        // Check for duplicate volunteer (same name, email, or mobile for the same event)
        const existingVolunteer = await Volunteer.findOne({
            $or: [
                { name: volunteerData.name, eventId: volunteerData.eventId, date: new Date(volunteerData.date) },
                { email: volunteerData.email, eventId: volunteerData.eventId, date: new Date(volunteerData.date) },
                { mobileNo: volunteerData.mobileNo, eventId: volunteerData.eventId, date: new Date(volunteerData.date) }
            ]
        });
        
        if (existingVolunteer) {
            return res.status(409).json({ 
                error: `Volunteer already exists for this event. Found: ${existingVolunteer.name} (${existingVolunteer.email})` 
            });
        }
        
        // Input validation
        if (!volunteerData.startTime || !volunteerData.endTime) {
            return res.status(400).json({ error: 'Start time and end time are required' });
        }
        
        // Calculate hours volunteered with cross-midnight handling
        const start = moment(volunteerData.startTime, 'HH:mm');
        const end = moment(volunteerData.endTime, 'HH:mm');
        
        let hoursVolunteered = end.diff(start, 'hours', true);
        
        // Handle cross-midnight scenarios (e.g., 23:00 to 02:00)
        if (hoursVolunteered < 0) {
            hoursVolunteered = hoursVolunteered + 24;
        }
        
        // Validate reasonable hours (0-24)
        if (hoursVolunteered > 24) {
            return res.status(400).json({ error: 'Invalid time range - hours cannot exceed 24' });
        }
        
        volunteerData.hoursVolunteered = hoursVolunteered;
        
        const volunteer = new Volunteer(volunteerData);
        await volunteer.save();
        res.status(201).json(volunteer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update volunteer (supports partial updates)
app.put('/api/volunteers/:id', async (req, res) => {
    try {
        const volunteerData = req.body;
        
        // Get existing volunteer to merge with updates
        const existingVolunteer = await Volunteer.findById(req.params.id);
        if (!existingVolunteer) {
            return res.status(404).json({ error: 'Volunteer not found' });
        }
        
        // Merge existing data with updates
        const updatedData = { ...existingVolunteer.toObject(), ...volunteerData };
        
        // Only validate startTime and endTime if they are being updated
        if (volunteerData.startTime !== undefined || volunteerData.endTime !== undefined) {
            if (!updatedData.startTime || !updatedData.endTime) {
                return res.status(400).json({ error: 'Start time and end time are required' });
            }
            
            // Recalculate hours volunteered with cross-midnight handling
            const start = moment(updatedData.startTime, 'HH:mm');
            const end = moment(updatedData.endTime, 'HH:mm');
            
            let hoursVolunteered = end.diff(start, 'hours', true);
            
            // Handle cross-midnight scenarios
            if (hoursVolunteered < 0) {
                hoursVolunteered = hoursVolunteered + 24;
            }
            
            // Validate reasonable hours
            if (hoursVolunteered > 24) {
                return res.status(400).json({ error: 'Invalid time range - hours cannot exceed 24' });
            }
            
            updatedData.hoursVolunteered = hoursVolunteered;
        }
        
        const volunteer = await Volunteer.findByIdAndUpdate(
            req.params.id,
            updatedData,
            { new: true, runValidators: true }
        );
        
        res.json(volunteer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete volunteer
app.delete('/api/volunteers/:id', async (req, res) => {
    try {
        const volunteer = await Volunteer.findByIdAndDelete(req.params.id);
        if (!volunteer) {
            return res.status(404).json({ error: 'Volunteer not found' });
        }
        res.json({ message: 'Volunteer deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate PDF attendance table
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { eventId, eventName, date, type = 'full' } = req.body;
        
        // Input validation
        if (!eventId || !eventName || !date) {
            return res.status(400).json({ error: 'Event ID, event name, and date are required' });
        }
        
        // Parse date properly - try multiple formats
        let eventDate, nextDay;
        try {
            eventDate = moment(date).startOf('day').toDate();
            nextDay = moment(date).add(1, 'day').startOf('day').toDate();
        } catch (err) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        
        // Get volunteers for specific event with date range query
        const volunteers = await Volunteer.find({ 
            eventId: eventId,
            date: {
                $gte: eventDate,
                $lt: nextDay
            }
        }).sort({ serialNumber: 1 });

        if (volunteers.length === 0) {
            return res.status(404).json({ error: `No volunteers found for event ${eventId} on ${moment(date).format('DD/MM/YYYY')}` });
        }

        // Create PDF with error handling
        const doc = new PDFDocument({ 
            layout: 'landscape',
            margin: 50,
            size: 'A4'
        });

        const filename = `volunteer-mastersheet-${type}-${eventId}_${moment(date).format('YYYY-MM-DD')}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Handle PDF generation errors
        doc.on('error', (err) => {
            console.error('PDF generation error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'PDF generation failed' });
            }
        });
        
        doc.pipe(res);

        if (type === 'summary') {
            // Generate Summary PDF
            generateSummaryPDF(doc, eventName, date, volunteers);
        } else {
            // Generate Full Details PDF
            generateFullPDF(doc, eventName, date, volunteers);
        }

        doc.end();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate Summary PDF
function generateSummaryPDF(doc, eventName, date, volunteers) {
    // Title section
    doc.fontSize(16).text('Volunteer Mastersheet - Summary', 50, 50, { align: 'center' });
    doc.fontSize(12).text(`${eventName} (${volunteers[0].eventId})`, 50, 80, { align: 'center' });
    doc.fontSize(10).text(`Date: ${moment(date).format('DD/MM/YYYY')}`, 50, 100, { align: 'center' });
    doc.text(`Total Volunteers: ${volunteers.length}`, 50, 115, { align: 'center' });

    // Table headers for summary
    const headers = [
        'S/N', 'Name', 'Email', 'Mobile', 'Role', 'Total Hours'
    ];

    // Calculate column widths
    const colWidths = [40, 120, 150, 100, 100, 80];

    let y = 140;
    let x = 50;
    
    // Draw header row
    doc.fontSize(10);
    headers.forEach((header, i) => {
        doc.rect(x, y, colWidths[i], 30).stroke();
        const textX = x + (colWidths[i] / 2);
        doc.text(header, textX - (doc.widthOfString(header) / 2), y + 10, { 
            width: colWidths[i] - 4
        });
        x += colWidths[i];
    });

    y += 30;

    // Draw data rows
    volunteers.forEach((volunteer, index) => {
        x = 50;
        const rowData = [
            volunteer.serialNumber.toString(),
            volunteer.name,
            volunteer.email,
            volunteer.mobileNo,
            volunteer.role,
            volunteer.hoursVolunteered ? volunteer.hoursVolunteered.toString() : '0'
        ];

        rowData.forEach((data, i) => {
            doc.rect(x, y, colWidths[i], 25).stroke();
            if (i === 1 || i === 2) { // Name and Email - left align
                doc.text(data, x + 5, y + 8, { 
                    width: colWidths[i] - 10,
                    height: 25
                });
            } else { // Other columns - center align
                const textX = x + (colWidths[i] / 2);
                doc.text(data, textX - (doc.widthOfString(data) / 2), y + 8, { 
                    width: colWidths[i] - 4,
                    height: 25
                });
            }
            x += colWidths[i];
        });

        y += 25;

        // Add new page if needed
        if (y > doc.page.height - 100) {
            doc.addPage();
            y = 50;
        }
    });
}

// Generate Full Details PDF
function generateFullPDF(doc, eventName, date, volunteers) {
    // Title section
    doc.fontSize(14).text('Volunteer Deployment for', 50, 50);
    doc.fontSize(12).text(`${eventName}`, 250, 50);
    
    doc.text('Event Date', 50, 80);
    doc.text(moment(date).format('DD/MM/YYYY'), 250, 80);
    
    doc.text('Reporting Time', 50, 100);
    doc.text('9:00 AM', 250, 100);
    
    doc.text('Reporting Venue', 50, 120);
    doc.text('Marina Bay Sands Expo, Convention Centre (Hall AB)', 250, 120);
    
    // Note section
    doc.fontSize(10).text('Note: Service Hours (5½ Hours) are to be rounded to nearest half hour. E.g.(5hrs and 20 min = 5.5 hours, 5 hours and 5 mins = 5 hours)', 50, 150);

    // Table headers matching your spreadsheet
    const headers = [
        'S/N', 'Name', 'Shift Start Time\n(hh:mm)', 'Shift End Time\n(hh:mm)', 
        'Acknowledgement of\nReceipt of Meal Allowance\nOnly sign if received',
        'Time In\n(hh:mm)', 'Sign In', 'Time Out\n(hh:mm)', 'Sign Out'
    ];

    // Calculate column widths (adjusted for better fit)
    const colWidths = [40, 120, 80, 80, 120, 80, 80, 80, 80]; // Custom widths

    let y = 180;
    let x = 50;
    
    // Draw header row
    doc.fontSize(9);
    headers.forEach((header, i) => {
        doc.rect(x, y, colWidths[i], 40).stroke();
        // Center the text in the cell
        const textX = x + (colWidths[i] / 2);
        const lines = header.split('\n');
        lines.forEach((line, lineIndex) => {
            doc.text(line, textX - (doc.widthOfString(line) / 2), y + 8 + (lineIndex * 10), { 
                width: colWidths[i] - 4
            });
        });
        x += colWidths[i];
    });

    y += 40;

    // Draw data rows
    volunteers.forEach((volunteer, index) => {
        x = 50;
        const rowData = [
            volunteer.serialNumber.toString(),
            volunteer.name,
            volunteer.startTime,
            volunteer.endTime,
            '', // Meal allowance acknowledgement
            '', // Time In
            '', // Sign In
            '', // Time Out
            ''  // Sign Out
        ];

        rowData.forEach((data, i) => {
            doc.rect(x, y, colWidths[i], 25).stroke();
            if (data) {
                if (i === 1) { // Name column - left align
                    doc.text(data, x + 5, y + 8, { 
                        width: colWidths[i] - 10,
                        height: 25
                    });
                } else { // Other columns - center align
                    const textX = x + (colWidths[i] / 2);
                    doc.text(data, textX - (doc.widthOfString(data) / 2), y + 8, { 
                        width: colWidths[i] - 4,
                        height: 25
                    });
                }
            }
            x += colWidths[i];
        });

        y += 25;

        // Add new page if needed
        if (y > doc.page.height - 100) {
            doc.addPage();
            y = 50;
            x = 50;
            
            // Redraw headers on new page
            doc.fontSize(9);
            headers.forEach((header, i) => {
                doc.rect(x, y, colWidths[i], 40).stroke();
                const textX = x + (colWidths[i] / 2);
                const lines = header.split('\n');
                lines.forEach((line, lineIndex) => {
                    doc.text(line, textX - (doc.widthOfString(line) / 2), y + 8 + (lineIndex * 10), { 
                        width: colWidths[i] - 4
                    });
                });
                x += colWidths[i];
            });
            y += 40;
        }
    });
}

// Get volunteers by event
app.get('/api/volunteers/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { date } = req.query;
        
        const query = { eventId };
        if (date) {
            query.date = new Date(date);
        }
        
        const volunteers = await Volunteer.find(query).sort({ serialNumber: 1 });
        res.json(volunteers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate Individual PDF Report
app.post('/api/generate-individual-pdf', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        // Input validation
        if (!name || !email || !phone) {
            return res.status(400).json({ error: 'Name, email, and phone are required' });
        }
        
        // Find all volunteers for this person
        const volunteers = await Volunteer.find({
            name: name,
            email: email,
            mobileNo: phone
        }).sort({ date: 1 });
        
        if (volunteers.length === 0) {
            return res.status(404).json({ error: 'No volunteer records found for this person' });
        }
        
        // Generate individual PDF
        generateIndividualPDF(volunteers, name, res);
        
    } catch (error) {
        console.error('Error generating individual PDF:', error);
        res.status(500).json({ error: error.message });
    }
});

// Function to generate individual PDF report
function generateIndividualPDF(volunteers, name, res) {
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Individual_Report_${name.replace(/\s+/g, '_')}.pdf"`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Calculate statistics
    const attendedEvents = volunteers.filter(v => v.attendance === 'attended');
    const totalHours = attendedEvents.reduce((sum, v) => sum + (parseFloat(v.hoursVolunteered) || 0), 0);
    
    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Individual Volunteer Report', { align: 'center' });
    doc.moveDown();
    
    // Personal Information
    doc.fontSize(14).font('Helvetica-Bold').text('Personal Information:', 50, doc.y);
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica')
        .text(`Name: ${volunteers[0].name}`, 70)
        .text(`Email: ${volunteers[0].email}`, 70)
        .text(`Phone: ${volunteers[0].mobileNo}`, 70)
        .text(`Total Events Registered: ${volunteers.length}`, 70)
        .text(`Events Attended: ${attendedEvents.length}`, 70)
        .text(`Total Hours Volunteered: ${totalHours.toFixed(1)} hours`, 70);
    
    doc.moveDown(1);
    
    // Events Table
    doc.fontSize(14).font('Helvetica-Bold').text('Volunteer History:', 50, doc.y);
    doc.moveDown(0.5);
    
    // Table headers
    const tableTop = doc.y;
    const headers = ['Event ID', 'Event Name', 'Date', 'Role', 'Hours', 'Status'];
    const colWidths = [60, 120, 80, 100, 50, 80];
    let xPos = 50;
    
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
    });
    
    // Draw header line
    doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();
    
    // Table rows
    let yPos = tableTop + 25;
    doc.font('Helvetica').fontSize(9);
    
    volunteers.forEach(volunteer => {
        if (yPos > 750) { // New page if needed
            doc.addPage();
            yPos = 50;
        }
        
        xPos = 50;
        const rowData = [
            volunteer.eventId,
            volunteer.eventName,
            new Date(volunteer.date).toLocaleDateString(),
            volunteer.role,
            volunteer.hoursVolunteered || '0',
            volunteer.attendance || 'Pending'
        ];
        
        rowData.forEach((data, i) => {
            doc.text(data.toString(), xPos, yPos, { width: colWidths[i], align: 'center' });
            xPos += colWidths[i];
        });
        
        yPos += 20;
    });
    
    // Footer
    doc.fontSize(8).text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50);
    
    // Finalize the PDF
    doc.end();
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});

module.exports = app;
