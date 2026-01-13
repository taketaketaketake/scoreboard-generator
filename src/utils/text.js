import { COLORS } from "../config/colors.js";
import { COORDS } from "../config/coordinates.js";

// Scale font sizes based on frame scale
const SCALE = COORDS.FRAME.scale;
const TEAM_NAME_SIZE = Math.round(64 * SCALE);
const SCORE_SIZE = Math.round(220 * SCALE);

/**
 * Draws a team name on the canvas.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} name - Team name
 * @param {number} x - X coordinate (center)
 * @param {number} y - Y coordinate (middle)
 */
export function drawTeamName(ctx, name, x, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.DEFAULT_TEXT;
  ctx.font = `${TEAM_NAME_SIZE}px Inter-Bold`;
  ctx.fillText(name, x, y);
  ctx.restore();
}

/**
 * Draws a score on the canvas.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} score - Score value
 * @param {number} x - X coordinate (center)
 * @param {number} y - Y coordinate (middle)
 */
export function drawScore(ctx, score, x, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.DEFAULT_TEXT;
  ctx.font = `${SCORE_SIZE}px Inter-ExtraBold`;
  ctx.fillText(String(score), x, y);
  ctx.restore();
}

/**
 * Draws the status text on the canvas.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} status - Status text (FINAL, LIVE, UPCOMING)
 * @param {number} x - X coordinate (center)
 * @param {number} y - Y coordinate (middle)
 */
export function drawStatus(ctx, status, x, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.STATUS_BAR_TEXT;
  ctx.font = "48px Inter-Bold";
  ctx.fillText(status, x, y);
  ctx.restore();
}
