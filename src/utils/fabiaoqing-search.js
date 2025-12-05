import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import https from 'node:https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function searchFabiaoqing(keyword) {
  if (!keyword) return [];

  try {
    const url = `https://www.fabiaoqing.com/search/bqb/${encodeURIComponent(
      keyword
    )}.html`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://www.fabiaoqing.com/',
      },
      agent: httpsAgent,
      timeout: 10_000,
    });
    if (!res.ok) {
      console.warn('[fabiaoqing] http error', res.status);
      return [];
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    $('.search-result div .search-picture img, .search-bqb img').each(
      (_idx, el) => {
        let imgUrl = $(el).attr('data-original') || $(el).attr('src');
        if (!imgUrl) return;
        if (imgUrl.startsWith('//')) {
          imgUrl = `https:${imgUrl}`;
        }
        if (!imgUrl.startsWith('http')) return;
        const name = ($(el).attr('alt') || keyword).trim();
        results.push({
          name,
          url: imgUrl,
          source: 'Fabiaoqing',
          referer: 'https://www.fabiaoqing.com/',
        });
      }
    );
    return results.slice(0, 6);
  } catch (err) {
    console.warn('[fabiaoqing] search failed', err.message);
    return [];
  }
}
