import { GlobalFonts, loadImage } from "@napi-rs/canvas";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, "..", "..", "assets");

let fontsRegistered = false;

/**
 * Registers required fonts. Throws if fonts are missing.
 */
export function registerFonts() {
  if (fontsRegistered) return;

  const fonts = [
    { file: "Inter_24pt-Bold.ttf", family: "Inter-Bold" },
    { file: "Inter_18pt-ExtraBold.ttf", family: "Inter-ExtraBold" }
  ];

  for (const font of fonts) {
    const fontPath = join(ASSETS_DIR, "fonts", font.file);
    if (!existsSync(fontPath)) {
      throw new Error(`Required font missing: ${font.file}. Add it to assets/fonts/`);
    }
    GlobalFonts.registerFromPath(fontPath, font.family);
  }

  fontsRegistered = true;
}

/**
 * Loads a background image by name.
 * @param {string} name - Background name (without extension)
 * @returns {Promise<Image|null>} - The loaded image or null if not found
 */
export async function loadBackground(name) {
  const extensions = [".png", ".jpg", ".jpeg"];

  for (const ext of extensions) {
    const imagePath = join(ASSETS_DIR, "backgrounds", `${name}${ext}`);
    if (existsSync(imagePath)) {
      return await loadImage(imagePath);
    }
  }

  // Background not found - return null (will use solid color fallback)
  return null;
}

/**
 * Loads the scoreboard frame overlay.
 * @returns {Promise<Image|null>} - The loaded image or null if not found
 */
export async function loadFrame() {
  const framePath = join(ASSETS_DIR, "frames", "frame transparent.png");

  if (!existsSync(framePath)) {
    // Frame not found - return null (will skip overlay)
    return null;
  }

  return await loadImage(framePath);
}

/**
 * Loads the header image.
 * @returns {Promise<Image|null>} - The loaded image or null if not found
 */
export async function loadHeader() {
  const headerPath = join(ASSETS_DIR, "header", "header_transparent.png");

  if (!existsSync(headerPath)) {
    return null;
  }

  return await loadImage(headerPath);
}
