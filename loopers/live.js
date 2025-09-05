const axios = require("axios");
const Config = require("../models/config");
const redisClient = require("../redis");
const WebSocket = require("ws");
const FormData = require("form-data");
const { clearMatchCache } = require("../controllers/matches");

let API_URL;
let API_KEY;
let wss;

const getConfig = async () => {
  try {
    const config = await Config.findOne({});
    API_URL = config.base_url;
    API_KEY = config.a_api_key;
  } catch (error) {
    console.log(error);
  }
};
getConfig();

const notifyRoomUsers = (matchId, data) => {
  if (!wss || !wss.rooms || !wss.rooms.has(matchId)) return;

  const roomUsers = wss.rooms.get(matchId);
  roomUsers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "live_match" + matchId,
          message: "Live match data updated",
          data: data,
        })
      );
    }
  });
};

const updateLiveMatches = async () => {
  if (!wss || !wss.rooms) return;

  for (const [matchId, users] of wss.rooms.entries()) {
    if (users.length > 0) {
      try {
        const data = await getLiveMatch(matchId);
        if (data && data.status) {
          notifyRoomUsers(matchId, data);
        }
      } catch (error) {
        console.error(`Error updating live match ${matchId}:`, error);
      }
    }
  }
};

const getLiveMatch = async (matchId) => {
  try {
    const data = await redisClient.get(matchId);

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

    if (data) {
      if (!response.data.status) {
        console.log("Error in livematch fetching !");
        return;
      } else {
        const oldData = JSON.parse(data);
        if (JSON.stringify(oldData) !== JSON.stringify(response.data)) {
          console.log("Live data changed, notifying clients");
          await clearMatchCache(matchId);
        }
      }
    }

    redisClient.set(`${matchId}`, JSON.stringify(response.data));

    console.log("Got live match data for match id", matchId);

    return response.data;
  } catch (error) {
    console.log(error);
  }
};

const initializeLiveUpdates = (websocketServer) => {
  wss = websocketServer;
  setInterval(updateLiveMatches, 2000);
};

module.exports = {
  getLiveMatch,
  initializeLiveUpdates,
  notifyRoomUsers,
};
