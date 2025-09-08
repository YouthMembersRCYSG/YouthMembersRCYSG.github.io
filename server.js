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
const PORT = process.env.PORT || 3000;

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

// MongoDB Connection (use MONGODB_URI from environment if provided)
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/volunteer_management';
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('Connected to MongoDB');
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
    vms: { type: Boolean, default: false },
    attendance: { type: String, enum: ['attended', 'no show'], default: 'attended' },
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
        const volunteers = await Volunteer.find().sort({ serialNumber: -1 });
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

// Update volunteer
app.put('/api/volunteers/:id', async (req, res) => {
    try {
        const volunteerData = req.body;
        
        // Input validation
        if (!volunteerData.startTime || !volunteerData.endTime) {
            return res.status(400).json({ error: 'Start time and end time are required' });
        }
        
        // Calculate hours volunteered with cross-midnight handling
        const start = moment(volunteerData.startTime, 'HH:mm');
        const end = moment(volunteerData.endTime, 'HH:mm');
        
        let hoursVolunteered = end.diff(start, 'hours', true);
        
        // Handle cross-midnight scenarios
        if (hoursVolunteered < 0) {
            hoursVolunteered = hoursVolunteered + 24;
        }
        
        // Validate reasonable hours
        if (hoursVolunteered > 24) {
            return res.status(400).json({ error: 'Invalid time range - hours cannot exceed 24' });
        }
        
        volunteerData.hoursVolunteered = hoursVolunteered;
        
        const volunteer = await Volunteer.findByIdAndUpdate(
            req.params.id,
            volunteerData,
            { new: true, runValidators: true }
        );
        
        if (!volunteer) {
            return res.status(404).json({ error: 'Volunteer not found' });
        }
        
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
        const { eventId, eventName, date } = req.body;
        
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

        const filename = `attendance_${eventId}_${moment(date).format('YYYY-MM-DD')}.pdf`;
        
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
        const pageWidth = doc.page.width - 100; // Account for margins
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

        doc.end();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});

module.exports = app;
