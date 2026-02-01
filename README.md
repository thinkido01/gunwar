# Pistol Duel - Online PvP Multiplayer

A real-time multiplayer 2D pistol duel game where two players battle each other online!

## Features

- **Real-time PvP Combat** - Fight against another player in real-time
- **Automatic Matchmaking** - Connects two players automatically
- **Full Physics** - Recoil, wall bouncing, and realistic movement
- **Sound Effects** - Gunshot and reload sounds
- **WebSocket Communication** - Low-latency multiplayer

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Open Two Browser Windows

Open two browser tabs or windows and navigate to:
```
http://localhost:3000
```

### 4. Play!

- First player will see "Waiting for opponent..."
- Second player will be matched automatically
- Both players click "READY" to start
- Use WASD to move, mouse to aim, click to shoot

## Game Controls

**Player Controls:**
- `W/A/S/D` or `Arrow Keys` - Move your pistol
- `Mouse` - Aim
- `Left Click` - Shoot
- Reload is automatic when ammo runs out

## Game Mechanics

- **Health**: 100 HP (5 shots to eliminate)
- **Ammo**: 6 bullets per magazine
- **Reload Time**: 2 seconds (automatic)
- **Recoil**: Gun pushes back when firing
- **Wall Bouncing**: Guns bounce off screen edges

## Technical Details

- **Server**: Node.js with WebSocket (ws library)
- **Client**: HTML5 Canvas + JavaScript
- **Communication**: Real-time WebSocket messages
- **Physics**: Client-side prediction with server validation

## File Structure

```
pistol-duel-multiplayer/
├── server.js       # WebSocket server
├── game.html       # Game client
├── package.json    # Dependencies
└── README.md       # This file
```

## Network Architecture

- Players connect via WebSocket
- Server handles matchmaking (2 players per room)
- Game state synchronized in real-time
- Client-side physics with server authority on hits
- Bullet collision detection on both client and server

## Troubleshooting

**Can't connect?**
- Make sure the server is running (`npm start`)
- Check that port 3000 is not in use
- Try accessing `http://localhost:3000` directly

**Game feels laggy?**
- This is designed for local network play
- For internet play, consider adding interpolation and lag compensation

**Players not matching?**
- Refresh both browser windows
- Make sure both are connecting to the same server

## Future Enhancements

- [ ] Add more weapons
- [ ] Power-ups and pickups
- [ ] Multiple game modes
- [ ] Spectator mode
- [ ] Leaderboard
- [ ] Better networking (lag compensation)
- [ ] Mobile support

Enjoy the duel! 🔫
