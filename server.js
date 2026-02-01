const WebSocket = require("ws");
const http = require("http");

const PORT = process.env.PORT || 3000;

// Create HTTP server (REQUIRED for Render)
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Pistol Duel Server Running");
});

// Attach WebSocket to HTTP server
const wss = new WebSocket.Server({ server });

let players = [];

wss.on("connection", (ws) => {
  console.log("Player connected");

  if (players.length >= 2) {
    ws.send(JSON.stringify({ type: "FULL" }));
    ws.close();
    return;
  }

  players.push(ws);
  ws.playerId = players.length;

  ws.send(JSON.stringify({
    type: "INIT",
    playerId: ws.playerId
  }));

  if (players.length === 2) {
    players.forEach(p =>
      p.send(JSON.stringify({ type: "START" }))
    );
  }

  ws.on("message", (message) => {
    players.forEach(p => {
      if (p !== ws && p.readyState === WebSocket.OPEN) {
        p.send(message.toString());
      }
    });
  });

  ws.on("close", () => {
    console.log("Player disconnected");
    players = players.filter(p => p !== ws);

    players.forEach(p =>
      p.send(JSON.stringify({ type: "RESET" }))
    );
  });
});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
