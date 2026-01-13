# Scoreboard Generator

Headless Node.js image generator for sports scoreboards with automated Detroit sports pipeline.

## Quick Start

```bash
git clone https://github.com/taketaketaketake/scoreboard-generator.git
cd scoreboard-generator
npm install   # Installs dependencies + sets up git hooks
```

## Features

- **Image Generator** - JSON payload → 1080x1080 PNG
- **Automated Pipeline** - Monitors Detroit Lions, Pistons, Tigers, Red Wings
- **ESPN Integration** - Fetches schedules, scores, and odds automatically
- **Cron Scheduling** - Daily game checks, pregame odds capture, postgame image generation

## Pipeline Commands

```bash
# Start orchestrator with cron jobs (6 AM daily check)
npm start

# Or run individual commands:
node orchestrator.js daily     # Check for today's games
node orchestrator.js refresh   # Fetch fresh schedules from ESPN
node orchestrator.js upcoming  # Show next 7 days of games
node orchestrator.js help      # Show all commands
```

## How the Pipeline Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR                            │
│                    (cron: 6 AM daily)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DAILY JOB                               │
│              Check stored schedules for today's games           │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────┐        ┌──────────────────────┐
│     PREGAME JOB      │        │    POSTGAME JOB      │
│  (1 hour before)     │        │  (after game ends)   │
│  Capture closing     │        │  Poll for final      │
│  odds                │        │  score, generate     │
└──────────────────────┘        │  scoreboard image    │
                                └──────────────────────┘
```

## Image Generator

```js
import { generateScoreboard } from './src/index.js';

await generateScoreboard({
  background: "background",
  left: { team: "LIONS", score: 24, color: "#005A8B" },
  right: { team: "BEARS", score: 17, color: "#0B162A" },
  status: "FINAL",
  outputPath: "./output/game.png"
});
```

### Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background` | string | Yes | Filename in `assets/backgrounds/` |
| `left.team` | string | Yes | Left team name |
| `left.score` | integer | Yes | Score (0-999) |
| `left.color` | string | Yes | Hex color |
| `right.team` | string | Yes | Right team name |
| `right.score` | integer | Yes | Score (0-999) |
| `right.color` | string | Yes | Hex color |
| `status` | string | Yes | `FINAL`, `LIVE`, or `UPCOMING` |
| `outputPath` | string | Yes | Output file path |

## Project Structure

```
scoreboard-generator/
├── orchestrator.js           # Main entry point with cron scheduling
├── agents/
│   ├── schedule.js           # Fetch/store ESPN schedules
│   ├── scores.js             # Poll for final scores
│   ├── odds.js               # Capture betting odds
│   ├── normalize.js          # ESPN → internal format
│   ├── decision.js           # Analyze game (blowout, upset)
│   └── content.js            # Build image payload
├── jobs/
│   ├── daily.js              # Daily game check
│   ├── pregame.js            # Capture closing odds
│   └── postgame.js           # Generate scoreboard after game
├── config/
│   ├── teams.json            # Detroit teams (ESPN IDs, colors)
│   ├── opponents.json        # All NFL/NBA/MLB/NHL teams
│   └── schedules/            # Stored season schedules
├── src/
│   ├── index.js              # Image generator entry point
│   ├── generateScoreboard.js # Canvas rendering
│   └── config/               # Canvas dimensions, coordinates
├── assets/
│   ├── backgrounds/          # Background images
│   ├── frames/               # Scoreboard frame overlay
│   ├── header/               # Header banner
│   └── fonts/                # Inter font files
├── scripts/
│   └── setup.js              # Git hooks setup (runs on npm install)
└── output/                   # Generated images (gitignored)
```

## Configuration

### Teams (`config/teams.json`)

```json
{
  "teams": [
    { "id": "lions", "espnId": 8, "sport": "football", "league": "nfl" },
    { "id": "pistons", "espnId": 8, "sport": "basketball", "league": "nba" },
    { "id": "tigers", "espnId": 6, "sport": "baseball", "league": "mlb" },
    { "id": "redwings", "espnId": 5, "sport": "hockey", "league": "nhl" }
  ]
}
```

### Image Positioning (`src/config/coordinates.js`)

```js
FRAME: { scale: 0.85, x: 81, y: 250 },
HEADER: { scale: 0.765, y: -180 }
```

## Data Storage

| Data | Location | Frequency |
|------|----------|-----------|
| Season schedules | `config/schedules/{team}_{year}.json` | Once per season |
| Opening/closing odds | `data/odds/{eventId}.json` | Per game |
| Game records | `data/games/{eventId}.json` | After each game |

Schedules rarely change - fetch once at season start with `node orchestrator.js refresh`.

## Requirements

- Node.js 18+
- Fonts in `assets/fonts/`: `Inter_24pt-Bold.ttf`, `Inter_18pt-ExtraBold.ttf`

## NPM Scripts

```bash
npm start              # Start orchestrator with cron
npm run setup          # Install git hooks manually
npm test               # Test image generator
npm run test:pipeline  # Test all pipeline agents
npm run fetch:schedules # Fetch all team schedules
npm run check:today    # Check for today's games
```
