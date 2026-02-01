const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Create HTTP server to serve the game
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(__dirname, 'game.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading game');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Game rooms management
const rooms = new Map();
let waitingPlayer = null;

class GameRoom {
    constructor(player1, player2) {
        this.id = Math.random().toString(36).substring(7);
        this.players = {
            player1: {
                ws: player1,
                x: 100,
                y: 300,
                baseX: 100,
                baseY: 300,
                angle: 0,
                health: 100,
                ammo: 6,
                velX: 0,
                velY: 0,
                recoilOffsetX: 0,
                recoilOffsetY: 0,
                recoilVelX: 0,
                recoilVelY: 0,
                recoilAngle: 0,
                ready: false
            },
            player2: {
                ws: player2,
                x: 700,
                y: 300,
                baseX: 700,
                baseY: 300,
                angle: Math.PI,
                health: 100,
                ammo: 6,
                velX: 0,
                velY: 0,
                recoilOffsetX: 0,
                recoilOffsetY: 0,
                recoilVelX: 0,
                recoilVelY: 0,
                recoilAngle: 0,
                ready: false
            }
        };
        this.gameStarted = false;
        this.bullets = [];
    }

    broadcast(message) {
        const data = JSON.stringify(message);
        this.players.player1.ws.send(data);
        this.players.player2.ws.send(data);
    }

    sendTo(playerId, message) {
        const data = JSON.stringify(message);
        this.players[playerId].ws.send(data);
    }

    getPlayerRole(ws) {
        if (this.players.player1.ws === ws) return 'player1';
        if (this.players.player2.ws === ws) return 'player2';
        return null;
    }

    handlePlayerInput(playerId, input) {
        const player = this.players[playerId];
        
        if (input.type === 'move') {
            player.velX = input.velX;
            player.velY = input.velY;
            player.baseX = input.baseX;
            player.baseY = input.baseY;
        } else if (input.type === 'aim') {
            player.angle = input.angle;
        } else if (input.type === 'shoot') {
            if (player.ammo > 0) {
                player.ammo--;
                
                // Create bullet
                this.bullets.push({
                    id: Math.random().toString(36),
                    x: input.bulletX,
                    y: input.bulletY,
                    angle: input.angle,
                    isPlayer1: playerId === 'player1',
                    active: true
                });

                // Apply recoil
                player.recoilVelX = input.recoilVelX;
                player.recoilVelY = input.recoilVelY;

                // Broadcast shoot event
                this.broadcast({
                    type: 'playerShoot',
                    playerId: playerId,
                    bulletX: input.bulletX,
                    bulletY: input.bulletY,
                    angle: input.angle,
                    ammo: player.ammo
                });

                // Check if reload needed
                if (player.ammo <= 0) {
                    setTimeout(() => {
                        player.ammo = 6;
                        this.broadcast({
                            type: 'playerReload',
                            playerId: playerId,
                            ammo: 6
                        });
                    }, 2000);
                }
            }
        } else if (input.type === 'hit') {
            const otherPlayerId = playerId === 'player1' ? 'player2' : 'player1';
            const otherPlayer = this.players[otherPlayerId];
            otherPlayer.health -= 20;

            this.broadcast({
                type: 'playerHit',
                playerId: otherPlayerId,
                health: otherPlayer.health
            });

            // Check for game over
            if (otherPlayer.health <= 0) {
                this.broadcast({
                    type: 'gameOver',
                    winner: playerId
                });
                this.gameStarted = false;
            }
        } else if (input.type === 'ready') {
            player.ready = true;
            
            // Check if both players are ready
            if (this.players.player1.ready && this.players.player2.ready) {
                this.gameStarted = true;
                this.broadcast({
                    type: 'gameStart'
                });
            }
        }

        // Broadcast state update
        this.broadcastState();
    }

    broadcastState() {
        const state = {
            type: 'stateUpdate',
            player1: {
                x: this.players.player1.x,
                y: this.players.player1.y,
                baseX: this.players.player1.baseX,
                baseY: this.players.player1.baseY,
                angle: this.players.player1.angle,
                health: this.players.player1.health,
                ammo: this.players.player1.ammo,
                velX: this.players.player1.velX,
                velY: this.players.player1.velY
            },
            player2: {
                x: this.players.player2.x,
                y: this.players.player2.y,
                baseX: this.players.player2.baseX,
                baseY: this.players.player2.baseY,
                angle: this.players.player2.angle,
                health: this.players.player2.health,
                ammo: this.players.player2.ammo,
                velX: this.players.player2.velX,
                velY: this.players.player2.velY
            }
        };

        this.broadcast(state);
    }
}

wss.on('connection', (ws) => {
    console.log('New player connected');

    if (waitingPlayer === null) {
        // First player - put them in waiting
        waitingPlayer = ws;
        ws.send(JSON.stringify({ type: 'waiting', message: 'Waiting for opponent...' }));
    } else {
        // Second player - create game room
        const room = new GameRoom(waitingPlayer, ws);
        rooms.set(waitingPlayer, room);
        rooms.set(ws, room);

        // Notify both players
        room.sendTo('player1', {
            type: 'matched',
            role: 'player1',
            roomId: room.id
        });
        room.sendTo('player2', {
            type: 'matched',
            role: 'player2',
            roomId: room.id
        });

        waitingPlayer = null;
        console.log('Game room created:', room.id);
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const room = rooms.get(ws);

            if (room) {
                const playerId = room.getPlayerRole(ws);
                if (playerId) {
                    room.handlePlayerInput(playerId, data);
                }
            }
        } catch (err) {
            console.error('Error handling message:', err);
        }
    });

    ws.on('close', () => {
        console.log('Player disconnected');
        
        const room = rooms.get(ws);
        if (room) {
            // Notify other player
            room.broadcast({
                type: 'playerDisconnected',
                message: 'Opponent disconnected'
            });

            // Clean up room
            rooms.delete(room.players.player1.ws);
            rooms.delete(room.players.player2.ws);
        }

        if (waitingPlayer === ws) {
            waitingPlayer = null;
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('WebSocket server ready for connections');
});
