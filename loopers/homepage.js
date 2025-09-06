const axios = require("axios");
const Config = require("../models/config");
const redisClient = require("../redis");
const WebSocket = require("ws");
const FormData = require("form-data");
const newPlayer = require("../models/newPlayer");
const { fetchAndSaveSeries } = require("../controllers/series");
const Match = require("../models/match");
const Shorts = require("../models/shorts");
const { createHash } = require("crypto");
const sendNotification = require("../utils/notification");
const Series = require("../models/series");
let API_URL = process.env.API_URL;
let API_KEY = process.env.API_KEY;
let wss;

let livematchMap = new Map();

const notifyClients = (type, data) => {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: type,
            message: "Data updated",
            data: data,
          })
        );
      }
    });
  }
};

async function refreshLiveMatchData(matchId) {
  const cacheKey = `livematch:${matchId}`;
  const formData = new FormData();
  formData.append("match_id", matchId);
  const oldDataRaw = await redisClient.get(cacheKey);

  const response = await axios.post(`${API_URL}liveMatch${API_KEY}`, formData);

  if (oldDataRaw !== JSON.stringify(response.data)) {
    const oldData = JSON.parse(oldDataRaw);
    const { toss: oldToss } = oldData.data;
    const matchData = response.data.data;
    const { toss } = matchData;
    const { series } = await Series.findOne({ series_id: matchData.series_id });
    if (oldToss !== toss) {
      sendNotification({
        title: `${series} - ${matchData.team_a} vs ${matchData.team_b} - Toss updated`,
        message: `${matchData.toss}`,
      });
    }
    if (
      matchData.last36ball.length > 0 &&
      oldData.data.last36ball.length === 0
    ) {
      sendNotification({
        title: `${series} - ${matchData.team_a} vs ${matchData.team_b} - Match started`,
        message: `Catch the live Scorecard Betweeen ${matchData.team_a} VS ${matchData.team_b}  🙌🏏`,
      });
    }

    if (matchData.current_inning !== oldData.data.current_inning) {
      sendNotification({
        title: `${series} - ${matchData.team_a} vs ${matchData.team_b}`,
        message: ` ${oldData.data.current_inning}st Innings Complete, Target${matchData.target}`,
      });
    }

    if (matchData.result !== oldData.data.result) {
      sendNotification({
        title: `${series} - ${matchData.team_a} vs ${matchData.team_b}`,
        message: ` ${matchData.result}`,
      });
    }

    if (
      JSON.stringify(matchData.batsman) !== JSON.stringify(oldData.data.batsman)
    ) {
      for (const batsman of matchData.batsman) {
        if (
          JSON.stringify(batsman) !== JSON.stringify(oldData.data.batsman) &&
          Number(batsman.run) % 50 === 0 &&
          Number(batsman.run) !== 0
        ) {
          sendNotification({
            title: `${series} - ${matchData.team_a} vs ${matchData.team_b} - ${
              Number(batsman.run) === 50
                ? "Halfway There"
                : Number(batsman.run) === 100
                ? "Century Complete"
                : ""
            }`,
            message: `${batsman.name} - ${batsman.run} Runs , ${batsman.ball} Balls 😀🙌 ✅`,
          });
        }
        
      }
    }

    const oldWickets =
      matchData.batting_team === matchData.team_a_id
        ? oldData.data.team_a_score?.wicket ?? 0
        : oldData.data.team_b_score?.wicket ?? 0;

    const newWickets =
      matchData.batting_team === matchData.team_a_id
        ? matchData.team_a_score?.wicket ?? 0
        : matchData.team_b_score?.wicket ?? 0;

    if (newWickets > oldWickets) {
      const lw = matchData.lastwicket;
      sendNotification({
        title: `${series} - ${matchData.team_a} vs ${matchData.team_b}`,
        message: `${lw.player} out, ${lw.run} Runs, ${lw.ball} Balls`,
      });
    }

    if (matchData.team_a_id === matchData.batting_team) {
      if (
        Number(matchData.team_a_over) % 5 === 0 &&
        matchData.match_type === "T20" &&
        oldData.data.team_a_over !== matchData.team_a_over
      ) {
        sendNotification({
          title: `${series} - ${matchData.team_a} vs ${matchData.team_b} - ${matchData.team_a_over} Over Complete`,
          message: `${matchData.team_a} - ${matchData.team_a_scores} 🏏`,
        });
      }
      if (
        Number(matchData.team_a_over) % 10 === 0 &&
        matchData.match_type != "T20" &&
        oldData.data.team_a_over !== matchData.team_a_over
      ) {
        sendNotification({
          title: `${series} - ${matchData.team_a} vs ${matchData.team_b} - ${matchData.team_a_over} Over Complete`,
          message: `${matchData.team_a} - ${matchData.team_a_scores} 🏏`,
        });
      }
    } else if (matchData.team_b_id === matchData.batting_team) {
      if (
        Number(matchData.team_b_over) % 5 === 0 &&
        matchData.match_type === "T20" &&
        oldData.data.team_b_over !== matchData.team_b_over
      ) {
        sendNotification({
          title: `${series} - ${matchData.team_a} vs ${matchData.team_b} - ${matchData.team_b_over} Over Complete`,
          message: `${matchData.team_b} - ${matchData.team_b_scores} 🏏`,
        });
      }
      if (
        Number(matchData.team_b_over) % 10 === 0 &&
        matchData.match_type != "T20" &&
        oldData.data.team_b_over !== matchData.team_b_over
      ) {
        sendNotification({
          title: `${series} - ${matchData.team_a} vs ${matchData.team_b} - ${matchData.team_b_over} Over Complete`,
          message: `${matchData.team_b} - ${matchData.team_b_scores} 🏏`,
        });
      }
    }
  }

  if (response.data.status) {
    await redisClient.set(cacheKey, JSON.stringify(response.data));
  }
}

