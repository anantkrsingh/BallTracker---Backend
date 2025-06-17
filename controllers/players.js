const Player = require("../models/newPlayer");
const PlayerOld = require("../models/player")
const axios = require("axios");
function parseDateOrNull(dateStr) {
  return !dateStr || dateStr === "0000-00-00" ? null : new Date(dateStr);
}


async function getPaginatedPlayers(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const name = req.query.name || null;
  const fields = req.query.fields
    ? req.query.fields.split(",").join(" ")
    : null;

  try {
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" }; 
    }

    const query = Player.find(filter);

    if (fields) {
      query.select(fields);
    }

    const players = await query
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ updatedAt: -1 }); 

    const total = await Player.countDocuments(filter);

    res.json({
      page,
      perPage: limit,
      total,
      data: players,
    });
  } catch (err) {
    console.error("Error fetching players:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getPlayerById(req, res) {
  const { playerId } = req.params;

  try {
    const player = await Player.findOne({ player_id: playerId });

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json({ data: player });
  } catch (err) {
    console.error("Error fetching player by ID:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getOldPlayerById(req, res) {
  const { playerId } = req.params;

  try {
    const player = await PlayerOld.findOne({ id: playerId });

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json({ data: player });
  } catch (err) {
    console.error("Error fetching player by ID:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  getPaginatedPlayers,
  getPlayerById,
  getOldPlayerById
};

// insertPlayers();
