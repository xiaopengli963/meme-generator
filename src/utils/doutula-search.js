import * as cheerio from 'cheerio';
import https from 'node:https';
import fetch from 'node-fetch'; // 必须显式使用 node-fetch 才能支持 agent

// 忽略 SSL 错误的 agent
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function searchDoutula(keyword) {
  try {
    const url = `https://www.pkdoutu.com/search?keyword=${encodeURIComponent(keyword)}`;
    
    const res = await fetch(url, {
      headers: { 
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.pkdoutu.com/'
      },
      agent: httpsAgent, // 关键：加上忽略证书错误的 agent
      timeout: 10000
    });
    
    if (!res.ok) {
        return [];
    }
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const results = [];
    $('.random_picture img').each((i, el) => {
        let imgUrl =
          $(el).attr('data-original') ||
          $(el).attr('data-backup') ||
          $(el).attr('src');
        const alt = ($(el).attr('alt') || keyword).trim();
        
        if (
          !imgUrl ||
          imgUrl.includes('loader.gif') ||
          imgUrl.includes('static.doutupk.com/img/gif.png')
        ) {
          return;
        }
        if (imgUrl.startsWith('//')) imgUrl = `https:${imgUrl}`;
        if (!imgUrl.startsWith('http')) return;

        results.push({
            url: imgUrl,
            name: alt,
            source: 'Doutula',
            referer: 'https://www.pkdoutu.com/'
        });
    });

    return results.slice(0, 8);
  } catch (err) {
    console.warn('[doutula] search failed:', err.message);
    return [];
  }
}
