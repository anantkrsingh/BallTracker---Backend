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
        console.log(API_URL, API_KEY);
    } catch (error) {
        console.log(error)
    }
}
getConfig();

const notifyClients = (type, data) => {
    if (wss) {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: type,
                    message: 'Data updated',
                    data: data
                }));
            }
        });
    }
};

const notifyClientsInRoom = (room, type, data) => {
    try {
        
    } catch (error) {
        
    }
}

const getHomepage = async () => {
    if (!API_URL || !API_KEY) {
        return;
    }
    try {
        const homepage = await redisClient.get('homepage');
        const response = await axios.get(`${API_URL}homeList/${API_KEY}`);
        console.log("Got", response.data.data.length, "items on homepage");

        if (homepage) {
            const oldData = JSON.parse(homepage);
            if (JSON.stringify(oldData) !== JSON.stringify(response.data)) {
                console.log("Homepage data changed, notifying clients");
                notifyClients('homepage_list', response.data);
            }
        }

        redisClient.set('homepage', JSON.stringify(response.data));
    } catch (error) {
        console.log(error);
    }
}

const getSeries = async () => {
    if (!API_URL || !API_KEY) {
        return;
    }
    try {
        const series = await redisClient.get('series');
        const response = await axios.get(`${API_URL}seriesList/${API_KEY}`);
        console.log("Got", response.data.data.length, "items on series");

        if (series) {
            const oldData = JSON.parse(series);
            if (JSON.stringify(oldData) !== JSON.stringify(response.data)) {
                console.log("Series data changed, notifying clients");
                notifyClients('series_list', response.data);
            }
        }

        redisClient.set('series', JSON.stringify(response.data));
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

