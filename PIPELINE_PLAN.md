# Detroit Sports Pipeline - Implementation Plan

## Overview

Automated pipeline that monitors Detroit sports teams, captures game data and odds, and generates scorecard images when games end.

```
Schedules → Odds Capture → Game Monitoring → Score Detection → Image Generation → Publishing
```

---

## Project Structure

```
detroit-sports-pipeline/
├── config/
│   ├── teams.json              # Team definitions + ESPN IDs
│   └── schedules/              # Cached season schedules
│       ├── lions_2026.json
│       ├── pistons_2026.json
│       ├── tigers_2026.json
│       └── redwings_2026.json
│
├── data/
│   ├── odds/                   # Captured odds (opening + closing)
│   └── games/                  # Completed game records
│
├── agents/
│   ├── schedule.js             # Fetches/stores season schedules
│   ├── odds.js                 # Captures betting lines
│   ├── scores.js               # Polls for final scores
│   ├── normalize.js            # ESPN format → internal format
│   ├── decision.js             # Should we generate content?
│   └── content.js              # Builds generator payload
│
├── jobs/
│   ├── daily.js                # Daily schedule check
│   ├── pregame.js              # Pre-game odds capture
│   └── postgame.js             # Post-game polling + generation
│
├── generator/                  # Existing scoreboard-generator
│   ├── src/
│   ├── assets/
│   └── package.json
│
├── orchestrator.js             # Main pipeline coordinator
├── package.json
└── README.md
```

---

## Phase 1: Configuration

### 1.1 Create `config/teams.json`

```json
{
  "teams": [
    {
      "id": "lions",
      "name": "Detroit Lions",
      "displayName": "LIONS",
      "espnId": 8,
      "sport": "football",
      "league": "nfl",
      "color": "#005A8B",
      "pollDelay": 150
    },
    {
      "id": "pistons",
      "name": "Detroit Pistons",
      "displayName": "PISTONS",
      "espnId": 10,
      "sport": "basketball",
      "league": "nba",
      "color": "#C8102E",
      "pollDelay": 120
    },
    {
      "id": "tigers",
      "name": "Detroit Tigers",
      "displayName": "TIGERS",
      "espnId": 6,
      "sport": "baseball",
      "league": "mlb",
      "color": "#0C2340",
      "pollDelay": 150
    },
    {
      "id": "redwings",
      "name": "Detroit Red Wings",
      "displayName": "RED WINGS",
      "espnId": 11,
      "sport": "hockey",
      "league": "nhl",
      "color": "#CE1126",
      "pollDelay": 120
    }
  ]
}
```

### 1.2 Create `config/opponents.json`

```json
{
  "nfl": {
    "CHI": { "name": "Bears", "color": "#0B162A" },
    "GB": { "name": "Packers", "color": "#203731" }
  },
  "nba": {
    "LAL": { "name": "Lakers", "color": "#552583" }
  }
}
```

Populated as needed - maps team abbreviations to display names and colors.

---

## Phase 2: Agents

### 2.1 Schedule Agent (`agents/schedule.js`)

**Purpose:** Fetch and store season schedules for all teams.

**Runs:** Once per week (schedules rarely change).

**ESPN Endpoint:**
```
https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{espnId}/schedule
```

**Output:** `config/schedules/{teamId}_{year}.json`

```json
[
  {
    "eventId": "401547417",
    "date": "2026-09-10T00:20:00Z",
    "opponent": "Kansas City Chiefs",
    "opponentAbbr": "KC",
    "home": false,
    "status": "STATUS_SCHEDULED"
  }
]
```

**Functions:**
- `fetchSchedule(team)` - Fetch from ESPN
- `storeSchedule(teamId, schedule)` - Write to JSON
- `getSchedule(teamId)` - Read from JSON
- `getTodaysGames()` - Filter all schedules for today
- `getUpcomingGames(days)` - Next N days across all teams

---

### 2.2 Odds Agent (`agents/odds.js`)

**Purpose:** Capture betting lines before games.

**Runs:**
- When schedule is fetched (opening lines)
- 1 hour before game time (closing lines)

**ESPN Endpoint:**
```
https://sports.core.api.espn.com/v2/sports/{sport}/leagues/{league}/events/{eventId}/competitions/{eventId}/odds
```

**Output:** `data/odds/{eventId}.json`

```json
{
  "eventId": "401547417",
  "opening": {
    "spread": -3.5,
    "moneyline": -180,
    "overUnder": 47.5,
    "favorite": "DET",
    "capturedAt": "2026-09-08T12:00:00Z"
  },
  "closing": {
    "spread": -7,
    "moneyline": -280,
    "overUnder": 49.5,
    "favorite": "DET",
    "capturedAt": "2026-09-10T23:00:00Z"
  }
}
```

