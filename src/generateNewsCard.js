/**
 * News Card Generator
 * Renders TAKEDETROIT social news cards (photo or typographic variant).
 * Sizes: feed 1080x1350, story 1080x1920, square 1080x1080.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const C = {
  panel: '#101318',
  white: '#FFFFFF',
  sub: '#B8BEC9',
  badgeDark: '#191E26',
  accent: '#F5A623',
  grid: '#1B1F26',
  coral: '#FF6B4A',
};

export const BADGE_COLORS = {
  breaking: '#E5202E',
  openings: '#F28C1B',
  trending: '#1E63D0',
  events: '#7A3BD0',
  watch: '#E5202E',
  news: '#F28C1B',
};

export const SIZES = {
  feed: { W: 1080, H: 1350, photoTop: 0.62 },
  story: { W: 1080, H: 1920, photoTop: 0.58 },
  square: { W: 1080, H: 1080, photoTop: 0.55 },
};

function coverDraw(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, r = w / h;
  let sw, sh, sx, sy;
  if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) * 0.25; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapWords(ctx, words, maxWidth, font) {
  ctx.font = font;
  const space = ctx.measureText(' ').width;
  const lines = [[]];
  let width = 0;
  for (const w of words) {
    const ww = ctx.measureText(w.t).width;
    if (width + ww > maxWidth && lines[lines.length - 1].length) { lines.push([]); width = 0; }
    lines[lines.length - 1].push(w);
    width += ww + space;
  }
  return lines;
}

function drawHeadline(ctx, text, accentPhrase, x, y, maxWidth, maxLines, startSize) {
  const norm = (s) => s.toLowerCase().replace(/[^\w’']/g, '');
  const words = text.split(' ').map((t) => ({ t, accent: false }));
  if (accentPhrase) {
    const aw = accentPhrase.split(' ');
    for (let i = 0; i <= words.length - aw.length; i++) {
      if (aw.every((a, j) => norm(words[i + j].t) === norm(a))) {
        aw.forEach((_, j) => (words[i + j].accent = true));
        break;
      }
    }
  }
  let size = startSize, lines;
  do {
    lines = wrapWords(ctx, words, maxWidth, `900 ${size}px "Helvetica Neue"`);
    if (lines.length <= maxLines) break;
    size -= 4;
  } while (size > 34);
  ctx.textBaseline = 'top';
  ctx.font = `900 ${size}px "Helvetica Neue"`;
  const space = ctx.measureText(' ').width;
  lines.forEach((line, li) => {
    let cx = x;
    for (const w of line) {
      ctx.fillStyle = w.accent ? C.accent : C.white;
      ctx.fillText(w.t, cx, y + li * size * 1.14);
      cx += ctx.measureText(w.t).width + space;
    }
  });
  return y + lines.length * size * 1.14;
}

function badge(ctx, x, y, part1, color1, part2, size = 34) {
  ctx.textBaseline = 'top';
  ctx.font = `900 ${size}px "Helvetica Neue"`;
  const pad = 20, h = size + 26;
  const w1 = ctx.measureText(part1).width + pad * 2;
  ctx.fillStyle = color1;
  ctx.fillRect(x, y, w1, h);
  ctx.fillStyle = C.white;
  ctx.fillText(part1, x + pad, y + 14);
  if (part2) {
    const w2 = ctx.measureText(part2).width + pad * 2;
    ctx.fillStyle = C.badgeDark;
    ctx.fillRect(x + w1, y, w2, h);
    ctx.fillStyle = C.white;
    ctx.fillText(part2, x + w1 + pad, y + 14);
  }
}

function wordmark(ctx, x, y, size = 30, align = 'left') {
  ctx.textBaseline = 'top';
  const bold = `900 ${size}px "Helvetica Neue"`, light = `300 ${size}px "Helvetica Neue"`;
  ctx.font = bold;
  const w1 = ctx.measureText('TAKE').width;
  ctx.font = light;
  const w2 = ctx.measureText('DETROIT').width;
  const startX = align === 'right' ? x - w1 - w2 : align === 'center' ? x - (w1 + w2) / 2 : x;
  ctx.font = bold; ctx.fillStyle = C.white; ctx.fillText('TAKE', startX, y);
  ctx.font = light; ctx.fillText('DETROIT', startX + w1, y);
}

/**
 * Render a news card.
 * @param {object} opts
 * @param {string} opts.headline           - required
 * @param {string} [opts.accentPhrase]     - words within headline to highlight
 * @param {string} [opts.subtext]
 * @param {string} [opts.source]           - attribution, e.g. "Crain’s Detroit"
 * @param {string} [opts.badge1="NEWS"]    - badge text
 * @param {string} [opts.badge2]           - optional second badge segment
 * @param {string} [opts.badgeColor]       - hex; defaults by badge1 keyword
 * @param {string} [opts.photo]            - URL or local path; omit for typographic card
 * @param {boolean} [opts.youtube=false]   - draw play button
 * @param {"feed"|"story"|"square"} [opts.size="feed"]
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateNewsCard(opts) {
  const {
    headline, accentPhrase, subtext, source,
    badge1 = 'NEWS', badge2 = null,
    photo = null, youtube = false, size = 'feed',
  } = opts;
  if (!headline) throw new Error('headline is required');
  const { W, H, photoTop } = SIZES[size] || SIZES.feed;
  const badgeColor = opts.badgeColor || BADGE_COLORS[badge1.toLowerCase()] || BADGE_COLORS.news;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, W, H);

  let img = null;
  if (photo) {
    try { img = await loadImage(photo); }
    catch (e) { console.warn(`[NewsCard] photo failed to load (${e.message}) — using typographic card`); }
  }

  if (img) {
    coverDraw(ctx, img, 0, 0, W, H * photoTop + 120);
    const g = ctx.createLinearGradient(0, H * photoTop - 200, 0, H * photoTop + 120);
    g.addColorStop(0, 'rgba(16,19,24,0)');
    g.addColorStop(1, 'rgba(16,19,24,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * photoTop - 200, W, 320);
    ctx.fillStyle = C.panel;
    ctx.fillRect(0, H * photoTop + 118, W, H - H * photoTop);
    const tg = ctx.createLinearGradient(0, 0, 0, 220);
    tg.addColorStop(0, 'rgba(0,0,0,0.55)');
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, 220);
  } else {
    // typographic variant: faint street grid + Woodward diagonal
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 2;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo((W / 8) * i, 0); ctx.lineTo((W / 8) * i, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (H / 8) * i); ctx.lineTo(W, (H / 8) * i); ctx.stroke();
    }
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(W * 0.15, H); ctx.lineTo(W * 0.8, 0); ctx.stroke();
    // oversized ghost DETROIT
    ctx.font = `900 ${Math.round(W * 0.24)}px "Helvetica Neue"`;
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.textBaseline = 'top';
    ctx.fillText('DETROIT', -14, H * 0.06);
  }

  const M = 64;
  badge(ctx, M, M, badge1.toUpperCase(), badgeColor, badge2 ? badge2.toUpperCase() : null);
  wordmark(ctx, W - M, M + 14, 26, 'right');

  if (youtube && img) {
    const cx = W / 2, cy = (H * photoTop) / 2 + 40;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(cx - 95, cy - 65, 190, 130, 28); ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 36); ctx.lineTo(cx - 26, cy + 36); ctx.lineTo(cx + 40, cy);
    ctx.closePath(); ctx.fill();
  }

  // headline block — photo cards anchor below photo; typographic cards center-third
  let y = img ? H * photoTop + 20 : H * 0.34;
  if (!img) {
    ctx.fillStyle = C.coral;
    ctx.fillRect(M, y - 60, 14, 46);
    ctx.font = `800 32px "Helvetica Neue"`;
    ctx.fillStyle = C.white;
    ctx.fillText('DETROIT', M + 32, y - 60);
    ctx.fillStyle = C.coral;
    ctx.fillText(badge1.toUpperCase(), M + 32 + ctx.measureText('DETROIT ').width, y - 60);
  }
  y = drawHeadline(ctx, headline, accentPhrase, M, y, W - M * 2, img ? 4 : 6, size === 'story' ? 92 : 78);

  if (subtext) {
    ctx.font = `500 30px "Helvetica Neue"`;
    ctx.fillStyle = C.sub;
    ctx.fillText(subtext, M, y + 22);
  }

  wordmark(ctx, M, H - 78, 34);
  if (source) {
    ctx.font = `500 24px "Helvetica Neue"`;
    ctx.fillStyle = C.sub;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`via ${source}`, W - M, H - 72);
    ctx.textAlign = 'left';
  }

  return canvas.toBuffer('image/png');
}

/** Render to a file path (creates directories). */
export async function generateNewsCardFile(opts, outputPath) {
  const buf = await generateNewsCard(opts);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buf);
  return outputPath;
}
