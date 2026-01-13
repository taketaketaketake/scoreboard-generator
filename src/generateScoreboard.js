import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

import { CANVAS } from "./config/canvas.js";
import { COORDS } from "./config/coordinates.js";
import { COLORS } from "./config/colors.js";

import { validatePayload } from "./utils/validatePayload.js";
import { registerFonts, loadBackground, loadFrame, loadHeader } from "./utils/loadAssets.js";
import { drawTeamName, drawScore, drawStatus } from "./utils/text.js";

/**
 * Generates a scoreboard image from the given payload.
 * @param {object} payload - The scoreboard payload
 * @returns {Promise<{success: boolean, path: string}>}
 */
export async function generateScoreboard(payload) {
  // Step 1: Validate payload (fail fast)
  validatePayload(payload);

  // Step 2: Register fonts (required)
  registerFonts();

  // Step 3: Load optional assets
  const [backgroundImage, frameImage, headerImage] = await Promise.all([
    loadBackground(payload.background),
    loadFrame(),
    loadHeader()
  ]);

  // Step 4: Create canvas
  const canvas = createCanvas(CANVAS.WIDTH, CANVAS.HEIGHT);
  const ctx = canvas.getContext("2d");

  // === DRAW ORDER (NON-NEGOTIABLE) ===

  // 1. Fill background color
  ctx.fillStyle = CANVAS.BACKGROUND_COLOR;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  // 2. Draw background image (if exists)
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
  }

  // Calculate scaled dimensions
  const scaledWidth = CANVAS.WIDTH * COORDS.FRAME.scale;
  const scaledHeight = CANVAS.HEIGHT * COORDS.FRAME.scale;

  // 3. Draw frame overlay (if exists) - scaled and centered
  if (frameImage) {
    ctx.drawImage(
      frameImage,
      COORDS.FRAME.x,
      COORDS.FRAME.y,
      scaledWidth,
      scaledHeight
    );
  }

  // 4. Draw header (if exists) - independent scale and position
  if (headerImage) {
    const headerWidth = CANVAS.WIDTH * COORDS.HEADER.scale;
    const headerHeight = CANVAS.HEIGHT * COORDS.HEADER.scale;
    ctx.drawImage(
      headerImage,
      COORDS.HEADER.x,
      COORDS.HEADER.y,
      headerWidth,
      headerHeight
    );
  }

  // 5. Draw left team name
  drawTeamName(ctx, payload.left.team, COORDS.LEFT_TEAM_NAME.x, COORDS.LEFT_TEAM_NAME.y);

  // 7. Draw right team name
  drawTeamName(ctx, payload.right.team, COORDS.RIGHT_TEAM_NAME.x, COORDS.RIGHT_TEAM_NAME.y);

  // 8. Draw left score
  drawScore(ctx, payload.left.score, COORDS.LEFT_SCORE.x, COORDS.LEFT_SCORE.y);

  // 9. Draw right score
  drawScore(ctx, payload.right.score, COORDS.RIGHT_SCORE.x, COORDS.RIGHT_SCORE.y);

  // Note: Status bar and text are baked into the frame

  // === EXPORT ===

  // Ensure output directory exists
  const outputDir = dirname(payload.outputPath);
  mkdirSync(outputDir, { recursive: true });

  // Write PNG to disk
  const buffer = canvas.toBuffer("image/png");
  writeFileSync(payload.outputPath, buffer);

  return {
    success: true,
    path: payload.outputPath
  };
}
