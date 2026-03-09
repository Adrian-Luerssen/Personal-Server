# UX Revamp & Platform Enhancement - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full platform refresh: personalization system, icon migration, Spotify OAuth frontend, async agent chat copilot, cinematic landing page, agent skill document, and comprehensive Playwright visual regression testing.

**Architecture:** Backend-first for new features (preferences, chat), then frontend foundation (icons, CSS tokens, theme upgrade), then page-by-page refresh, then testing. Each phase produces a working increment.

**Tech Stack:** NestJS 9, TypeORM, PostgreSQL, React 18, Vite, Lucide React, Playwright, pure CSS with CSS custom properties.

**Design Document:** `docs/plans/2026-03-09-ux-revamp-design.md`

---

## Phase 1: Personalization Backend

### Task 1.1: Database Migration for Preferences

**Files:**
- Create: `backend/src/migrations/1762600000000-account-preferences.ts`

**Step 1: Write the migration**

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountPreferences1762600000000 implements MigrationInterface {
  name = "AccountPreferences1762600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "app_theme_mode" AS ENUM ('dark', 'light', 'auto')
    `);
    await queryRunner.query(`
      CREATE TYPE "app_sidebar_position" AS ENUM ('left', 'right')
    `);
    await queryRunner.query(`
      CREATE TYPE "app_density" AS ENUM ('compact', 'comfortable', 'spacious')
    `);
    await queryRunner.query(`
      CREATE TABLE "app_account_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accountId" uuid NOT NULL,
        "accentColor" varchar(7) NOT NULL DEFAULT '#7dd3fc',
        "themeMode" "app_theme_mode" NOT NULL DEFAULT 'dark',
        "background" jsonb,
        "sidebarPosition" "app_sidebar_position" NOT NULL DEFAULT 'left',
        "density" "app_density" NOT NULL DEFAULT 'comfortable',
        "customCss" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_account_preferences_account" UNIQUE ("accountId"),
        CONSTRAINT "FK_account_preferences_account" FOREIGN KEY ("accountId")
          REFERENCES "app_account"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app_account_preferences"`);
    await queryRunner.query(`DROP TYPE "app_density"`);
    await queryRunner.query(`DROP TYPE "app_sidebar_position"`);
    await queryRunner.query(`DROP TYPE "app_theme_mode"`);
  }
}
```

**Step 2: Run migration**

```bash
cd backend && npx ts-node -r tsconfig-paths/register node_modules/typeorm/cli.js migration:run -d src/dataSource.ts
```

**Step 3: Commit**

```bash
git add backend/src/migrations/1762600000000-account-preferences.ts
git commit -m "feat: add account preferences migration"
```

### Task 1.2: Preferences Entity

**Files:**
- Create: `backend/src/system/accounts/account-preferences.entity.ts`

**Step 1: Create entity**

```typescript
import { Entity, Column, OneToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Account } from "./account.entity";

export enum ThemeMode { DARK = "dark", LIGHT = "light", AUTO = "auto" }
export enum SidebarPosition { LEFT = "left", RIGHT = "right" }
export enum Density { COMPACT = "compact", COMFORTABLE = "comfortable", SPACIOUS = "spacious" }

@Entity("account_preferences")
export class AccountPreferences {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: false })
  accountId: string;

  @OneToOne(() => Account, { onDelete: "CASCADE" })
  @JoinColumn({ name: "accountId" })
  account: Account;

  @Column({ type: "varchar", length: 7, default: "#7dd3fc" })
  accentColor: string;

  @Column({ type: "enum", enum: ThemeMode, default: ThemeMode.DARK })
  themeMode: ThemeMode;

  @Column({ type: "jsonb", nullable: true })
  background: { type: "solid" | "gradient" | "image"; value: string } | null;

  @Column({ type: "enum", enum: SidebarPosition, default: SidebarPosition.LEFT })
  sidebarPosition: SidebarPosition;

  @Column({ type: "enum", enum: Density, default: Density.COMFORTABLE })
  density: Density;

  @Column({ type: "text", nullable: true })
  customCss: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
