# Scoreboard Generator

Headless Node.js image generator for sports scoreboards. Takes a JSON payload, outputs a 1080x1080 PNG.

Built for automation pipelines and AI agents.

## How It Works

```
JSON Payload → generateScoreboard() → PNG Image
```

The generator composites multiple image layers:

1. **Background** - City/scene image (full canvas)
2. **Frame** - Scoreboard panels, VS badge, status bar (scaled/positioned)
3. **Header** - Title banner (positioned independently)
4. **Text** - Team names and scores (drawn on top)

## Quick Start

```bash
# Install dependencies
npm install

# Run test (generates sample image)
node src/test.js

# Output: output/scoreboards/2026-01-12/test_game.png
```

## Usage

```js
import { generateScoreboard } from './src/index.js';

await generateScoreboard({
  background: "background",
  left: {
    team: "LIONS",
    score: 24,
    color: "#005A8B"
  },
  right: {
    team: "PISTONS",
    score: 112,
    color: "#C8102E"
  },
  status: "FINAL",
  outputPath: "./output/my_game.png"
});
```

## Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background` | string | Yes | Filename in `assets/backgrounds/` (without extension) |
| `left.team` | string | Yes | Left team name |
| `left.score` | integer | Yes | Left team score (0-999) |
| `left.color` | string | Yes | Hex color (e.g., `#005A8B`) |
| `right.team` | string | Yes | Right team name |
| `right.score` | integer | Yes | Right team score (0-999) |
| `right.color` | string | Yes | Hex color (e.g., `#C8102E`) |
| `status` | string | Yes | `FINAL`, `LIVE`, or `UPCOMING` |
| `outputPath` | string | Yes | Output file path |

## Configuration

All positioning controlled in `src/config/coordinates.js`:

```js
FRAME: {
  scale: 0.85,    // Scoreboard size (0.85 = 85% of canvas)
  x: 81,          // Horizontal position
  y: 250          // Vertical position (higher = lower)
},
HEADER: { y: -210 },  // Header vertical position
```

## Project Structure

```
scoreboard-generator/
├── src/
│   ├── index.js              # Entry point (exports generateScoreboard)
│   ├── generateScoreboard.js # Main render function
│   ├── test.js               # Test script with sample payload
│   ├── config/
│   │   ├── canvas.js         # Canvas dimensions (1080x1080)
│   │   ├── coordinates.js    # All positions and scaling
│   │   └── colors.js         # Color constants
│   └── utils/
│       ├── loadAssets.js     # Image and font loaders
│       ├── validatePayload.js # Payload validation (fail-fast)
│       └── text.js           # Text rendering helpers
├── assets/
│   ├── backgrounds/          # Background images
│   ├── frames/               # Scoreboard frame overlay
│   ├── header/               # Header banner
│   └── fonts/                # Inter font files
├── output/                   # Generated images (gitignored)
└── package.json
```

## Design Principles

- **Deterministic** - Same payload always produces same image
- **Fail-fast** - Invalid payloads throw immediately with clear errors
- **Assets over logic** - Visual elements are images, not code
- **Configurable** - All positions in one file, no magic numbers in render code

## Requirements

- Node.js 18+
- Fonts: `Inter_24pt-Bold.ttf`, `Inter_18pt-ExtraBold.ttf` in `assets/fonts/`

## Integration

This is a standalone image generator. To integrate with a pipeline:

```js
// Your pipeline/agent code
import { generateScoreboard } from './src/index.js';

// Build payload from your data source (API, database, user input)
const payload = buildPayload(gameData);

// Generate image
const result = await generateScoreboard(payload);
// result: { success: true, path: "./output/game.png" }
```

No HTTP server or CLI required - just import and call the function.
