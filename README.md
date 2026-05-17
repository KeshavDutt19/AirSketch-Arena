<<<<<<< HEAD
# AirSketch Arena

A production-style real-time multiplayer drawing and guessing game inspired by Scribbl.io, built with React, Vite, TailwindCSS, Framer Motion, Express, Socket.IO, MongoDB, JWT auth, and MediaPipe hand tracking.

## Quick Start

```bash
npm install
cp .env.example server/.env
npm run dev
```

Client: `http://localhost:5173`  
Server: `http://localhost:5000`

## Project Structure

- `client/` - React + Vite app, canvas renderer, lobby/game screens, MediaPipe air drawing.
- `server/` - Express API, JWT auth, Socket.IO game server, MongoDB models.
- `server/src/game/` - authoritative in-memory room state, scoring, timers, word selection.
- `server/src/socket/` - socket authentication, room events, chat moderation, canvas sync.
- `client/src/hooks/` - reusable socket, canvas, and hand tracking hooks.
- `client/src/components/` - production UI pieces for lobby, game shell, tools, chat, leaderboard.

## Multiplayer Sync

The drawer emits compressed stroke deltas through Socket.IO. The server verifies turn ownership, applies rate limits, and relays drawing operations to room members. Chat guesses are sanitized and checked server-side against the secret word so clients never receive the full answer until the round ends.

## Hand Tracking System

The client uses MediaPipe Tasks Vision `HandLandmarker` against webcam frames. The index fingertip is mapped into canvas coordinates. A pinch between thumb and index finger begins drawing, while an open hand stops it. Coordinates pass through exponential smoothing and a low-pass noise gate before being converted into regular canvas stroke deltas, so mouse and air drawing share the same multiplayer sync path.

## Deployment

1. Create a MongoDB Atlas database and copy the connection string.
2. Deploy the backend to Render or Railway from the `server/` folder.
3. Set backend env vars: `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`.
4. Deploy the frontend to Vercel or Netlify from the `client/` folder.
5. Set frontend env var: `VITE_API_URL=https://your-backend.onrender.com`.
6. Set `CLIENT_ORIGIN=https://your-frontend.vercel.app` on the backend.

Room invite links use `/room/:code`, for example:

```text
https://your-frontend.vercel.app/room/ABCD12
```

`vercel.json` and `netlify.toml` include SPA rewrites so invite links open the React app correctly.

## Commands

```bash
npm install
npm run dev
npm run build --workspace client
npm run start --workspace server
```
=======
# AirSketch-Arena
AirSketch Arena is a real-time multiplayer drawing &amp; guessing game inspired by Scribbl.io. Built with React, Node.js, Socket.IO, and MongoDB, it features live canvas sync, room invites, leaderboards, rematches, chat, random word categories, and AI-powered hand-tracking drawing.
>>>>>>> 3d1f131258be79a43ba03f657d28bd507896567f
