export const COORDS = {
  // Frame scale and position (85% = 15% smaller)
  FRAME: {
    scale: 0.85,
    x: 81,      // (1080 - 1080*0.85) / 2 = 81
    y: 250      // lowered scoreboard position
  },

  // Header position and scale (10% smaller than frame)
  HEADER: {
    scale: 0.765,  // 0.85 * 0.9 = 10% smaller than frame
    x: 127,        // (1080 - 1080*0.765) / 2 = centered
    y: -180
  },

  // Team name positions (scaled and offset to match frame)
  // Formula: FRAME.x + originalX * scale, FRAME.y + originalY * scale
  LEFT_TEAM_NAME: { x: 336, y: 539 },   // 81 + 300*0.85, 250 + 340*0.85
  RIGHT_TEAM_NAME: { x: 744, y: 539 },  // 81 + 780*0.85, 250 + 340*0.85

  // Score positions (scaled and offset to match frame)
  LEFT_SCORE: { x: 336, y: 684 },   // 81 + 300*0.85, 250 + 510*0.85
  RIGHT_SCORE: { x: 744, y: 684 }   // 81 + 780*0.85, 250 + 510*0.85
};
