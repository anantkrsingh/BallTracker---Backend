const PlayerRankings = require("../models/playerRankings");
const TeamRankings = require("../models/teamRankings");
const getRankings = async (req, res) => {
  const { style, rankingType = "Men", type } = req.query;
  const rankings = await PlayerRankings.find({ style, rankingType, type })
    .populate({
      path: "player",
      select: "image",
    })
    .sort({ rating: -1 });
  res.status(200).json({
    data: rankings,
  });
};

const getTeamRankings = async (req, res) => {
  const { rankingType = "Men", type = "Test" } = req.query;
  console.log(rankingType, type);
  const rankings = await TeamRankings.find({
    style: "Teams",
    rankingType,
    type,
  })
    .populate({
      path: "team",
      select: "image_path",
    })
    .sort({ rating: -1 });
  res.status(200).json({
    data: rankings,
  });
};
module.exports = { getRankings, getTeamRankings };
