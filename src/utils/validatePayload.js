const VALID_STATUSES = ["FINAL", "LIVE", "UPCOMING"];
const MAX_SCORE = 999;

/**
 * Validates the scoreboard payload.
 * Throws descriptive errors on any violation.
 * @param {object} payload - The scoreboard payload
 */
export function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be an object");
  }

  // Required top-level fields
  const requiredFields = ["background", "left", "right", "status", "outputPath"];
  for (const field of requiredFields) {
    if (!(field in payload)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate left team
  validateTeam(payload.left, "left");

  // Validate right team
  validateTeam(payload.right, "right");

  // Validate status
  if (!VALID_STATUSES.includes(payload.status)) {
    throw new Error(
      `Invalid status: "${payload.status}". Must be one of: ${VALID_STATUSES.join(", ")}`
    );
  }

  // Validate outputPath is a string
  if (typeof payload.outputPath !== "string" || payload.outputPath.trim() === "") {
    throw new Error("outputPath must be a non-empty string");
  }

  // Validate background is a string
  if (typeof payload.background !== "string" || payload.background.trim() === "") {
    throw new Error("background must be a non-empty string");
  }
}

/**
 * Validates a team object (left or right)
 * @param {object} team - The team object
 * @param {string} side - "left" or "right" for error messages
 */
function validateTeam(team, side) {
  if (!team || typeof team !== "object") {
    throw new Error(`${side} must be an object`);
  }

  // Required team fields
  const requiredTeamFields = ["team", "score", "color"];
  for (const field of requiredTeamFields) {
    if (!(field in team)) {
      throw new Error(`Missing required field: ${side}.${field}`);
    }
  }

  // Validate team name
  if (typeof team.team !== "string" || team.team.trim() === "") {
    throw new Error(`${side}.team must be a non-empty string`);
  }

  // Validate score
  if (typeof team.score !== "number" || !Number.isInteger(team.score)) {
    throw new Error(`${side}.score must be an integer`);
  }
  if (team.score < 0) {
    throw new Error(`${side}.score must be non-negative`);
  }
  if (team.score > MAX_SCORE) {
    throw new Error(`${side}.score exceeds maximum of ${MAX_SCORE}`);
  }

  // Validate color (basic hex check)
  if (typeof team.color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(team.color)) {
    throw new Error(`${side}.color must be a valid hex color (e.g., #FF0000)`);
  }
}
