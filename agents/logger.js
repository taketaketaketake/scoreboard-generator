/**
 * Event Logger Agent
 * Structured event logging with file persistence for observability
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVENTS_DIR = join(__dirname, '..', 'data', 'events');

// Ensure events directory exists
mkdirSync(EVENTS_DIR, { recursive: true });

/**
 * Get the current date string in YYYY-MM-DD format (Detroit timezone)
 * @returns {string}
 */
function getDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Detroit' });
}

/**
 * Get the events file path for a given date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {string}
 */
function getEventsFilePath(date) {
  return join(EVENTS_DIR, `${date}.jsonl`);
}

/**
 * Log a generic event
 * @param {string} type - Event type (e.g., 'job.started', 'job.completed')
 * @param {object} data - Event data
 */
export function logEvent(type, data = {}) {
  const event = {
    id: `${type.replace('.', '-')}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    ...data
  };

  const filePath = getEventsFilePath(getDateString());
  const line = JSON.stringify(event) + '\n';

  try {
    writeFileSync(filePath, line, { flag: 'a' });
    console.log(`[Logger] ${type}: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error(`[Logger] Failed to write event: ${error.message}`);
  }

  return event;
}

/**
 * Log job started event
 * @param {string} jobType - Type of job (daily, pregame, postgame)
 * @param {object} game - Game object (optional)
 */
export function jobStarted(jobType, game = null) {
  return logEvent('job.started', {
    jobType,
    eventId: game?.eventId || null,
    team: game?.team?.name || null
  });
}

/**
 * Log job completed event
 * @param {string} jobType - Type of job
 * @param {object} game - Game object (optional)
 * @param {object} result - Result data
 * @param {number} startTime - Start timestamp for duration calculation
 */
export function jobCompleted(jobType, game = null, result = {}, startTime = null) {
  return logEvent('job.completed', {
    jobType,
    eventId: game?.eventId || null,
    team: game?.team?.name || null,
    result,
    duration: startTime ? Date.now() - startTime : null
  });
}

/**
 * Log job failed event
 * @param {string} jobType - Type of job
 * @param {object} game - Game object (optional)
 * @param {string} error - Error message
 * @param {number} startTime - Start timestamp for duration calculation
 */
export function jobFailed(jobType, game = null, error, startTime = null) {
  return logEvent('job.failed', {
    jobType,
    eventId: game?.eventId || null,
    team: game?.team?.name || null,
    error: error?.message || error,
    duration: startTime ? Date.now() - startTime : null
  });
}

/**
 * Log job scheduled event
 * @param {string} jobType - Type of job
 * @param {object} game - Game object
 * @param {Date} scheduledFor - Scheduled time
 */
export function jobScheduled(jobType, game, scheduledFor) {
  return logEvent('job.scheduled', {
    jobType,
    eventId: game?.eventId || null,
    team: game?.team?.name || null,
    opponent: game?.opponent || null,
    scheduledFor: scheduledFor?.toISOString() || null
  });
}

/**
 * Log game final detected
 * @param {string} eventId - Game event ID
 * @param {string} score - Score string (e.g., "24-17")
 */
export function gameFinal(eventId, score) {
  return logEvent('game.final', { eventId, score });
}

/**
 * Log image generated
 * @param {string} eventId - Game event ID
 * @param {string} path - Output path
 */
export function imageGenerated(eventId, path) {
  return logEvent('image.generated', { eventId, path });
}

/**
 * Log R2 upload
 * @param {string} eventId - Game event ID
 * @param {string} url - Public URL
 */
export function r2Uploaded(eventId, url) {
  return logEvent('r2.uploaded', { eventId, url });
}

/**
 * Log Twilio MMS sent
 * @param {string} eventId - Game event ID
 * @param {string} recipient - Recipient phone number
 */
export function twilioSent(eventId, recipient) {
  return logEvent('twilio.sent', { eventId, recipient });
}

/**
 * Log odds captured
 * @param {string} eventId - Game event ID
 * @param {number} spread - Spread value
 * @param {number} overUnder - Over/under value
 */
export function oddsCaptured(eventId, spread, overUnder) {
  return logEvent('odds.captured', { eventId, spread, overUnder });
}

/**
 * Read events from a specific date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Array} - Array of event objects
 */
export function readEvents(date) {
  const filePath = getEventsFilePath(date);

  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch (error) {
    console.error(`[Logger] Failed to read events: ${error.message}`);
    return [];
  }
}

/**
 * Read events from recent days
 * @param {number} days - Number of days to look back
 * @returns {Array} - Array of event objects sorted by timestamp (newest first)
 */
export function readRecentEvents(days = 1) {
  const events = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    events.push(...readEvents(dateStr));
  }

  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Get event statistics
 * @param {number} days - Number of days to analyze
 * @returns {object} - Statistics object
 */
export function getStats(days = 1) {
  const events = readRecentEvents(days);

  const stats = {
    total: events.length,
    byType: {},
    jobs: {
      started: 0,
      completed: 0,
      failed: 0,
      scheduled: 0
    },
    successRate: 0
  };

  for (const event of events) {
    // Count by type
    stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

    // Count job events
    if (event.type === 'job.started') stats.jobs.started++;
    if (event.type === 'job.completed') stats.jobs.completed++;
    if (event.type === 'job.failed') stats.jobs.failed++;
    if (event.type === 'job.scheduled') stats.jobs.scheduled++;
  }

  // Calculate success rate
  const totalFinished = stats.jobs.completed + stats.jobs.failed;
  if (totalFinished > 0) {
    stats.successRate = Math.round((stats.jobs.completed / totalFinished) * 100);
  }

  return stats;
}

/**
 * List available event dates
 * @returns {Array} - Array of date strings
 */
export function listEventDates() {
  try {
    const files = readdirSync(EVENTS_DIR);
    return files
      .filter(f => f.endsWith('.jsonl'))
      .map(f => f.replace('.jsonl', ''))
      .sort()
      .reverse();
  } catch (error) {
    return [];
  }
}
