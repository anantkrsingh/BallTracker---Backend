
const redis = require("../redis");


const getRankings = async (req, res) => {
  const { style, rankingType = "Men", type = "Odi" } = req.query;


  const cacheKey = `playerRanking${style}-${rankingType}-${type}`

  const data = await redis.get(cacheKey)


  res.status(200).json({
    data: JSON.parse(data),
  });
};

const getTeamRankings = async (req, res) => {

  const { rankingType = "Men", type = "Test" } = req.query;
  const cacheKey = `teamRanking-${rankingType}-${type}`

  const data = await redis.get(cacheKey)


  res.status(200).json({
    data: JSON.parse(data),
  });
};
module.exports = { getRankings, getTeamRankings };
