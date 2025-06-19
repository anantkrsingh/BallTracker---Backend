const express = require('express');
const router = express.Router();
const Config = require('../models/config');

router.get('/', async (req, res) => {
    try {
        const config = await Config.findOne({});
        res.json(config || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// router.post('/', async (req, res) => {
//     try {
//         const config = await Config.findOneAndUpdate(
//             {},
//             req.body,
//             { new: true, upsert: true }
//         );
//         res.json(config);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to update config' });
//     }
// });

module.exports = router; 