const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    clientName: { type: String, required: true },
    whatsapp: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Calling', 'Lead', 'Important', 'Payment Pending', 'New Order', 'On Process', 'Correction', 'Completed'],
        default: 'Calling'
    },
    notes: { type: String },
    source: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Tracking who closed the deal
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);
