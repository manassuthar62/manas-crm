const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true, required: true },
    queueNumber: { type: Number },
    clientName: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    brief: { type: String, default: '' },
    assets: [{ type: String }], // File paths
    packageName: { type: String, default: '' },
    packagePrice: { type: Number, default: 0 },
    detailsSubmitted: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['online', 'qr'], required: true },
    paymentAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
    transactionId: { type: String }, // Optional for online payments
    paymentScreenshot: { type: String }, // Optional for online payments
    // PayU specific fields
    payuHash: { type: String },
    mihpayid: { type: String },
    bank_ref_num: { type: String },
    payuStatus: { type: String },
    status: { 
        type: String, 
        enum: ['New Order', 'Script Verification', 'Editing', 'Delivery', 'Correction', 'Completed'],
        default: 'New Order'
    },
    editor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editorPayout: { type: Number, default: 0 },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    eta: { type: Date },
    statusUpdatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