```

**Step 2: Commit**

```bash
git add backend/src/system/accounts/account-preferences.entity.ts
git commit -m "feat: add AccountPreferences entity"
```

### Task 1.3: Preferences Service

**Files:**
- Create: `backend/src/system/accounts/preferences.service.ts`

**Step 1: Create service**

```typescript
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccountPreferences } from "./account-preferences.entity";

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(AccountPreferences)
    private readonly repo: Repository<AccountPreferences>
  ) {}

  async getOrCreate(accountId: string): Promise<AccountPreferences> {
    let prefs = await this.repo.findOne({ where: { accountId } });
    if (!prefs) {
      prefs = this.repo.create({ accountId });
      prefs = await this.repo.save(prefs);
    }
    return prefs;
  }

  async update(accountId: string, data: Partial<AccountPreferences>): Promise<AccountPreferences> {
    const prefs = await this.getOrCreate(accountId);
    Object.assign(prefs, data);
    return this.repo.save(prefs);
  }
}
```

**Step 2: Commit**

```bash
git add backend/src/system/accounts/preferences.service.ts
git commit -m "feat: add PreferencesService"
```

### Task 1.4: Preferences Controller

**Files:**
- Create: `backend/src/system/accounts/preferences.controller.ts`
- Modify: `backend/src/system/system.module.ts` - register new entity, service, controller

**Step 1: Create controller**

```typescript
import { Controller, Get, Patch, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ReqUser } from "../auth/auth.decorator";
import { Account } from "./account.entity";
import { PreferencesService } from "./preferences.service";

@ApiTags("Account Preferences")
@ApiBearerAuth("access-token")
@Controller("accounts/preferences")
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  async get(@ReqUser() account: Account) {
    return this.preferencesService.getOrCreate(account.id);
  }

  @Patch()
  async update(@ReqUser() account: Account, @Body() body: Partial<{
    accentColor: string;
    themeMode: string;
    background: any;
    sidebarPosition: string;
    density: string;
    customCss: string;
  }>) {
    return this.preferencesService.update(account.id, body);
  }
}
```

**Step 2: Register in SystemModule**

Add `AccountPreferences` to TypeOrmModule.forFeature imports, add `PreferencesService` to providers, add `PreferencesController` to controllers.

**Step 3: Verify compilation**

```bash
cd backend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add backend/src/system/accounts/preferences.controller.ts backend/src/system/system.module.ts
git commit -m "feat: add preferences API endpoints"
```

---

## Phase 2: Icon System Foundation

### Task 2.1: Install Lucide React

**Step 1: Install**

```bash
cd frontend && npm install lucide-react
```

**Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add lucide-react icon library"
```

### Task 2.2: Create Icon Wrapper Component

**Files:**
- Create: `frontend/src/components/icons/Icon.jsx`
- Create: `frontend/src/components/icons/custom/index.js` (placeholder for custom SVGs)
- Create: `frontend/src/components/icons/index.js`

**Step 1: Create Icon wrapper**

