import fetch from 'node-fetch';

const API_ENDPOINT = 'https://www.duitang.com/napi/blog/list/by_search/';
const REFERER = 'https://www.duitang.com/';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildQuery(keyword) {
  if (!keyword) return '';
  return `${keyword} 抖音 表情包`.trim();
}

export async function searchDouyinMemes(keyword) {
  const query = buildQuery(keyword);
  if (!query) return [];

  const url = `${API_ENDPOINT}?kw=${encodeURIComponent(query)}&start=0&limit=12`;
  try {
    const res = await fetch(url, {
      headers: {
        Referer: REFERER,
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 10_000,
    });
    if (!res.ok) {
      console.warn('[douyin] http error', res.status);
      return [];
    }
    const payload = await res.json();
    const list = payload?.data?.object_list ?? [];
    return list
      .map((item) => {
        const imgPath = item?.photo?.path;
        if (!imgPath) return null;
        const url = imgPath.startsWith('http') ? imgPath : `https:${imgPath}`;
        return {
          name: item?.msg || keyword,
          url,
          source: 'Douyin-Duitang',
          referer: REFERER,
          animated: url.includes('.gif'),
        };
      })
      .filter(Boolean)
      .slice(0, 6);
  } catch (err) {
    console.warn('[douyin] search failed', err.message);
    return [];
  }
}


