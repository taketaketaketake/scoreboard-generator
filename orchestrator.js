/**
 * Orchestrator
 * Main entry point that coordinates the entire pipeline
 * Runs cron jobs for scheduling and monitoring games
 */

import 'dotenv/config';
import cron from 'node-cron';
import { runDailyJob, refreshSchedulesAndOdds, printUpcomingGames } from './jobs/daily.js';
import { runPregameJob } from './jobs/pregame.js';
import { runPostgameJob } from './jobs/postgame.js';

// Store scheduled timeouts so we can track them
const scheduledJobs = new Map();

/**
 * Schedule a job to run at a specific time
 * @param {string} name - Job name for logging
 * @param {Date} time - When to run
 * @param {function} fn - Function to execute
 */
function scheduleAt(name, time, fn) {
  const now = new Date();
  const delay = time.getTime() - now.getTime();

  if (delay <= 0) {
    console.log(`[Scheduler] ${name} - Running immediately (time already passed)`);
    fn();
    return;
  }

  console.log(`[Scheduler] ${name} - Scheduled for ${time.toLocaleString()} (in ${Math.round(delay / 60000)} minutes)`);

  const timeout = setTimeout(() => {
    console.log(`[Scheduler] ${name} - Executing now`);
    scheduledJobs.delete(name);
    fn();
  }, delay);

  scheduledJobs.set(name, timeout);
}

/**
 * Schedule pregame job for a game
 * @param {object} game - Game object
 * @param {Date} time - When to run
 */
function schedulePregame(game, time) {
  const jobName = `pregame-${game.eventId}`;
  scheduleAt(jobName, time, () => runPregameJob(game));
}

/**
 * Schedule postgame job for a game
 * @param {object} game - Game object
 * @param {Date} time - When to start polling
 */
function schedulePostgame(game, time) {
  const jobName = `postgame-${game.eventId}`;
  scheduleAt(jobName, time, () => runPostgameJob(game));
}

/**
 * Run the daily check manually
 */
async function runDailyCheck() {
  await runDailyJob(schedulePregame, schedulePostgame);
}

/**
 * Start cron jobs only (for use when imported by server.js)
 * This allows the orchestrator to run alongside the web server in a single process
 */
export function startCronJobs() {
  console.log('[Orchestrator] Starting cron jobs...');

  // Daily job at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('\n[Cron] Running daily job...');
    await runDailyCheck();
  }, {
    timezone: 'America/Detroit'
  });

  // Weekly refresh on Sunday at midnight
  cron.schedule('0 0 * * 0', async () => {
    console.log('\n[Cron] Running weekly refresh...');
    await refreshSchedulesAndOdds();
  }, {
    timezone: 'America/Detroit'
  });

  console.log('[Orchestrator] Cron jobs scheduled (daily 6AM, weekly Sunday 12AM)');

  // Run initial daily check
  console.log('[Orchestrator] Running initial daily check...');
  runDailyCheck();
}

/**
 * Start the orchestrator with cron scheduling (standalone mode)
 */
function startOrchestrator() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Detroit Sports Pipeline Orchestrator     ║');
  console.log('║                                            ║');
  console.log('║   Cron Jobs:                               ║');
  console.log('║   - Daily check: 6:00 AM                   ║');
  console.log('║   - Weekly refresh: Sunday 12:00 AM        ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log('Started at:', new Date().toISOString());
  console.log('');

  startCronJobs();

  console.log('Press Ctrl+C to stop.\n');
}

/**
 * CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start':
    case undefined:
      // Default: start the orchestrator
      startOrchestrator();
      break;

    case 'daily':
      // Run daily check once
      await runDailyCheck();
      process.exit(0);
      break;

    case 'refresh':
      // Refresh schedules and odds
      await refreshSchedulesAndOdds();
      process.exit(0);
      break;

    case 'upcoming':
      // Print upcoming games
      printUpcomingGames();
      process.exit(0);
      break;

    case 'help':
      console.log(`
Detroit Sports Pipeline Orchestrator

Usage: node orchestrator.js [command]

Commands:
  start     Start the orchestrator with cron jobs (default)
  daily     Run daily check once and exit
  refresh   Refresh schedules and fetch opening odds
  upcoming  Print upcoming games for next 7 days
  help      Show this help message

Examples:
  node orchestrator.js              # Start with cron jobs
  node orchestrator.js daily        # Check for today's games
  node orchestrator.js refresh      # Fetch fresh schedules
  node orchestrator.js upcoming     # See upcoming games
`);
      process.exit(0);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "node orchestrator.js help" for usage');
      process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down orchestrator...');

  // Clear all scheduled jobs
  for (const [name, timeout] of scheduledJobs) {
    clearTimeout(timeout);
    console.log(`Cancelled: ${name}`);
  }

  console.log('Goodbye!');
  process.exit(0);
});

// Only run main() if this file is executed directly (not imported)
if (process.argv[1] && process.argv[1].includes('orchestrator.js')) {
  main().catch(console.error);
}
