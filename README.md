# 🔹 Volunteer Management System

A comprehensive, professional-grade volunteer management system built for YouthMembersRCYSG with full-stack capabilities including volunteer coordination, event management, proposal workflow, and broadcast communications.

## 🚀 Features

### Core Functionality
- **Volunteer Management**: Complete volunteer lifecycle management with profiles, skills tracking, certifications, and service hours
- **Event Management**: Event creation, scheduling, registration, attendance tracking, and reporting
- **Proposal System**: Structured proposal submission, approval workflow, and implementation tracking
- **Broadcast Communications**: Multi-channel messaging (Email, SMS, Push notifications) with delivery tracking
- **Dashboard & Reporting**: Real-time analytics, performance metrics, and comprehensive reporting
- **Role-Based Access Control**: Granular permissions for volunteers, leaders, and administrators

### Advanced Features
- **Real-time Notifications**: Instant updates and alerts
- **File Management**: Document upload and storage for events, proposals, and communications
- **Export Capabilities**: CSV exports for all major data entities
- **Search & Filtering**: Advanced search across all modules
- **Mobile-Responsive Design**: Optimized for desktop, tablet, and mobile devices

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js 18+ with Express.js
- **Database**: MongoDB Atlas (Cloud)
- **Authentication**: JWT + bcrypt password hashing
- **Email**: Nodemailer with SMTP support (Gmail tested)
- **Validation**: express-validator for input validation
- **Security**: Helmet, CORS, rate limiting

### Frontend
- **Architecture**: Vanilla JavaScript with modular class-based design
- **UI Framework**: Custom CSS with responsive components
- **Charts**: Canvas-based data visualization
- **Icons**: Custom icon implementation
- **Responsive**: Mobile-first CSS Grid and Flexbox

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- MongoDB Atlas account
- SMTP email service (Gmail recommended)
- Git

### Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/YouthMembersRCYSG/YouthMembersRCYSG.github.io.git
   cd YouthMembersRCYSG.github.io
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and email credentials
   ```

3. **Initialize database**
   ```bash
   npm run create-admin  # Creates admin user: admin@example.com / Password1
   ```

4. **Test email setup**
   ```bash
   npm run test-email    # Verify email configuration
   ```

5. **Start development server**
   ```bash
   npm run dev           # Server runs on http://localhost:3000
   ```

## 👥 User Roles & Permissions

### Admin
- Complete system access and configuration
- User management and role assignment
- Blacklist management and system oversight

### Leader  
- Proposal approval and workflow management
- Event management and attendance tracking
- Access to reporting dashboard and analytics

### Privileged Creator
- Event creation and management
- Broadcast creation and management
- Volunteer directory access

### Volunteer
- Personal profile management
- Event registration and participation
- Proposal submission

## 📁 Project Architecture

```
YouthMembersRCYSG.github.io/
├── backend/
│   ├── auth/                 # Authentication & authorization
│   │   ├── models.js        # User model
│   │   ├── routes.js        # Auth endpoints
│   │   └── middleware.js    # JWT verification
│   ├── volunteers/           # Volunteer management
│   │   ├── models.js        # VolunteerProfile model
│   │   └── routes.js        # Volunteer CRUD
│   ├── events/              # Event management
│   │   ├── models.js        # Event & Attendance models
│   │   └── routes.js        # Event CRUD & attendance
│   ├── proposals/           # Proposal workflow
│   │   ├── models.js        # Proposal model
│   │   └── routes.js        # Proposal CRUD & approval
│   ├── broadcasts/          # Communication system
│   │   ├── models.js        # Broadcast model
│   │   └── routes.js        # Broadcast creation & delivery
│   ├── reporting/           # Analytics and reporting
│   │   └── routes.js        # Dashboard & export endpoints
│   ├── config/database.js   # MongoDB configuration
│   ├── scripts/create-admin.js # Admin user creation
│   └── server.js            # Main application server
├── frontend/
│   ├── css/
│   │   ├── main.css         # Core styling
│   │   └── components.css   # UI components
│   ├── js/
│   │   ├── config.js        # App configuration
│   │   ├── utils.js         # Utility functions
│   │   ├── auth.js          # Authentication management
│   │   ├── api.js           # API client
│   │   ├── ui.js            # UI components
│   │   ├── dashboard.js     # Dashboard & analytics
│   │   ├── volunteers-manager.js    # Volunteer management
│   │   ├── events-manager.js        # Event management
│   │   ├── proposals-manager.js     # Proposal management
│   │   ├── broadcasts-manager.js    # Broadcast management
│   │   └── main.js          # Application controller
│   └── index.html           # Single-page application
├── .env                     # Environment configuration
├── .env.example             # Environment template
└── package.json             # Dependencies and scripts
```

## 🔧 Configuration

### Essential Environment Variables
```env
# Server
NODE_ENV=development
PORT=3000

