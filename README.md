# SevisBirth — PNG Digital Birth Registration System

> A fully-working demo of Papua New Guinea's civil identity and birth registration platform, featuring five role-based interfaces, OIDC4VP digital identity verification, T5-OmniMatch deduplication, and field-level data protection.

---

## Overview

SevisBirth digitises the end-to-end birth registration workflow for Papua New Guinea — from a community health worker capturing a birth in a remote village, through facility-level validation, civil registry review, and final certification by the Registrar General.

Every step of the identity verification chain uses **OIDC4VP** (OpenID for Verifiable Presentations) with **SD-JWT Verifiable Credentials**, backed by the SevisPass national digital identity wallet. A demo bypass button is available under every QR flow so the system can be evaluated without a real wallet.

---

## Features

| Feature | Detail |
|---|---|
| **5 role-based interfaces** | CHW (mobile), Facility Manager, Civil Registrar, Registrar General |
| **OIDC4VP authentication** | Real SVG QR codes, session polling, demo bypass |
| **T5-OmniMatch deduplication** | 1:N biometric dedup result per registration |
| **State machine** | `submitted → received → reviewing → approved → certifying → complete → voided` |
| **Data protection** | PNG Privacy Act 2020 consent banner, field masking, click-to-reveal, access audit log |
| **SevisPass UID** | Tier-stamped decentralised identifier per verified individual |
| **Live charts** | Provincial registration volume, activity feed (Recharts) |
| **REST API** | Express 5, Drizzle ORM, PostgreSQL, Zod validation, OpenAPI codegen |

---

## Tech Stack

### Frontend (`artifacts/sevisbirth`)
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Wouter (routing)
- TanStack Query (server state)
- Recharts (data visualisation)
- react-hook-form + Zod

### Backend (`artifacts/api-server`)
- Node.js + Express 5
- Drizzle ORM
- PostgreSQL
- `qrcode` (SVG QR generation)
- Pino (structured logging)

### Shared libraries
- `lib/db` — Drizzle schema and migrations
- `lib/api-spec` — OpenAPI spec
- `lib/api-client-react` — generated TanStack Query hooks
- `lib/api-zod` — generated Zod validators

---

## Role-Based Interfaces

### 🩺 Community Health Worker — Mary Kila
Mobile-first interface for field registration.
- 5-step registration form
- Step 2: OIDC4VP parent/informant identity verification with QR scan
- Step 5: optional witness verification
- Dedup result shown inline (clear / warning / match)

### 🏥 Facility Manager — Dr. Peter Naime
Desktop interface for reviewing records at facility level.
- PNG Privacy Act 2020 consent banner on first access
- Searchable, filterable records table
- Sensitive fields (DOB, names, UIDs) masked by default — click-to-reveal
- Session access audit log panel
- Full record detail drawer with state timeline

### 📜 Civil Registrar — Susan Tua
Split-panel review and approval queue.
- OIDC4VP session verification required before approving/rejecting
- Inline dedup warnings and verification metadata per record
- Green/amber/red status indicators

### 🏛️ Registrar General — James Walo
National operations dashboard.
- OIDC4VP session badge in header
- KPI cards (total, pending, approved, certified)
- Province-level bar chart
- One-click certification of approved records (OIDC4VP gated)
- Live system activity feed

---

## Demo Accounts

| Role | Username | Password |
|---|---|---|
| Community Health Worker | `mary` | `demo` |
| Facility Manager | `peter` | `demo` |
| Civil Registrar | `susan` | `demo` |
| Registrar General | `james` | `demo` |

All login flows open an OIDC4VP QR modal. Click **"Demo Bypass"** to skip the wallet scan and proceed immediately.

---

## Running Locally

