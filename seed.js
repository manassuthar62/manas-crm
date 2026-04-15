const mongoose = require('mongoose');
const User = require('./server/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_video_crm';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB for seeding...');
        
        const existingAdmin = await User.findOne({ email: 'admin@aivideo.com' });
        if (existingAdmin) {
            console.log('Admin already exists');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = new User({
            name: 'Main Admin',
            email: 'admin@aivideo.com',
            password: hashedPassword,
            role: 'admin'
        });

        await admin.save();
        console.log('Admin created: admin@aivideo.com / admin123');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
