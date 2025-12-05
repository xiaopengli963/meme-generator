import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function searchQianku(keyword) {
  if (!keyword) return [];

  try {
    const url = `https://588ku.com/sucai/${encodeURIComponent(keyword)}.html`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://588ku.com/',
      },
      timeout: 10_000,
    });
    if (!res.ok) {
      console.warn('[qianku] http error', res.status);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    $('img').each((_idx, el) => {
      let imgUrl =
        $(el).attr('data-original') ||
        $(el).attr('data-src') ||
        $(el).attr('src');
      if (!imgUrl) return;
      if (imgUrl.startsWith('//')) {
        imgUrl = `https:${imgUrl}`;
      }
      if (!imgUrl.startsWith('http')) return;
      // 过滤站内 logo
      if (imgUrl.includes('static') || imgUrl.includes('logo')) return;
      const alt = ($(el).attr('alt') || keyword).trim();
      results.push({
        name: alt,
        url: imgUrl,
        source: 'Qianku',
        referer: 'https://588ku.com/',
      });
    });
    return results.slice(0, 6);
  } catch (err) {
    console.warn('[qianku] search failed', err.message);
    return [];
  }
}

