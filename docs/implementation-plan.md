# Implementation Plan: Observability Dashboard

## Goal
Add a dashboard to track job events - when they fire, succeed, and fail.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Jobs          │────▶│   Logger        │────▶│   Events Store  │
│ (daily/pre/post)│     │   (agents/)     │     │   (data/events/)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │◀────│   API Endpoints │◀────│   Read Events   │
│   (public/)     │     │   (server.js)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Files to Create

### 1. `agents/logger.js` - Event Logger
Structured event logging with file persistence.

```javascript
// Event types
logEvent(type, data)  // Generic event
jobStarted(jobType, game)
jobCompleted(jobType, game, result)
jobFailed(jobType, game, error)
jobScheduled(jobType, game, scheduledFor)

// Storage: data/events/{date}.jsonl (one JSON object per line)
// Format:
{
  "id": "post-401825475-1706367600000",
  "timestamp": "2026-01-27T15:00:00.000Z",
  "type": "job.completed",
  "jobType": "postgame",
  "eventId": "401825475",
  "team": "Michigan State Spartans MBB",
  "data": { "success": true, "twilioSent": true, "score": "75-68" },
  "duration": 12500
}
```

### 2. `public/dashboard.html` - Observability Dashboard
Single-page dashboard showing:

- **Active Jobs** - Currently running jobs with elapsed time
- **Recent Events** - Last 20 events with status badges
- **Today's Schedule** - Jobs scheduled for today
- **Statistics** - Success rates, counts

UI: Simple table-based layout with Tailwind CSS (matches existing dashboard style).

### 3. API Endpoints (add to `server.js`)

```javascript
GET /api/events              // Recent events (last 24h)
GET /api/events?date=2026-01-27  // Events for specific date
GET /api/events/stats        // Aggregated statistics
```

## Files to Modify

### 1. `jobs/postgame.js`
Add logging calls at key points:
- Job started
- Game final detected
- Image generated
- R2 uploaded
- Twilio sent
- Job completed/failed

### 2. `jobs/pregame.js`
Add logging calls:
- Job started
- Odds captured
- Job completed/failed

### 3. `jobs/daily.js`
Add logging calls:
- Job started
- Games found
- Jobs scheduled
- Job completed

### 4. `orchestrator.js`
Add logging for scheduled jobs.

### 5. `server.js`
- Add event API endpoints
- Serve dashboard.html

## Event Types

| Event | When | Data |
|-------|------|------|
| `job.scheduled` | Daily job schedules pre/postgame | jobType, eventId, scheduledFor |
| `job.started` | Any job begins | jobType, eventId, team |
| `job.completed` | Job finishes successfully | jobType, eventId, result, duration |
| `job.failed` | Job errors | jobType, eventId, error, duration |
| `game.final` | Final score detected | eventId, score |
| `image.generated` | Scoreboard created | eventId, path |
| `r2.uploaded` | Image uploaded to R2 | eventId, url |
| `twilio.sent` | MMS sent | eventId, recipient |
| `odds.captured` | Odds stored | eventId, spread, ou |

## Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│  📊 Pipeline Dashboard                              [Refresh] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  TODAY'S STATS                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 3 Jobs   │ │ 2 ✅     │ │ 1 ❌     │ │ 1 🕐     │        │
│  │ Total    │ │ Success  │ │ Failed   │ │ Pending  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│  SCHEDULED JOBS                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🕐 pregame-401825475  MSU vs Rutgers    5:30 PM (2h)   │ │
│  │ 🕐 postgame-401825475 MSU vs Rutgers    8:30 PM (5h)   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  RECENT EVENTS                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 10:14 AM  ✅ job.completed   daily      3 games found  │ │
│  │ 10:14 AM  📅 job.scheduled   pregame    MSU @ 5:30 PM  │ │
│  │ 10:14 AM  📅 job.scheduled   postgame   MSU @ 8:30 PM  │ │
│  │ Yesterday ✅ job.completed   postgame   Lions WIN 24-20│ │
│  │ Yesterday ✅ twilio.sent     postgame   MMS delivered  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Implementation Order

1. Create `agents/logger.js` with file-based event storage
2. Add API endpoints to `server.js`
3. Create `public/dashboard.html`
4. Instrument `jobs/daily.js`
5. Instrument `jobs/pregame.js`
6. Instrument `jobs/postgame.js`
7. Instrument `orchestrator.js`

## Verification

1. **Local test**: Run `npm start`, check dashboard at `http://localhost:3000/dashboard.html`
2. **Trigger daily job**: Run `node orchestrator.js daily` and verify events appear
3. **Check event files**: Verify `data/events/{date}.jsonl` is created with events
4. **API test**: `curl http://localhost:3000/api/events` returns JSON
5. **Deploy to Railway**: Push and verify dashboard works on production URL
