# Volunteer Management System

A comprehensive web application for managing volunteer data and generating attendance sheets for Youth Members RCYSG events.

## Features

- **Volunteer Registration Form**: Add new volunteers with complete information
- **Auto-fill Functionality**: Automatically suggests existing volunteers when entering name, email, or mobile number
- **Volunteer Management**: View, edit, and delete volunteer records
- **PDF Generation**: Generate attendance sheets in PDF format for events
- **MongoDB Integration**: Store all data in MongoDB database
- **Responsive Design**: Works on desktop and mobile devices

## Schema

### Mastersheet Schema
- S/N (Serial Number)
- District
- Event Name
- Event ID
- Event Format
- Details
- Name
- Email
- Mobile No.
- Role
- Date
- Start Time
- End Time
- Hours Volunteered (auto-calculated)
- VMS (yes/no)
- Attendance (attended/no show)
- Remarks (Warning/Blacklist)
- Volunteer Shirt Taken
- Shirt Size

### PDF Attendance Table Schema
- S/N
- Name
- Contact number
- Email Add
- Role Assigned
- Shift Start Time (hh:mm)
- Shift End Time (hh:mm)
- Temp AM
- Acknowledgement of Receipt of Meal Allowance
- Acknowledgement of Receipt of ART Kit
- Acknowledgement of Volunteer T-shirt
- Time In (hh:mm)
- Sign In
- Temp PM
- Time Out (hh:mm)
- Sign Out

## Installation

1. Install Node.js and MongoDB
2. Clone this repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start MongoDB service
5. Run the application:
   ```bash
   npm start
   ```
   For development with auto-restart:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Use the **Add/Update Volunteer** tab to register new volunteers
3. Use the **Volunteer List** tab to view and manage existing records
4. Use the **Generate PDF** tab to create attendance sheets

### Auto-fill Feature
When entering volunteer information, the system will automatically check for existing records based on:
- Name
- Email address
- Mobile number

If a match is found, you'll be prompted to auto-fill the form with existing data.

## API Endpoints

- `GET /api/volunteers` - Get all volunteers
- `POST /api/volunteers` - Add new volunteer
- `PUT /api/volunteers/:id` - Update volunteer
- `DELETE /api/volunteers/:id` - Delete volunteer
- `GET /api/volunteers/search?query=` - Search volunteers
- `GET /api/volunteers/event/:eventId` - Get volunteers by event
- `POST /api/generate-pdf` - Generate attendance PDF

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **PDF Generation**: PDFKit
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome

## Configuration

### MongoDB Connection
Update the MongoDB connection string in `server.js`:
```javascript
mongoose.connect('mongodb://localhost:27017/volunteer_management');
```

### Port Configuration
Change the port in `server.js` if needed:
```javascript
const PORT = process.env.PORT || 3000;
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact the Youth Members RCYSG team.
