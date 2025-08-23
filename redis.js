const { createClient } = require("redis");
require("dotenv").config();
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.log(err);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});
redisClient.connect();

module.exports = redisClient;
