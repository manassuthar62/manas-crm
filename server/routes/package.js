const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { authenticate, adminOnly } = require('../middleware/auth');

// Get all packages (Public)
router.get('/all', async (req, res) => {
    try {
        const packages = await Package.find({ isActive: true }).sort({ price: 1 });
        res.json({ success: true, packages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add new package (Admin)
router.post('/add', authenticate, adminOnly, async (req, res) => {
    try {
        const { name, price, features } = req.body;
        const newPackage = new Package({ name, price, features });
        await newPackage.save();
        res.json({ success: true, package: newPackage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update package (Admin)
router.put('/update/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const { name, price, features, isActive } = req.body;
        const updatedPackage = await Package.findByIdAndUpdate(
            req.params.id,
            { name, price, features, isActive },
            { new: true }
        );
        res.json({ success: true, package: updatedPackage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete package (Admin)
router.delete('/delete/:id', authenticate, adminOnly, async (req, res) => {
    try {
        await Package.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
