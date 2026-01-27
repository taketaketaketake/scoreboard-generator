# Architecture

## Overview

The Scoreboard Generator is an automated pipeline that monitors Detroit sports teams, generates scoreboard images after games, and sends them via MMS. It runs on Railway as a single Node.js process combining a web server and background job scheduler.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Railway                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         server.js                                  │  │
│  │  ┌─────────────────┐     ┌──────────────────────────────────────┐ │  │
│  │  │  Express Server │     │           Orchestrator               │ │  │
│  │  │  - Dashboard    │     │  - Cron: 6 AM daily check            │ │  │
│  │  │  - API routes   │     │  - Cron: Sunday midnight refresh     │ │  │
│  │  │  - Health check │     │  - setTimeout: pregame/postgame jobs │ │  │
│  │  └─────────────────┘     └──────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
    ┌─────────────┐              ┌─────────────────┐
    │   Browser   │              │  External APIs  │
    │  Dashboard  │              │  - ESPN         │
    └─────────────┘              │  - Cloudflare R2│
                                 │  - Twilio       │
                                 └─────────────────┘
```

## Directory Structure

```
scoreboard-generator/
├── agents/           # Reusable modules for specific tasks
│   ├── content.js    # Builds payload for image generation
│   ├── decision.js   # Determines if/how to generate image
│   ├── normalize.js  # Normalizes ESPN data to internal format
│   ├── odds.js       # Fetches and stores betting odds
│   ├── r2.js         # Uploads images to Cloudflare R2
│   ├── schedule.js   # Fetches team schedules from ESPN
│   ├── scores.js     # Polls ESPN for live/final scores
│   └── twilio.js     # Sends MMS via Twilio
├── config/           # Configuration files
│   ├── teams.json    # Monitored teams definition
│   ├── opponents.json# Opponent colors/logos by league
│   └── schedules/    # Cached schedule data per team
├── data/             # Runtime data storage
│   ├── games/        # Completed game records (JSON)
│   ├── odds/         # Captured odds per game (JSON)
│   └── events/       # Event logs for observability (JSONL)
├── docs/             # Documentation
├── jobs/             # Scheduled job definitions
│   ├── daily.js      # Morning check for today's games
│   ├── pregame.js    # Captures closing odds before game
│   └── postgame.js   # Generates/sends scoreboard after game
├── output/           # Generated scoreboard images
│   └── {date}/       # Organized by date
├── public/           # Static web assets
│   └── index.html    # Dashboard UI
├── src/              # Core image generation
│   └── index.js      # Canvas-based scoreboard renderer
├── orchestrator.js   # Job scheduler with cron
└── server.js         # Express server + orchestrator startup
```

## Components

### Server (`server.js`)
Express web server that:
- Serves the public dashboard
- Provides API endpoints (`/api/upcoming`, `/api/today`, `/api/odds/:eventId`, `/api/health`)
- Starts the orchestrator cron jobs on boot

### Orchestrator (`orchestrator.js`)
Background job scheduler that:
- Runs daily job at 6:00 AM Detroit time
- Runs weekly refresh on Sunday at midnight
- Schedules pregame/postgame jobs dynamically via `setTimeout`
- Tracks scheduled jobs in a Map for cleanup on shutdown

### Jobs

| Job | Trigger | Purpose |
|-----|---------|---------|
| **Daily** | 6 AM cron | Find today's games, schedule pre/postgame jobs |
| **Pregame** | 1 hour before game | Capture closing odds |
| **Postgame** | Game start + poll delay | Poll for final, generate image, upload, send MMS |

### Agents

| Agent | Responsibility |
|-------|----------------|
| `schedule.js` | Fetch team schedules from ESPN API |
| `scores.js` | Poll ESPN for live scores, detect final |
| `odds.js` | Fetch/store opening and closing odds |
| `normalize.js` | Transform ESPN data to internal format |
| `decision.js` | Analyze game, decide tone/tags |
| `content.js` | Build image generation payload |
| `r2.js` | Upload images to Cloudflare R2 |
| `twilio.js` | Send MMS with scoreboard image |

## Data Flow

### Daily Flow
```
6:00 AM
   │
   ▼
┌─────────────────┐
│   Daily Job     │
│                 │
│ 1. Get today's  │
│    games        │
│ 2. For each:    │
│    - Schedule   │
│      pregame    │
│    - Schedule   │
│      postgame   │
└─────────────────┘
```

### Game Day Flow
```
1hr before game          Game start + delay          After final
      │                         │                         │
      ▼                         ▼                         ▼
┌───────────┐            ┌─────────────┐           ┌─────────────┐
│  Pregame  │            │  Postgame   │           │   Output    │
│           │            │             │           │             │
│ - Fetch   │            │ - Poll ESPN │           │ - Image in  │
│   closing │            │   until     │           │   output/   │
│   odds    │            │   final     │           │ - Record in │
│ - Store   │            │ - Normalize │           │   data/     │
│   to JSON │            │ - Analyze   │           │   games/    │
└───────────┘            │ - Generate  │           │ - MMS sent  │
                         │   image     │           └─────────────┘
                         │ - Upload R2 │
                         │ - Send MMS  │
                         └─────────────┘
```

## External Services

### ESPN API
- **Purpose**: Team schedules, live scores, game status
- **Auth**: None (public API)
- **Endpoints**:
  - `/apis/site/v2/sports/{sport}/{league}/teams/{id}/schedule`
  - `/apis/site/v2/sports/{sport}/{league}/scoreboard/{eventId}`

### Cloudflare R2
- **Purpose**: Host generated scoreboard images (public URLs for Twilio)
- **Auth**: S3-compatible API keys
- **Config**: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### Twilio
- **Purpose**: Send MMS with scoreboard image
- **Auth**: Account SID + Auth Token
- **Config**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `RECIPIENT_PHONE_NUMBER`

## Configuration

### Environment Variables
```
# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
RECIPIENT_PHONE_NUMBER=

# Cloudflare R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

### Teams Configuration (`config/teams.json`)
Each team defines:
- `id`: Internal identifier
- `name`: Full team name
- `espnId`: ESPN's team ID
- `sport`: Sport type (football, basketball, hockey, baseball)
- `league`: League identifier (nfl, nba, nhl, mlb, college-football, etc.)
- `color`: Primary team color (hex)
- `pollDelay`: Minutes after game start to begin polling

## Deployment

### Railway
- Single service running `npm start`
- Auto-deploys from GitHub main branch
- Environment variables configured in Railway dashboard
- Public URL: `scoreboard-generator-production.up.railway.app`

### Process Lifecycle
1. Railway starts container
2. `npm start` runs `server.js`
3. Express server binds to `PORT`
4. `startCronJobs()` initializes orchestrator
5. Initial daily check runs immediately
6. Cron jobs scheduled for 6 AM daily and Sunday midnight
7. Process runs indefinitely, scheduling jobs as games occur
