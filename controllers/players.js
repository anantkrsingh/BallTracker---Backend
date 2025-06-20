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
    ? req.query.fields.split(",")
    : null;

  try {
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    const matchStage = { $match: filter };

    const addFieldsStage = {
      $addFields: {
        hasSpecialImage: {
          $cond: [
            { $regexMatch: { input: "$image", regex: /cricketchampion\.co\.in/i } },
            1,
            0,
          ],
        },
      },
    };

    const sortStage = {
      $sort: { hasSpecialImage: -1, updatedAt: -1 },
    };

    const projectStage = fields
      ? {
          $project: Object.fromEntries(fields.map((f) => [f, 1])),
        }
      : null;

    const skipStage = { $skip: (page - 1) * limit };
    const limitStage = { $limit: limit };

    const pipeline = [matchStage, addFieldsStage, sortStage];
    if (projectStage) pipeline.push(projectStage);
    pipeline.push(skipStage, limitStage);

    const players = await Player.aggregate(pipeline);

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
