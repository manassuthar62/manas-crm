const mongoose = require('mongoose');
const User = require('./server/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_video_crm');
        const user = await User.findOne({ email: 'admin@aivideo.com' });
        if (!user) {
            console.log('User not found');
        } else {
            console.log('User found:', user.email);
            const isMatch = await bcrypt.compare('admin123', user.password);
            console.log('Password match:', isMatch);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
verify();
