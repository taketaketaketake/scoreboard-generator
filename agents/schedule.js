import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', 'config');
const SCHEDULES_DIR = join(CONFIG_DIR, 'schedules');

// Load teams config
const teams = JSON.parse(readFileSync(join(CONFIG_DIR, 'teams.json'), 'utf-8')).teams;

/**
 * Fetch schedule for a team from ESPN
 * @param {object} team - Team object from config
 * @returns {Promise<Array>} - Array of games
 */
export async function fetchSchedule(team) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/teams/${team.espnId}/schedule`;

  console.log(`Fetching schedule for ${team.name}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch schedule for ${team.name}: ${response.status}`);
  }

  const data = await response.json();

  // Transform to simpler format
  const schedule = data.events.map(event => {
    const competition = event.competitions[0];
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
    const isHome = homeTeam?.team?.abbreviation === team.displayName ||
                   homeTeam?.team?.id == team.espnId;

    const opponent = isHome ? awayTeam : homeTeam;

    return {
      eventId: event.id,
      date: event.date,
      name: event.name,
      shortName: event.shortName,
      opponent: opponent?.team?.displayName || 'TBD',
      opponentAbbr: opponent?.team?.abbreviation || 'TBD',
      home: isHome,
      status: competition.status?.type?.name || 'STATUS_SCHEDULED'
    };
  });

  return schedule;
}

/**
 * Store schedule to JSON file
 * @param {string} teamId - Team ID (e.g., 'lions')
 * @param {Array} schedule - Schedule array
 */
export function storeSchedule(teamId, schedule) {
  const year = new Date().getFullYear();
  const filePath = join(SCHEDULES_DIR, `${teamId}_${year}.json`);
  writeFileSync(filePath, JSON.stringify(schedule, null, 2));
  console.log(`Stored ${schedule.length} games for ${teamId} at ${filePath}`);
}

/**
 * Load schedule from JSON file
 * @param {string} teamId - Team ID (e.g., 'lions')
 * @returns {Array|null} - Schedule array or null if not found
 */
export function getSchedule(teamId) {
  const year = new Date().getFullYear();
  const filePath = join(SCHEDULES_DIR, `${teamId}_${year}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Fetch and store schedules for all teams
 */
export async function fetchAllSchedules() {
  for (const team of teams) {
    try {
      const schedule = await fetchSchedule(team);
      storeSchedule(team.id, schedule);
      // Small delay to be nice to ESPN's API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching schedule for ${team.name}:`, error.message);
    }
  }
}

/**
 * Get all games happening today across all teams
 * @returns {Array} - Array of today's games with team info
 */
export function getTodaysGames() {
  const today = new Date().toISOString().split('T')[0];
  const todaysGames = [];

  for (const team of teams) {
    const schedule = getSchedule(team.id);
    if (!schedule) continue;

    const games = schedule.filter(game => game.date.startsWith(today));
    games.forEach(game => {
      todaysGames.push({
        ...game,
        team: team
      });
    });
  }

  return todaysGames;
}

/**
 * Get upcoming games for the next N days
 * @param {number} days - Number of days to look ahead
 * @returns {Array} - Array of upcoming games with team info
 */
export function getUpcomingGames(days = 7) {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const upcomingGames = [];

  for (const team of teams) {
    const schedule = getSchedule(team.id);
    if (!schedule) continue;

    const games = schedule.filter(game => {
      const gameDate = new Date(game.date);
      return gameDate >= now && gameDate <= future;
    });

    games.forEach(game => {
      upcomingGames.push({
        ...game,
        team: team
      });
    });
  }

  // Sort by date
  upcomingGames.sort((a, b) => new Date(a.date) - new Date(b.date));

  return upcomingGames;
}

// CLI: Run directly to fetch all schedules
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fetchAllSchedules().then(() => {
    console.log('Done fetching all schedules');
  });
}
