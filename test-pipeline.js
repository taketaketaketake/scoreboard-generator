/**
 * Pipeline Test Script
 * Tests the full flow from ESPN data to image generation
 */

import { fetchSchedule, storeSchedule, getSchedule } from './agents/schedule.js';
import { fetchScoreboard, extractScoreData } from './agents/scores.js';
import { normalizeGameData } from './agents/normalize.js';
import { analyzeGame, shouldGenerate } from './agents/decision.js';
import { buildPayload } from './agents/content.js';
import { generateScoreboard } from './src/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const teams = JSON.parse(readFileSync(join(__dirname, 'config', 'teams.json'), 'utf-8')).teams;

async function testScheduleAgent() {
  console.log('\n=== Testing Schedule Agent ===\n');

  const lions = teams.find(t => t.id === 'lions');
  console.log(`Fetching schedule for ${lions.name}...`);

  try {
    const schedule = await fetchSchedule(lions);
    console.log(`Found ${schedule.length} games`);
    console.log('First 3 games:');
    schedule.slice(0, 3).forEach(game => {
      console.log(`  ${game.date} - ${game.opponent} (${game.home ? 'Home' : 'Away'})`);
    });

    storeSchedule(lions.id, schedule);
    console.log('✓ Schedule stored successfully');

    const loaded = getSchedule(lions.id);
    console.log(`✓ Schedule loaded: ${loaded.length} games`);

    return schedule;
  } catch (error) {
    console.error('✗ Schedule Agent failed:', error.message);
    return null;
  }
}

async function testScoresAgent() {
  console.log('\n=== Testing Scores Agent ===\n');

  const lions = teams.find(t => t.id === 'lions');

  try {
    console.log(`Fetching NFL scoreboard...`);
    const events = await fetchScoreboard(lions.sport, lions.league);
    console.log(`Found ${events.length} events on scoreboard`);

    if (events.length === 0) {
      console.log('No games on scoreboard today');
      return null;
    }

    // Find a completed game (any team) for testing
    const completedGame = events.find(e =>
      e.competitions[0].status?.type?.name === 'STATUS_FINAL'
    );

    if (completedGame) {
      const scoreData = extractScoreData(completedGame);
      console.log(`\nFound completed game: ${scoreData.name}`);
      console.log(`  ${scoreData.away.team}: ${scoreData.away.score}`);
      console.log(`  ${scoreData.home.team}: ${scoreData.home.score}`);
      console.log(`  Status: ${scoreData.status}`);
      return scoreData;
    } else {
      console.log('No completed games found on scoreboard');
      // Return first game for structure testing
      const firstGame = extractScoreData(events[0]);
      console.log(`\nUsing in-progress/scheduled game: ${firstGame.name}`);
      return firstGame;
    }
  } catch (error) {
    console.error('✗ Scores Agent failed:', error.message);
    return null;
  }
}

function testNormalizeAgent(scoreData, team) {
  console.log('\n=== Testing Normalize Agent ===\n');

  try {
    const normalized = normalizeGameData(scoreData, team);
    console.log('Normalized data:');
    console.log(`  Our team: ${normalized.ourTeam.name} (${normalized.ourTeam.score})`);
    console.log(`  Opponent: ${normalized.opponent.name} (${normalized.opponent.score})`);
    console.log(`  Result: ${normalized.result.isWin ? 'WIN' : normalized.result.isTie ? 'TIE' : 'LOSS'} by ${normalized.result.margin}`);
    console.log('✓ Normalize Agent works');
    return normalized;
  } catch (error) {
    console.error('✗ Normalize Agent failed:', error.message);
    return null;
  }
}

function testDecisionAgent(normalizedData, league) {
  console.log('\n=== Testing Decision Agent ===\n');

  try {
    const decision = analyzeGame(normalizedData, null, league);
    console.log('Decision analysis:');
    console.log(`  Should generate: ${decision.generate}`);
    console.log(`  Is win: ${decision.isWin}`);
    console.log(`  Is blowout: ${decision.isBlowout}`);
    console.log(`  Margin: ${decision.margin}`);
    console.log(`  Tone: ${decision.tone}`);
    console.log(`  Tags: ${decision.tags.join(', ')}`);
    console.log('✓ Decision Agent works');
    return decision;
  } catch (error) {
    console.error('✗ Decision Agent failed:', error.message);
    return null;
  }
}

function testContentAgent(normalizedData, decision) {
  console.log('\n=== Testing Content Agent ===\n');

  try {
    const payload = buildPayload(normalizedData, decision);
    console.log('Generated payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('✓ Content Agent works');
    return payload;
  } catch (error) {
    console.error('✗ Content Agent failed:', error.message);
    return null;
  }
}

async function testFullPipeline() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     Detroit Sports Pipeline Test           ║');
  console.log('╚════════════════════════════════════════════╝');

  // Test with mock data first
  console.log('\n=== Testing with Mock Data ===\n');

  const mockScoreData = {
    eventId: '999999999',
    name: 'Detroit Lions at Chicago Bears',
    shortName: 'DET @ CHI',
    status: 'STATUS_FINAL',
    isComplete: true,
    home: {
      team: 'Chicago Bears',
      abbreviation: 'CHI',
      score: 17,
      winner: false
    },
    away: {
      team: 'Detroit Lions',
      abbreviation: 'DET',
      score: 31,
      winner: true
    },
    date: new Date().toISOString()
  };

  const lions = teams.find(t => t.id === 'lions');

  // Test each agent
  const normalized = testNormalizeAgent(mockScoreData, lions);
  if (!normalized) return;

  const decision = testDecisionAgent(normalized, lions.league);
  if (!decision) return;

  const payload = testContentAgent(normalized, decision);
  if (!payload) return;

  // Test image generation
  console.log('\n=== Testing Image Generation ===\n');

  try {
    // Use test output path
    payload.outputPath = './output/test/pipeline_test.png';

    const result = await generateScoreboard(payload);
    console.log(`✓ Image generated: ${result.path}`);
  } catch (error) {
    console.error('✗ Image generation failed:', error.message);
  }

  // Test with live ESPN data
  console.log('\n=== Testing with Live ESPN Data ===\n');

  try {
    await testScheduleAgent();
    await testScoresAgent();
  } catch (error) {
    console.error('Live data test error:', error.message);
  }

  console.log('\n=== Pipeline Test Complete ===\n');
}

// Run tests
testFullPipeline().catch(console.error);
