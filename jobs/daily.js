/**
 * Daily Job
 * Runs once per day to check for games and schedule pregame/postgame jobs
 */

import { getTodaysGames, getUpcomingGames, fetchAllSchedules } from '../agents/schedule.js';
import { fetchOpeningOddsForGames } from '../agents/odds.js';
import { jobStarted, jobCompleted, jobFailed, jobScheduled } from '../agents/logger.js';

/**
 * Main daily job function
 * @param {function} schedulePregame - Function to schedule pregame job
 * @param {function} schedulePostgame - Function to schedule postgame job
 * @returns {object} - Summary of scheduled jobs
 */
export async function runDailyJob(schedulePregame, schedulePostgame) {
  const startTime = Date.now();
  jobStarted('daily');

  console.log('\n========================================');
  console.log('Daily Job Started:', new Date().toISOString());
  console.log('========================================\n');

  // Get today's games
  const todaysGames = getTodaysGames();

  if (todaysGames.length === 0) {
    console.log('No Detroit games today.');
    jobCompleted('daily', null, { gamesFound: 0 }, startTime);
    return { gamesFound: 0, scheduled: [] };
  }

  console.log(`Found ${todaysGames.length} Detroit game(s) today:\n`);

  const scheduled = [];

  for (const game of todaysGames) {
    const gameTime = new Date(game.date);
    const now = new Date();

    console.log(`  ${game.team.name} vs ${game.opponent}`);
    console.log(`  Time: ${gameTime.toLocaleString()}`);
    console.log(`  Event ID: ${game.eventId}`);

    // Calculate pregame time (1 hour before)
    const pregameTime = new Date(gameTime.getTime() - 60 * 60 * 1000);

    // Calculate postgame polling start (pollDelay minutes after game start)
    const postgameTime = new Date(gameTime.getTime() + game.team.pollDelay * 60 * 1000);

    // Schedule pregame if it hasn't passed
    if (pregameTime > now) {
      console.log(`  → Scheduling pregame job for ${pregameTime.toLocaleTimeString()}`);
      if (schedulePregame) {
        schedulePregame(game, pregameTime);
        jobScheduled('pregame', game, pregameTime);
      }
    } else {
      console.log(`  → Pregame time already passed`);
    }

    // Schedule postgame if it hasn't passed
    if (postgameTime > now) {
      console.log(`  → Scheduling postgame job for ${postgameTime.toLocaleTimeString()}`);
      if (schedulePostgame) {
        schedulePostgame(game, postgameTime);
        jobScheduled('postgame', game, postgameTime);
      }
    } else {
      console.log(`  → Postgame polling time already passed, checking now...`);
      // If game should be done, schedule immediate check
      if (schedulePostgame) {
        schedulePostgame(game, new Date());
        jobScheduled('postgame', game, new Date());
      }
    }

    scheduled.push({
      game: game,
      pregameTime: pregameTime,
      postgameTime: postgameTime
    });

    console.log('');
  }

  console.log('Daily Job Complete\n');

  jobCompleted('daily', null, { gamesFound: todaysGames.length, scheduledCount: scheduled.length }, startTime);

  return {
    gamesFound: todaysGames.length,
    scheduled: scheduled
  };
}

/**
 * Refresh schedules and fetch opening odds for upcoming games
 */
export async function refreshSchedulesAndOdds() {
  console.log('\n========================================');
  console.log('Weekly Refresh Started:', new Date().toISOString());
  console.log('========================================\n');

  // Fetch fresh schedules from ESPN
  console.log('Fetching schedules from ESPN...');
  await fetchAllSchedules();

  // Get upcoming games for next 7 days
  const upcomingGames = getUpcomingGames(7);
  console.log(`\nFound ${upcomingGames.length} upcoming games in next 7 days`);

  // Fetch opening odds for upcoming games
  if (upcomingGames.length > 0) {
    console.log('Fetching opening odds...');
    await fetchOpeningOddsForGames(upcomingGames);
  }

  console.log('\nWeekly Refresh Complete\n');
}

/**
 * Print upcoming games summary
 */
export function printUpcomingGames() {
  const games = getUpcomingGames(7);

  console.log('\n========================================');
  console.log('Upcoming Detroit Games (Next 7 Days)');
  console.log('========================================\n');

  if (games.length === 0) {
    console.log('No upcoming games found.');
    return;
  }

  for (const game of games) {
    const gameTime = new Date(game.date);
    console.log(`${game.team.name} vs ${game.opponent}`);
    console.log(`  ${gameTime.toLocaleDateString()} at ${gameTime.toLocaleTimeString()}`);
    console.log(`  ${game.home ? 'Home' : 'Away'} | Event ID: ${game.eventId}`);
    console.log('');
  }
}
