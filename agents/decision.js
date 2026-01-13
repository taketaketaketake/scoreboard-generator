/**
 * Decision Agent
 * Determines if/how to generate content based on game data and rules
 */

// Blowout thresholds by league
const BLOWOUT_MARGINS = {
  nfl: 14,    // 2 touchdowns
  nba: 20,    // Comfortable NBA win
  mlb: 6,     // Run rule territory
  nhl: 4      // Dominant hockey win
};

/**
 * Determine if we should generate content for this game
 * @param {object} normalizedData - Normalized game data
 * @returns {boolean} - Whether to generate
 */
export function shouldGenerate(normalizedData) {
  // Only generate for final games
  if (normalizedData.status !== 'STATUS_FINAL') {
    return false;
  }

  // Always generate for our Detroit teams
  return true;
}

/**
 * Analyze game and return flags/metadata
 * @param {object} normalizedData - Normalized game data
 * @param {object|null} odds - Odds data (optional)
 * @param {string} league - League for blowout threshold
 * @returns {object} - Analysis results
 */
export function analyzeGame(normalizedData, odds = null, league = 'nfl') {
  const { result, ourTeam, opponent } = normalizedData;

  // Check for blowout
  const blowoutThreshold = BLOWOUT_MARGINS[league] || 14;
  const isBlowout = result.margin >= blowoutThreshold;

  // Check for upset (if we have odds)
  let isUpset = false;
  let wasUnderdog = false;
  let expectedSpread = null;

  if (odds?.closing?.spread) {
    expectedSpread = odds.closing.spread;
    // Negative spread means we were favored
    // If we won as underdog (positive spread) = upset
    wasUnderdog = expectedSpread > 0;
    isUpset = result.isWin && wasUnderdog;
  }

  // Determine tone
  let tone = 'neutral';
  if (result.isWin) {
    tone = isBlowout ? 'dominant' : 'confident';
  } else if (result.isLoss) {
    tone = isBlowout ? 'rough' : 'neutral';
  }

  // Generate tags for potential captions
  const tags = [];
  if (result.isWin) tags.push('win');
  if (result.isLoss) tags.push('loss');
  if (isBlowout) tags.push('blowout');
  if (isUpset) tags.push('upset');
  if (result.margin <= 3) tags.push('close');

  return {
    generate: shouldGenerate(normalizedData),

    // Outcome
    isWin: result.isWin,
    isLoss: result.isLoss,
    isTie: result.isTie,
    margin: result.margin,

    // Flags
    isBlowout: isBlowout,
    isUpset: isUpset,
    isCloseGame: result.margin <= 3,
    wasUnderdog: wasUnderdog,

    // Odds context
    expectedSpread: expectedSpread,

    // Tone/style
    tone: tone,
    tags: tags,

    // Scores
    ourScore: ourTeam.score,
    theirScore: opponent.score
  };
}

/**
 * Get tone string for content generation
 * @param {object} decision - Decision analysis
 * @returns {string} - Tone descriptor
 */
export function getTone(decision) {
  return decision.tone;
}

/**
 * Generate a simple headline based on decision
 * @param {object} normalizedData - Normalized game data
 * @param {object} decision - Decision analysis
 * @returns {string} - Headline text
 */
export function generateHeadline(normalizedData, decision) {
  const { ourTeam, opponent } = normalizedData;

  if (decision.isWin) {
    if (decision.isBlowout) {
      return `${ourTeam.name} dominate ${opponent.name}`;
    }
    if (decision.isUpset) {
      return `${ourTeam.name} upset ${opponent.name}`;
    }
    if (decision.isCloseGame) {
      return `${ourTeam.name} edge ${opponent.name}`;
    }
    return `${ourTeam.name} defeat ${opponent.name}`;
  }

  if (decision.isLoss) {
    if (decision.isBlowout) {
      return `${ourTeam.name} fall to ${opponent.name}`;
    }
    if (decision.isCloseGame) {
      return `${ourTeam.name} lose close one to ${opponent.name}`;
    }
    return `${ourTeam.name} lose to ${opponent.name}`;
  }

  return `${ourTeam.name} tie ${opponent.name}`;
}
