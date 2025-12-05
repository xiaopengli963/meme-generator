import fetch from 'node-fetch';

const DEFAULT_TENOR_KEY = process.env.TENOR_API_KEY || 'LIVDSRZULELA';
const TENOR_API = 'https://g.tenor.com/v1/search';

export async function searchTenor(keyword) {
  if (!keyword) return [];

  try {
    const url = `${TENOR_API}?key=${DEFAULT_TENOR_KEY}&q=${encodeURIComponent(
      keyword
    )}&limit=5&media_filter=gif,tinygif`;
    const res = await fetch(url, { timeout: 7000 });
    if (!res.ok) {
      console.warn('[tenor] http error', res.status);
      return [];
    }
    const data = await res.json();
    const results = data?.results ?? [];
    return results
      .map((item) => {
        // v1 structure: item.media[0].tinygif.url
        const media =
          item.media?.[0]?.tinygif || item.media?.[0]?.gif || item.media_formats?.gif;
        if (!media?.url) return null;
        return {
          name: item.title || keyword,
          url: media.url,
          source: 'Tenor',
          referer: 'https://tenor.com/',
          animated: true,
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('[tenor] search failed', err.message);
    return [];
  }
}

