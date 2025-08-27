const axios = require("axios");
const { z } = require("zod");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StructuredOutputParser } = require("@langchain/core/output_parsers");
const PlayerRankings = require("../models/playerRankings");
const PlayerNew = require("../models/newPlayer");
const Team = require("../models/team");
const TeamRankings = require("../models/teamRankings");
const redisClient = require("../redis");
const Schema = z.object({
  Test: z.array(
    z.object({
      Position: z.number(),
      Player: z.string(),
      Rating: z.string(),
      Country: z.string(),
    })
  ),
  Odi: z.array(
    z.object({
      Position: z.number(),
      Player: z.string(),
      Rating: z.number(),
      Country: z.string(),
    })
  ),
  T20: z.array(
    z.object({
      Position: z.number(),
      Player: z.string(),
      Rating: z.number(),
      Country: z.string(),
    })
  ),
});
const TeamSchema = z.object({
  Test: z.array(
    z.object({
      Position: z.number(),
      Team: z.string(),
      Rating: z.number(),
      Points: z.string(),
    })
  ),
  Odi: z.array(
    z.object({
      Position: z.number(),
      Team: z.string(),
      Rating: z.string(),
      Points: z.string(),
    })
  ),
  T20: z.array(
    z.object({
      Position: z.number(),
      Team: z.string(),
      Rating: z.string(),
      Points: z.string(),
    })
  ),
});
const parser = StructuredOutputParser.fromZodSchema(Schema);
const teamParser = StructuredOutputParser.fromZodSchema(TeamSchema);
const teamPrompt = PromptTemplate.fromTemplate(
  `You are a smart AI agent that extracts structured JSON from HTML.

  You will be given a HTML table and you need to extract the data from the table and return it in the following format:

  --position of team --team name --rating of team --points--

  Respond only with valid JSON that matches this schema:
{format_instructions}

HTML:
{html}
`
);
const prompt = PromptTemplate.fromTemplate(
  `You are a smart AI agent that extracts structured JSON from HTML.

  You will be given a HTML table and you need to extract the data from the table and return it in the following format:

 --position of player --player name --rating of player --country--

  Respond only with valid JSON that matches this schema:
{format_instructions}

HTML:
{html}
`
);

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  apiKey:
    process.env.GOOGLE_API_KEY || `AIzaSyC7_P2LLw2D5Q5w79iJTAWSoSvK5nQTAEs`,
});

async function rankings(html) {
  const formattedPrompt = await prompt.format({
    html: html,
    format_instructions: parser.getFormatInstructions(),
  });
  console.log("Model invoked");

  const response = await model.invoke(formattedPrompt);
  const data = parser.parse(response.content);
  console.log("Got response from model");
  return data;
}
async function teamRankings(html) {
  const formattedPrompt = await teamPrompt.format({
    html: html,
    format_instructions: teamParser.getFormatInstructions(),
  });
  const response = await model.invoke(formattedPrompt);
  const data = teamParser.parse(response.content);
  return data;
}

async function saveTeamRankings(data, style, rankingType) {
  const formats = Object.keys(data);
  for (const format of formats) {
    const cacheKey = `teamRanking-${rankingType}-${format}`;
    const teams = [];
    for (const team of data[format]) {
      const teamObj = await Team.findOne({
        name: { $regex: new RegExp(`^${team.Team}$`, "i") },
      });
      const teamRanking = {
        style: style,
        rankingType: rankingType,
        team: {
          image: teamObj?.image_path,
          _id: teamObj?._id,
          id: teamObj?.id,
        },
        name: team.Team,
        rating: team.Rating,
        points: team.Points,
        position: team.Position,
        type: format,
      };
      console.log("Team ranking " + teamRanking);
      teams.push(teamRanking);
    }
    await redisClient.set(cacheKey, JSON.stringify(teams));
  }
}
async function saveRankings(data, style, rankingType) {
  const formats = Object.keys(data);

  for (const format of formats) {
    const cacheKey = `playerRanking${style}-${rankingType}-${format}`;
    const players = [];
    for (const player of data[format]) {
      let playerObj = await PlayerNew.findOne({
        name: new RegExp(`^${player.Player}$`, "i"),
      });

      const playerRanking = {
        style: style,
        rankingType: rankingType,
        player: {
          image: playerObj?.image,
          _id: playerObj?._id,
        },
        name: player.Player,
        rating: player.Rating,
        country: player.Country,
        position: player.Position,
        type: format,
        position: player.Position,
      };
      console.log("Player ranking " + playerRanking);

      players.push(playerRanking);
    }
    await redisClient.set(cacheKey, JSON.stringify(players));
  }
}

async function getRankings() {
  console.log("Fetching Rankings ");
  const html = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/men/batting"
  );
  console.log("Fetched men's batting");
  const womenBatting = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/women/batting"
  );
  console.log("Fetched women's batting");

  const htmlBowling = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/men/bowling"
  );
  console.log("Fetched men's batting");
  const womenBowling = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/women/bowling"
  );
  console.log("Fetched women's bowling");
  const allRounder = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/men/all-rounder"
  );
  const womenAllRounder = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/women/all-rounder"
  );
  const teams = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/men/teams"
  );
  const womenTeams = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/women/teams"
  );
  console.log("Fetched all data");
  const data = await rankings(html.data);
  await saveRankings(data, "Batting", "Men");
  console.log("Saved men's batting");

  const dataBowling = await rankings(htmlBowling.data);
  await saveRankings(dataBowling, "Bowling", "Men");

  const dataAllRounder = await rankings(allRounder.data);
  await saveRankings(dataAllRounder, "All Rounder", "Men");

  const dataTeams = await teamRankings(teams.data);
  await saveTeamRankings(dataTeams, "Teams", "Men");

  const dataWomenBatting = await rankings(womenBatting.data);
  await saveRankings(dataWomenBatting, "Batting", "Women");

  const dataWomenBowling = await rankings(womenBowling.data);
  await saveRankings(dataWomenBowling, "Bowling", "Women");

  const dataWomenAllRounder = await rankings(womenAllRounder.data);
  await saveRankings(dataWomenAllRounder, "All Rounder", "Women");

  const dataWomenTeams = await teamRankings(womenTeams.data);
  await saveTeamRankings(dataWomenTeams, "Teams", "Women");
}

async function runRankingsJob() {
  try {
    await getRankings();
  } catch (err) {
    console.error("Failed to fetch rankings", err);
  }

  setTimeout(runRankingsJob, 86400000);
}

module.exports = {
  runRankingsJob,
};
