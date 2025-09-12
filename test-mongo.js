const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/volunteer_management';
    
    console.log('Testing MongoDB connection...');
    console.log('URI:', mongoUri.replace(/:([^:@]*@)/, ':***@')); // Hide password
    
    try {
        const connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };

        // Add SSL options for Atlas connections
        if (mongoUri.includes('mongodb+srv') || mongoUri.includes('mongodb.net')) {
            connectionOptions.ssl = true;
            connectionOptions.sslValidate = false;
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
        
        // List databases
        const adminDb = mongoose.connection.db.admin();
        const dbs = await adminDb.listDatabases();
        console.log('✅ Available databases:', dbs.databases.map(db => db.name));
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        
        if (error.message.includes('IP') || error.message.includes('whitelist')) {
            console.log('\n💡 Possible solutions:');
            console.log('1. Add your IP address to MongoDB Atlas whitelist');
            console.log('2. Add 0.0.0.0/0 to allow all IPs (not recommended for production)');
            console.log('3. Use MongoDB Compass to test connection');
        }
        
        if (error.message.includes('SSL') || error.message.includes('TLS')) {
            console.log('\n💡 SSL/TLS solutions:');
            console.log('1. Check if your network blocks SSL connections');
            console.log('2. Try connecting from a different network');
            console.log('3. Contact your network administrator');
        }
        
        process.exit(1);
    }
};

testConnection();
