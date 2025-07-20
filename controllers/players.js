const Player = require("../models/newPlayer");
const PlayerOld = require("../models/player");
const redis = require("../redis");

 async function getPaginatedPlayers(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const name = req.query.name ?? null;
  const fields = req.query.fields ? req.query.fields.split(",") : null;

  const cacheKey = [
    "players",
    `p${page}`,
    `l${limit}`,
    name ? `n:${name.toLowerCase()}` : "",
    fields ? `f:${fields.sort().join("_")}` : "",
  ]
    .filter(Boolean)
    .join("|");

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const filter = name ? { name: { $regex: name, $options: "i" } } : {};
    const matchStage = { $match: filter };
    const addFields = {
      $addFields: {
        hasSpecialImage: {
          $cond: [
            {
              $regexMatch: {
                input: "$image",
                regex: /cricketchampion\.co\.in/i,
              },
            },
            1,
            0,
          ],
        },
      },
    };
    const sortStage = { $sort: { hasSpecialImage: -1, updatedAt: -1 } };
    const project = fields
      ? { $project: Object.fromEntries(fields.map((f) => [f, 1])) }
      : null;
    const skipStage = { $skip: (page - 1) * limit };
    const limitStage = { $limit: limit };

    const pipeline = [matchStage, addFields, sortStage];
    if (project) pipeline.push(project);
    pipeline.push(skipStage, limitStage);

    const [players, total] = await Promise.all([
      Player.aggregate(pipeline),
      Player.countDocuments(filter),
    ]);

    const response = { page, perPage: limit, total, data: players };

    await redis.setEx(cacheKey, 60 * 5, JSON.stringify(response));

    return res.json(response);
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
async function getPlayerByIdV1(req, res) {
  const { playerId } = req.params;

  try {
    const player = await Player.findOne({ _id: playerId });

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
  getOldPlayerById,
  getPlayerByIdV1
};

// insertPlayers();
