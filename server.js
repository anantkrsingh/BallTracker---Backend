const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mongoose = require("mongoose");
const configRouter = require("./routes/config");
const teamsRouter = require("./routes/team");
const playersRouter = require("./routes/player");
const redisClient = require("./redis");
const setupWebSocketEvents = require("./websocket/events");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
require("./redis");
require("./controllers/players");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

app.use("/api/config", configRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/players", playersRouter);

app.use("/api/auth", async (req, res) => {
  const appSig = req.headers["x-app-signature"];

  console.log(appSig);

  if (!appSig || appSig !== process.env.APP_SHA) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const secret = process.env.APP_SHA;

  const token = jwt.sign({ token: uuidv4() }, secret, { expiresIn: "2h" });

  const homepage = await redisClient.get("homepage");
  const series = await redisClient.get("series");

  return res
    .status(200)
    .json({
      token,
     
    });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const startServer = async () => {
  try {
    await mongoose.connect("mongodb://anant:anant@64.227.187.78:27017");
    console.log("Connected to MongoDB");

    setupWebSocketEvents(wss);

    require("./loopers/homepage");

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
