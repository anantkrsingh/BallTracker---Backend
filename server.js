const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const configRouter = require('./routes/config');
const setupWebSocketEvents = require('./websocket/events');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
require("./loopers/homepage");
require("./redis");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

mongoose.connect('mongodb://localhost:27017/ballt', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(express.static('public'));

app.use('/api/config', configRouter);

app.use("/api/auth", (req, res) => {
    const appSig = req.headers['x-app-signature'];

    if (!appSig || appSig !== process.env.APP_SHA) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const secret = process.env.APP_SHA;

    const token = jwt.sign({ token: uuidv4() }, secret, { expiresIn: '2h' });

    return res.status(200).json({ token })
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

setupWebSocketEvents(wss);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



