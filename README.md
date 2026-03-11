<p align="center">
  <img src="frontend/public/logo.svg" width="80" alt="Personal Server Logo" />
</p>

<h1 align="center">Personal Server</h1>

<p align="center">
  A self-hosted personal data platform that consolidates fitness, music, habits, and financial data into a unified dashboard.
</p>

<p align="center">
  <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-9.x-red?style=flat&logo=nestjs" alt="NestJS" /></a>
  <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18.x-blue?style=flat&logo=react" alt="React" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16-blue?style=flat&logo=postgresql" alt="PostgreSQL" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-4.x-blue?style=flat&logo=typescript" alt="TypeScript" /></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker" alt="Docker" /></a>
</p>

---

## Features

### Workout Tracking
- Import data from **FitNotes** (SQLite)
- Track workout sessions, exercises, sets, and reps
- Monitor bodyweight over time
- Create and manage workout routines

### Music Analytics
- **Spotify integration** with OAuth linking
- Track listening history and streams
- View top tracks, artists, and albums
- Analytics per day/hour with customizable timeframes

### Habits Tracking
- Import data from **HabitShare** (CSV)
- Track daily habits with success/fail/skip status
- Streak calculations and calendar view

### Finance Tracking
- Import data from **Cashew** (JSON export)
- Track transactions across multiple wallets
- Category management with icons and subcategories
- Period-based dashboard (week/month/year/all time)
- Add, edit, and delete transactions
- Month-by-month navigation with summary

### AI Copilot
- Chat interface with cross-domain context
- Ask questions about your data in plain language
- Agent API with scoped API keys for external integrations

### Security
- JWT-based authentication with refresh tokens
- Multi-factor authentication (MFA/TOTP)
- Multi-user support with per-account data isolation
- Agent API keys with granular scopes

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 9, TypeORM, PostgreSQL 16, Redis 7 |
| **Frontend** | React 18, Vite 5, Chart.js, React Router 6 |
| **Infra** | Docker Compose, Nginx, Vercel (frontend), Render (backend) |
| **Real-time** | Socket.IO, @nestjs/schedule for cron jobs |

---

## Quick Start

### Prerequisites
- Node.js 22.x
- Docker and Docker Compose (for local database)

### Development

```bash
# Clone
git clone https://github.com/Adrian-Luerssen/Personal-Server.git
cd Personal-Server

# Start database
docker-compose up -d postgres redis

# Backend
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run typeorm:migrate:run
npm run start:dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api

### Production

```bash
docker-compose up -d
```

---

## Project Structure

```
Personal-Server/
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── system/          # Auth, accounts, Spotify OAuth
│   │   ├── music/           # Music/streaming module
│   │   ├── workout/         # Workout tracking module
│   │   ├── habits/          # Habits tracking module
│   │   ├── finance/         # Finance tracking module
│   │   ├── agents/          # Agent API authentication
│   │   ├── api/v1/          # Versioned API for agents
│   │   ├── chat/            # AI copilot chat
│   │   ├── dashboard/       # Cross-domain analytics
│   │   └── migrations/      # TypeORM migrations
│   └── Dockerfile
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/      # Shared components
│   │   ├── pages/           # Route pages
│   │   └── contexts/        # React contexts
│   └── Dockerfile
├── initdb/                  # Database initialization scripts
├── docs/                    # Documentation
└── docker-compose.yml
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `JWT_KEY` | Secret key for JWT signing |
| `DATABASE_URL` | PostgreSQL connection string |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |
| `SPOTIFY_REDIRECT_URI` | OAuth callback URL |

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Development Guide](docs/DEVELOPMENT.md)

---

## License

MIT

---

Built with care for personal data ownership.
