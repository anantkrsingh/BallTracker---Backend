const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const Player = require("./models/newPlayer");

async function getPlayerData(id, team) {
  const form = new FormData();
  form.append("player_id", id);
  const response = await axios.post(
    "https://apicricketchampion.in/apiv3/playerInfo/82661a627e89c54e9e129b36ffd1b0e6",
    form,
    {
      headers: form.getHeaders(),
    }
  );

  const playerData = response.data.data;

  const dbPlayer = await Player.findOne({ player_id: id });

  if (!dbPlayer) {
    console.log("Player not found " + id);
    const newPlayer = {
      ...playerData.player,
      teams: [team],
      batting_career: playerData.batting_career,
      bowling_career: playerData.batting_career,
    };
    await Player.create(newPlayer);
    console.log("New player saved " + id);
    return;
  }
  if (dbPlayer?.teams && Array.isArray(dbPlayer.teams)) {
    const cleanedTeams = [...new Set(dbPlayer.teams.filter(Boolean))];
    dbPlayer.teams = cleanedTeams;
    await dbPlayer.save();
  }

  if (!dbPlayer.teams.includes(team)) {
    dbPlayer.teams.push(team);
    await dbPlayer.save();
  }

  console.log(dbPlayer.teams);
}

async function getSeriesSquadData(id) {
  const form = new FormData();
  form.append("series_id", id);
  const response = await axios.post(
    "https://apicricketchampion.in/apiv3/squadsBySeriesId/82661a627e89c54e9e129b36ffd1b0e6",
    form,
    {
      headers: form.getHeaders(),
    }
  );
  console.log(response.data);
  const seriesData = response.data.data;
  const filePath = path.join(__dirname + "/images.txt");
  for (squad of seriesData) {
    const imageUrl = squad.team.flag;
    if (!imageUrl.includes("ui-avatars.com")) {
      fs.appendFile(filePath, `${imageUrl},`, "utf8", (err) => {
        if (err) {
          // console.error("Error writing to the file:", err);
          // console.log("Saving to:", filePath);
        } else {
          // console.log("Saving to:", filePath);
          // console.log("Text successfully written/appended to file.");
        }
      });
    }

    for (player of squad.player) {
      const imageUrl = player.image;
      await getPlayerData(player.player_id, squad.team.name);
      if (!imageUrl.includes("ui-avatars.com")) {
        fs.appendFile(filePath, `${imageUrl},`, "utf8", (err) => {
          if (err) {
            //   console.error("Error writing to the file:", err);
          } else {
            //   console.log("Text successfully written/appended to file.");
          }
        });
      }
    }
  }

  console.log(seriesData);
}

async function startFetching() {
  // getPlayers();
  const response = await axios.get(
    "https://apicricketchampion.in/apiv3/seriesList/82661a627e89c54e9e129b36ffd1b0e6"
  );
  const seriesList = response.data.data;

  for (series of seriesList) {
    console.log(series.series_id);
    await getSeriesSquadData(series.series_id);
  }
}

async function start() {
  const response = await axios.get(
    "https://apicricketchampion.in/apiv3/homeList/82661a627e89c54e9e129b36ffd1b0e6"
  );
  const seriesList = response.data.data;

  for (series of seriesList) {
    console.log(series.series_id);
    await getSeriesSquadData(series.series_id);
  }
}

async function getPlayers() {
  const players = await Player.find();

  players.forEach(async (player) => {
    await getPlayerData(player.player_id, null);
  });
}

module.exports = {
  startFetching,
};
