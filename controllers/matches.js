const Match = require("../models/match");
const redisClient = require("../redis");
const FormData = require("form-data");
const axios = require("axios");
const Scorecard = require("../models/scorecard");
const API_URL = process.env.API_URL || "";
const API_KEY = process.env.API_KEY || "";
const { createHash } = require("crypto");

const livematchMap = new Map();

async function fetchHomePageMatches(req, res) {
  const cacheKey = `homepage`;
  const hashKey = `homepage:hash`;
  const previousHash = req.query.hash;
  const currentHash = await redisClient.get(hashKey);

  if (previousHash === currentHash) {
    return res.status(200).json({
      hash: currentHash,
    });
  }
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    return res
      .status(200)
      .json({ ...JSON.parse(cachedData), hash: currentHash });
  }

  return res.status(200).json([]);
}

async function fetchLiveMatchData(req, res) {
  const matchId = req.query.matchId;
  livematchMap.set(matchId, Date.now());

  const cacheKey = `livematch:${matchId}`;
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  } else {
    const formData = new FormData();
    formData.append("match_id", matchId);

    const response = await axios.post(
      `${API_URL}liveMatch${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.data.status) {
      await redisClient.set(cacheKey, JSON.stringify(response.data));
      return res.status(200).json(response.data);
    } else {
      return res.status(400).json({ error: "Failed to fetch live match data" });
    }
  }
}

async function getMatches(req, res) {
  try {
    const { match_type, match_status, page, limit } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;

    const cacheKey = `matches:${match_type || "all"}:${
      match_status || "all"
    }:${pageNumber}:${pageSize}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    let matchData = [];

    if (match_status === "Upcoming") {
      const response = await axios.get(`${API_URL}upcomingMatches${API_KEY}`);
      matchData = response.data?.data || [];
    } else if (match_status === "Finished") {
      const response = await axios.get(`${API_URL}recentMatches${API_KEY}`);
      matchData = response.data?.data || [];
    } else {
      return res.status(400).json({ error: "Unsupported match_status value" });
    }
    if (match_type) {
      matchData = matchData.filter((match) =>
        match.match_type?.toLowerCase().includes(match_type.toLowerCase())
      );
    }

    matchData.sort((a, b) => {
      const aDate = new Date(a.date_wise?.split(",")[0]);
      const bDate = new Date(b.date_wise?.split(",")[0]);

      return match_status === "Upcoming" ? aDate - bDate : bDate - aDate;
    });

    const totalMatches = matchData.length;
    const totalPages = Math.ceil(totalMatches / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const paginatedMatches = matchData.slice(startIndex, startIndex + pageSize);

    const matchesByDate = {};
    paginatedMatches.forEach((match) => {
      const date = match.date_wise?.split(",")[0];
      if (date) {
        if (!matchesByDate[date]) {
          matchesByDate[date] = [];
        }
        matchesByDate[date].push(match);
      }
    });

    const result = Object.keys(matchesByDate).map((date) => ({
      date,
      matches: matchesByDate[date],
    }));

    const pagination = {
      currentPage: pageNumber,
      totalPages,
      totalMatches,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
      nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
      previousPage: pageNumber > 1 ? pageNumber - 1 : null,
      pageSize,
    };

    const responseData = {
      data: result,
      pagination,
    };

    // Cache the result for 10 minutes (600 seconds)
    await redisClient.setEx(cacheKey, 600, JSON.stringify(responseData));

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("getMatches error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getMatchInfo(match_id) {
  const formData = new FormData();
  formData.append("match_id", match_id);

  const API_URL = process.env.API_URL || "";
  const API_KEY = process.env.API_KEY || "";

  const matchResponse = await axios.post(
    `${API_URL}matchInfo${API_KEY}`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!matchResponse.data.status || !matchResponse.data.data) {
    console.log(matchResponse.data);
    return null;
  }

  const apiData = matchResponse.data.data;

  const matchData = {
    match_id: parseInt(match_id),
    series_id: apiData.series_id,
    series: apiData.series,
    is_impact: apiData.is_impact,
    matchs: apiData.matchs,
    match_date: apiData.match_date,
    match_time: apiData.match_time,
    venue_id: apiData.venue_id,
    venue: apiData.venue,
    is_hundred: apiData.is_hundred,
    place: apiData.place,
    venue_weather: apiData.venue_weather,
    toss: apiData.toss,
    umpire: apiData.umpire,
    third_umpire: apiData.third_umpire,
    referee: apiData.referee,
    man_of_match: apiData.man_of_match,
    man_of_match_player: apiData.man_of_match_player,
    match_type: apiData.match_type,
    match_status: apiData.match_status,
    result: apiData.result,
    team_a_id: apiData.team_a_id,
    team_a: {
      team_id: apiData.team_a_id,
      name: apiData.team_a,
      short_name: apiData.team_a_short,
      img: apiData.team_a_img,
    },
    team_a_short: apiData.team_a_short,
    team_a_img: apiData.team_a_img,
    team_b_id: apiData.team_b_id,
    team_b: {
      team_id: apiData.team_b_id,
      name: apiData.team_b,
      short_name: apiData.team_b_short,
      img: apiData.team_b_img,
    },
    team_b_short: apiData.team_b_short,
    team_b_img: apiData.team_b_img,
  };

  const match = await Match.findOneAndUpdate(
    { match_id: parseInt(match_id) },
    matchData,
    { new: true, upsert: true }
  );

  return match;
}

async function getMatch(req, res) {
  try {
    const { match_id } = req.params;

    const cacheKey = `match:${match_id}`;
    const cachedMatch = await redisClient.get(cacheKey);

    if (cachedMatch) {
      const match = JSON.parse(cachedMatch);
      return res.status(200).json({ match });
    }
    const match = await getMatchInfo(match_id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    await redisClient.setEx(cacheKey, 600, JSON.stringify(match));
    res.status(200).json({ match });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getMatchSquads(req, res) {
  try {
    const { matchId } = req.params;
    const cacheKey = `squadsByMatchId:${matchId}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ data: JSON.parse(cachedData) });
    }
    const formData = new FormData();
    formData.append("match_id", matchId);

    const API_URL = process.env.API_URL || "";
    const API_KEY = process.env.API_KEY || "";

    const squadsResponse = await axios.post(
      `${API_URL}squadsByMatchId${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const { getPlayerData } = require("./series");

    let dat = {
      team_a: {
        name: squadsResponse.data.data.team_a.name,
        short_name: squadsResponse.data.data.team_a.short_name,
        flag: squadsResponse.data.data.team_a.flag,
        players: [],
      },
      team_b: {
        name: squadsResponse.data.data.team_b.name,
        short_name: squadsResponse.data.data.team_b.short_name,
        flag: squadsResponse.data.data.team_b.flag,
        players: [],
      },
    };

    // Process team A players in parallel
    const teamAPlayers = squadsResponse.data.data.team_a.player;
    const teamAPlayerPromises = teamAPlayers.map(async (player) => {
      const playerData = await getPlayerData(player.player_id, dat.team_a.name);
      return {
        ...player,
        player: playerData?._id ?? null, // fallback if undefined
      };
    });
    dat.team_a.players = await Promise.all(teamAPlayerPromises);

    // Process team B players in parallel
    const teamBPlayers = squadsResponse.data.data.team_b.player;
    const teamBPlayerPromises = teamBPlayers.map(async (player) => {
      const playerData = await getPlayerData(player.player_id, dat.team_b.name);
      return {
        ...player,
        player: playerData?._id ?? null,
      };
    });
    dat.team_b.players = await Promise.all(teamBPlayerPromises);

    // Cache and respond
    await redisClient.setEx(cacheKey, 3000, JSON.stringify(dat));
    return res.status(200).json({ data: dat });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getMatchCommentary(req, res) {
  try {
    const { matchId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const formData = new FormData();
    formData.append("match_id", matchId);

    const API_URL = process.env.API_URL || "";
    const API_KEY = process.env.API_KEY || "";

    const commentaryResponse = await axios.post(
      `${API_URL}commentary${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const rawData = commentaryResponse.data.data;

    // Step 1: Flatten the commentary
    const flatCommentary = [];

    for (const inningKey in rawData) {
      const overs = rawData[inningKey];
      for (const overKey in overs) {
        const events = overs[overKey];
        for (const item of events) {
          flatCommentary.push({
            ...item,
            inningKey,
            overKey,
          });
        }
      }
    }

    // Step 2: Sort by commentary_id (descending)
    flatCommentary.sort((a, b) => b.commentary_id - a.commentary_id);

    // Step 3: Pagination
    const total = flatCommentary.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = flatCommentary.slice(start, end);

    // Step 4: Return paginated response
    return res.status(200).json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        hasNextPage: end < total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching commentary:", error.message);
    return res.status(500).json({ error: "Failed to fetch commentary" });
  }
}

async function getMatchScorecard(req, res) {
  try {
    const { match_id } = req.params;

    const cacheKey = `scorecard:${match_id}`;
    const cachedScorecard = await redisClient.get(cacheKey);

    if (cachedScorecard) {
      const scorecard = JSON.parse(cachedScorecard);
      return res.status(200).json({ scorecard });
    } else {
      const { fetchMatchScorecard } = require("./series");

      await fetchMatchScorecard(parseInt(match_id));
    }

    const existingScorecard = await Scorecard.findOne({
      matchId: parseInt(match_id),
    })
      .populate({
        path: "innings.batsmen.player",
        model: "Player",
      })
      .populate({
        path: "innings.bowlers.player",
        model: "Player",
      })
      .populate({
        path: "innings.fallwicket.player",
        model: "Player",
      })
      .populate({
        path: "innings.partnership.player_a_id",
        model: "Player",
      })
      .populate({
        path: "innings.partnership.player_b_id",
        model: "Player",
      });

    if (existingScorecard) {
      await redisClient.setEx(cacheKey, 600, JSON.stringify(existingScorecard));
      return res.status(200).json({ scorecard: existingScorecard });
    } else {
      return res.status(404).json({ error: "Scorecard not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getMatchFeeds(req, res) {
  try {
    const { matchId } = req.params;

    const formData = new FormData();
    formData.append("match_id", matchId);

    const API_URL = process.env.API_URL || "";
    const API_KEY = process.env.API_KEY || "";

    const matchFancyResponse = await axios.post(
      `${API_URL}matchFancy${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const matchFancyData = matchFancyResponse.data.data;
    return res.status(200).json({ data: matchFancyData });
  } catch (error) {}
}

async function clearMatchCache(matchId) {
  try {
    const cacheKey = `match:${matchId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.log("Error clearing match cache:", error);
  }
}

async function clearScorecardCache(matchId) {
  try {
    const cacheKey = `scorecard:${matchId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.log("Error clearing scorecard cache:", error);
  }
}

async function refreshLiveMatchData(matchId) {
  const cacheKey = `livematch:${matchId}`;
  const hashKey = `livematch:${matchId}:hash`;
  const formData = new FormData();
  formData.append("match_id", matchId);

  const response = await axios.post(`${API_URL}liveMatch${API_KEY}`, formData);
  const hash = createHash("md5").update(JSON.stringify(response.data)).digest("hex");

  if (response.data.status) {
    await redisClient.set(cacheKey, JSON.stringify(response.data));
    await redisClient.set(hashKey, hash);
  }
}

setInterval(() => {
  livematchMap.forEach((timestamp, matchId) => {
    if (Date.now() - timestamp < 5000) {
      refreshLiveMatchData(matchId);
    }
  });
}, 2000);

module.exports = {
  getMatches,
  getMatch,
  getMatchScorecard,
  clearMatchCache,
  clearScorecardCache,
  getMatchSquads,
  getMatchCommentary,
  getMatchFeeds,
  getMatchInfo,
  fetchHomePageMatches,
  fetchLiveMatchData,
};
