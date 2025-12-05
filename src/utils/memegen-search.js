import fetch from 'node-fetch';

let templateCache = [];
let cacheLoadedAt = 0;

const MEMEGEN_TTL = 60 * 60 * 1000; // 1h
const TEMPLATE_ENDPOINT = 'https://api.memegen.link/templates/';

async function ensureTemplates() {
  const now = Date.now();
  if (templateCache.length > 0 && now - cacheLoadedAt < MEMEGEN_TTL) {
    return templateCache;
  }
  const res = await fetch(TEMPLATE_ENDPOINT, { timeout: 10_000 });
  if (!res.ok) {
    throw new Error(`memegen http ${res.status}`);
  }
  templateCache = await res.json();
  cacheLoadedAt = now;
  return templateCache;
}

function normalizeKeyword(keyword = '') {
  return keyword
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '');
}

export async function searchMemegenTemplates(keyword) {
  const cleaned = normalizeKeyword(keyword);
  if (!cleaned) return [];
  try {
    const templates = await ensureTemplates();
    const matches = templates.filter((tpl) => {
      const id = tpl.id?.toLowerCase() || '';
      const name = tpl.name?.toLowerCase() || '';
      return id.includes(cleaned) || name.includes(cleaned);
    });
    return matches.slice(0, 5).map((tpl) => ({
      name: tpl.name || tpl.id,
      url: tpl.blank,
      source: 'Memegen.link',
      referer: 'https://api.memegen.link/',
    }));
  } catch (err) {
    console.warn('[memegen] search failed', err.message);
    return [];
  }
}


