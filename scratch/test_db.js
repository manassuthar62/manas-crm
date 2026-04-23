const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
console.log('Testing connection to:', MONGODB_URI);

mongoose.connect(MONGODB_URI, { family: 4 })
    .then(() => {
        console.log('Successfully connected to MongoDB');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection failed:');
        console.error(err);
        process.exit(1);
    });
