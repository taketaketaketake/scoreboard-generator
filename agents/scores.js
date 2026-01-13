/**
 * Scores Agent
 * Polls ESPN for game status and final scores
 */

/**
 * Fetch today's scoreboard for a sport/league
 * @param {string} sport - Sport (e.g., 'football')
 * @param {string} league - League (e.g., 'nfl')
 * @returns {Promise<Array>} - Array of events
 */
export async function fetchScoreboard(sport, league) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch scoreboard: ${response.status}`);
  }

  const data = await response.json();
  return data.events || [];
}

/**
 * Fetch detailed game summary
 * @param {string} eventId - ESPN event ID
 * @param {string} sport - Sport (e.g., 'football')
 * @param {string} league - League (e.g., 'nfl')
 * @returns {Promise<object>} - Game summary
 */
export async function fetchGameSummary(eventId, sport, league) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${eventId}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch game summary: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get status of a specific game from scoreboard
 * @param {string} eventId - ESPN event ID
 * @param {string} sport - Sport
 * @param {string} league - League
 * @returns {Promise<object|null>} - Game data or null if not found
 */
export async function getGameStatus(eventId, sport, league) {
  const events = await fetchScoreboard(sport, league);
  return events.find(e => e.id === eventId) || null;
}

/**
 * Extract score data from an ESPN event
 * @param {object} event - ESPN event object
 * @returns {object} - Extracted score data
 */
export function extractScoreData(event) {
  const competition = event.competitions[0];
  const status = competition.status?.type?.name || 'STATUS_SCHEDULED';

  const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
  const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');

  return {
    eventId: event.id,
    name: event.name,
    shortName: event.shortName,
    status: status,
    isComplete: status === 'STATUS_FINAL',
    home: {
      team: homeCompetitor.team.displayName,
      abbreviation: homeCompetitor.team.abbreviation,
      score: parseInt(homeCompetitor.score || '0', 10),
      winner: homeCompetitor.winner || false
    },
    away: {
      team: awayCompetitor.team.displayName,
      abbreviation: awayCompetitor.team.abbreviation,
      score: parseInt(awayCompetitor.score || '0', 10),
      winner: awayCompetitor.winner || false
    },
    date: event.date
  };
}

/**
 * Poll for final score - keeps checking until game is final
 * @param {string} eventId - ESPN event ID
 * @param {string} sport - Sport
 * @param {string} league - League
 * @param {number} intervalMs - Polling interval in ms (default 5 minutes)
 * @param {number} maxAttempts - Max polling attempts (default 60 = 5 hours)
 * @returns {Promise<object>} - Final score data
 */
export async function pollUntilFinal(eventId, sport, league, intervalMs = 5 * 60 * 1000, maxAttempts = 60) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Polling attempt ${attempts} for event ${eventId}...`);

    try {
      const event = await getGameStatus(eventId, sport, league);

      if (!event) {
        console.log(`Event ${eventId} not found in scoreboard, waiting...`);
        await sleep(intervalMs);
        continue;
      }

      const scoreData = extractScoreData(event);
      console.log(`Status: ${scoreData.status} | ${scoreData.away.abbreviation} ${scoreData.away.score} @ ${scoreData.home.abbreviation} ${scoreData.home.score}`);

      if (scoreData.isComplete) {
        console.log(`Game ${eventId} is FINAL`);
        return scoreData;
      }

      // Not final yet, wait and try again
      await sleep(intervalMs);
    } catch (error) {
      console.error(`Error polling event ${eventId}:`, error.message);
      await sleep(intervalMs);
    }
  }

  throw new Error(`Max polling attempts reached for event ${eventId}`);
}

/**
 * Check if a game is final (one-time check)
 * @param {string} eventId - ESPN event ID
 * @param {string} sport - Sport
 * @param {string} league - League
 * @returns {Promise<object|null>} - Score data if final, null if not
 */
export async function checkIfFinal(eventId, sport, league) {
  const event = await getGameStatus(eventId, sport, league);

  if (!event) {
    return null;
  }

  const scoreData = extractScoreData(event);

  if (scoreData.isComplete) {
    return scoreData;
  }

  return null;
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
