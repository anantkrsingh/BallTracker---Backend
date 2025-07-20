const axios = require("axios");
const redisClient = require("../redis");
const API_KEY = process.env.NEWS_API_KEY;
async function getPaginatedNews(req, res) {
  const { page = 1, limit = 10 } = req.query;

  try {
    const url = `https://newsapi.org/v2/everything?pageSize=${limit}&page=${page}&apiKey=${API_KEY}&q=cricket`;
    const redisData = await redisClient.get(url);
    if (redisData) {
      const cachedResponse = JSON.parse(redisData);
      return res.status(200).json({ data: cachedResponse });
    }
    const response = await axios.get(url);

    const news = response.data;

    await redisClient.set(url, JSON.stringify(news), "EX", 60 * 60 * 5);

    res.status(200).json({ data: news });
  } catch (err) {
    console.error("Error fetching news:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  getPaginatedNews,
};
