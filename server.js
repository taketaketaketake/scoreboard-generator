/**
 * Web Server
 * Serves the dashboard and API endpoints
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getUpcomingGames, getTodaysGames } from './agents/schedule.js';
import { getOdds } from './agents/odds.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// API: Get upcoming games
app.get('/api/upcoming', (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const games = getUpcomingGames(days);
  res.json(games);
});

// API: Get today's games
app.get('/api/today', (req, res) => {
  const games = getTodaysGames();
  res.json(games);
});

// API: Get odds for a game
app.get('/api/odds/:eventId', (req, res) => {
  const odds = getOdds(req.params.eventId);
  res.json(odds || { message: 'No odds available' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
