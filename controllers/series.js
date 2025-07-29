const axios = require("axios");
const Series = require("../models/series");
const redis = require("../redis");
const Match = require("../models/match");
const FormData = require("form-data");
const Player = require("../models/newPlayer");
const Scorecard = require("../models/scorecard");
const PointsTable = require("../models/pointsTable");
const Venue = require("../models/venue");
const Squads = require("../models/squads");
const API_URL = `${process.env.API_URL}`;
const API_KEY = `${process.env.API_KEY}`;
const SERIES_ENDPOINT = `${API_URL}seriesList${API_KEY}`;
const CACHE_KEY = "series:all";
const TTL_5_HRS = 60 * 60 * 5;
const mongoose = require("mongoose");
const { clearMatchCache } = require("./matches");

async function fetchAndSaveSeries(url = SERIES_ENDPOINT) {
  try {
    const { data } = await axios.get(url);

    if (!data.status) throw new Error(`API error: `);

    const ops = data.data.map((s) => ({
      updateOne: {
        filter: { series_id: s.series_id },
        update: {
          $set: {
            series: s.series,
            series_type: s.series_type,
            series_date: s.series_date,
            total_matches: s.total_matches,
            start_date: s.start_date,
            end_date: s.end_date,
            image: s.image,
            month_wise: s.month_wise,
          },
        },
        upsert: true,
      },
    }));

    if (ops.length) await Series.bulkWrite(ops);

    let series = await Series.find({}).lean();

    series.forEach(async (ser) => {
      await fetchSeriesVenues(ser.series_id, ser._id);
      await fetchSeriesPointsTable(ser.series_id);
      await fetchSeriesSquads(ser.series_id, ser._id);
      await fetchSeriesUpcomingMatches(ser.series_id);
      await fetchSeriesMatches(ser.series_id);
    });

    return series;
  } catch (error) {
    console.log(error.message);
  }
}

