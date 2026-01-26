# Specificity

Layer-based geometry modeling and cradle-to-gate LCA workflows with real-time
analytics.

## Stack

- Frontend: Vite + React + TypeScript
- Backend: Node.js + Express + TypeScript
- Realtime: Socket.IO
- 3D Viewer: react-three-fiber + drei
- Workflow Canvas: React Flow
- State: Zustand
- Charts: Recharts
- Styling: CSS Modules

## Project Structure

- `client/` Vite React app
- `server/` Express + Socket.IO API
- `server/data/` seed datasets (materials + ECC)
- `server/saves/` saved project JSON

## Setup

```bash
npm install
```

### Fonts

Place `Proxima Nova` and `Bodoni` font files in
`client/src/assets/fonts/` to enable the intended typography. The UI will fall
back to system fonts if these files are missing.

## Development

```bash
npm run dev
```

### Ports

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

The client proxies `/api` and `/socket.io` to the server. On startup you will see
`Frontend running at ...` and `Backend running at ...` in the dev logs.

## API

- `GET /api/materials`
- `GET /api/ecc`
- `GET /api/saves`
- `GET /api/saves/:id`
- `POST /api/saves`

## Environment

Copy `.env.example` to `.env` at the repo root and adjust as needed:

```
SERVER_PORT=3001
CLIENT_PORT=5173
```

`SERVER_PORT` sets the backend port (and the Vite dev proxy target). `CLIENT_PORT`
sets the Vite dev server port (Vite will pick the next available port if it's
in use). Optional overrides for deployments: `VITE_API_BASE_URL` and
`VITE_SOCKET_URL`.
