const express = require('express');
const router = express.Router();
const Config = require('../models/config');
const { insertTeam } = require('../controllers/team');

router.get('/', async (req, res) => {
    try {
        const config = await Config.findOne({});
        res.json(config || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

router.post('/', insertTeam);

module.exports = router; 