```jsx
// frontend/src/components/icons/Icon.jsx
import { icons as lucideIcons } from 'lucide-react'
import { customIcons } from './custom'

const DENSITY_SIZES = { compact: 16, comfortable: 20, spacious: 24 }

export default function Icon({ name, size, className, style, density = 'comfortable', ...props }) {
  const resolvedSize = size || DENSITY_SIZES[density] || 20

  // Check custom icons first
  const CustomIcon = customIcons[name]
  if (CustomIcon) {
    return <CustomIcon width={resolvedSize} height={resolvedSize} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} {...props} />
  }

  // Convert kebab-case to PascalCase for Lucide lookup
  const pascalName = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  const LucideIcon = lucideIcons[pascalName]
  if (LucideIcon) {
    return <LucideIcon size={resolvedSize} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} {...props} />
  }

  // Fallback: render nothing (dev warning)
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Icon "${name}" not found in Lucide or custom icons`)
  }
  return null
}
```

**Step 2: Create custom icons placeholder**

```js
// frontend/src/components/icons/custom/index.js
// Custom SVG icons for domain-specific uses
// Add exports here as: export { default as IconName } from './IconName'
export const customIcons = {}
```

**Step 3: Create barrel export**

```js
// frontend/src/components/icons/index.js
export { default as Icon } from './Icon'
```

**Step 4: Commit**

```bash
git add frontend/src/components/icons/
git commit -m "feat: add Icon wrapper component with Lucide + custom SVG support"
```

### Task 2.3: Create Icon Name Mapping

**Files:**
- Create: `frontend/src/components/icons/material-to-lucide.js`

**Step 1: Create mapping from Material Icons to Lucide equivalents**

This file maps every Material Icon name used in the codebase to its Lucide equivalent:

```js
// Material Icon name -> Lucide icon name
export const ICON_MAP = {
  home: 'home',
  person: 'user',
  music_note: 'music',
  public: 'globe',
  fitness_center: 'dumbbell',
  bolt: 'zap',
  history: 'clock',
  list: 'list',
  monitor_weight: 'scale',
  file_download: 'download',
  account_balance_wallet: 'wallet',
  receipt_long: 'receipt',
  account_balance: 'landmark',
  self_improvement: 'heart-pulse',
  settings: 'settings',
  light_mode: 'sun',
  dark_mode: 'moon',
  logout: 'log-out',
  chevron_right: 'chevron-right',
  chevron_left: 'chevron-left',
  warning: 'alert-triangle',
  search: 'search',
  add: 'plus',
  edit: 'pencil',
  delete: 'trash-2',
  close: 'x',
  check: 'check',
  check_circle: 'check-circle',
  error: 'alert-circle',
  info: 'info',
  refresh: 'refresh-cw',
  upload_file: 'upload',
  cloud_upload: 'cloud-upload',
  preview: 'eye',
  play_arrow: 'play',
  arrow_back: 'arrow-left',
  date_range: 'calendar-range',
  storage: 'hard-drive',
  help_outline: 'help-circle',
  sync: 'loader',
  category: 'tag',
  key: 'key-round',
  link: 'link',
  tune: 'sliders-horizontal',
  language: 'languages',
  copy: 'copy',
  visibility: 'eye',
  visibility_off: 'eye-off',
  expand_more: 'chevron-down',
  expand_less: 'chevron-up',
  more_vert: 'more-vertical',
  timer: 'timer',
  schedule: 'clock',
  trending_up: 'trending-up',
  bar_chart: 'bar-chart-3',
  show_chart: 'line-chart',
  palette: 'palette',
  brush: 'paintbrush',
  format_paint: 'paintbrush',
  image: 'image',
  code: 'code',
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/icons/material-to-lucide.js
git commit -m "feat: add Material Icons to Lucide mapping"
```

---

## Phase 3: CSS & Theme Foundation

### Task 3.1: Extend CSS Variables for Density and Personalization

**Files:**
- Modify: `frontend/src/styles.css`

**Step 1: Add density variables and typography scale after existing variables**

Add to `:root` (after existing variables):

```css
/* Typography scale */
--font-size-xs: 0.75rem;
--font-size-sm: 0.85rem;
--font-size-base: 0.95rem;
--font-size-lg: 1.1rem;
--font-size-xl: 1.35rem;
--font-size-2xl: 1.75rem;
--font-size-3xl: 2.25rem;

/* Density: comfortable (default) */
--density-padding-xs: 0.25rem;
--density-padding-sm: 0.5rem;
--density-padding-md: 0.75rem;
--density-padding-lg: 1rem;
--density-padding-xl: 1.5rem;
--density-gap-sm: 0.4rem;
--density-gap-md: 0.75rem;
--density-gap-lg: 1rem;
```

Add density overrides:

```css
[data-density="compact"] {
  --density-padding-xs: 0.15rem;
  --density-padding-sm: 0.3rem;
  --density-padding-md: 0.5rem;
  --density-padding-lg: 0.75rem;
  --density-padding-xl: 1rem;
  --density-gap-sm: 0.25rem;
  --density-gap-md: 0.5rem;
  --density-gap-lg: 0.75rem;
  --font-size-base: 0.875rem;
}

[data-density="spacious"] {
  --density-padding-xs: 0.35rem;
  --density-padding-sm: 0.65rem;
  --density-padding-md: 1rem;
  --density-padding-lg: 1.25rem;
  --density-padding-xl: 2rem;
  --density-gap-sm: 0.5rem;
  --density-gap-md: 1rem;
  --density-gap-lg: 1.5rem;
  --font-size-base: 1rem;
}
```

**Step 2: Commit**

```bash
git add frontend/src/styles.css
git commit -m "feat: add density and typography CSS variables"
```

### Task 3.2: Upgrade ThemeContext to PreferencesContext

**Files:**
- Create: `frontend/src/contexts/PreferencesContext.jsx` (replaces ThemeContext)
- Modify: `frontend/src/main.jsx` - swap provider
- Modify: `frontend/src/App.jsx` - swap provider

**Step 1: Create PreferencesContext**

```jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import { getTokens } from '../auth'

const PreferencesContext = createContext()

const DEFAULTS = {
  accentColor: '#7dd3fc',
  themeMode: 'dark',
  background: null,
  sidebarPosition: 'left',
  density: 'comfortable',
  customCss: null,
}

const LS_KEY = 'user-preferences'

function applyPreferences(prefs) {
  const root = document.documentElement

  // Theme
  const effectiveTheme = prefs.themeMode === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : prefs.themeMode
  root.dataset.theme = effectiveTheme

  // Density
  root.dataset.density = prefs.density

  // Sidebar position
  root.dataset.sidebarPosition = prefs.sidebarPosition

  // Accent color - inject CSS variable overrides
  const accentStyle = document.getElementById('user-accent-style') || (() => {
    const el = document.createElement('style')
    el.id = 'user-accent-style'
    document.head.appendChild(el)
    return el
  })()

  let css = `:root { --color-accent: ${prefs.accentColor}; --color-accent-hover: ${prefs.accentColor}dd; --color-accent-muted: ${prefs.accentColor}22; }`

  // Background
  if (prefs.background) {
    if (prefs.background.type === 'solid') {
      css += ` :root { --color-bg-base: ${prefs.background.value}; }`
    } else if (prefs.background.type === 'gradient') {
      css += ` body { background: ${prefs.background.value} !important; }`
    } else if (prefs.background.type === 'image') {
      css += ` body { background: url(${prefs.background.value}) center/cover fixed !important; }`
    }
  }

  // Custom CSS
  if (prefs.customCss) {
    css += `\n${prefs.customCss}`
  }

  accentStyle.textContent = css
}

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
    } catch { return DEFAULTS }
  })

  // Apply on mount and whenever prefs change
  useEffect(() => {
    applyPreferences(prefs)
  }, [prefs])

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (prefs.themeMode !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyPreferences(prefs)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [prefs.themeMode])

  // Fetch from API on mount if logged in
  useEffect(() => {
    const { accessToken } = getTokens()
    if (!accessToken) return
    apiFetch('/accounts/preferences')
      .then(data => {
        const merged = { ...DEFAULTS, ...data }
        setPrefs(merged)
        localStorage.setItem(LS_KEY, JSON.stringify(merged))
      })
      .catch(() => {}) // silent fail, use local
  }, [])

  const updatePrefs = useCallback(async (updates) => {
    const next = { ...prefs, ...updates }
    setPrefs(next)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    try {
      await apiFetch('/accounts/preferences', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    } catch {} // silent fail, local already updated
  }, [prefs])

  const toggleTheme = useCallback(() => {
    const next = prefs.themeMode === 'dark' ? 'light' : 'dark'
    updatePrefs({ themeMode: next })
  }, [prefs.themeMode, updatePrefs])

  return (
    <PreferencesContext.Provider value={{ prefs, updatePrefs, toggleTheme, theme: prefs.themeMode === 'auto'
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : prefs.themeMode }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  return useContext(PreferencesContext)
}

// Backwards compatibility
export function useTheme() {
  const { prefs, toggleTheme } = usePreferences()
  return {
    theme: prefs.themeMode === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : prefs.themeMode,
    toggleTheme
  }
}
```

**Step 2: Update main.jsx** - Replace `ThemeProvider` with `PreferencesProvider`

**Step 3: Update App.jsx** - Replace `ThemeProvider` with `PreferencesProvider` if wrapped there

**Step 4: Verify app still works**

```bash
cd frontend && npm run dev
```

**Step 5: Commit**

```bash
git add frontend/src/contexts/PreferencesContext.jsx frontend/src/main.jsx frontend/src/App.jsx
git commit -m "feat: replace ThemeContext with PreferencesContext (accent, density, background, sidebar position)"
```

---

## Phase 4: Spotify OAuth Frontend

### Task 4.1: Add Spotify Callback Route

**Files:**
- Create: `frontend/src/pages/Spotify/SpotifyCallback.jsx`
- Modify: `frontend/src/App.jsx` - add route

**Step 1: Create callback page**

```jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../api'
import { LoadingSpinner } from '../../components/shared'

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('No authorization code received from Spotify')
      return
    }

    apiFetch('/auth/spotify/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
      .then(() => navigate('/spotify/personal', { replace: true }))
      .catch((err) => setError(err.message || 'Failed to connect Spotify'))
  }, [])

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="alert-error">{error}</div>
        <button className="btn" onClick={() => navigate('/settings')}>Back to Settings</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <LoadingSpinner size={40} />
      <div style={{ color: 'var(--color-text-secondary)' }}>Connecting to Spotify...</div>
    </div>
  )
}
```

**Step 2: Add route to App.jsx** - Add `/spotify/callback` as a protected route

**Step 3: Commit**

```bash
git add frontend/src/pages/Spotify/SpotifyCallback.jsx frontend/src/App.jsx
git commit -m "feat: add Spotify OAuth callback route"
```

### Task 4.2: Update Backend Spotify Auth for Frontend OAuth

**Files:**
- Modify: `backend/src/system/auth/auth.controller.ts` - ensure link endpoint returns URL as JSON
- Modify: `backend/src/system/spotify/spotify.controller.ts` - ensure callback accepts code in body

**Step 1: Check and fix** the `GET /auth/spotify/link` endpoint to return `{ url: "..." }` rather than redirecting. Check the callback endpoint accepts `{ code }` in POST body and exchanges it using the account from JWT auth (not URL param).

**Step 2: Update `SPOTIFY_REDIRECT_URI` in `.env`** to point to the frontend callback route for production.

**Step 3: Commit**

```bash
git add backend/src/system/auth/auth.controller.ts backend/src/system/spotify/spotify.controller.ts
git commit -m "feat: update Spotify auth endpoints for frontend OAuth flow"
```

### Task 4.3: Build Connections Tab with OAuth + Manual Token

**Files:**
- Create: `frontend/src/pages/Settings/Connections.jsx`
- Modify: `frontend/src/pages/Settings/Settings.jsx` - use new component for connections tab

**Step 1: Create Connections component** with two tabs (OAuth redirect and manual token paste). OAuth tab has a "Connect with Spotify" button that calls `GET /api/auth/spotify/link`, gets the URL, and does `window.location.href = url`. Manual tab has Access Token and Refresh Token inputs with a Save button calling `POST /api/spotify/tokens`.

Show connection status: connected (with profile info + disconnect), or not connected (show methods).

**Step 2: Commit**

```bash
git add frontend/src/pages/Settings/Connections.jsx frontend/src/pages/Settings/Settings.jsx
git commit -m "feat: add Spotify OAuth + manual token connection UI"
```

---

## Phase 5: Chat Backend

### Task 5.1: Database Migration for Chat

**Files:**
- Create: `backend/src/migrations/1762700000000-chat.ts`

**Step 1: Write migration**

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class Chat1762700000000 implements MigrationInterface {
  name = "Chat1762700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "app_chat_sender" AS ENUM ('user', 'agent')
    `);
    await queryRunner.query(`
      CREATE TYPE "app_chat_status" AS ENUM ('sent', 'read', 'thinking', 'delivered', 'error')
    `);
    await queryRunner.query(`
      CREATE TABLE "app_chat_conversation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accountId" uuid NOT NULL,
        "title" varchar(200),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_conversation" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_conversation_account" FOREIGN KEY ("accountId")
          REFERENCES "app_account"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "app_chat_message" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "accountId" uuid NOT NULL,
        "sender" "app_chat_sender" NOT NULL,
        "agentKeyId" uuid,
        "text" text NOT NULL,
        "status" "app_chat_status" NOT NULL DEFAULT 'sent',
        "pageContext" jsonb,
        "replyToId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_message" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_message_conversation" FOREIGN KEY ("conversationId")
          REFERENCES "app_chat_conversation"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_message_account" FOREIGN KEY ("accountId")
          REFERENCES "app_account"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_message_agent_key" FOREIGN KEY ("agentKeyId")
          REFERENCES "app_agent_key"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_chat_message_reply" FOREIGN KEY ("replyToId")
          REFERENCES "app_chat_message"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_chat_message_conversation" ON "app_chat_message" ("conversationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_chat_message_account_status" ON "app_chat_message" ("accountId", "status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app_chat_message"`);
    await queryRunner.query(`DROP TABLE "app_chat_conversation"`);
    await queryRunner.query(`DROP TYPE "app_chat_status"`);
    await queryRunner.query(`DROP TYPE "app_chat_sender"`);
  }
}
```

**Step 2: Run migration, commit**

### Task 5.2: Chat Entities

**Files:**
- Create: `backend/src/chat/entities/conversation.entity.ts`
- Create: `backend/src/chat/entities/message.entity.ts`

Create entities matching the migration schema. Conversation has OneToMany messages. Message has ManyToOne conversation, optional ManyToOne agentKey, optional self-referencing replyTo.

**Commit after creation.**

### Task 5.3: Chat Service

**Files:**
- Create: `backend/src/chat/chat.service.ts`

Methods:
- `listConversations(accountId)` - paginated, ordered by updatedAt desc
- `createConversation(accountId, title?)` - create new conversation
- `getMessages(conversationId, accountId, after?)` - messages after timestamp (for polling)
- `sendMessage(conversationId, accountId, text, pageContext?)` - create user message
- `deleteConversation(conversationId, accountId)` - delete with ownership check
- `getUnread(accountId)` - messages with status 'sent' (for agent polling)
- `updateMessageStatus(messageId, accountId, status)` - agent updates status
- `sendAgentMessage(conversationId, accountId, agentKeyId, text, replyToId?)` - agent posts reply

**Commit after creation.**

### Task 5.4: Chat Controller (User-facing, JWT)

**Files:**
- Create: `backend/src/chat/chat.controller.ts`

Endpoints:
- `GET /chat/conversations`
- `POST /chat/conversations`
- `GET /chat/conversations/:id/messages?after=`
- `POST /chat/conversations/:id/messages`
- `DELETE /chat/conversations/:id`

**Commit after creation.**

### Task 5.5: Chat Agent Controller (Agent-facing, API key)

**Files:**
- Create: `backend/src/chat/chat-agent.controller.ts`
- Modify: `backend/src/agents/constants/scopes.ts` - add `chat:read`, `chat:write`

Endpoints (all under `/v1/chat`, using AgentKeyGuard + ScopeGuard):
- `GET /v1/chat/unread` - requires `chat:read`
- `GET /v1/chat/conversations/:id/messages` - requires `chat:read`
- `PATCH /v1/chat/messages/:id` - requires `chat:write` (update status)
- `POST /v1/chat/conversations/:id/messages` - requires `chat:write` (send reply)

**Commit after creation.**

### Task 5.6: Chat Module

**Files:**
- Create: `backend/src/chat/chat.module.ts`
- Modify: `backend/src/app.module.ts` - register ChatModule

Register entities, service, both controllers. Import AgentsModule for guards.

**Commit after creation. Verify compilation with `npx tsc --noEmit`.**

---

## Phase 6: Landing Page

### Task 6.1: Build Cinematic Landing Page

**Files:**
- Rewrite: `frontend/src/pages/Landing.jsx`

Build the full single-page scroll landing:

1. **Hero section** - Full viewport, dark bg, animated gradient mesh (CSS keyframes on radial gradients), bold headline, subtitle, two CTA buttons, floating dashboard mockup with glow + CSS 3D perspective transform
2. **Feature showcase** - Staggered card grid with IntersectionObserver fade-in, one card per domain (Workouts, Finance, Habits, Music, Agent Copilot), glassmorphism with domain accent glow, Lucide icons
3. **Live data feel** - Animated counters using CSS counter-increment or JS, mock dashboard widget, subtle particle grid background (CSS dots pattern)
4. **Agent/Copilot section** - Split layout with chat mockup showing fake conversation with context chips and status indicators
5. **Personalization section** - Theme switching animation (CSS transition demo), grid of dashboard variants
6. **Footer** - GitHub link, tech badges, login/register links

All animations: pure CSS (keyframes, transitions) + IntersectionObserver for scroll triggers. No extra dependencies.

**This is a large task - implement section by section, commit after each working section.**

```bash
git commit -m "feat: build cinematic landing page"
```

---

## Phase 7: Appearance Settings Tab

### Task 7.1: Build Appearance Tab

**Files:**
- Create: `frontend/src/pages/Settings/Appearance.jsx`
- Modify: `frontend/src/pages/Settings/Settings.jsx` - add appearance tab

Build the Appearance settings component:
- Color picker (accent color) with preset swatches + custom hex input
- Theme mode toggle: dark / light / auto (three buttons)
- Background selector: solid color picker, gradient builder (two-color with direction), image upload
- Sidebar position: left / right toggle
- Density: compact / comfortable / spacious radio buttons with live preview
- Custom CSS: collapsible textarea with monospace font
- "Reset to defaults" button

All changes call `updatePrefs()` from PreferencesContext for instant local feedback + API persistence.

**Commit after completion.**

---

## Phase 8: UI Refresh - All Pages

### Task 8.1: Remove Material Icons CDN

**Files:**
- Modify: `frontend/index.html` - remove Google Material Icons link tag

**Commit.**

### Task 8.2: Migrate Sidebar Icons

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`

