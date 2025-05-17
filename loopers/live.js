const axios = require('axios');
const Config = require('../models/config');
const redisClient = require('../redis');
const WebSocket = require('ws');

let API_URL;
let API_KEY;
let wss;

const getConfig = async () => {
    try {
        const config = await Config.findOne({});
        API_URL = config.base_url;
        API_KEY = config.a_api_key;
    } catch (error) {
        console.log(error)
    }
}
getConfig();



 const getLiveMatch = async (matchId) => {
    try {
        const data = await redisClient.get(matchId);

        const response = await axios.post(`${API_URL}liveMatch/${API_KEY}`, {
            match_id: matchId
        })

        if (data) {
            const oldData = JSON.parse(data);
            if (JSON.stringify(oldData) !== JSON.stringify(response.data)) {
                console.log("Series data changed, notifying clients");
                notifyClients('livematch', response.data);
            }
        }

        redisClient.set(`${matchId}`, JSON.stringify(response.data));

        console.log("Got live match data for match id", matchId);

        return response.data;
    } catch (error) {
        console.log(error)
    }
}


module.exports = {
    getLiveMatch
}