### Prerequisites
- [Node.js 20+](https://nodejs.org)
- [pnpm](https://pnpm.io): `npm install -g pnpm`
- [PostgreSQL 15+](https://www.postgresql.org/download/)

### 1 — Install dependencies
```bash
pnpm install
```

### 2 — Configure environment
Create a `.env` file in the project root:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/sevisbirth
SESSION_SECRET=any-random-string-here
```

### 3 — Push schema and seed data
```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed
```

### 4 — Start servers (two terminals)
```bash
# Terminal 1 — API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 5173)
pnpm --filter @workspace/sevisbirth run dev
```

Open `http://localhost:5173` in your browser.

---

## Running on Android (Termux)

Termux is a full Linux environment for Android — this project runs on it.

```bash
# Install prerequisites
pkg update && pkg upgrade
pkg install nodejs postgresql git
npm install -g pnpm

# Initialise PostgreSQL (one-time)
initdb $PREFIX/var/lib/postgresql
pg_ctl -D $PREFIX/var/lib/postgresql start
createdb sevisbirth

# Install and run
pnpm install
echo 'DATABASE_URL=postgresql://localhost/sevisbirth' >> .env
echo 'SESSION_SECRET=change-me' >> .env
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed
```

Open two Termux sessions (swipe to add), run the API server in one and the frontend in the other, then visit `http://localhost:5173` in your browser.

> Requires ~1 GB of free RAM. After a reboot, start PostgreSQL again with `pg_ctl -D $PREFIX/var/lib/postgresql start` before running the servers.

---

## API Reference

The REST API is documented via OpenAPI. Key endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate with username + password |
| `GET` | `/api/auth/me` | Get current session user |
| `GET` | `/api/birth-records` | List records (filterable, searchable) |
| `POST` | `/api/birth-records` | Create new birth record |
| `POST` | `/api/birth-records/:id/transition` | Advance record state |
| `GET` | `/api/stats` | Aggregate national statistics |
| `GET` | `/api/stats/by-province` | Per-province counts |
| `GET` | `/api/activity` | Recent state transition activity |
| `POST` | `/api/oidc4vp/initiate` | Start OIDC4VP session, get QR code |
| `GET` | `/api/oidc4vp/status` | Poll session verification status |
| `POST` | `/api/oidc4vp/bypass` | Demo bypass — simulate wallet scan |

---

## OIDC4VP Flow

```
Client                  SevisBirth API           SevisPass Wallet
  │                           │                         │
  │  POST /oidc4vp/initiate   │                         │
  │──────────────────────────▶│                         │
  │  { qrCode (SVG), sessionId }                        │
  │◀──────────────────────────│                         │
  │                           │                         │
  │  [User scans QR]          │                         │
  │  ─────────────────────────────────────────────────▶ │
  │                           │  VP Token (SD-JWT)      │
  │                           │◀──────────────────────  │
  │                           │  [verify + dedup]       │
  │                           │                         │
  │  GET /oidc4vp/status      │                         │
  │──────────────────────────▶│                         │
  │  { authenticated: true, user: { name, uid, ... } }  │
  │◀──────────────────────────│                         │
```

In the demo environment, **POST /api/oidc4vp/bypass** simulates the wallet completing the flow instantly.

---

## Record State Machine

```
submitted ──▶ received ──▶ reviewing ──┬──▶ approved ──▶ certifying ──▶ complete
                                       │
                                       └──▶ rejected

complete / approved ──▶ voided  (at any point by authorised actor)
```

The system auto-advances `submitted → received → reviewing` on creation. All transitions are logged to the `state_history` table with actor and timestamp.

---

## Data Protection

The facility interface implements the following controls in compliance with the PNG Privacy Act 2020:

- **Consent banner** — full-screen acknowledgement required on first access per session
- **Field masking** — DOB, informant name, and SevisPass UIDs are masked (`SP-MKIL-••••`) by default
- **Click-to-reveal** — individual fields can be revealed with a single click; each reveal is logged
- **Sensitive data unlock** — a toolbar toggle reveals all fields at once with a session-wide audit flag
- **Access log panel** — slide-over drawer listing every reveal event (field, actor, timestamp) for the current session

---

## Project Structure

```
sevisbirth-demo/
├── artifacts/
│   ├── api-server/          Express 5 REST API
│   │   └── src/routes/
│   │       ├── auth.ts
│   │       ├── birthRecords.ts
│   │       ├── stats.ts
│   │       ├── sevispass.ts
│   │       └── oidc4vp.ts   OIDC4VP mock SSO endpoints
│   └── sevisbirth/          React + Vite frontend
│       └── src/
│           ├── components/
│           │   ├── oidc-auth-modal.tsx
│           │   └── data-protection.tsx
│           └── pages/
│               ├── login.tsx
│               ├── chw-home.tsx
│               ├── chw-registration.tsx
│               ├── chw-queue.tsx
│               ├── facility-dashboard.tsx
│               ├── registry-queue.tsx
│               └── approval-dashboard.tsx
├── lib/
│   ├── db/                  Drizzle ORM schema + migrations
│   ├── api-spec/            OpenAPI specification
│   ├── api-client-react/    Generated TanStack Query hooks
│   └── api-zod/             Generated Zod validators
└── README.md
```

---

## Licence

MIT — built as a demonstration system for PNG civil identity infrastructure. Not for production use without appropriate security review and integration with real SevisPass infrastructure.
