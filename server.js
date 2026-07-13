/**
 * Web Server
 * Serves the dashboard and API endpoints
 */

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getUpcomingGames, getTodaysGames } from './agents/schedule.js';
import { getOdds } from './agents/odds.js';
import { startCronJobs, getScheduledJobs } from './orchestrator.js';
import { readEvents, readRecentEvents, getStats, listEventDates } from './agents/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://pub-d0714c2682ac4db6ba129c2044cd3629.r2.dev"],
    },
  },
}));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Serve generated scoreboard images
app.use('/output', express.static(join(__dirname, 'output')));

// API: Get upcoming games
app.get('/api/upcoming', (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 30);
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
  const eventId = req.params.eventId.replace(/[^a-zA-Z0-9]/g, '');
  if (!eventId) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }
  const odds = getOdds(eventId);
  res.json(odds || { message: 'No odds available' });
});

// API: Get events (for observability dashboard)
app.get('/api/events', (req, res) => {
  const date = req.query.date;
  const days = Math.min(Math.max(parseInt(req.query.days) || 1, 1), 7);

  if (date) {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    res.json(readEvents(date));
  } else {
    res.json(readRecentEvents(days));
  }
});

// API: Get event statistics
app.get('/api/events/stats', (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 1, 1), 30);
  res.json(getStats(days));
});

// API: List available event dates
app.get('/api/events/dates', (req, res) => {
  res.json(listEventDates());
});

// API: Get scheduled jobs
app.get('/api/scheduled', (req, res) => {
  res.json(getScheduledJobs());
});

// API: Render a TAKEDETROIT news card → PNG
// Body: { headline, accentPhrase?, subtext?, source?, badge1?, badge2?,
//         badgeColor?, photo?, youtube?, size? ("feed"|"story"|"square") }
app.post('/api/render', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    const { generateNewsCard } = await import('./src/generateNewsCard.js');
    const buf = await generateNewsCard(req.body || {});
    res.set('Content-Type', 'image/png');
    res.send(buf);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// API: Trigger the daily social job manually
// Body (optional): { count?, send? }
app.post('/api/social/run', express.json(), async (req, res) => {
  try {
    const { runSocialJob } = await import('./jobs/social.js');
    const { count, send } = req.body || {};
    const result = await runSocialJob({ count, send });
    res.json({
      picked: result.picks.map((p) => ({ title: p.title, badge: p.badge1, source: p.source, caption: p.caption })),
      cards: result.cards.map((c) => ({
        feed: c.files.feed.url || c.files.feed.path,
        story: c.files.story.url || c.files.story.path,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

  // Start the orchestrator cron jobs
  startCronJobs();
});
