const axios = require('axios');
const Config = require('../models/config');
const redisClient = require('../redis');

let API_URL;
let API_KEY;

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



const getHomepage = async () => {
    if (!API_URL || !API_KEY) {
        return;
    }
    try {
        // console.log("Getting homepage");
        const homepage = await redisClient.get('homepage');
        if (homepage) {
            // console.log("Got homepage from redis");
            return;
        }
        const response = await axios.get(`${API_URL}homeList/${API_KEY}`);
        console.log("Got", response.data.data.length, "items on homepage");
        redisClient.set('homepage', JSON.stringify(response.data));
    } catch (error) {
        console.log(error);
    }
}

setInterval(() => {
    getHomepage();
}, 2000);

