const { verifyToken } = require('../utils/verifier');
const redisClient = require('../redis');
const startDataFetching = require('../loopers/homepage');

const connectedUsers = new Map();
const rooms = new Map();

const setupWebSocketEvents = (wss) => {
    startDataFetching(wss);

    wss.on('connection', (ws, req) => {
        console.log('New client connected');
        let currentUser = null;

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                console.log(data);

                if (data.type === 'auth' && data.token) {
                    try {
                        const token = verifyToken(data.token);

                        if (token) {
                            currentUser = token;
                            connectedUsers.set(token, ws);
                            const homepage = await redisClient.get('homepage');
                            const series = await redisClient.get('series');
                            ws.send(JSON.stringify({
                                type: 'auth_success',
                                message: 'Authentication successful',
                                homepage: homepage
                            }));
                            ws.send(JSON.stringify({
                                type: 'series_list',
                                message: 'Series fetched successfully',
                                series: series
                            }));
                        } else {
                            ws.send(JSON.stringify({
                                type: 'auth_error',
                                message: 'Invalid token'
                            }));
                            ws.close();
                        }
                    } catch (error) {
                        console.log(error);
                        ws.send(JSON.stringify({
                            type: 'auth_error',
                            message: 'Token verification failed'
                        }));
                        ws.close();
                    }
                }

            } catch (error) {
                console.error('Error processing message:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format'
                }));
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            if (currentUser) {
                rooms.forEach((users, roomId) => {
                    if (users.has(currentUser)) {
                        users.delete(currentUser);
                    }
                });
                connectedUsers.delete(currentUser);
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            if (currentUser) {
                rooms.forEach((users, roomId) => {
                    if (users.has(currentUser)) {
                        users.delete(currentUser);
                    }
                });
                connectedUsers.delete(currentUser);
            }
        });
    });
};

// setInterval(() => {
// console.log(connectedUsers.size)
// }, 100);




module.exports = setupWebSocketEvents;
