const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

// WebSocket server
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ message: "Welcome to the Wordle game!" }));
});

module.exports = wss;