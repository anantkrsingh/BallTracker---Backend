const axios = require("axios");
const Config = require("../models/config");
const redisClient = require("../redis");
const WebSocket = require("ws");
const FormData = require("form-data");

let API_URL;
let API_KEY;

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

const getSquads = async (matchId) => {

  const formData = new FormData();
  formData.append("match_id", matchId);

  const response = await axios.post(
    `${API_URL}squadsByMatchId${API_KEY}`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  redisClient.set(
    `squads_${matchId}`,
    JSON.stringify(response.data),
    "EX",
    3600
  );

  return response.data;
};

module.exports = { getSquads };