setInterval(() => {
  livematchMap.forEach((timestamp, matchId) => {
    if (Date.now() - timestamp < 5000) {
      refreshLiveMatchData(matchId);
    }
  });
}, 2000);

const getHomepage = async () => {
  if (!API_URL || !API_KEY) {
    return;
  }
  try {
    const homepage = await redisClient.get("homepage");
    const response = await axios.get(`${API_URL}homeList${API_KEY}`);
    let homeMatches = {
      live: [],
      upcoming: [],
      finished: [],
    };

    for (const match of response.data.data) {
      if (match.match_status === "Live") {
        livematchMap.set(match.match_id, Date.now());
        const cacheKey = `livematch:${match.match_id}`;
        const matchData = await redisClient.get(cacheKey);
        if (matchData) {
          homeMatches.live.push({ ...match, liveData: JSON.parse(matchData) });
        } else {
          const formData = new FormData();
          formData.append("match_id", match.match_id);

          const response = await axios.post(
            `${API_URL}liveMatch${API_KEY}`,
            formData
          );
          if (response.data.status) {
            homeMatches.live.push({ ...match, liveData: response.data });
          }
        }
      } else if (match.match_status === "Finished") {
        homeMatches.finished.push(match);
      } else if (
        match.match_status === "Upcoming" &&
        homeMatches.upcoming.length < 5
      ) {
        livematchMap.set(match.match_id, Date.now());
        const cacheKey = `livematch:${match.match_id}`;
        const matchData = await redisClient.get(cacheKey);
        if (matchData) {
          homeMatches.upcoming.push({
            ...match,
            liveData: JSON.parse(matchData),
          });
        } else {
          const formData = new FormData();
          formData.append("match_id", match.match_id);

          const response = await axios.post(
            `${API_URL}liveMatch${API_KEY}`,
            formData
          );
          if (response.data.status) {
            homeMatches.upcoming.push({ ...match, liveData: response.data });
          }
        }
      }
    }
    const hash = createHash("md5")
      .update(JSON.stringify(homeMatches))
      .digest("hex");
    redisClient.set("homepage:hash", hash);
    if (homepage) {
      const oldData = JSON.parse(homepage);
      if (JSON.stringify(oldData) !== JSON.stringify(homeMatches)) {
        redisClient.set("homepage", JSON.stringify(homeMatches));
      }
    } else {
      redisClient.set("homepage", JSON.stringify(homeMatches));
    }
  } catch (error) {
    console.log(error);
  }
};