Replace every `<span className="material-icons">name</span>` with `<Icon name="lucide-name" size={20} />`. Use the mapping from `material-to-lucide.js`. Remove all emoji usage. Update sidebar to respect `data-sidebarPosition` for left/right layout.

**Commit.**

### Task 8.3-8.20: Migrate Each Page (one task per page)

For each page in the inventory, apply:

1. Replace all Material Icons `<span>` with `<Icon>` component
2. Remove all emoji characters from labels, buttons, text
3. Replace hardcoded padding/margins with density variables where applicable
4. Use typography scale variables for font sizes
5. Ensure skeleton loading is present for all async data
6. Add micro-interactions (hover transitions on cards/buttons)
7. Verify dark and light theme rendering

**Page list (one commit each):**
- 8.3: `Login.jsx`, `Register.jsx`
- 8.4: `Home.jsx`
- 8.5: `Profile.jsx`
- 8.6: `SpotifyPersonal.jsx`
- 8.7: `SpotifyGlobal.jsx` (if exists)
- 8.8: `Workout.jsx` (overview)
- 8.9: `WorkoutActive.jsx`
- 8.10: `WorkoutHistory.jsx`
- 8.11: `WorkoutExercises.jsx`
- 8.12: `WorkoutBodyweight.jsx`
- 8.13: `WorkoutImport.jsx`
- 8.14: `Finance.jsx` (overview)
- 8.15: `FinanceTransactions.jsx`
- 8.16: `FinanceWallets.jsx`
- 8.17: `FinanceImport.jsx`
- 8.18: `Habits.jsx`
- 8.19: `HabitsImport.jsx`
- 8.20: `Settings.jsx`, `AgentApiKeys.jsx`

