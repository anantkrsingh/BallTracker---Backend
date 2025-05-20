const Team = require("../models/team");
const redisClient = require("../redis");

function parseDateOrNull(dateString) {
  return !dateString || dateString === "0000-00-00"
    ? null
    : new Date(dateString);
}

const insertTeam = async (req, res) => {
  const teamEntries = Object.values(req.body.teams);

  const formattedTeams = teamEntries.map((team) => {
    const formattedSquad = Array.isArray(team.squad)
      ? team.squad.map((player) => ({
          id: player.id,
          firstname: player.firstname,
          lastname: player.lastname,
          fullname: player.fullname,
          gender: player.gender,
          dateofbirth: parseDateOrNull(player.dateofbirth),
          country_id: player.country_id,
          battingstyle: player.battingstyle,
          bowlingstyle: player.bowlingstyle,
          image_path: player.image_path,
          resource: player.resource,
          position: player.position || {},
          squad: player.squad || {},
          updated_at: parseDateOrNull(player.updated_at),
        }))
      : [];

    return {
      id: team.id,
      code: team.code,
      country_id: team.country_id,
      image_path: team.image_path,
      name: team.name,
      national_team: team.national_team,
      resource: team.resource,
      squad: formattedSquad,
      updated_at: team.updated_at ? new Date(team.updated_at) : null,
    };
  });

  try {
    for (const team of formattedTeams) {
      await Team.findOneAndUpdate(
        { id: team.id },
        { $set: team },
        { upsert: true, new: true }
      );
      console.log("Updated " + team.id);
    }
    console.log("All teams saved/updated successfully.");
  } catch (error) {
    console.error("Error saving teams:", error);
  }
};
async function getPaginatedTeams(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const fields = req.query.fields
    ? req.query.fields.split(",").join(" ")
    : null;

  try {
    const cacheKey = `teams:page=${page}:limit=${limit}:fields=${
      fields || "all"
    }`;

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const query = Team.find();

    if (fields) {
      query.select(fields);
    }

    const teams = await query
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ updated_at: -1 });

    const total = await Team.countDocuments();
    const response = {
      page,
      perPage: limit,
      total,
      data: teams,
    };
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));

    res.json(response);
  } catch (err) {
    console.error("Error fetching teams:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getTeamById(req, res) {
  const { teamId } = req.params;

  try {
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json(team);
  } catch (err) {
    console.error("Error fetching team by ID:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  insertTeam,
  getPaginatedTeams,
  getTeamById,
};
