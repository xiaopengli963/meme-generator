import fetch from 'node-fetch';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildImageUrl(file) {
  if (!file?.key) return null;
  const suffix = file.type?.includes('gif') ? '' : '_fw658';
  return `https://gd-hbimg.huaban.com/${file.key}${suffix}`;
}

export async function searchHuaban(keyword) {
  if (!keyword) return [];

  try {
    const url = `https://api.huaban.com/search?per_page=6&q=${encodeURIComponent(
      keyword
    )}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://huaban.com/',
      },
      timeout: 7000,
    });
    if (!res.ok) {
      console.warn('[huaban] http error', res.status);
      return [];
    }
    const data = await res.json();
    const pins = data?.pins ?? data?.data ?? [];
    return pins
      .map((pin) => {
        const url = buildImageUrl(pin.file);
        if (!url) return null;
        return {
          name: pin.raw_text || keyword,
          url,
          source: 'Huaban',
          referer: 'https://huaban.com/',
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('[huaban] search failed', err.message);
    return [];
  }
}

