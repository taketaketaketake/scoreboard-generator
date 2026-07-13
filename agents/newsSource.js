/**
 * News Source Agent
 * Fetches Detroit news candidates. Primary: Detroit Small Business Map API
 * (/api/v1/content — news + YouTube). Fallback: Google News RSS directly
 * (same feeds the map ingests), so the pipeline works even if the map API
 * is stale or down.
 */
import { XMLParser } from 'fast-xml-parser';

const MAP_API_URL = process.env.MAP_API_URL || 'https://api-production-49e0.up.railway.app/api/v1';

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=detroit+small+business&hl=en-US&gl=US',
  'https://news.google.com/rss/search?q=detroit+restaurant&hl=en-US&gl=US',
  'https://news.google.com/rss/search?q=detroit+events&hl=en-US&gl=US',
  'https://news.google.com/rss/search?q=detroit&hl=en-US&gl=US',
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

/** Normalized item: {title, url, source, publishedAt, image, type: 'news'|'youtube'} */

async function fromMapApi() {
  const res = await fetch(`${MAP_API_URL}/content?limit=50&relevance=relevant`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`map API ${res.status}`);
  const data = await res.json();
  const items = data.items || data.data || [];
  return items.map((i) => ({
    title: i.title,
    url: i.source_url || i.url || i.video_url,
    source: i.source_name || i.channel_name || 'Detroit',
    publishedAt: i.published_at ? new Date(i.published_at) : null,
    image: i.thumbnail_url || i.image_url || null,
    type: (i.platform === 'youtube' || i.content_type === 'youtube' || i.video_url) ? 'youtube' : 'news',
  })).filter((i) => i.title && i.url);
}

async function fromRss() {
  const all = [];
  const seen = new Set();
  for (const feedUrl of RSS_FEEDS) {
    try {
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'TakeDetroitSocial/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const parsed = parser.parse(await res.text());
      const items = parsed?.rss?.channel?.item || [];
      for (const item of Array.isArray(items) ? items : [items]) {
        const url = item.link;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        // Google News titles end with " - Source Name"
        const raw = String(item.title || '');
        const m = raw.match(/^(.*)\s-\s([^-]+)$/);
        all.push({
          title: m ? m[1].trim() : raw,
          url,
          source: m ? m[2].trim() : (item.source?.['#text'] || 'Google News'),
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
          image: null,
          type: 'news',
        });
      }
    } catch (err) {
      console.warn(`[NewsSource] RSS feed failed: ${feedUrl} (${err.message})`);
    }
  }
  return all;
}

/**
 * Fetch news candidates from the freshest available source.
 * @param {number} maxAgeHours - only keep items newer than this
 */
export async function fetchCandidates(maxAgeHours = 36) {
  let items = [];
  let sourceUsed = 'map-api';
  try {
    items = await fromMapApi();
    if (!items.length) throw new Error('map API returned 0 items');
  } catch (err) {
    console.warn(`[NewsSource] map API unavailable (${err.message}) — falling back to RSS`);
    items = await fromRss();
    sourceUsed = 'rss';
  }
  const cutoff = Date.now() - maxAgeHours * 3600_000;
  const fresh = items.filter((i) => !i.publishedAt || i.publishedAt.getTime() > cutoff);
  console.log(`[NewsSource] ${fresh.length} fresh candidates via ${sourceUsed}`);
  return fresh;
}
