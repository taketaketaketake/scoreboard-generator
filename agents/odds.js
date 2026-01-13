import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'odds');

/**
 * Fetch odds for a game from ESPN
 * @param {string} eventId - ESPN event ID
 * @param {string} sport - Sport (e.g., 'football')
 * @param {string} league - League (e.g., 'nfl')
 * @returns {Promise<object|null>} - Odds data or null if not available
 */
export async function fetchOdds(eventId, sport, league) {
  const url = `https://sports.core.api.espn.com/v2/sports/${sport}/leagues/${league}/events/${eventId}/competitions/${eventId}/odds`;

  console.log(`Fetching odds for event ${eventId}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`No odds available for event ${eventId}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // ESPN returns odds from multiple providers, get the first one with data
    if (!data.items || data.items.length === 0) {
      console.log(`No odds items for event ${eventId}`);
      return null;
    }

    // Try to get odds details from the first provider
    const oddsRef = data.items[0].$ref || data.items[0];
    let oddsData;

    if (typeof oddsRef === 'string') {
      // Need to fetch the actual odds data
      const oddsResponse = await fetch(oddsRef);
      if (!oddsResponse.ok) return null;
      oddsData = await oddsResponse.json();
    } else {
      oddsData = oddsRef;
    }

    // Extract relevant odds info
    return {
      spread: oddsData.spread || null,
      overUnder: oddsData.overUnder || null,
      homeTeamOdds: oddsData.homeTeamOdds || null,
      awayTeamOdds: oddsData.awayTeamOdds || null,
      provider: oddsData.provider?.name || 'Unknown'
    };
  } catch (error) {
    console.error(`Error fetching odds for event ${eventId}:`, error.message);
    return null;
  }
}

/**
 * Get stored odds for a game
 * @param {string} eventId - ESPN event ID
 * @returns {object|null} - Stored odds or null
 */
export function getOdds(eventId) {
  const filePath = join(DATA_DIR, `${eventId}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Store opening odds for a game
 * @param {string} eventId - ESPN event ID
 * @param {object} odds - Odds data
 */
export function storeOpeningOdds(eventId, odds) {
  const filePath = join(DATA_DIR, `${eventId}.json`);

  const data = {
    eventId: eventId,
    opening: {
      ...odds,
      capturedAt: new Date().toISOString()
    },
    closing: null
  };

  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Stored opening odds for event ${eventId}`);
}

/**
 * Store closing odds for a game
 * @param {string} eventId - ESPN event ID
 * @param {object} odds - Odds data
 */
export function storeClosingOdds(eventId, odds) {
  const filePath = join(DATA_DIR, `${eventId}.json`);

  let data = getOdds(eventId);

  if (!data) {
    // No opening odds stored, create new record
    data = {
      eventId: eventId,
      opening: null,
      closing: null
    };
  }

  data.closing = {
    ...odds,
    capturedAt: new Date().toISOString()
  };

  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Stored closing odds for event ${eventId}`);
}

/**
 * Fetch and store opening odds for upcoming games
 * @param {Array} games - Array of upcoming games
 */
export async function fetchOpeningOddsForGames(games) {
  for (const game of games) {
    // Skip if we already have opening odds
    const existingOdds = getOdds(game.eventId);
    if (existingOdds?.opening) {
      console.log(`Already have opening odds for ${game.eventId}`);
      continue;
    }

    const odds = await fetchOdds(game.eventId, game.team.sport, game.team.league);
    if (odds) {
      storeOpeningOdds(game.eventId, odds);
    }

    // Small delay to be nice to ESPN's API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Fetch and store closing odds for a specific game
 * @param {object} game - Game object with eventId and team info
 */
export async function fetchClosingOddsForGame(game) {
  const odds = await fetchOdds(game.eventId, game.team.sport, game.team.league);
  if (odds) {
    storeClosingOdds(game.eventId, odds);
  }
}