**Each task: modify file, replace icons, remove emojis, apply density vars, commit.**

### Task 8.21: Migrate Shared Components

**Files:**
- Modify all files in `frontend/src/components/shared/`

Replace any Material Icon usage in shared components. Update Modal, StatCard, StepIndicator, ProgressBar etc. to use density variables for padding.

**Commit.**

---

## Phase 9: Chat Frontend

### Task 9.1: Create Page Context Hook

**Files:**
- Create: `frontend/src/hooks/usePageContext.js`

```js
import { useLocation } from 'react-router-dom'

const PAGE_TYPES = {
  '/home': 'dashboard',
  '/workout': 'workout-overview',
  '/workout/history': 'workout-history',
  '/workout/exercises': 'workout-exercises',
  '/workout/bodyweight': 'workout-bodyweight',
  '/workout/active': 'workout-active',
  '/workout/import': 'workout-import',
  '/finance': 'finance-overview',
  '/finance/transactions': 'finance-transactions',
  '/finance/wallets': 'finance-wallets',
  '/finance/import': 'finance-import',
  '/habits': 'habits',
  '/habits/import': 'habits-import',
  '/spotify/personal': 'spotify-personal',
  '/settings': 'settings',
  '/profile': 'profile',
}

export function usePageContext(extra = {}) {
  const location = useLocation()
  const route = location.pathname
  const pageType = PAGE_TYPES[route] || 'unknown'
  const params = Object.fromEntries(new URLSearchParams(location.search))

  return { route, pageType, filters: params, ...extra }
}
```

