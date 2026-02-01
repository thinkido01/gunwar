const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

// IMPORTANT: use hosting port if available
const PORT = process.env.PORT || 3000;

/* =========================
   HTTP SERVER (Serve Game)
========================= */
const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/game.html") {
    fs.readFile(path.join(__dirname, "game.html"), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading game.html");
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

/* =========================
   WEBSOCKET SERVER
========================= */
const wss = new WebSocket.Server({ server });

let waitingPlayer = null;
const rooms = new Map();

/* =========================
   GAME ROOM CLASS
========================= */
class GameRoom {
  constructor(p1, p2) {
    this.players = {
      player1: this.createPlayer(p1, 100, 300, 0),
      player2: this.createPlayer(p2, 700, 300, Math.PI)
    };
    this.gameRunning = true;
  }

  createPlayer(ws, x, y, angle) {
    return {
      ws,
      x,
      y,
      angle,
      health: 100
    };
  }

  getRole(ws) {
    if (this.players.player1.ws === ws) return "player1";
    if (this.players.player2.ws === ws) return "player2";
    return null;
  }

  other(role) {
    return role === "player1" ? "player2" : "player1";
  }

  broadcast(data) {
    const msg = JSON.stringify(data);
    Object.values(this.players).forEach(p => {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(msg);
      }
    });
  }

  handleInput(role, data) {
    if (!this.gameRunning) return;

    const player = this.players[role];
    const enemy = this.players[this.other(role)];

    if (data.type === "move") {
      player.x = data.x;
      player.y = data.y;
      player.angle = data.angle;
    }

    if (data.type === "hit") {
      enemy.health -= 20;

      this.broadcast({
        type: "hit",
        player: this.other(role),
        health: enemy.health
      });

      if (enemy.health <= 0) {
        this.gameRunning = false;
        this.broadcast({
          type: "gameOver",
          winner: role
        });
      }
    }

    this.broadcast({
      type: "state",
      players: {
        player1: this.players.player1,
        player2: this.players.player2
      }
    });
  }
}

/* =========================
   CONNECTION HANDLER
========================= */
wss.on("connection", ws => {
  console.log("Player connected");

  if (!waitingPlayer) {
    waitingPlayer = ws;
    ws.send(JSON.stringify({ type: "waiting" }));
  } else {
    const room = new GameRoom(waitingPlayer, ws);
    rooms.set(waitingPlayer, room);
    rooms.set(ws, room);

    room.players.player1.ws.send(
      JSON.stringify({ type: "matched", role: "player1" })
    );
    room.players.player2.ws.send(
      JSON.stringify({ type: "matched", role: "player2" })
    );

    waitingPlayer = null;
    console.log("Room created");
  }

  ws.on("message", msg => {
    try {
      const data = JSON.parse(msg);
      const room = rooms.get(ws);
      if (!room) return;

      const role = room.getRole(ws);
      if (role) room.handleInput(role, data);
    } catch (e) {
      console.error("Invalid message", e);
    }
  });

  ws.on("close", () => {
    console.log("Player disconnected");
    const room = rooms.get(ws);

    if (room) {
      room.broadcast({ type: "opponentLeft" });
      rooms.delete(room.players.player1.ws);
      rooms.delete(room.players.player2.ws);
    }

    if (waitingPlayer === ws) waitingPlayer = null;
  });
});

/* =========================
   START SERVER
========================= */
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
