import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'output');

/**
 * Build the payload for the image generator
 * @param {object} normalizedData - Normalized game data
 * @param {object} decision - Decision analysis
 * @returns {object} - Generator-ready payload
 */
export function buildPayload(normalizedData, decision) {
  const { ourTeam, opponent, eventId, date } = normalizedData;

  // Generate output path with date folder
  const gameDate = new Date(date).toISOString().split('T')[0];
  const filename = `${ourTeam.name.toLowerCase().replace(/\s+/g, '_')}_vs_${opponent.name.toLowerCase().replace(/\s+/g, '_')}_${eventId}.png`;
  const outputPath = join(OUTPUT_DIR, gameDate, filename);

  return {
    background: 'background',
    left: {
      team: ourTeam.name,
      score: ourTeam.score,
      color: ourTeam.color,
      league: ourTeam.league,
      logo: ourTeam.logo
    },
    right: {
      team: opponent.name,
      score: opponent.score,
      color: opponent.color,
      league: opponent.league,
      logo: opponent.logo
    },
    status: 'FINAL',
    outputPath: outputPath
  };
}

/**
 * Generate output path for a game
 * @param {object} normalizedData - Normalized game data
 * @returns {string} - Output file path
 */
export function getOutputPath(normalizedData) {
  const { ourTeam, opponent, eventId, date } = normalizedData;

  const gameDate = new Date(date).toISOString().split('T')[0];
  const filename = `${ourTeam.name.toLowerCase().replace(/\s+/g, '_')}_vs_${opponent.name.toLowerCase().replace(/\s+/g, '_')}_${eventId}.png`;

  return join(OUTPUT_DIR, gameDate, filename);
}

/**
 * Build extended payload with metadata (for storage/logging)
 * @param {object} normalizedData - Normalized game data
 * @param {object} decision - Decision analysis
 * @param {object|null} odds - Odds data
 * @returns {object} - Extended payload with metadata
 */
export function buildExtendedPayload(normalizedData, decision, odds = null) {
  const basePayload = buildPayload(normalizedData, decision);

  return {
    ...basePayload,
    metadata: {
      eventId: normalizedData.eventId,
      date: normalizedData.date,
      isWin: decision.isWin,
      isBlowout: decision.isBlowout,
      isUpset: decision.isUpset,
      margin: decision.margin,
      tone: decision.tone,
      tags: decision.tags,
      odds: odds ? {
        opening: odds.opening,
        closing: odds.closing
      } : null,
      generatedAt: new Date().toISOString()
    }
  };
}
