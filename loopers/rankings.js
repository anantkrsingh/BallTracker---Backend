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
  model: "gemini-2.5-pro",
  temperature: 0,
  apiKey:
    process.env.GOOGLE_API_KEY || `AIzaSyCqb0NIA63NtjEUjJBf_fCjbZYuRwJyVVw`,
});

async function rankings(html) {
  const formattedPrompt = await prompt.format({
    html: html,
    format_instructions: parser.getFormatInstructions(),
  });

  const response = await model.invoke(formattedPrompt);
  const data = parser.parse(response.content);
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
    for (const team of data[format]) {
      const teamObj = await Team.findOne({
        name: { $regex: new RegExp(`^${team.Team}$`, "i") },
      });
      const teamRanking = {
        style: style,
        rankingType: rankingType,
        team: teamObj?._id,
        name: team.Team,
        rating: team.Rating,
        points: team.Points,
        position: team.Position,
        type: format,
      };
      const rankings = await TeamRankings.updateOne(
        {
          // team: teamObj?._id,
          type: format,
          rankingType: rankingType,
          name: team.Team,
          position: team.Position,
        },
        teamRanking,
        { upsert: true }
      );
    }
  }
}
async function saveRankings(data, style, rankingType) {
  const formats = Object.keys(data);

  for (const format of formats) {
    for (const player of data[format]) {
      let playerObj = await PlayerNew.findOne({
        name: new RegExp(`^${player.Player}$`, "i"),
      });
      if (!playerObj) {
        const newPlayerId = uuidv4();
        playerObj = await PlayerNew.create({
          player_id: newPlayerId,
          name: player.Player,
          country: player.Country,
        });
        console.log(
          `Created new player: ${player.Player} (ID: ${newPlayerId})`
        );
      }

      const playerRanking = {
        style: style,
        rankingType: rankingType,
        player: playerObj?._id,
        name: player.Player,
        rating: player.Rating,
        country: player.Country,
        position: player.Position,
        type: format,
        position: player.Position,
      };

      await PlayerRankings.updateOne(
        {
          type: format,
          rankingType: rankingType,
          country: player.Country,
          position: player.Position,
        },
        { $set: playerRanking },
        { upsert: true }
      );
    }
  }
}

(async () => {
  const html = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/men/batting"
  );
  const womenBatting = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/women/batting"
  );
  const htmlBowling = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/men/bowling"
  );
  const womenBowling = await axios.get(
    "https://www.cricbuzz.com/cricket-stats/icc-rankings/women/bowling"
  );
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
  const data = await rankings(html.data);
  const dataBowling = await rankings(htmlBowling.data);
  const dataAllRounder = await rankings(allRounder.data);
  const dataTeams = await teamRankings(teams.data);
  const dataWomenBatting = await rankings(womenBatting.data);
  console.log("Women batting rankings " + JSON.stringify(dataWomenBatting));
  const dataWomenBowling = await rankings(womenBowling.data);
  const dataWomenAllRounder = await rankings(womenAllRounder.data);

  const dataWomenTeams = await teamRankings(womenTeams.data);

  await saveRankings(dataWomenBatting, "Batting", "Women");
  await saveRankings(dataWomenBowling, "Bowling", "Women");
  await saveRankings(dataWomenAllRounder, "All Rounder", "Women");
  await saveTeamRankings(dataWomenTeams, "Teams", "Women");
  await saveRankings(data, "Batting", "Men");
  await saveRankings(dataBowling, "Bowling", "Men");
  await saveRankings(dataAllRounder, "All Rounder", "Men");
  await saveTeamRankings(dataTeams, "Teams", "Men");
})();