const getSeries = async () => {
  if (!API_URL || !API_KEY) {
    return;
  }
  try {
    const series = await redisClient.get("series");
    const response = await axios.get(`${API_URL}seriesList${API_KEY}`);
    // console.log("Got", response.data.data.length, "items on series");

    if (series) {
      const oldData = JSON.parse(series);
      if (JSON.stringify(oldData) !== JSON.stringify(response.data)) {
        // console.log("Series data changed, notifying clients");
        notifyClients("series_list", response.data);
      }
    }

    redisClient.set("series", JSON.stringify(response.data));
  } catch (error) {
    console.log(error);
  }
};

async function getMatchPlayers(matchId) {
  try {
    console.log("Getting players for match", matchId);
    const formData = new FormData();
    formData.append("match_id", matchId);
    const response = await axios.post(
      `${API_URL}playingXiByMatchId${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log(
      "Got ",
      response.data.data.length,
      "players for match",
      matchId
    );
    const playersA = response.data.data.team_a.player;
    const playersB = response.data.data.team_b.player;
    if (playersA || playersB) {
      for (let i = 0; i < playersA.length; i++) {
        await getPlayerData(playersA[i].player_id);
      }
      for (let i = 0; i < playersB.length; i++) {
        await getPlayerData(playersB[i].player_id);
      }
    }
  } catch (error) {
    console.log(error);
  }
}

async function getPlayerData(playerId) {
  try {
    console.log("Checking player data for", playerId);
    const playerExist = await newPlayer.findOne({
      player_id: playerId,
    });
    if (playerExist) {
      console.log("Player found in DB ");
      return;
    }

    const formData = new FormData();
    formData.append("player_id", playerId);
    const response = await axios.post(
      `${API_URL}playerInfo${API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response) {
      console.log(response.data);
      const playerData = response.data.data.player;
      const playerStats = response.data.data;
      const play = new newPlayer({
        player_id: playerData.player_id,
        name: playerData.name,
        play_role: playerData.play_role,
        image: playerData.image,
        style_bating: playerData.style_bating,
        style_bowling: playerData.style_bowling,
        born: playerData.born,
        height: playerData.height,
        birth_place: playerData.birth_place,
        description: playerData.description,
        teams: playerData.teams,
        batting_career: [...playerStats.batting_career],
        bowling_career: [...playerStats.bowling_career],
      });
      await play.save();
      console.log("New player saved");
    }
  } catch (error) {
    console.log(error);
  }
}

async function fetchUpcomingMatches() {
  try {
    const response = await axios.get(`${API_URL}upcomingMatches${API_KEY}`);

    for (const match of response.data.data) {
      const newMatch = {
        ...match,
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

async function getShorts() {
  try {
    const response = await axios.get(`${API_URL}news${API_KEY}`);
    for (const news of response.data.data) {
      const newsExist = await Shorts.findOne({ news_id: news.news_id });
      if (newsExist) {
        continue;
      }
      const newNews = new Shorts({
        news_id: news.news_id,
        title: news.title,
        description: news.description,
        image: news.image,
        pub_date: news.pub_date,
        content: news.content,
      });
      await newNews.save();
    }
  } catch (error) {
    console.log(error);
  }
}

const startDataFetching = (websocketServer) => {
  wss = websocketServer;
  getHomepage();
  getSeries();
  getShorts();
  fetchUpcomingMatches();
  setInterval(() => {
    getHomepage();
  }, 2000);
  setInterval(() => {
    getSeries();
  }, 10000);
  setInterval(() => {
    getShorts();
  }, 7200000);
};

module.exports = startDataFetching;
