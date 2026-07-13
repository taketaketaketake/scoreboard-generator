// Social news-card mockups based on Zach's reference (photo card, badge, accent headline).
// Run: node social-mockups.js   → writes to ./mockups/
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'fs';

mkdirSync('./mockups', { recursive: true });

const PHOTO = '/Users/Zach/Github_Projects/thefakezach/public/take-detroit-cupcakes.jpg';

const C = {
  panel: '#101318',        // bottom panel / card bg
  white: '#FFFFFF',
  sub: '#B8BEC9',
  red: '#E5202E',          // BREAKING
  orange: '#F28C1B',       // EXPLAINER / OPENINGS
  blue: '#1E63D0',         // TRENDING
  badgeDark: '#191E26',    // second half of two-part badge
  accent: '#F5A623',       // headline highlight (gold-orange)
};

// ---------- helpers ----------
function coverDraw(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, r = w / h;
  let sw, sh, sx, sy;
  if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) * 0.25; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// wrap words, each word = {t, accent}
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

// headline with accent substring; shrinks to fit maxLines
function drawHeadline(ctx, text, accentPhrase, x, y, maxWidth, maxLines, startSize) {
  const words = text.split(' ').map((t) => ({ t, accent: false }));
  if (accentPhrase) {
    const aw = accentPhrase.split(' ');
    for (let i = 0; i <= words.length - aw.length; i++) {
      if (aw.every((a, j) => words[i + j].t.replace(/[^\w’']/g, '') === a.replace(/[^\w’']/g, ''))) {
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

// two-part badge: [PART1][PART2]
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

// brand wordmark: TAKE (bold) DETROIT (light)
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

// ---------- the card ----------
async function newsCard({
  W = 1080, H = 1350,
  badge1 = 'OPENINGS', badgeColor = C.orange, badge2 = null,
  headline, accentPhrase, subtext, source,
  youtube = false, photoTop = 0.62,
}) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const img = await loadImage(PHOTO);

  // photo fills whole card; panel overlays bottom
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, W, H);
  coverDraw(ctx, img, 0, 0, W, H * photoTop + 120);

  // gradient photo → panel
  const g = ctx.createLinearGradient(0, H * photoTop - 200, 0, H * photoTop + 120);
  g.addColorStop(0, 'rgba(16,19,24,0)');
  g.addColorStop(1, 'rgba(16,19,24,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, H * photoTop - 200, W, 320);
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, H * photoTop + 118, W, H - H * photoTop);

  // subtle top gradient for badge legibility
  const tg = ctx.createLinearGradient(0, 0, 0, 220);
  tg.addColorStop(0, 'rgba(0,0,0,0.55)');
  tg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, W, 220);

  const M = 64;
  badge(ctx, M, M, badge1, badgeColor, badge2);
  wordmark(ctx, W - M, M + 14, 26, 'right');

  if (youtube) {
    // centered play button on photo
    const cx = W / 2, cy = (H * photoTop) / 2 + 40;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(cx - 95, cy - 65, 190, 130, 28); ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 36); ctx.lineTo(cx - 26, cy + 36); ctx.lineTo(cx + 40, cy);
    ctx.closePath(); ctx.fill();
  }

  // headline block
  let y = H * photoTop + (youtube ? 40 : 20);
  y = drawHeadline(ctx, headline, accentPhrase, M, y, W - M * 2, 4, 78);

  if (subtext) {
    ctx.font = `500 30px "Helvetica Neue"`;
    ctx.fillStyle = C.sub;
    ctx.fillText(subtext, M, y + 22);
    y += 60;
  }

  // footer: wordmark left, source right
  wordmark(ctx, M, H - 78, 34);
  if (source) {
    ctx.font = `500 24px "Helvetica Neue"`;
    ctx.fillStyle = C.sub;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`via ${source}`, W - M, H - 72);
    ctx.textAlign = 'left';
  }
  return canvas;
}

// ---------- render set ----------
const save = (name, canvas) => writeFileSync(`./mockups/${name}.png`, canvas.toBuffer('image/png'));

const HEADLINE = 'Beloved Eastern Market bakery expands to Corktown';
const run = async () => {
  save('card-feed-openings', await newsCard({
    headline: HEADLINE, accentPhrase: 'expands to Corktown',
    subtext: 'Second location opens this fall.', source: 'Crain’s Detroit',
    badge1: 'OPENINGS', badgeColor: C.orange,
  }));
  save('card-feed-breaking', await newsCard({
    headline: 'Major water main break shuts down Woodward Ave', accentPhrase: 'shuts down Woodward',
    subtext: 'Crews expect repairs through Friday.', source: 'Detroit Free Press',
    badge1: 'BREAKING', badgeColor: C.red, badge2: 'NEWS',
  }));
  save('card-feed-trending', await newsCard({
    headline: 'Detroit named a top 10 U.S. food city for 2026', accentPhrase: 'top 10 U.S. food city',
    subtext: null, source: 'Eater',
    badge1: 'TRENDING', badgeColor: C.blue, badge2: 'NEWS',
  }));
  save('card-youtube-watch', await newsCard({
    headline: 'Inside Detroit’s most ambitious restaurant opening', accentPhrase: 'most ambitious',
    subtext: null, source: 'YouTube · Eater Detroit',
    badge1: 'WATCH', badgeColor: C.red, youtube: true,
  }));
  save('card-story', await newsCard({
    W: 1080, H: 1920, photoTop: 0.58,
    headline: HEADLINE, accentPhrase: 'expands to Corktown',
    subtext: 'Second location opens this fall.', source: 'Crain’s Detroit',
    badge1: 'OPENINGS', badgeColor: C.orange,
  }));
  save('card-square-x', await newsCard({
    W: 1080, H: 1080, photoTop: 0.55,
    headline: HEADLINE, accentPhrase: 'expands to Corktown',
    subtext: null, source: 'Crain’s Detroit',
    badge1: 'OPENINGS', badgeColor: C.orange,
  }));
  console.log('6 mockups written to ./mockups/');
};
run();