**Commit.**

### Task 9.2: Build Chat Panel Component

**Files:**
- Create: `frontend/src/components/ChatPanel.jsx`

Sliding drawer (~350px) on the right side:
- Fixed toggle button (bottom-right corner) with unread badge
- Panel slides in/out with CSS transition
- Two views: conversation list / conversation detail
- Conversation list: shows recent conversations, "New conversation" button
- Conversation detail: message bubbles with status indicators (check, double-check, dots, error), page context chip above input, text input + send button
- Polling: 3s when open, 30s when closed
- Unread badge on toggle button when panel is closed and new messages detected
- Uses `usePageContext()` to auto-attach context to messages

**This is a large component - build incrementally:**
1. Toggle button + slide panel shell
2. Conversation list view
3. Conversation detail view with messages
4. Message input with context chip
5. Polling logic
6. Unread badge

**Commit after each sub-step or after complete.**

### Task 9.3: Integrate Chat Panel into Layout

**Files:**
- Modify: `frontend/src/components/Layout.jsx`

Add `<ChatPanel />` inside the Layout component, rendered for all authenticated pages.

**Commit.**

---

## Phase 10: Agent Skill Document

### Task 10.1: Write Agent Skill Document

**Files:**
- Create: `docs/agent-skill.md`

Write comprehensive markdown covering:
- Authentication (X-API-Key header, key format ps_live_XXX)
- Available scopes with descriptions
- All v1 endpoints with request/response examples
- Chat protocol (polling schedule, status update flow, reply flow)
- Data domains (workout, finance, habits, music relationships)
- Behavioral guidelines (polling intervals, rate limits, pageContext interpretation)
- Example pageContext objects for each page type

