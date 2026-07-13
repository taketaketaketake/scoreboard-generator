/**
 * Social Job
 * Daily pipeline: fetch Detroit news → pick the best → render TAKEDETROIT
 * cards (feed + story) → upload to R2 → MMS the cards + captions to Zach.
 *
 * Dry-run safe: without R2/Twilio credentials it renders locally and logs.
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchCandidates } from '../agents/newsSource.js';
import { pickBest } from '../agents/newsPick.js';
import { generateNewsCardFile } from '../src/generateNewsCard.js';
import { uploadToR2, validateR2Config } from '../agents/r2.js';
import { sendScoreboardImage, sendTextMessage, validateConfig as validateTwilio } from '../agents/twilio.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'output', 'social');

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

/**
 * @param {object} opts
 * @param {number} [opts.count=3]  - how many stories to post
 * @param {boolean} [opts.send=true] - send MMS (auto-disabled if Twilio not configured)
 */
export async function runSocialJob({ count = 3, send = true } = {}) {
  console.log('\n[Social] === Daily social job starting ===');
  const candidates = await fetchCandidates(36);
  if (!candidates.length) {
    console.log('[Social] No fresh candidates — nothing to do.');
    return { picks: [], cards: [] };
  }

  const picks = await pickBest(candidates, count);
  console.log(`[Social] Picked ${picks.length}:`);
  picks.forEach((p, i) => console.log(`  ${i + 1}. [${p.badge1}] ${p.title} (${p.source})`));

  const date = new Date().toISOString().split('T')[0];
  const r2Ok = validateR2Config().valid;
  const twilioOk = validateTwilio().valid;
  const cards = [];

  for (const pick of picks) {
    const base = slugify(pick.title);
    const common = {
      headline: pick.title,
      accentPhrase: pick.accentPhrase,
      subtext: pick.subtext,
      source: pick.source,
      badge1: pick.type === 'youtube' ? 'WATCH' : pick.badge1,
      badge2: pick.type === 'youtube' ? null : pick.badge2,
      photo: pick.image || null,
      youtube: pick.type === 'youtube',
    };

    const files = {};
    for (const size of ['feed', 'story']) {
      const path = join(OUTPUT_DIR, date, `${base}-${size}.png`);
      await generateNewsCardFile({ ...common, size }, path);
      files[size] = { path };
      if (r2Ok) {
        try {
          const { publicUrl } = await uploadToR2(path, `social/${date}/${base}-${size}.png`);
          files[size].url = publicUrl;
          console.log(`[Social] uploaded ${size}: ${publicUrl}`);
        } catch (err) {
          console.error(`[Social] R2 upload failed: ${err.message}`);
        }
      }
    }
    cards.push({ pick, files });
  }

  // Delivery: one MMS per story (feed card) with the caption + link
  if (send && twilioOk) {
    for (const { pick, files } of cards) {
      const media = files.feed.url;
      const body = `[${pick.badge1}] ${pick.caption}\n\nstory + feed cards on R2\nsource: ${pick.url}`;
      try {
        if (media) await sendScoreboardImage(media, body);
        else await sendTextMessage(`${body}\n(no R2 — card saved locally: ${files.feed.path})`);
        console.log(`[Social] MMS sent for "${pick.title.slice(0, 40)}..."`);
      } catch (err) {
        console.error(`[Social] MMS failed: ${err.message}`);
      }
    }
  } else {
    console.log(`[Social] Delivery skipped (${send ? 'Twilio not configured' : 'send=false'}). Cards in ${join(OUTPUT_DIR, date)}`);
  }

  console.log('[Social] === Done ===\n');
  return { picks, cards };
}