**Functions:**
- `fetchOdds(eventId, sport, league)` - Fetch from ESPN
- `storeOpeningOdds(eventId, odds)` - Store opening line
- `storeClosingOdds(eventId, odds)` - Store closing line
- `getOdds(eventId)` - Read stored odds

---

### 2.3 Scores Agent (`agents/scores.js`)

**Purpose:** Poll for final scores after games should be ending.

**Runs:** Starting 90-150 min after game time, every 5 min until final.

**ESPN Endpoint:**
```
https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard
```

**Functions:**
- `fetchScoreboard(sport, league)` - Get today's scores
- `getGameStatus(eventId)` - Check specific game status
- `pollUntilFinal(eventId, sport, league)` - Loop until STATUS_FINAL
- `extractFinalScore(event)` - Parse score from ESPN response

**Status Values:**
- `STATUS_SCHEDULED` - Not started
- `STATUS_IN_PROGRESS` - Live
- `STATUS_HALFTIME` - Halftime
- `STATUS_FINAL` - Ended
- `STATUS_POSTPONED` - Delayed

---

### 2.4 Normalize Agent (`agents/normalize.js`)

**Purpose:** Convert ESPN data to internal format.

**Functions:**
- `normalizeTeamName(espnName)` - "Detroit Lions" → "LIONS"
- `normalizeScore(scoreString)` - "24" → 24
- `normalizeGameData(espnEvent, team)` - Full transformation
- `getTeamColor(abbr, league)` - Lookup color from config

**Input (ESPN):**
```json
{
  "competitions": [{
    "competitors": [
      { "team": { "abbreviation": "DET" }, "score": "31", "homeAway": "away" },
      { "team": { "abbreviation": "CHI" }, "score": "17", "homeAway": "home" }
    ]
  }]
}
```

**Output (Internal):**
```json
{
  "leftTeam": { "name": "LIONS", "score": 31, "color": "#005A8B" },
  "rightTeam": { "name": "BEARS", "score": 17, "color": "#0B162A" },
  "home": "right",
  "winner": "left",
  "margin": 14
}
```

---

### 2.5 Decision Agent (`agents/decision.js`)

**Purpose:** Determine if/how to generate content.

**Rules:**
- Only generate for Detroit teams (already filtered)
- Only generate for STATUS_FINAL
- Flag "upset" if underdog wins
- Flag "blowout" if margin ≥ 14 (NFL) / 20 (NBA) / 5 (NHL) / 6 (MLB)
- Set tone: win = "confident", loss = "neutral"

**Functions:**
- `shouldGenerate(gameData)` - Returns boolean
- `analyzeGame(gameData, odds)` - Returns flags/metadata
- `getTone(gameData)` - Returns tone string

**Output:**
```json
{
  "generate": true,
  "isWin": true,
  "isUpset": false,
  "isBlowout": true,
  "tone": "confident",
  "margin": 14
}
```

---

### 2.6 Content Agent (`agents/content.js`)

**Purpose:** Build final payload for image generator.

**Input:** Normalized game data + decision metadata + odds

**Output:** Generator-ready payload

```json
{
  "background": "background",
  "left": {
    "team": "LIONS",
    "score": 31,
    "color": "#005A8B"
  },
  "right": {
    "team": "BEARS",
    "score": 17,
    "color": "#0B162A"
  },
  "status": "FINAL",
  "outputPath": "./output/2026-09-10/lions_bears_401547417.png"
}
```

**Functions:**
- `buildPayload(gameData, decision)` - Construct full payload
- `getOutputPath(gameData)` - Generate dated output path

---

## Phase 3: Jobs (Scheduled Tasks)

### 3.1 Daily Job (`jobs/daily.js`)

**Runs:** Once per day (6 AM)

**Tasks:**
1. Check schedules for today's games
2. Log upcoming games
3. Schedule pregame/postgame jobs for each game

```js
async function dailyJob() {
  const todaysGames = getTodaysGames();

  for (const game of todaysGames) {
    // Schedule odds capture 1 hour before
    scheduleJob(game.date - 1hr, () => pregameJob(game));

    // Schedule polling to start after expected end
    const pollStart = game.date + game.team.pollDelay;
    scheduleJob(pollStart, () => postgameJob(game));
  }
}
```

---

### 3.2 Pregame Job (`jobs/pregame.js`)

**Runs:** 1 hour before each game

**Tasks:**
1. Fetch closing odds
2. Store odds data

```js
async function pregameJob(game) {
  const odds = await fetchOdds(game.eventId, game.sport, game.league);
  await storeClosingOdds(game.eventId, odds);
}
```

---

### 3.3 Postgame Job (`jobs/postgame.js`)

**Runs:** 90-150 min after game start, polls every 5 min

**Tasks:**
1. Poll until STATUS_FINAL
2. Normalize data
3. Run decision logic
4. Build payload
5. Generate image
6. (Future) Publish