**Commit.**

### Task 10.2: Add Skill Endpoint

**Files:**
- Create: `backend/src/health/skill.controller.ts`

```typescript
import { Controller, Get, Header } from "@nestjs/common";
import { NoAuth } from "../system/auth/auth.decorator";
import * as fs from "fs";
import * as path from "path";

@Controller("agent-skill")
export class SkillController {
  @Get()
  @NoAuth()
  @Header("Content-Type", "text/markdown")
  getSkill() {
    const skillPath = path.join(process.cwd(), "docs", "agent-skill.md");
    return fs.readFileSync(skillPath, "utf-8");
  }
}
```

Register in HealthModule (or create a standalone module).

**Commit.**

---

## Phase 11: Playwright Testing

### Task 11.1: Setup Playwright

**Step 1: Install**

```bash
cd frontend && npm install -D @playwright/test && npx playwright install chromium
```

**Step 2: Create config**

Create `frontend/playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
})
```

**Step 3: Create test fixtures**

Create `frontend/tests/fixtures/auth.ts` with login helper.
Create `frontend/tests/fixtures/api.ts` with API helpers.

**Step 4: Commit**

```bash
git add frontend/playwright.config.ts frontend/tests/fixtures/
git commit -m "feat: setup Playwright with fixtures"
```