async function fetchSeriesSquads(seriesId, objectId) {
  try {
    const formData = new FormData();
    formData.append("series_id", seriesId);

    const response = await axios.post(
      `${API_URL}squadsBySeriesId${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.status === 200 && response.data.status) {
      const data = response.data.data;

      const squadData = {
        series_id: seriesId,
        series: objectId,
        teams: [],
      };

      for (const item of data) {
        const teamObj = {
          name: item.team.name,
          short_name: item.team.short_name,
          flag: item.team.flag,
          players: [],
        };

        for (const player of item.player) {
          try {
            const dbPlayer = await getPlayerData(
              player.player_id,
              item.team.name
            );
            teamObj.players.push(dbPlayer._id);
          } catch (error) {
            console.error(
              `Error processing player ${player.player_id}:`,
              error
            );
          }
        }

        squadData.teams.push(teamObj);
      }
      await Squads.updateOne(
        { series_id: seriesId, series: objectId },
        { $set: squadData },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error("Error fetching squads:", error);
  }
}

async function fetchSeriesVenues(seriesId, objectId) {
  try {
    const formData = new FormData();
    formData.append("series_id", seriesId);
    const response = await axios.post(
      `${API_URL}venuesBySeriesId${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.status === 200 && response.data.status) {
      const data = response.data.data;
      const ops = data.map((venue) => ({
        updateOne: {
          filter: { id: venue.id, series: objectId },
          update: {
            $set: {
              name: venue.name,
              place: venue.place,
              image: venue.image,
              series_id: seriesId,
              series: objectId,
              created_at: new Date(),
              updated_at: new Date(),
            },
          },
          upsert: true,
        },
      }));

      if (ops.length) await Venue.bulkWrite(ops);
    }
  } catch (error) {
    console.error("Error fetching venues:", error);
  }
}

async function fetchSeriesMatches(seriesId) {
  try {
    const formData = new FormData();
    formData.append("series_id", seriesId);
    const response = await axios.post(
      `${API_URL}recentMatchesBySeriesId${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    for (const match of response.data.data) {
      const newMatch = {
        ...match,
        series_id: seriesId,
        team_a: {
          team_id: match.team_a_id,
          name: match.team_a,
          short_name: match.team_a_short,
          img: match.team_a_img,
          scores: match.team_a_scores,
          overs: match.team_a_over,
        },
        team_b: {
          team_id: match.team_b_id,
          name: match.team_b,
          short_name: match.team_b_short,
          img: match.team_b_img,
          scores: match.team_b_scores,
          overs: match.team_b_over,
        },
      };

      await Match.updateOne(
        { match_id: match.match_id },
        { $set: newMatch },
        { upsert: true }
      );

      await fetchMatchScorecard(match.match_id);
    }
  } catch (error) {
    console.log(error);
  }
}

async function fetchSeriesPointsTable(seriesId) {
  try {
    const formData = new FormData();
    formData.append("series_id", seriesId);
    const response = await axios.post(
      `${API_URL}pointsTable${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (response.status == 200 && response.data.status) {
      const pointsTable = response.data.data;
      const existingTeams = await PointsTable.find({
        team_id: { $in: pointsTable.map((team) => team.team_id) },
        series_id: seriesId,
      }).lean();

      const ops = pointsTable
        .filter(
          (team) =>
            !existingTeams.some((existing) => existing.team_id === team.team_id)
        )
        .map((team) => ({
          updateOne: {
            filter: { team_id: team.team_id, series_id: seriesId },
            update: {
              $set: {
                teams: team.teams,
                flag: team.flag,
                P: team.P,
                W: team.W,
                L: team.L,
                NR: team.NR,
                Pts: team.Pts,
                NRR: team.NRR,
                QE: team.QE,
                series_id: seriesId,
              },
            },
            upsert: true,
          },
        }));

      if (ops.length) await PointsTable.bulkWrite(ops);

      if (ops.length) await PointsTable.bulkWrite(ops);
    }
  } catch (error) {
    console.error("Error fetching points table:", error);
  }
}

async function fetchSeriesUpcomingMatches(seriesId) {
  try {
    const formData = new FormData();
    formData.append("series_id", seriesId);
    const response = await axios.post(
      `${API_URL}upcomingMatchesBySeriesId${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    for (const match of response.data.data) {
      const newMatch = {
        ...match,
        series_id: seriesId,
        team_a: {
          team_id: match.team_a_id,
          name: match.team_a,
          short_name: match.team_a_short,
          img: match.team_a_img,
        },
        team_b: {
          team_id: match.team_b_id,
          name: match.team_b,
          short_name: match.team_b_short,
          img: match.team_b_img,
        },
      };

      await Match.updateOne(
        { match_id: match.match_id },
        { $set: newMatch },
        { upsert: true }
      );
    }
  } catch (error) {
    console.log(error);
  }
}

async function fetchMatchScorecard(matchId) {
  try {
    const body = new FormData();
    body.append("match_id", matchId);

    const response = await axios.post(
      `${API_URL}scorecardByMatchId${API_KEY}`,
      body,
      {
        headers: {
          ...body.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.data.status) {
      console.log(response.data);
      return;
    }

    const scorecard = response.data.data;

    // Fetch and store player data
    const playerIds = new Set();

    // Collect player IDs from batsmen and bowlers
    Object.keys(scorecard.scorecard).forEach((inningKey) => {
      const inning = scorecard.scorecard[inningKey];
      inning.batsman?.forEach((batsman) => playerIds.add(batsman.player_id));
      inning.bolwer?.forEach((bowler) => playerIds.add(bowler.player_id));
    });

    // Fetch or create player documents
    await Promise.all(
      Array.from(playerIds).map((playerId) => getPlayerData(playerId, null))
    );

    const playerMap = await Player.find({
      player_id: { $in: Array.from(playerIds) },
    });
    const playerIdToRef = playerMap.reduce((map, player) => {
      map[player.player_id] = player._id;
      return map;
    }, {});

    const innings = Object.keys(scorecard.scorecard).map((inningKey) => {
      const inning = scorecard.scorecard[inningKey];

      return {
        inning: inning.team.inning,
        team: {
          team_id: inning.team.team_id,
          name: inning.team.name,
          short_name: inning.team.short_name,
          flag: inning.team.flag,
          score: inning.team.score,
          wicket: inning.team.wicket,
          test_declare: inning.team.test_declare,
          over: inning.team.over,
          extras: inning.team.extras,
        },
        batsmen: inning.batsman?.map((batsman) => ({
          player: playerIdToRef[batsman.player_id],
          name: batsman.name,
          run: batsman.run,
          ball: batsman.ball,
          fours: batsman.fours,
          sixes: batsman.sixes,
          strike_rate: batsman.strike_rate,
          impact_status: batsman.impact_status,
          out_by: batsman.out_by,
        })),
        bowlers: inning.bolwer?.map((bowler) => ({
          player: playerIdToRef[bowler.player_id],
          over: bowler.over,
          name: bowler.name,
          maiden: bowler.maiden,
          run: bowler.run,
          wicket: bowler.wicket,
          economy: bowler.economy,
          dot_ball: bowler.dot_ball,
          impact_status: bowler.impact_status,
        })),
        fallwicket: inning.fallwicket?.map((fall) => ({
          player: playerIdToRef[fall.player_id],
          name: fall.player,
          score: fall.score,
          wicket: fall.wicket,
          over: fall.over,
        })),
        partnership: inning.partnership?.map((partnership) => ({
          player_a_id: playerIdToRef[partnership.player_a_id],
          player_b_id: playerIdToRef[partnership.player_b_id],
          players_name: partnership.players_name,
          run: partnership.run,
          ball: partnership.ball,
        })),
      };
    });

    const scorecardData = {
      matchId,
      result: scorecard.result,
      is_hundred: scorecard.is_hundred,
      innings: innings,
    };

    const scorecardDoc = await Scorecard.findOneAndUpdate(
      { matchId },
      { $set: scorecardData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await Match.updateOne(
      { match_id: matchId },
      { $set: { scorecard: scorecardDoc._id } },
      { upsert: true }
    );

    await clearMatchCache(matchId);

    const { clearScorecardCache } = require("./matches");
    await clearScorecardCache(matchId);
  } catch (error) {
    console.error("Error fetching or upserting scorecard data:", error);
  }
}

async function getPlayerData(id, team) {
  try {
    const form = new FormData();
    form.append("player_id", id);

    const response = await axios.post(`${API_URL}playerInfo${API_KEY}`, form, {
      headers: form.getHeaders(),
    });

    const playerData = response.data.data;

    let dbPlayer = await Player.findOne({ player_id: id });

    if (!dbPlayer) {
      const newPlayer = new Player({
        player_id: playerData.player.player_id,
        name: playerData.player.name,
        teams: [team],
        batting_career: playerData.batting_career,
        bowling_career: playerData.bowling_career,
      });

      await newPlayer.save();
      return newPlayer;
    }
    if (!dbPlayer.teams.includes(team)) {
      dbPlayer.teams.push(team);
      await dbPlayer.save();
    }
    return dbPlayer;
  } catch (error) {
    console.error("Error fetching or saving player data:", error);
    throw error;
  }
}

async function getSeries(req, res) {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return res.status(200).json({ data: JSON.parse(cached) });
    }

    const freshList = await fetchAndSaveSeries();

    await redis.setEx(CACHE_KEY, TTL_5_HRS, JSON.stringify(freshList));

    return res.status(200).json({ data: freshList });
  } catch (err) {
    console.error("[getSeries]", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function fetchMatchesWithScorecards(seriesId) {
  try {
    const matches = await Match.find({ series_id: seriesId }).populate(
      "scorecard"
    );

    return matches;
  } catch (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }
}
async function getSeriesOverview(req, res) {
  try {
    const { seriesId } = req.query;
    const redisKey = `seriesOverview:${seriesId}`;

    const cachedData = await redis.get(redisKey);
    if (cachedData) {
      if (JSON.parse(cachedData) != {}) {
        return res.status(200).json(JSON.parse(cachedData));
      }
    }

    const matches = await fetchMatchesWithScorecards(seriesId);

    // Group matches by match type
    const matchesByType = {};
    matches.forEach((match) => {
      const matchType = match.match_type || "Unknown";
      if (!matchesByType[matchType]) {
        matchesByType[matchType] = [];
      }
      matchesByType[matchType].push(match);
    });

    const result = {};

    // Process each match type separately
    for (const [matchType, typeMatches] of Object.entries(matchesByType)) {
      const playerStats = {};
      const bowlerRankings = {};
      let highest;

      const playerIds = new Set();
      typeMatches.forEach((match) => {
        if (match.scorecard && match.scorecard.innings) {
          match.scorecard.innings.forEach((inning) => {
            if (inning.batsmen) {
              inning.batsmen.forEach((batsman) => {
                playerIds.add(batsman.player);
              });
            }
            if (inning.bowlers) {
              inning.bowlers.forEach((bowler) => {
                playerIds.add(bowler.player);
              });
            }
          });
        }
      });

      const players = await Player.find({
        _id: { $in: Array.from(playerIds) },
      });

      for (const match of typeMatches) {
        if (match.scorecard && match.scorecard.innings) {
          for (const inning of match.scorecard.innings) {
            if (inning.batsmen) {
              for (const batsman of inning.batsmen) {
                const player = players.find((p) =>
                  p._id.equals(batsman.player)
                );
                if (!highest) {
                  highest = {
                    runs: batsman.run,
                    playerId: batsman.player,
                    name: player.name,
                    image: player.image,
                    team: inning.team.name,
                    fours: batsman.fours,
                    sixes: batsman.sixes,
                  };
                } else if (highest.runs < batsman.run) {
                  highest = {
                    runs: batsman.run,
                    playerId: batsman.player,
                    name: player.name,
                    image: player.image,
                    team: inning.team.name,
                    fours: batsman.fours,
                    sixes: batsman.sixes,
                  };
                }

                if (playerStats[batsman.player]) {
                  playerStats[batsman.player].totalRuns += batsman.run;
                  playerStats[batsman.player].fours += batsman.fours;
                  playerStats[batsman.player].sixes += batsman.sixes;
                  playerStats[batsman.player].hundreds +=
                    batsman.run >= 100 ? 1 : 0;
                  playerStats[batsman.player].fifties +=
                    batsman.run >= 50 && batsman.run < 100 ? 1 : 0;
                } else {
                  const teamData = await getTeamNameByPlayerId(batsman.player);
                  playerStats[batsman.player] = {
                    playerId: batsman.player,
                    totalRuns: batsman.run,
                    name: player.name,
                    image: player.image,
                    team: teamData?.teamName || "Unknown",
                    fours: batsman.fours,
                    sixes: batsman.sixes,
                    hundreds: batsman.run >= 100 ? 1 : 0,
                    fifties: batsman.run >= 50 && batsman.run < 100 ? 1 : 0,
                  };
                }
              }
            }

            if (inning.bowlers) {
              for (const bowler of inning.bowlers) {
                const player = players.find((p) => p._id.equals(bowler.player));
                if (bowlerRankings[bowler.player]) {
                  bowlerRankings[bowler.player].totalWickets += bowler.wicket;
                  bowlerRankings[bowler.player].totalRuns += bowler.run;
                  bowlerRankings[bowler.player].fiveWickets +=
                    bowler.wicket >= 5 ? 1 : 0;
                  bowlerRankings[bowler.player].innings += 1;
                } else {
                  const teamData = await getTeamNameByPlayerId(bowler.player);
                  bowlerRankings[bowler.player] = {
                    playerId: bowler.player,
                    name: player?.name || "Unknown",
                    image: player?.image || null,
                    totalWickets: bowler.wicket,
                    totalRuns: bowler.run,
                    team: teamData?.teamName || "Unknown",
                    fiveWickets: bowler.wicket >= 5 ? 1 : 0,
                    innings: 1,
                  };
                }
              }
            }
          }
        }
      }

      const topBatsman = Object.keys(playerStats)
        .map((playerId) => ({
          playerName: playerStats[playerId].name,
          totalRuns: playerStats[playerId].totalRuns,
          playerId: playerId,
          image: playerStats[playerId].image,
          team: playerStats[playerId].team,
          fours: playerStats[playerId].fours,
          sixes: playerStats[playerId].sixes,
        }))
        .sort((a, b) => b.totalRuns - a.totalRuns);

      const sixer = Object.keys(playerStats)
        .map((playerId) => ({
          playerName: playerStats[playerId].name,
          totalRuns: playerStats[playerId].totalRuns,
          playerId: playerId,
          image: playerStats[playerId].image,
          team: playerStats[playerId].team,
          fours: playerStats[playerId].fours,
          sixes: playerStats[playerId].sixes,
        }))
        .sort((a, b) => b.sixes - a.sixes);

      const fours = Object.keys(playerStats)
        .map((playerId) => ({
          playerName: playerStats[playerId].name,
          totalRuns: playerStats[playerId].totalRuns,
          playerId: playerId,
          image: playerStats[playerId].image,
          team: playerStats[playerId].team,
          fours: playerStats[playerId].fours,
          sixes: playerStats[playerId].sixes,
          hundreds: playerStats[playerId].hundreds,
        }))
        .sort((a, b) => b.fours - a.fours);

      const fifties = Object.keys(playerStats)
        .map((playerId) => ({
          playerName: playerStats[playerId].name,
          totalRuns: playerStats[playerId].totalRuns,
          playerId: playerId,
          image: playerStats[playerId].image,
          team: playerStats[playerId].team,
          fours: playerStats[playerId].fours,
          sixes: playerStats[playerId].sixes,
          fifties: playerStats[playerId].fifties,
        }))
        .sort((a, b) => b.fifties - a.fifties);

      const hundreds = Object.keys(playerStats)
        .map((playerId) => ({
          playerName: playerStats[playerId].name,
          totalRuns: playerStats[playerId].totalRuns,
          playerId: playerId,
          image: playerStats[playerId].image,
          team: playerStats[playerId].team,
          fours: playerStats[playerId].fours,
          sixes: playerStats[playerId].sixes,
          hundreds: playerStats[playerId].hundreds,
        }))
        .sort((a, b) => b.hundreds - a.hundreds);

      const bestAvg = Object.keys(bowlerRankings)
        .map((playerId) => ({
          playerName: bowlerRankings[playerId].name,
          totalWickets: bowlerRankings[playerId].totalWickets,
          playerId: playerId,
          image: bowlerRankings[playerId].image,
          avg:
            bowlerRankings[playerId].totalWickets > 0
              ? bowlerRankings[playerId].totalRuns /
                bowlerRankings[playerId].totalWickets
              : Infinity,
          team: bowlerRankings[playerId].team,
        }))
        .sort((a, b) => a.avg - b.avg);

      const topBowler = Object.keys(bowlerRankings)
        .map((playerId) => ({
          playerName: bowlerRankings[playerId].name,
          totalWickets: bowlerRankings[playerId].totalWickets,
          playerId: playerId,
          image: bowlerRankings[playerId].image,
          avg:
            bowlerRankings[playerId].totalRuns /
              bowlerRankings[playerId].totalWickets || 1,
          team: bowlerRankings[playerId].team,
        }))
        .sort((a, b) => b.totalWickets - a.totalWickets);

      const fiveWickets = Object.keys(bowlerRankings)
        .map((playerId) => ({
          playerName: bowlerRankings[playerId].name,
          totalWickets: bowlerRankings[playerId].totalWickets,
          playerId: playerId,
          image: bowlerRankings[playerId].image,
          avg:
            bowlerRankings[playerId].totalRuns /
              bowlerRankings[playerId].totalWickets || 1,
          team: bowlerRankings[playerId].team,
          fiveWickets: bowlerRankings[playerId].fiveWickets,
          innings: bowlerRankings[playerId].innings,
        }))
        .sort((a, b) => {
          if (b.fiveWickets === a.fiveWickets) {
            return a.innings - b.innings;
          }
          return b.fiveWickets - a.fiveWickets;
        });

      result[matchType] = {
        topBatsman: topBatsman[0] || null,
        highest: highest || null,
        topBowler: topBowler[0] || null,
        bestAvg: bestAvg[0] || null,
        sixer: sixer[0] || null,
        fours: fours[0] || null,
        fifties: fifties[0] || null,
        hundreds: hundreds[0] || null,
        fiveWickets: fiveWickets[0] || null,
      };
    }

    await redis.set(redisKey, JSON.stringify(result), "EX", 3600);

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getTeamNameByPlayerId(playerId) {
  const objectId = new mongoose.Types.ObjectId(playerId);

  const result = await Squads.aggregate([
    { $unwind: "$teams" },
    {
      $match: {
        "teams.players": objectId,
      },
    },
    {
      $project: {
        _id: 0,
        teamName: "$teams.name",
        shortName: "$teams.short_name",
        flag: "$teams.flag",
        series_id: 1,
      },
    },
    { $limit: 1 },
  ]);

  return result[0] || null;
}

async function getSeriesMatches(req, res) {
  try {
    const { seriesId } = req.query;

    if (!seriesId) {
      return res.status(400).json({ error: "Series ID is required" });
    }

    const matches = await Match.find({ series_id: seriesId });

    if (!matches || matches.length === 0) {
      return res
        .status(404)
        .json({ error: "No matches found for this series" });
    }

    return res.status(200).json({ data: matches });
  } catch (error) {
    console.error("[getSeriesMatches]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
async function getSeriesSquads(req, res) {
  try {
    const { seriesId } = req.query;
    if (!seriesId) {
      return res.status(400).json({ error: "Series ID is required" });
    }
    const squads = await Squads.findOne(
      { series_id: seriesId },
      { "teams.players": 0, series_id: 0 }
    );

    return res.status(200).json({ data: squads });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
async function getSeriesTeamSquads(req, res) {
  try {
    const { id, squadId } = req.query;
    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }

    const squads = await Squads.findOne({ _id: squadId }).populate({
      path: "teams.players",
      select: "name player_id image",
    });
    if (!squads) {
      return res.status(404).json({ error: "No squads found for this series" });
    }
    const specificTeam = squads.teams.find(
      (team) => team._id.toString() === id
    );

    return res.status(200).json({ data: specificTeam });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
async function getSeriesPointsTable(req, res) {
  try {
    const { seriesId } = req.query;

    if (!seriesId) {
      return res.status(400).json({ error: "Series ID is required" });
    }

    const pointsTable = await PointsTable.find({ series_id: seriesId }).sort({
      NRR: -1,
    });

    if (!pointsTable || pointsTable.length === 0) {
      return res
        .status(404)
        .json({ error: "No points table found for this series" });
    }

    return res.status(200).json({ data: pointsTable });
  } catch (error) {
    console.error("[getSeriesPointsTable]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  fetchAndSaveSeries,
  getSeries,
  getSeriesOverview,
  getSeriesMatches,
  getSeriesPointsTable,
  getSeriesTeamSquads,
  getSeriesSquads,
  fetchMatchScorecard,
  getPlayerData,
};
