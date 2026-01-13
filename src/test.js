import { generateScoreboard } from "./generateScoreboard.js";
import { existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "output", "scoreboards", "2026-01-12");

// Valid test payload
const validPayload = {
  background: "background",
  left: {
    team: "LIONS",
    score: 24,
    color: "#005A8B"
  },
  right: {
    team: "PISTONS",
    score: 112,
    color: "#C8102E"
  },
  status: "FINAL",
  outputPath: join(OUTPUT_DIR, "test_game.png")
};

// Invalid payload for validation testing
const invalidPayload = {
  background: "test",
  left: {
    team: "TEAM",
    score: -5, // Invalid: negative score
    color: "#000000"
  },
  right: {
    team: "OTHER",
    score: 10,
    color: "#FFFFFF"
  },
  status: "INVALID_STATUS", // Invalid status
  outputPath: "./test.png"
};

async function runTests() {
  console.log("=== Scoreboard Generator Tests ===\n");

  // Test 1: Valid payload
  console.log("Test 1: Generate scoreboard with valid payload");
  try {
    const result = await generateScoreboard(validPayload);

    if (result.success && existsSync(result.path)) {
      const stats = statSync(result.path);
      console.log(`  ✓ Success: Image created at ${result.path}`);
      console.log(`  ✓ File size: ${stats.size} bytes`);
    } else {
      console.log("  ✗ Failed: Image not created");
      process.exit(1);
    }
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
    process.exit(1);
  }

  console.log("");

  // Test 2: Invalid payload (should throw)
  console.log("Test 2: Reject invalid payload");
  try {
    await generateScoreboard(invalidPayload);
    console.log("  ✗ Failed: Should have thrown an error");
    process.exit(1);
  } catch (error) {
    console.log(`  ✓ Correctly rejected: ${error.message}`);
  }

  console.log("\n=== All tests passed ===");
}

runTests().catch((error) => {
  console.error("Test runner failed:", error);
  process.exit(1);
});
