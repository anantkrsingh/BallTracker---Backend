const axios = require("axios");
const Config = require("../models/config");
const redisClient = require("../redis");
const WebSocket = require("ws");
const FormData = require("form-data");
const newPlayer = require("../models/newPlayer");

let API_URL;
let API_KEY;
let wss;

const getConfig = async () => {
  try {
    const config = await Config.findOne({});
    API_URL = config.base_url;
    API_KEY = config.a_api_key;
    console.log(API_URL, API_KEY);
  } catch (error) {
    console.log(error);
  }
};
getConfig();

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



const getHomepage = async () => {
  if (!API_URL || !API_KEY) {
    return;
  }
  try {
    const homepage = await redisClient.get("homepage");
    const response = await axios.get(`${API_URL}homeList${API_KEY}`);
    // console.log("Got", response.data.data.length, "items on homepage");

    for (let i = 0; i < response.data.data.length; i++) {
      //   await getMatchPlayers(response.data.data[i].match_id);
    }

    if (homepage) {
      const oldData = JSON.parse(homepage);
      if (JSON.stringify(oldData) !== JSON.stringify(response.data)) {
        // console.log("Homepage data changed, notifying clients");
        notifyClients("homepage_list", response.data);
      }
    }

    redisClient.set("homepage", JSON.stringify(response.data));
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

const startDataFetching = (websocketServer) => {
  wss = websocketServer;
  setInterval(() => {
    getHomepage();
    getSeries();
  }, 2000);
};

module.exports = startDataFetching;
