# Docker / Docker Compose

Use the complete [Firebase + MongoDB Atlas setup guide](./SETUP.md) before running this application. The backend now **requires** a Mongo Atlas URI, Firebase Admin credentials, and an exact allowed browser origin; Compose has no embedded database password or credential fallback.

## Start

1. Create a root `.env` from [`.env.example`](./.env.example).
2. Set `MONGO_URI`, Firebase Admin server credentials, the public Firebase Web app settings, and `CLIENT_ORIGINS` to the exact frontend origin users will open. Keep Admin private keys only on the backend.
3. From the project root:

```bash
docker compose up --build
```

4. Open `http://localhost:5173` locally. The backend is not published on the host; the frontend's Nginx routes `/api/` and authenticated `/socket.io/` traffic to it. The proxied health endpoint is `http://localhost:5173/api/health`.

## Operations

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
```

Do not use `docker compose down -v` unless you intentionally want to remove associated volumes. Before production use, set TLS at the public reverse proxy, configure narrow Mongo Atlas network access instead of `0.0.0.0/0`, provision only intended staff accounts, and rehearse migrations against a backup or staging database. See [SETUP.md](./SETUP.md) for the full details.
