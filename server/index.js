const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for HTTPS detection
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('Created uploads directory at:', UPLOADS_DIR);
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Simple Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
const orderRoutes = require('./routes/order');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/team');
const packageRoutes = require('./routes/package');
const Package = require('./models/Package');
const paymentRoutes = require('./routes/payment');
const withdrawalRoutes = require('./routes/withdrawal');

app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/withdrawal', withdrawalRoutes);

// Auto-seed packages
async function seedPackages() {
    try {
        const count = await Package.countDocuments();
        if (count === 0) {
            const defaults = [
                { name: '1 Video', price: 499, features: ['1 AI Promotional Video', 'Free Script Included', 'Free Editing Included'] },
                { name: '3 Videos', price: 1299, features: ['3 AI Promotional Videos', 'Free Scripts Included', 'Free Editing Included'] },
                { name: '5 Videos', price: 1999, features: ['5 AI Promotional Videos', 'Free Scripts Included', 'Free Editing Included'] }
            ];
            await Package.insertMany(defaults);
            console.log('Seeded default packages');
        }
    } catch (err) {
        console.error('Seeding error:', err);
    }
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_video_crm';
mongoose.connect(MONGODB_URI, { family: 4 })
    .then(() => {
        console.log('Connected to MongoDB at ' + MONGODB_URI);
        seedPackages();
    })
    .catch(err => {
        console.error('\x1b[31m%s\x1b[0m', 'CRITICAL ERROR: Could not connect to MongoDB!');
        console.error('\x1b[33m%s\x1b[0m', 'Please ensure MongoDB is running: "net start MongoDB" or "mongod"');
        console.error(err);
    });

// Serve frontend - Catch-all middleware
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API route not found' });
    }

    // If it looks like a file request (has an extension) and reached here, it's a 404
    if (path.extname(req.path)) {
        return res.status(404).send('File not found');
    }

    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Always return JSON for API errors instead of Express HTML pages
app.use((err, req, res, next) => {
    if (req.path.startsWith('/api/')) {
        if (err?.type === 'entity.parse.failed') {
            return res.status(400).json({ success: false, message: 'Invalid JSON body' });
        }

        console.error('API error:', err);
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal server error'
        });
    }

    next(err);
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('\x1b[31m%s\x1b[0m', `CRITICAL: Port ${PORT} is already in use by another process!`);
        console.error('\x1b[33m%s\x1b[0m', 'Please close other terminals or kill the process on port 5000.');
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});
