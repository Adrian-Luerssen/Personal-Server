# 🏠 Personal Server

[![NestJS](https://img.shields.io/badge/NestJS-9.x-red?style=flat&logo=nestjs)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18.x-blue?style=flat&logo=react)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)

> A self-hosted personal data aggregation platform that consolidates your fitness, music, habits, and financial data into a unified dashboard.

![Personal Server Dashboard](docs/assets/screenshot-placeholder.png)

---

## ✨ Features

### 🏋️ Workout Tracking
- Import data from **FitNotes** (SQLite)
- Track workout sessions, exercises, sets, and reps
- Monitor bodyweight over time
- Create and manage workout routines
- Categories and exercise library management

### 🎵 Music Analytics
- **Spotify integration** with OAuth linking
- Track listening history and streams
- View top tracks, artists, and albums
- Analytics per day/hour with customizable timeframes
- Global and personal statistics

### 📊 Habits Tracking
- Import data from **HabitShare** (CSV)
- Track daily habits with success/fail/skip status
- Streak calculations (current and longest)
- Calendar view by month
- Success rate statistics

### 📈 Cross-Domain Dashboard
- Correlate Spotify listening during workouts
- Unified timeline view
- Multi-domain analytics

### 🔐 Security
- JWT-based authentication
- Multi-factor authentication (MFA/TOTP)
- Multi-user support with account segregation
- Per-account data isolation

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **NestJS 9** | Node.js framework |
| **TypeORM** | Database ORM |
| **PostgreSQL 16** | Primary database |
| **Redis 7** | Caching & job queues |
| **Socket.IO** | Real-time communication |
| **Swagger/OpenAPI** | API documentation |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Vite 5** | Build tool |
| **React Router 6** | Client-side routing |
| **Chart.js** | Data visualization |
| **Socket.IO Client** | Real-time updates |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker Compose** | Container orchestration |
| **Apache Airflow** | Workflow automation |
| **Nginx** | Frontend serving (production) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22.x
- **Docker** and **Docker Compose**
- **pnpm** or **npm**

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Personal-Server.git
   cd Personal-Server
   ```

2. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Setup the backend**
   ```bash
   cd backend
   cp .env.example .env.dev
   # Edit .env.dev with your configuration
   npm install
   npm run typeorm:migrate:run
   npm run start:dev
   ```

4. **Setup the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Swagger Docs: http://localhost:3000/api

### Production Deployment

```bash
# Build and start all services
docker-compose up -d

# Access
# Frontend: http://localhost:80
# Backend: http://localhost:3000
# Airflow: http://localhost:8080 (admin/admin)
```

---

## 📁 Project Structure

```
Personal-Server/
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── system/          # Auth, accounts, Spotify OAuth
│   │   ├── music/           # Music/streaming module
│   │   ├── workout/         # Workout tracking module
│   │   ├── habits/          # Habits tracking module
│   │   ├── dashboard/       # Cross-domain analytics
│   │   └── migrations/      # TypeORM migrations
│   └── Dockerfile
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/      # Shared components
│   │   ├── pages/           # Route pages
│   │   └── contexts/        # React contexts
│   └── Dockerfile
├── airflow/                 # Airflow DAGs and config
├── initdb/                  # Database initialization scripts
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEVELOPMENT.md
└── docker-compose.yml
```

---

## 📖 Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System design and module structure
- **[API Reference](docs/API.md)** - Complete API documentation
- **[Development Guide](docs/DEVELOPMENT.md)** - Setup and contribution guide

---

## 🗺️ Roadmap

- [x] Workout module with FitNotes import
- [x] Music module with Spotify integration
- [x] Habits module with HabitShare import
- [ ] Finance module with Cashew import
- [ ] Agent API (MCP + REST) for AI assistants
- [ ] Enhanced FitNotes import UX
- [ ] Mobile-responsive dashboard

---

## 📄 License

This project is private and proprietary.

---

## 🤝 Contributing

This is a personal project. For issues or suggestions, please open an issue.

---

Built with ❤️ for personal data ownership
