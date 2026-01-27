/**
 * Postgame Job
 * Polls for final score and generates scoreboard image
 */

import { pollUntilFinal, checkIfFinal } from '../agents/scores.js';
import { normalizeGameData } from '../agents/normalize.js';
import { analyzeGame, shouldGenerate } from '../agents/decision.js';
import { buildPayload, buildExtendedPayload } from '../agents/content.js';
import { getOdds } from '../agents/odds.js';
import { generateScoreboard } from '../src/index.js';
import { sendScoreboardImage, validateConfig as validateTwilioConfig } from '../agents/twilio.js';
import { uploadScoreboardVerified, validateR2Config } from '../agents/r2.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'games');

/**
 * Store completed game record
 * @param {string} eventId - Event ID
 * @param {object} data - Game data to store
 */
function storeGameRecord(eventId, data) {
  const filePath = join(DATA_DIR, `${eventId}.json`);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Game record stored: ${filePath}`);
}

/**
 * Run postgame job for a specific game
 * @param {object} game - Game object with eventId and team info
 * @param {object} options - Options (pollInterval, maxAttempts)
 * @returns {object} - Result summary
 */
export async function runPostgameJob(game, options = {}) {
  const {
    pollInterval = 5 * 60 * 1000,  // 5 minutes
    maxAttempts = 60               // 5 hours max
  } = options;

  console.log('\n========================================');
  console.log('Postgame Job Started:', new Date().toISOString());
  console.log(`Game: ${game.team.name} vs ${game.opponent}`);
  console.log(`Event ID: ${game.eventId}`);
  console.log(`Poll interval: ${pollInterval / 1000}s`);
  console.log('========================================\n');

  try {
    // First, check if game is already final
    console.log('Checking if game is already final...');
    let scoreData = await checkIfFinal(game.eventId, game.team.sport, game.team.league);

    if (!scoreData) {
      // Not final yet, start polling
      console.log('Game not final yet. Starting polling...\n');
      scoreData = await pollUntilFinal(
        game.eventId,
        game.team.sport,
        game.team.league,
        pollInterval,
        maxAttempts
      );
    } else {
      console.log('Game is already final!\n');
    }

    // Normalize the data
    console.log('Normalizing game data...');
    const normalized = normalizeGameData(scoreData, game.team);

    console.log(`Result: ${normalized.ourTeam.name} ${normalized.ourTeam.score} - ${normalized.opponent.name} ${normalized.opponent.score}`);
    console.log(`Outcome: ${normalized.result.isWin ? 'WIN' : normalized.result.isTie ? 'TIE' : 'LOSS'}`);

    // Get odds if available
    const odds = getOdds(game.eventId);
    if (odds) {
      console.log('Odds data found for this game');
    }

    // Run decision logic
    console.log('\nAnalyzing game...');
    const decision = analyzeGame(normalized, odds, game.team.league);

    console.log(`Blowout: ${decision.isBlowout}`);
    console.log(`Upset: ${decision.isUpset}`);
    console.log(`Tone: ${decision.tone}`);
    console.log(`Tags: ${decision.tags.join(', ')}`);

    // Check if we should generate
    if (!decision.generate) {
      console.log('\nDecision: Do not generate image');
      return {
        success: true,
        generated: false,
        reason: 'Decision agent said no',
        eventId: game.eventId
      };
    }

    // Build payload
    console.log('\nBuilding payload...');
    const payload = buildPayload(normalized, decision);
    console.log(`Output path: ${payload.outputPath}`);

    // Generate image
    console.log('\nGenerating scoreboard image...');
    const result = await generateScoreboard(payload);
    console.log(`✓ Image generated: ${result.path}`);

    // Upload to R2 and send via Twilio if configured
    let twilioResult = null;
    const twilioValidation = validateTwilioConfig();
    const r2Validation = validateR2Config();

    if (twilioValidation.valid && r2Validation.valid) {
      try {
        // Upload to R2 and verify it's accessible before sending MMS
        console.log('\nUploading scoreboard to R2...');
        const uploadResult = await uploadScoreboardVerified(result.path);
        console.log(`✓ Uploaded and verified: ${uploadResult.publicUrl}`);

        // Send via Twilio with R2 URL
        const gameDate = new Date(normalized.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const scoreMessage = `${normalized.ourTeam.name} ${normalized.ourTeam.score} - ${normalized.opponent.name} ${normalized.opponent.score} | ${decision.isWin ? 'WIN' : 'LOSS'} | ${gameDate}`;

        console.log('\nSending scoreboard via Twilio...');
        twilioResult = await sendScoreboardImage(uploadResult.publicUrl, scoreMessage);
        console.log(`✓ MMS sent to ${twilioResult.to}`);
      } catch (error) {
        console.error(`⚠ Failed to upload/send: ${error.message}`);
      }
    } else if (!r2Validation.valid) {
      console.log('\nR2 not configured, skipping upload and MMS');
      console.log('Missing:', r2Validation.issues.join(', '));
    } else if (!twilioValidation.valid) {
      console.log('\nTwilio not configured, skipping MMS');
    }

    // Store game record
    const extendedPayload = buildExtendedPayload(normalized, decision, odds);
    storeGameRecord(game.eventId, {
      normalized: normalized,
      decision: decision,
      payload: extendedPayload,
      generatedAt: new Date().toISOString()
    });

    return {
      success: true,
      generated: true,
      path: result.path,
      eventId: game.eventId,
      score: `${normalized.ourTeam.name} ${normalized.ourTeam.score} - ${normalized.opponent.name} ${normalized.opponent.score}`,
      isWin: decision.isWin,
      twilioSent: twilioResult?.success || false
    };

  } catch (error) {
    console.error('\nPostgame job failed:', error.message);
    return {
      success: false,
      generated: false,
      eventId: game.eventId,
      error: error.message
    };
  } finally {
    console.log('\n========================================');
    console.log('Postgame Job Complete:', new Date().toISOString());
    console.log('========================================\n');
  }
}

/**
 * Run postgame job immediately (for testing or catch-up)
 * Checks once without polling
 * @param {object} game - Game object
 * @returns {object} - Result summary
 */
export async function runPostgameJobOnce(game) {
  return runPostgameJob(game, {
    pollInterval: 0,
    maxAttempts: 1
  });
}
