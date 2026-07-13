/**
 * News Pick Agent
 * Scores candidates and picks the day's best. If GEMINI_API_KEY is set,
 * Gemini ranks the shortlist and writes captions + accent phrases;
 * otherwise a deterministic fallback does both.
 */

const POSITIVE = [
  ['opens', 8], ['opening', 8], ['new restaurant', 8], ['grand opening', 10],
  ['expands', 6], ['expansion', 6], ['small business', 6], ['local', 3],
  ['restaurant', 4], ['bakery', 4], ['brewery', 4], ['coffee', 3],
  ['festival', 5], ['event', 3], ['award', 5], ['best', 4], ['first', 3],
  ['downtown', 3], ['corktown', 4], ['eastern market', 5], ['midtown', 3],
];
const NEGATIVE = [
  ['shooting', -100], ['killed', -100], ['dead', -100], ['crash', -50],
  ['arrest', -50], ['lawsuit', -20], ['bankrupt', -10], ['lions', -15],
  ['tigers', -15], ['pistons', -15], ['red wings', -15], // sports = scoreboard pipeline's job
];

function keywordScore(title) {
  const t = title.toLowerCase();
  let s = 0;
  for (const [kw, pts] of POSITIVE) if (t.includes(kw)) s += pts;
  for (const [kw, pts] of NEGATIVE) if (t.includes(kw)) s += pts;
  return s;
}

function categorize(title) {
  const t = title.toLowerCase();
  if (/(opens|opening|debut|launches|new spot|new restaurant|new shop)/.test(t)) return { badge1: 'OPENINGS' };
  if (/(festival|concert|event|weekend|market|fair|show)/.test(t)) return { badge1: 'EVENTS' };
  if (/(breaking|closes|closing|shuts|fire|emergency)/.test(t)) return { badge1: 'BREAKING', badge2: 'NEWS' };
  if (/(best|top \d|ranked|named|award)/.test(t)) return { badge1: 'TRENDING', badge2: 'NEWS' };
  return { badge1: 'NEWS' };
}

function dedupe(items) {
  const seen = [];
  return items.filter((i) => {
    const words = new Set(i.title.toLowerCase().split(/\W+/).filter((w) => w.length > 4));
    for (const other of seen) {
      const overlap = [...words].filter((w) => other.has(w)).length;
      if (overlap >= Math.min(3, words.size)) return false;
    }
    seen.push(words);
    return true;
  });
}

async function geminiEnrich(picks) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const prompt = `You run @take.detroit, a Detroit city-guide social brand. For each news item below, write:
- "caption": an Instagram caption (1-2 punchy sentences + 3-5 local hashtags, no emojis overload)
- "accentPhrase": the 2-4 consecutive words FROM THE HEADLINE that deserve visual highlight
- "subtext": optional one-line factual sub-headline (or null)
Return ONLY a JSON array, same order, objects with keys caption, accentPhrase, subtext.

Items:
${picks.map((p, i) => `${i + 1}. ${p.title} (source: ${p.source})`).join('\n')}`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonText = text.replace(/```json|```/g, '').trim();
    const arr = JSON.parse(jsonText);
    if (Array.isArray(arr) && arr.length === picks.length) return arr;
    throw new Error('shape mismatch');
  } catch (err) {
    console.warn(`[NewsPick] Gemini enrich failed (${err.message}) — using fallback captions`);
    return null;
  }
}

function fallbackEnrich(pick) {
  const words = pick.title.split(' ');
  // highlight the middle third of the headline as a rough accent
  const start = Math.floor(words.length / 3);
  const accentPhrase = words.slice(start, Math.min(start + 3, words.length)).join(' ');
  return {
    caption: `${pick.title} — via ${pick.source}. #Detroit #DetroitNews #TakeDetroit`,
    accentPhrase,
    subtext: null,
  };
}

/**
 * Pick the best N items and enrich with captions/accents.
 * @param {Array} candidates - from newsSource.fetchCandidates()
 * @param {number} count
 */
export async function pickBest(candidates, count = 3) {
  const scored = candidates
    .map((c) => ({ ...c, score: keywordScore(c.title) + (c.type === 'youtube' ? 4 : 0) }))
    .filter((c) => c.score > -10)
    .sort((a, b) => b.score - a.score);

  const unique = dedupe(scored);
  // ensure at most one youtube item in the set
  const picks = [];
  for (const item of unique) {
    if (picks.length >= count) break;
    if (item.type === 'youtube' && picks.some((p) => p.type === 'youtube')) continue;
    picks.push(item);
  }

  const enriched = (await geminiEnrich(picks)) || picks.map(fallbackEnrich);
  return picks.map((p, i) => ({
    ...p,
    ...categorize(p.title),
    caption: enriched[i]?.caption || fallbackEnrich(p).caption,
    accentPhrase: enriched[i]?.accentPhrase || fallbackEnrich(p).accentPhrase,
    subtext: enriched[i]?.subtext ?? null,
  }));
}
