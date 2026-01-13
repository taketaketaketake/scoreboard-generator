import { GlobalFonts, loadImage } from "@napi-rs/canvas";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, "..", "..", "assets");

// Cloudflare R2 public bucket
const R2_BASE_URL = "https://pub-d0714c2682ac4db6ba129c2044cd3629.r2.dev";

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
 * Load image from R2 URL with local fallback
 * @param {string} r2Path - Path on R2 (e.g., "background.png")
 * @param {string} localPath - Local file path fallback
 * @returns {Promise<Image|null>}
 */
async function loadFromR2(r2Path, localPath = null) {
  try {
    const url = `${R2_BASE_URL}/${encodeURIComponent(r2Path).replace(/%2F/g, '/')}`;
    return await loadImage(url);
  } catch (err) {
    console.log(`R2 load failed for ${r2Path}, trying local fallback...`);
    if (localPath && existsSync(localPath)) {
      return await loadImage(localPath);
    }
    return null;
  }
}

/**
 * Loads a background image by name.
 * @param {string} name - Background name (without extension)
 * @returns {Promise<Image|null>} - The loaded image or null if not found
 */
export async function loadBackground(name) {
  // Try R2 first
  const r2Image = await loadFromR2(`${name}.png`);
  if (r2Image) return r2Image;

  // Fallback to local
  const extensions = [".png", ".jpg", ".jpeg"];
  for (const ext of extensions) {
    const imagePath = join(ASSETS_DIR, "backgrounds", `${name}${ext}`);
    if (existsSync(imagePath)) {
      return await loadImage(imagePath);
    }
  }

  return null;
}

/**
 * Loads the scoreboard frame overlay.
 * @returns {Promise<Image|null>} - The loaded image or null if not found
 */
export async function loadFrame() {
  // Try R2 first
  const r2Image = await loadFromR2("frame_transparent.png");
  if (r2Image) return r2Image;

  // Fallback to local
  const framePath = join(ASSETS_DIR, "frames", "frame transparent.png");
  if (existsSync(framePath)) {
    return await loadImage(framePath);
  }

  return null;
}

/**
 * Loads the header image.
 * @returns {Promise<Image|null>} - The loaded image or null if not found
 */
export async function loadHeader() {
  // Try R2 first
  const r2Image = await loadFromR2("header_transparent.png");
  if (r2Image) return r2Image;

  // Fallback to local
  const headerPath = join(ASSETS_DIR, "header", "header_transparent.png");
  if (existsSync(headerPath)) {
    return await loadImage(headerPath);
  }

  return null;
}

/**
 * Loads a team logo from R2.
 * @param {string} league - The league (nfl, nba)
 * @param {string} logoKey - The logo filename without extension
 * @returns {Promise<Image|null>} - The loaded image or null if not found
 */
export async function loadLogo(league, logoKey) {
  if (!logoKey) return null;

  const folder = league === 'nfl' ? 'nfl-teams' : 'nba-teams';
  const r2Path = `${folder}/${logoKey}.png`;

  return await loadFromR2(r2Path);
}
