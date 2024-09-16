const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

// WebSocket server
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ message: "Welcome to the Wordle game!" }));
});

// WebSocket broadcast to all clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = broadcast;