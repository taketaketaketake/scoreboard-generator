import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', 'config');

// Load config files
const teams = JSON.parse(readFileSync(join(CONFIG_DIR, 'teams.json'), 'utf-8')).teams;
const opponents = JSON.parse(readFileSync(join(CONFIG_DIR, 'opponents.json'), 'utf-8'));

/**
 * Find our team (Detroit) from the config
 * @param {string} abbreviation - Team abbreviation
 * @param {string} league - League
 * @returns {object|null} - Team config or null
 */
export function findOurTeam(abbreviation, league) {
  return teams.find(t =>
    t.league === league &&
    (t.displayName === abbreviation || t.espnId.toString() === abbreviation)
  );
}

/**
 * Get opponent info from config
 * @param {string} abbreviation - Opponent abbreviation
 * @param {string} league - League
 * @returns {object} - Opponent info with defaults
 */
export function getOpponentInfo(abbreviation, league) {
  const leagueOpponents = opponents[league] || {};
  const opponent = leagueOpponents[abbreviation];

  if (opponent) {
    return opponent;
  }

  // Default if not in config
  return {
    name: abbreviation,
    displayName: abbreviation,
    color: '#333333'
  };
}

/**
 * Normalize ESPN score data to internal format
 * @param {object} scoreData - Score data from scores agent
 * @param {object} ourTeam - Our team config
 * @returns {object} - Normalized game data
 */
export function normalizeGameData(scoreData, ourTeam) {
  // Determine which side is our team
  const isHome = scoreData.home.abbreviation === ourTeam.displayName ||
                 scoreData.home.abbreviation === 'DET';

  const ourSide = isHome ? scoreData.home : scoreData.away;
  const theirSide = isHome ? scoreData.away : scoreData.home;

  // Get opponent info
  const opponentInfo = getOpponentInfo(theirSide.abbreviation, ourTeam.league);

  // Determine winner
  const ourScore = ourSide.score;
  const theirScore = theirSide.score;
  const isWin = ourScore > theirScore;
  const isTie = ourScore === theirScore;
  const margin = Math.abs(ourScore - theirScore);

  return {
    eventId: scoreData.eventId,
    date: scoreData.date,
    status: scoreData.status,

    // Our team (always on left in output)
    ourTeam: {
      name: ourTeam.displayName,
      score: ourScore,
      color: ourTeam.color,
      isHome: isHome,
      league: ourTeam.league,
      logo: ourTeam.logo
    },

    // Opponent (always on right in output)
    opponent: {
      name: opponentInfo.displayName,
      score: theirScore,
      color: opponentInfo.color,
      isHome: !isHome,
      league: ourTeam.league,
      logo: opponentInfo.logo
    },

    // Game outcome
    result: {
      isWin: isWin,
      isTie: isTie,
      isLoss: !isWin && !isTie,
      margin: margin,
      winner: isWin ? 'our' : (isTie ? 'tie' : 'opponent')
    },

    // Raw data for reference
    raw: scoreData
  };
}

/**
 * Normalize team name to display format
 * @param {string} name - Raw team name
 * @returns {string} - Normalized display name
 */
export function normalizeTeamName(name) {
  // Map common variations to canonical names
  const nameMap = {
    'Detroit Lions': 'LIONS',
    'Lions': 'LIONS',
    'DET': 'LIONS',
    'Detroit Pistons': 'PISTONS',
    'Pistons': 'PISTONS',
    'Detroit Tigers': 'TIGERS',
    'Tigers': 'TIGERS',
    'Detroit Red Wings': 'RED WINGS',
    'Red Wings': 'RED WINGS'
  };

  return nameMap[name] || name.toUpperCase();
}

/**
 * Normalize score to integer
 * @param {string|number} score - Raw score
 * @returns {number} - Integer score
 */
export function normalizeScore(score) {
  if (typeof score === 'number') return score;
  return parseInt(score, 10) || 0;
}
