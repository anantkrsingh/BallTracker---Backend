# Express WebSocket Prototype

A simple prototype demonstrating Express with WebSocket support.

## Features

- Express HTTP server
- WebSocket server using the `ws` package
- Simple chat-like interface
- Automatic reconnection on disconnect

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

- The application provides a simple chat interface
- Type messages in the input field and press Enter or click Send
- Messages will be echoed back by the server
- The connection status is displayed in the messages area
- The client automatically reconnects if the connection is lost

## Project Structure

- `server.js` - Main server file with Express and WebSocket setup
- `public/index.html` - Client-side interface
- `package.json` - Project configuration and dependencies 