### Task 11.2-11.15: Write Test Suites

One task per test directory (refer to design doc Section 7 for full list):

- 11.2: `tests/auth/` - landing, login, register
- 11.3: `tests/dashboard/` - home
- 11.4: `tests/spotify/` - connection, personal
- 11.5: `tests/workout/` - overview, exercises, history, bodyweight, import
- 11.6: `tests/finance/` - overview, transactions, wallets, import
- 11.7: `tests/habits/` - habits, import
- 11.8: `tests/settings/` - appearance, agent-keys, connections
- 11.9: `tests/profile/` - profile
- 11.10: `tests/chat/` - panel, messaging, notifications
- 11.11: `tests/personalization/` - theme, accent, density, sidebar
- 11.12: `tests/responsive/` - mobile, tablet, desktop
- 11.13: `tests/visual-regression/` - pages, modals, density, landing

Each task: write test file(s), run `npx playwright test tests/<dir>/ --headed` to verify, commit.

### Task 11.14: Generate Visual Regression Baselines

```bash
cd frontend && npx playwright test tests/visual-regression/ --update-snapshots
git add frontend/tests/__screenshots__/
git commit -m "feat: add visual regression baselines"
```

---

## Execution Order Summary

| Phase | Tasks | Dependencies | Estimated Commits |
|-------|-------|-------------|-------------------|
| 1. Personalization Backend | 1.1-1.4 | None | 4 |
| 2. Icon System Foundation | 2.1-2.3 | None | 3 |
| 3. CSS & Theme Foundation | 3.1-3.2 | Phase 2 | 2 |
| 4. Spotify OAuth Frontend | 4.1-4.3 | None | 3 |
| 5. Chat Backend | 5.1-5.6 | None | 6 |
| 6. Landing Page | 6.1 | Phase 2, 3 | 1-3 |
| 7. Appearance Settings | 7.1 | Phase 1, 3 | 1 |
| 8. UI Refresh - All Pages | 8.1-8.21 | Phase 2, 3 | 21 |
| 9. Chat Frontend | 9.1-9.3 | Phase 5 | 3 |
| 10. Agent Skill Document | 10.1-10.2 | Phase 5 | 2 |
| 11. Playwright Testing | 11.1-11.14 | All above | 14 |
| **Total** | | | **~60 commits** |

**Parallelizable:** Phases 1, 2, 4, 5 can all run in parallel (no dependencies on each other).