```js
async function postgameJob(game) {
  // Poll until final
  const finalData = await pollUntilFinal(game.eventId, game.sport, game.league);

  // Normalize
  const normalized = normalizeGameData(finalData, game.team);

  // Decision
  const odds = getOdds(game.eventId);
  const decision = analyzeGame(normalized, odds);

  if (!decision.generate) return;

  // Build payload
  const payload = buildPayload(normalized, decision);

  // Generate image
  await generateScoreboard(payload);

  // Store record
  await storeCompletedGame(game.eventId, { normalized, decision, payload });
}
```

---

## Phase 4: Orchestrator

### `orchestrator.js`

Main entry point that coordinates everything.

```js
import cron from 'node-cron';
import { dailyJob } from './jobs/daily.js';
import { fetchAllSchedules } from './agents/schedule.js';
import { fetchOpeningOdds } from './agents/odds.js';

// Weekly: Refresh schedules
cron.schedule('0 0 * * 0', async () => {
  await fetchAllSchedules();
  await fetchOpeningOdds();
});

// Daily: Check for games
cron.schedule('0 6 * * *', dailyJob);

// Manual trigger
export async function runPipeline() {
  await dailyJob();
}
```

---

## Phase 5: Integration with Generator

The existing `scoreboard-generator` becomes a submodule/folder.

```js
// In agents/content.js or jobs/postgame.js
import { generateScoreboard } from '../generator/src/index.js';

const payload = buildPayload(normalized, decision);
const result = await generateScoreboard(payload);
// result: { success: true, path: "./output/..." }
```

---

## Implementation Order

### Week 1: Foundation
1. [ ] Create project structure
2. [ ] Create `config/teams.json`
3. [ ] Create `config/opponents.json` (starter)
4. [ ] Move scoreboard-generator into `generator/`

### Week 2: Data Agents
5. [ ] Build Schedule Agent
6. [ ] Build Odds Agent
7. [ ] Build Scores Agent
8. [ ] Test each agent independently

### Week 3: Processing Agents
9. [ ] Build Normalize Agent
10. [ ] Build Decision Agent
11. [ ] Build Content Agent
12. [ ] Test full data flow manually

### Week 4: Automation
13. [ ] Build Daily Job
14. [ ] Build Pregame Job
15. [ ] Build Postgame Job
16. [ ] Build Orchestrator with cron
17. [ ] End-to-end testing

### Week 5: Polish
18. [ ] Error handling + retries
19. [ ] Logging
20. [ ] Deployment setup

---

## Testing Strategy

### Manual Testing (During Development)
```bash
# Test schedule fetch
node -e "import('./agents/schedule.js').then(m => m.fetchSchedule('lions'))"

# Test odds fetch
node -e "import('./agents/odds.js').then(m => m.fetchOdds('401547417', 'football', 'nfl'))"

# Test full pipeline with mock data
node test/pipeline.test.js
```

### Integration Test
```js
// test/integration.js
// Uses a known completed game to test full flow
const KNOWN_GAME = '401547417';  // A past Lions game

const score = await fetchGameSummary(KNOWN_GAME);
const normalized = normalizeGameData(score);
const decision = analyzeGame(normalized);
const payload = buildPayload(normalized, decision);
await generateScoreboard(payload);
// Verify image exists
```

---

## Environment

### Dependencies
```json
{
  "dependencies": {
    "node-cron": "^3.0.0",
    "@napi-rs/canvas": "^0.1.65"
  }
}
```

### Running
```bash
# Development - manual triggers
node orchestrator.js

# Production - runs cron jobs
node --experimental-modules orchestrator.js
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           WEEKLY                                         │
│  Schedule Agent → config/schedules/*.json                               │
│  Odds Agent (opening) → data/odds/*.json                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DAILY (6 AM)                                   │
│  Daily Job: "Any Detroit games today?"                                  │
│  → Schedule pregame job (game time - 1hr)                               │
│  → Schedule postgame job (game time + 90-150min)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PREGAME (-1 hour)                                 │
│  Odds Agent (closing) → data/odds/*.json                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     POSTGAME (+90-150 min)                               │
│                                                                          │
│  Scores Agent ─── poll every 5 min until FINAL                          │
│       │                                                                  │
│       ▼                                                                  │
│  Normalize Agent ─── ESPN format → internal format                      │
│       │                                                                  │
│       ▼                                                                  │
│  Decision Agent ─── should we generate? flags? tone?                    │
│       │                                                                  │
│       ▼                                                                  │
│  Content Agent ─── build generator payload                              │
│       │                                                                  │
│       ▼                                                                  │
│  generateScoreboard(payload) ─── PNG                                    │
│       │                                                                  │
│       ▼                                                                  │
│  (Future) Publish                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Notes

- **No AI needed** for data agents - just API calls and transforms
- **Decision Agent** could use AI later for dynamic captions
- **Polling is cheap** - ESPN's API is free and fast
- **Store everything** - odds history enables future insights
- **Fail gracefully** - if ESPN is down, retry; don't crash
