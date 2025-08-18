const { verifyToken } = require("../utils/verifier");
const redisClient = require("../redis");
const startDataFetching = require("../loopers/homepage");
const { getLiveMatch, initializeLiveUpdates } = require("../loopers/live");
const { getSquads } = require("../loopers/info");
const Config = require("../models/config");
const { getMatchInfo } = require("../controllers/matches");

const connectedUsers = new Map();
const rooms = new Map();
const userRooms = new Map();

const setupWebSocketEvents = (wss) => {
  startDataFetching(wss);
  initializeLiveUpdates(wss);
  wss.rooms = rooms;

  wss.on("connection", (ws, req) => {
    console.log("New client connected");
    let currentUser = null;

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message);

        console.log(data);

        if (data.type === "auth" && data.token) {
          try {
            const token = verifyToken(data.token);
            if (token) {
              currentUser = token;
              connectedUsers.set(token, ws);
              const homepage = await redisClient.get("homepage");
              const series = await redisClient.get("series");

              let config = await redisClient.get("config");
              if (!config) {
                config = await Config.findOne({});
                await redisClient.set(
                  "config",
                  JSON.stringify(config),
                  "EX",
                  120
                );
              } else {
                config = JSON.parse(config);
              }
              ws.send(
                JSON.stringify({
                  type: "config",
                  message: "Config fetched successfully",
                  data: config,
                })
              );
              ws.send(
                JSON.stringify({
                  type: "auth_success",
                  message: "Authentication successful",
                  data: JSON.parse(homepage),
                })
              );
              ws.send(
                JSON.stringify({
                  type: "series_list",
                  message: "Series fetched successfully",
                  data: JSON.parse(series),
                })
              );
              if (currentUser && userRooms.has(currentUser)) {
                const previousRoomId = userRooms.get(currentUser);
                const previousRoom = rooms.get(previousRoomId);
                if (previousRoom) {
                  const index = previousRoom.indexOf(ws);
                  if (index > -1) {
                    previousRoom.splice(index, 1);
                  }
                  if (previousRoom.length === 0) {
                    rooms.delete(previousRoomId);
                  }
                }
              }
            } else {
              ws.send(
                JSON.stringify({
                  type: "auth_error",
                  message: "Invalid token",
                })
              );
              ws.close();
            }
          } catch (error) {
            console.log(error);
            ws.send(
              JSON.stringify({
                type: "auth_error",
                message: "Token verification failed",
              })
            );
            ws.close();
          }
        }

        if (data.type === "join_room" && data.token) {
          const { matchId } = data;
          try {
            if (currentUser && userRooms.has(currentUser)) {
              const previousRoomId = userRooms.get(currentUser);
              const previousRoom = rooms.get(previousRoomId);

              if (previousRoom) {
                console.log("User is already in a room");
                const index = previousRoom.indexOf(ws);
                if (index > -1) {
                  previousRoom.splice(index, 1);
                }
                if (previousRoom.length === 0) {
                  rooms.delete(previousRoomId);
                }
              }
            }

            console.log("New user joined room", matchId);

            let room = rooms.get(matchId);
            if (!room) {
              room = [];
              rooms.set(matchId, room);
            }

            if (!room.includes(ws)) {
              room.push(ws);
            }

            if (currentUser) {
              userRooms.set(currentUser, matchId);
            }

            const cacheData = await redisClient.get(matchId);
            const cacheKey = `match:${matchId}`;
            const cachedMatch = await redisClient.get(cacheKey);
            let match = cachedMatch ? JSON.parse(cachedMatch) : null;

            if (!match) {
              match = await getMatchInfo(matchId);
            }

            let parsedCache = null;

            if (cacheData) {
              try {
                parsedCache = JSON.parse(cacheData);
              } catch (err) {
                console.warn(
                  "Failed to parse Redis cache for match:",
                  matchId,
                  err
                );
              }
            }
            if (!parsedCache || !parsedCache.status) {
              const data = await getLiveMatch(matchId);
              ws.send(
                JSON.stringify({
                  type: "match_info" + matchId,
                  message: "Match info fetched successfully",
                  data: match,
                })
              );
              ws.send(
                JSON.stringify({
                  type: "live_match" + matchId,
                  message: "Live match data fetched successfully",
                  data: data,
                })
              );
            } else {
              ws.send(
                JSON.stringify({
                  type: "match_info" + matchId,
                  message: "Match info fetched successfully",
                  data: match,
                })
              );
              ws.send(
                JSON.stringify({
                  type: "live_match" + matchId,
                  message: "Live match data fetched successfully (from cache)",
                  data: parsedCache,
                })
              );
            }

            console.log("Live match data sent to user", matchId);
          } catch (error) {
            console.error("Error handling user join:", error);
          }
        }
        // if (data.type === "leave_room") {
        //   const { matchId } = data;
        //   if (currentUser && connectedUsers.has(currentUser)) {
        //     const room = rooms.get(matchId);
        //     if (room) {
        //       const index = room.indexOf(ws);
        //       if (index > -1) {
        //         room.splice(index, 1);
        //       }
        //       if (room.length === 0) {
        //         rooms.delete(matchId);
        //       }
        //     }

        //     connectedUsers.delete(currentUser);
        //   }
        // }
        if (data.type === "get_squads") {
          const { matchId } = data;

          let squadsData = await redisClient.get(`squads_${matchId}`);
          if (squadsData) {
            ws.send(
              JSON.stringify({
                type: "squads",
                message: "Squads fetched successfully",
                data: JSON.parse(squadsData),
              })
            );
          } else {
            squadsData = await getSquads(matchId);
            ws.send(
              JSON.stringify({
                type: "squads",
                message: "Squads fetched successfully",
                data: squadsData,
              })
            );
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      try {
        if (currentUser) {
          if (userRooms.has(currentUser)) {
            const roomId = userRooms.get(currentUser);
            const room = rooms.get(roomId);
            if (room) {
              const index = room.indexOf(ws);
              if (index > -1) {
                room.splice(index, 1);
              }
              if (room.length === 0) {
                rooms.delete(roomId);
              }
            }
            userRooms.delete(currentUser);
          }
          connectedUsers.delete(currentUser);
        }
      } catch (error) {
        console.log(error);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      if (currentUser) {
        if (userRooms.has(currentUser)) {
          const roomId = userRooms.get(currentUser);
          const room = rooms.get(roomId);
          if (room) {
            const index = room.indexOf(ws);
            if (index > -1) {
              room.splice(index, 1);
            }
            if (room.length === 0) {
              rooms.delete(roomId);
            }
          }
          userRooms.delete(currentUser);
        }
        connectedUsers.delete(currentUser);
      }
    });
  });
};

// setInterval(() => {
// console.log(connectedUsers.size)
// }, 100);

module.exports = setupWebSocketEvents;
