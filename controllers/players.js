const Player = require('../models/player');
const axios = require('axios')
function parseDateOrNull(dateStr) {
    return (!dateStr || dateStr === '0000-00-00') ? null : new Date(dateStr);
}

async function insertPlayers() {
    console.log("Fetching players")
    const response = await axios.get(
        'https://cricket.sportmonks.com/api/v2.0/players?api_token=wCxsZfShJallEGcTX21EHqpdUVU67iCuANZQCEwKqpm3QzV2mwaMErIBKZwy&include=career'
    );
    console.log("Goit PLayers")
    const players = response.data.data.map(p => ({
        resource: p.resource,
        id: p.id,
        country_id: p.country_id,
        firstname: p.firstname,
        lastname: p.lastname,
        fullname: p.fullname,
        image_path: p.image_path,
        dateofbirth: parseDateOrNull(p.dateofbirth),
        gender: p.gender,
        battingstyle: p.battingstyle,
        bowlingstyle: p.bowlingstyle,
        position: p.position || {},
        updated_at: parseDateOrNull(p.updated_at),
        career: Array.isArray(p.career) ? p.career.map(c => ({
            resource: c.resource,
            type: c.type,
            season_id: c.season_id,
            player_id: c.player_id,
            bowling: c.bowling,
            batting: typeof c.batting === 'object' ? c.batting : null,
            updated_at: parseDateOrNull(c.updated_at)
        })) : []
    }));

    try {
        await Player.insertMany(players, { ordered: false });
        console.log('Players inserted successfully');
    } catch (err) {
        console.error('Error inserting players:', err.message);
    }
}


async function getPaginatedPlayers(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    try {
        const players = await Player.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ updated_at: -1 });

        const total = await Player.countDocuments();

        res.json({
            page,
            perPage: limit,
            total,
            data: players
        });
    } catch (err) {
        console.error('Error fetching players:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getPaginatedPlayers,
}



// insertPlayers();