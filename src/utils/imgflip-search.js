import fetch from 'node-fetch';

const IMGFLIP_ENDPOINT = 'https://api.imgflip.com/get_memes';
let templateCache = [];
let cacheLoadedAt = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1h

async function ensureTemplates() {
  const now = Date.now();
  if (templateCache.length > 0 && now - cacheLoadedAt < CACHE_TTL) {
    return templateCache;
  }
  const res = await fetch(IMGFLIP_ENDPOINT, { timeout: 10_000 });
  if (!res.ok) {
    throw new Error(`imgflip http ${res.status}`);
  }
  const payload = await res.json();
  if (!payload.success) {
    throw new Error('imgflip unsuccessful');
  }
  templateCache = payload.data?.memes ?? [];
  cacheLoadedAt = now;
  return templateCache;
}

function normalize(text = '') {
  return text.toLowerCase();
}

export async function searchImgflipTemplates(keyword) {
  if (!keyword) return [];
  try {
    const templates = await ensureTemplates();
    const norm = normalize(keyword);
    const matches = templates.filter((tpl) => {
      const name = normalize(tpl.name);
      return name.includes(norm);
    });
    return matches.slice(0, 5).map((tpl) => ({
      name: tpl.name,
      url: tpl.url,
      source: 'Imgflip',
      referer: 'https://imgflip.com/',
    }));
  } catch (err) {
    console.warn('[imgflip] search failed', err.message);
    return [];
  }
}


