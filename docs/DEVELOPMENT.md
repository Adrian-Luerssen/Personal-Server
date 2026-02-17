# 🛠️ Development Guide

This guide covers setting up the development environment, code conventions, and how to extend the Personal Server.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Code Conventions](#code-conventions)
- [Adding New Modules](#adding-new-modules)
- [Database Migrations](#database-migrations)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Issues](#common-issues)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 22.x | JavaScript runtime |
| npm/pnpm | Latest | Package manager |
| Docker | Latest | Container runtime |
| Docker Compose | Latest | Multi-container orchestration |
| Git | Latest | Version control |

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript Importer
  - NestJS Snippets
- **DBeaver** or **pgAdmin** for database management
- **Postman** or **Insomnia** for API testing

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Personal-Server.git
cd Personal-Server
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.dev

# Edit .env.dev with your settings
```

**Required environment variables:**

```env
# Database
DATABASE_URL=postgres://myuser:mypassword@localhost:5432/mydatabase

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_KEY=your-super-secret-jwt-key-change-this

# Spotify OAuth (optional)
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback

# Root credentials (for initial admin)
USER_ROOT_CREDENTIALS=password
```

### 4. Run Migrations

```bash
# Run all pending migrations
npm run typeorm:migrate:run
```

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
# Runs on http://localhost:3000
# Swagger UI at http://localhost:3000/api
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### Production Mode (Docker)

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Useful Commands

```bash
# Backend
npm run start:dev      # Development with hot reload
npm run start:debug    # Debug mode
npm run build          # Build for production
npm run lint           # Run ESLint
npm run format         # Format with Prettier
npm run test           # Run tests
npm run test:e2e       # Run E2E tests

# Frontend
npm run dev            # Development server
npm run build          # Production build
npm run preview        # Preview production build

# Database
npm run typeorm:migrate:gen ./src/migrations/MigrationName  # Generate migration
npm run typeorm:migrate:run   # Run migrations
```

---

## Project Structure

### Backend Structure

```
backend/
├── src/
│   ├── app.module.ts          # Root module
│   ├── main.ts                # Entry point
│   ├── dataSource.ts          # TypeORM configuration
│   │
│   ├── system/                # Core system functionality
│   │   ├── auth/              # Authentication
│   │   ├── accounts/          # User accounts
│   │   ├── spotify/           # Spotify OAuth
│   │   └── common/            # Shared utilities
│   │
│   ├── music/                 # Music module
│   │   ├── artists/
│   │   ├── albums/
│   │   ├── tracks/
│   │   ├── streams/
│   │   └── playlists/
│   │
│   ├── workout/               # Workout module
│   │   ├── categories/
│   │   ├── exercises/
│   │   ├── sessions/
│   │   ├── sets/
│   │   ├── bodyweight/
│   │   ├── routines/
│   │   └── import/
│   │
│   ├── habits/                # Habits module
│   │   ├── entities/
│   │   ├── habits/
│   │   ├── entries/
│   │   └── import/
│   │
│   ├── dashboard/             # Cross-domain analytics
│   ├── health/                # Health checks
│   ├── migrations/            # TypeORM migrations
│   └── utils/                 # Utility functions
│
├── test/                      # E2E tests
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.jsx               # Entry point
│   ├── App.jsx                # Root component
│   ├── api.js                 # API client
│   ├── auth.js                # Auth utilities
│   ├── config.js              # Configuration
│   │
│   ├── components/            # Shared components
│   │   ├── Layout.jsx
│   │   ├── AuthGuard.jsx
│   │   └── ...
│   │
│   ├── contexts/              # React contexts
│   │   └── ThemeContext.jsx
│   │
│   ├── pages/                 # Route pages
│   │   ├── Landing.jsx
│   │   ├── Home.jsx
│   │   ├── Profile.jsx
│   │   ├── Auth/
│   │   ├── Spotify/
│   │   └── Workout/
│   │
│   └── styles.css             # Global styles
│
├── public/
├── index.html
├── vite.config.js
└── package.json
```

---

## Code Conventions

### TypeScript / NestJS

#### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `WorkoutSession` |
| Interfaces | PascalCase with `I` prefix | `IWorkoutService` |
| Functions | camelCase | `getActiveSession()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Files | kebab-case | `workout-session.entity.ts` |
| Directories | kebab-case | `workout-sessions/` |

#### Entity Pattern

All user-owned entities must extend `AbstractAccountOwnedEntity`:

```typescript
import { Entity, Column, Index } from 'typeorm';
import { AbstractAccountOwnedEntity } from '../../system/common/AbstractAccountOwnedEntity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
@Index(['accountId', 'date'])  // Common index pattern
export class MyEntity extends AbstractAccountOwnedEntity {
  @ApiProperty({ description: 'Field description' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ description: 'Optional field', required: false })
  @Column({ type: 'text', nullable: true })
  notes?: string;
}
```

#### Service Pattern

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MyEntity } from './my-entity.entity';
import { Account } from '../../system/accounts/account.entity';

@Injectable()
export class MyService {
  constructor(
    @InjectRepository(MyEntity)
    private readonly repo: Repository<MyEntity>,
  ) {}

  async findAll(account: Account): Promise<MyEntity[]> {
    return this.repo.find({
      where: { accountId: account.id },
      order: { createdAt: 'DESC' },
    });
  }

  async create(account: Account, data: Partial<MyEntity>): Promise<MyEntity> {
    const entity = this.repo.create({
      ...data,
      accountId: account.id,
    });
    return this.repo.save(entity);
  }
}
```

#### Controller Pattern

```typescript
import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MyService } from './my.service';
import { ReqUser } from '../../system/auth/auth.decorator';
import { Account } from '../../system/accounts/account.entity';

@ApiTags('My Module')
@ApiBearerAuth('access-token')
@Controller('my-module')
export class MyController {
  constructor(private readonly service: MyService) {}

  @Get()
  @ApiOperation({ summary: 'List all items' })
  async findAll(@ReqUser() account: Account) {
    return this.service.findAll(account);
  }

  @Post()
  @ApiOperation({ summary: 'Create new item' })
  async create(
    @ReqUser() account: Account,
    @Body() body: { name: string; notes?: string },
  ) {
    return this.service.create(account, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item by ID' })
  async findOne(
    @ReqUser() account: Account,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(account, id);
  }
}
```

### React / Frontend

#### Component Pattern

```jsx
import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/my-endpoint');
      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="my-component">
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

---

## Adding New Modules

### Step 1: Create Entity

```bash
# Create directory structure
mkdir -p backend/src/my-module/entities
```

Create `backend/src/my-module/entities/my-entity.entity.ts`:

```typescript
import { Entity, Column, Index } from 'typeorm';
import { AbstractAccountOwnedEntity } from '../../system/common/AbstractAccountOwnedEntity';

@Entity()
export class MyEntity extends AbstractAccountOwnedEntity {
  @Column()
  name: string;
}
```

### Step 2: Create Service

Create `backend/src/my-module/my.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MyEntity } from './entities/my-entity.entity';

@Injectable()
export class MyService {
  constructor(
    @InjectRepository(MyEntity)
    private readonly repo: Repository<MyEntity>,
  ) {}

  // Add methods...
}
```

### Step 3: Create Controller

Create `backend/src/my-module/my.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MyService } from './my.service';

@ApiTags('My Module')
@ApiBearerAuth('access-token')
@Controller('my-module')
export class MyController {
  constructor(private readonly service: MyService) {}

  // Add endpoints...
}
```

### Step 4: Create Module

Create `backend/src/my-module/my.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MyEntity } from './entities/my-entity.entity';
import { MyService } from './my.service';
import { MyController } from './my.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MyEntity])],
  providers: [MyService],
  controllers: [MyController],
  exports: [MyService],
})
export class MyModule {}
```

### Step 5: Register in AppModule

Edit `backend/src/app.module.ts`:

```typescript
import { MyModule } from './my-module/my.module';

@Module({
  imports: [
    // ... existing imports
    MyModule,
  ],
})
export class AppModule {}
```

### Step 6: Generate Migration

```bash
npm run typeorm:migrate:gen ./src/migrations/AddMyEntity
npm run typeorm:migrate:run
```

---

## Database Migrations

### Generate Migration

After changing entities:

```bash
npm run typeorm:migrate:gen ./src/migrations/DescriptiveName
```

### Run Migrations

```bash
# Development
npm run typeorm:migrate:run

# Production
npm run typeorm:migrate:run:prod
```

### Revert Migration

```bash
npm run typeorm:migration:revert
```

### Migration Best Practices

1. **Always review generated migrations** before running
2. **Use descriptive names**: `AddWorkoutSets`, `AddIndexToStreams`
3. **Test migrations** on a copy of production data
4. **Never modify** already-run migrations

---

## Testing

### Run Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

### Writing Tests

```typescript
// my.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MyEntity } from './entities/my-entity.entity';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: getRepositoryToken(MyEntity),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

---

## Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Backend",
      "port": 9229,
      "restart": true
    }
  ]
}
```

Run backend in debug mode:

```bash
npm run start:debug
```

### Database Queries

Enable TypeORM query logging in development:

```typescript
// dataSource.ts
export const AppDataSource = new DataSource({
  // ...
  logging: process.env.NODE_ENV === 'development',
});
```

---

## Common Issues

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Database Connection Failed

1. Check if PostgreSQL is running: `docker-compose ps`
2. Verify DATABASE_URL in `.env.dev`
3. Check network connectivity

### Migration Errors

```bash
# Drop and recreate database (DEVELOPMENT ONLY)
npm run typeorm:migrate:drop
npm run typeorm:migrate:run
```

### TypeScript Compilation Errors

```bash
# Clear build cache
rm -rf dist/
npm run build
```

### Node Module Issues

```bash
# Clear and reinstall
rm -rf node_modules/
rm package-lock.json
npm install
```

---

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation

### Commit Messages

Follow conventional commits:

```
feat: add workout session tracking
fix: correct stream count calculation
docs: update API documentation
refactor: simplify auth middleware
```

---

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
