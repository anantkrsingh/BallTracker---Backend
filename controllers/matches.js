const Match = require("../models/match");
const redisClient = require("../redis");
const FormData = require("form-data");
const axios = require("axios");
const Scorecard = require("../models/scorecard");
async function getMatches(req, res) {
  try {
    const { match_type, page, date } = req.query;

    // Build query with optional match_type filter
    let query = {};
    if (match_type) {
      query.match_type = { $regex: match_type, $options: "i" };
    }

    const matches = await Match.find(query).lean();

    const uniqueDates = [
      ...new Set(matches.map((match) => match?.date_wise?.split(",")[0])),
    ].sort((a, b) => new Date(a) - new Date(b));

    const totalPages = uniqueDates.length;

    // Create dates with page information
    const datesWithPages = uniqueDates.map((dateStr, index) => ({
      date: dateStr,
      page: index + 1,
    }));

    // Find today's date page
    const today = new Date();
    const todayString = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Find the page that contains today's date or the closest date
    let todayPageIndex = uniqueDates.findIndex((date) =>
      date.includes(todayString)
    );

    // If today's date not found, find the closest future date
    if (todayPageIndex === -1) {
      todayPageIndex = uniqueDates.findIndex((date) => new Date(date) >= today);
      // If no future date found, use the last page
      if (todayPageIndex === -1) {
        todayPageIndex = uniqueDates.length - 1;
      }
    }

    let result = [];
    let pagination = {};

    // Check if date parameter is provided
    if (date) {
      // Find the page for the specific date
      const datePageIndex = uniqueDates.findIndex((d) => d === date);

      if (datePageIndex === -1) {
        return res.status(404).json({ error: "Date not found" });
      }

      const currentMatches = matches.filter(
        (match) => match.date_wise.split(",")[0] === date
      );

      // Sort matches within the date
      currentMatches.sort((a, b) => {
        const aDate = new Date(a.date_wise.split(",")[0]);
        const bDate = new Date(b.date_wise.split(",")[0]);
        return aDate - bDate;
      });

      result = [
        {
          date: date,
          matches: currentMatches,
        },
      ];

      pagination = {
        currentPage: datePageIndex + 1,
        totalPages: totalPages,
        totalDates: totalPages,
        hasNextPage: datePageIndex < totalPages - 1,
        hasPreviousPage: datePageIndex > 0,
        nextPage: datePageIndex < totalPages - 1 ? datePageIndex + 2 : null,
        previousPage: datePageIndex > 0 ? datePageIndex : null,
        todayPage: todayPageIndex + 1,
        currentDate: date,
        datesWithPages: datesWithPages,
      };
    }
    // Check if page is provided
    else if (page) {
      // When page is provided, return only that specific date
      const currentPage = parseInt(page) - 1; // Convert to 0-based index
      const validCurrentPage = Math.max(
        0,
        Math.min(currentPage, totalPages - 1)
      );

      const currentDate = uniqueDates[validCurrentPage];
      const currentMatches = matches.filter(
        (match) => match.date_wise.split(",")[0] === currentDate
      );

      // Sort matches within the date
      currentMatches.sort((a, b) => {
        const aDate = new Date(a.date_wise.split(",")[0]);
        const bDate = new Date(b.date_wise.split(",")[0]);
        return aDate - bDate;
      });

      result = [
        {
          date: currentDate,
          matches: currentMatches,
        },
      ];

      pagination = {
        currentPage: validCurrentPage + 1,
        totalPages: totalPages,
        totalDates: totalPages,
        hasNextPage: validCurrentPage < totalPages - 1,
        hasPreviousPage: validCurrentPage > 0,
        nextPage:
          validCurrentPage < totalPages - 1 ? validCurrentPage + 2 : null,
        previousPage: validCurrentPage > 0 ? validCurrentPage : null,
        todayPage: todayPageIndex + 1,
        currentDate: currentDate,
        datesWithPages: datesWithPages,
      };
    } else {
      // When no page is provided, return today + yesterday (default behavior)
      const currentDate = uniqueDates[todayPageIndex];
      const previousDate =
        todayPageIndex > 0 ? uniqueDates[todayPageIndex - 1] : null;

      // Get matches for current date (today)
      const currentMatches = matches.filter(
        (match) => match.date_wise.split(",")[0] === currentDate
      );

      // Get matches for previous date (yesterday)
      const previousMatches = previousDate
        ? matches.filter(
            (match) => match.date_wise.split(",")[0] === previousDate
          )
        : [];

      // Sort matches within each date
      currentMatches.sort((a, b) => {
        const aDate = new Date(a.date_wise.split(",")[0]);
        const bDate = new Date(b.date_wise.split(",")[0]);
        return aDate - bDate;
      });

      previousMatches.sort((a, b) => {
        const aDate = new Date(a.date_wise.split(",")[0]);
        const bDate = new Date(b.date_wise.split(",")[0]);
        return aDate - bDate;
      });

      // Prepare the response data in ascending order (previous date first, then current date)
      if (previousDate) {
        result.push({
          date: previousDate,
          matches: previousMatches,
        });
      }

      result.push({
        date: currentDate,
        matches: currentMatches,
      });

      pagination = {
        currentPage: todayPageIndex + 1,
        totalPages: totalPages,
        totalDates: totalPages,
        hasNextPage: todayPageIndex < totalPages - 1,
        hasPreviousPage: todayPageIndex > 0,
        nextPage: todayPageIndex < totalPages - 1 ? todayPageIndex + 2 : null,
        previousPage: todayPageIndex > 0 ? todayPageIndex : null,
        todayPage: todayPageIndex + 1,
        currentDate: currentDate,
        previousDate: previousDate,
        datesWithPages: datesWithPages,
      };
    }

    res.status(200).json({
      data: result,
      pagination: pagination,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
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

    // Fetch from API
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
      return res.status(404).json({ error: "Match not found" });
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

    // Update or create match in database
    const match = await Match.findOneAndUpdate(
      { match_id: parseInt(match_id) },
      matchData,
      { new: true, upsert: true }
    );

    // Cache in Redis for 10 minutes
    await redisClient.setEx(cacheKey, 600, JSON.stringify(match));

    res.status(200).json({ match });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
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

module.exports = {
  getMatches,
  getMatch,
  getMatchScorecard,
  clearMatchCache,
  clearScorecardCache,
};
