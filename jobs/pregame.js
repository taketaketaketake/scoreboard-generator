/**
 * Pregame Job
 * Runs ~1 hour before game to capture closing odds
 */

import { fetchClosingOddsForGame, getOdds } from '../agents/odds.js';

/**
 * Run pregame job for a specific game
 * @param {object} game - Game object with eventId and team info
 * @returns {object} - Result summary
 */
export async function runPregameJob(game) {
  console.log('\n========================================');
  console.log('Pregame Job Started:', new Date().toISOString());
  console.log(`Game: ${game.team.name} vs ${game.opponent}`);
  console.log(`Event ID: ${game.eventId}`);
  console.log('========================================\n');

  try {
    // Fetch and store closing odds
    console.log('Fetching closing odds...');
    await fetchClosingOddsForGame(game);

    // Verify odds were stored
    const odds = getOdds(game.eventId);

    if (odds?.closing) {
      console.log('\nClosing odds captured:');
      console.log(`  Spread: ${odds.closing.spread || 'N/A'}`);
      console.log(`  Over/Under: ${odds.closing.overUnder || 'N/A'}`);
      console.log(`  Provider: ${odds.closing.provider || 'Unknown'}`);
      console.log(`  Captured at: ${odds.closing.capturedAt}`);

      return {
        success: true,
        eventId: game.eventId,
        odds: odds.closing
      };
    } else {
      console.log('No closing odds available for this game');
      return {
        success: false,
        eventId: game.eventId,
        error: 'No odds available'
      };
    }
  } catch (error) {
    console.error('Pregame job failed:', error.message);
    return {
      success: false,
      eventId: game.eventId,
      error: error.message
    };
  } finally {
    console.log('\nPregame Job Complete\n');
  }
}