# Database  
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/vms

# Authentication
JWT_SECRET=your_secure_jwt_secret
SESSION_SECRET=your_secure_session_secret

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
EMAIL_FROM=noreply@yourdomain.com
```

## 🚀 Current Status

### ✅ Completed Features
- **Backend Infrastructure**: Express server with MongoDB Atlas integration
- **Authentication System**: JWT-based auth with role-based access control
- **Volunteer Management**: Complete CRUD with profile management, skills tracking
- **Event Management**: Event creation, registration, attendance tracking
- **Proposal System**: Submission, approval workflow, status tracking
- **Broadcast System**: Multi-channel messaging with delivery tracking
- **Dashboard Analytics**: Real-time stats, charts, and reporting
- **Email Integration**: SMTP functionality tested and working
- **Database Setup**: MongoDB models and admin user creation
- **Frontend Interface**: Complete single-page application with responsive design

### 🔄 Implementation Status
- **Server**: ✅ Running successfully on port 3000
- **Database**: ✅ MongoDB Atlas connected and operational
- **Email**: ✅ SMTP configuration tested and functional
- **Authentication**: ✅ Admin user created (admin@example.com / Password1)
- **Frontend**: ✅ All managers implemented and integrated
- **API**: ✅ All endpoints functional and tested

## 🛠 Development Commands

```bash
# Development
npm run dev              # Start development server with nodemon
npm run create-admin     # Create admin user interactively
npm run test-email       # Test email configuration

# Production
npm start                # Start production server
```

## 🧪 Testing

### Email Configuration Test
```bash
npm run test-email       # Tests SMTP setup and sends test email
```

### Manual Testing Checklist
- [x] Server starts without errors
- [x] Database connection established
- [x] Admin login successful
- [x] Volunteer CRUD operations
- [x] Event creation and management
- [x] Proposal submission and approval
- [x] Broadcast creation and sending
- [x] Dashboard analytics loading

## 📊 API Endpoints Summary

```
Authentication:     POST /api/auth/login, /register, /logout
Volunteers:         GET|POST|PUT|DELETE /api/volunteers
Events:            GET|POST|PUT|DELETE /api/events
Proposals:         GET|POST|PUT|DELETE /api/proposals
Broadcasts:        GET|POST|PUT|DELETE /api/broadcasts
Reporting:         GET /api/reporting/dashboard, /quick-stats
```

## 🔒 Security Features

- JWT-based authentication with secure token handling
- bcrypt password hashing with configurable rounds
- Input validation and sanitization
- Rate limiting and CORS configuration
- Environment-based configuration management
- Secure session management

## 📱 Mobile Responsiveness

The application is fully responsive with:
- Mobile-first CSS design
- Touch-friendly interface elements
- Optimized layouts for all screen sizes
- Progressive Web App capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Repository**: YouthMembersRCYSG.github.io
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: See individual module README files for detailed guides

## 📄 License

MIT License - see LICENSE file for details.

---

**🎯 Professional full-stack volunteer management system - Ready for production deployment**

*Built with ❤️ for YouthMembersRCYSG*
