import { config } from './config.js';
import { Jimp, loadFont } from 'jimp';
import { SANS_32_WHITE } from 'jimp/fonts';
import Fuse from 'fuse.js';
import { searchImagesDDG } from './utils/ddg-search.js';
import { searchSogouMemes } from './utils/sogou-search.js';
import { searchDoutula } from './utils/doutula-search.js';
import { searchFabiaoqing } from './utils/fabiaoqing-search.js';
import { searchQianku } from './utils/qianku-search.js';
import { searchHuaban } from './utils/huaban-search.js';
import { searchTenor } from './utils/tenor-search.js';
import {
  searchWeChatMemes,
  searchBilibiliMemes,
  searchWeiboMemes,
} from './utils/platform-search.js';
import { searchDouyinMemes } from './utils/douyin-search.js';
import { searchMemegenTemplates } from './utils/memegen-search.js';
import { searchImgflipTemplates } from './utils/imgflip-search.js';
import { searchRedditMemes } from './utils/reddit-search.js';
import { searchPopularMemes } from './utils/popular-search.js';
import fetch from 'node-fetch';
import https from 'node:https';

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || 'Mw7xK4D35386876d'; 
const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const LOCAL_MEMES = [
  { names: ['熊猫头', 'panda'], url: 'https://i.imgur.com/M8R9jCq.jpg' },
  { names: ['点赞', 'good'], url: 'https://i.imgur.com/t4b8f.jpg' },
  { names: ['流汗', '无语'], url: 'https://i.imgur.com/8Yk6t8L.png' },
  { names: ['哭', '悲伤'], url: 'https://i.imgur.com/t8J1t8p.jpg' },
  { names: ['黑人问号', '疑惑'], url: 'https://i.imgflip.com/10lggx.jpg' },
  { names: ['打脸', '扇'], url: 'https://i.imgflip.com/9ehk.jpg' },
  { names: ['吃瓜'], url: 'https://i.imgur.com/J5lX5.jpg' },
  { names: ['小丑'], url: 'https://i.imgflip.com/38el31.jpg' },
  { names: ['狗头'], url: 'https://i.imgflip.com/4t0m5.jpg' },
];
const fuse = new Fuse(LOCAL_MEMES, { keys: ['names'], threshold: 0.3 });
const outputCache = new Map();

function searchLocalPrecise(keyword) {
  if (!keyword) return [];
  const results = fuse.search(keyword);
  if (results.length === 0 || results[0].score >= 0.1) return [];
  const best = results[0].item;
  return [
    {
      name: best.names[0],
      url: best.url,
      source: 'Local-Fuse',
    },
  ];
}

function pickRandomResult(results = [], sampleSize = 3) {
  if (!Array.isArray(results) || results.length === 0) return null;
  const max = Math.min(results.length, sampleSize);
  const idx = Math.floor(Math.random() * max);
  return results[idx];
}

function getSearchSteps(keyword) {
  return [
    { label: 'Hot-Funny', handler: () => searchPopularMemes(keyword), sampleSize: 2 },
    { label: 'WeChat', handler: () => searchWeChatMemes(keyword), sampleSize: 5 },
    { label: 'Douyin', handler: () => searchDouyinMemes(keyword), sampleSize: 5 },
    { label: 'Memegen.link', handler: () => searchMemegenTemplates(keyword), sampleSize: 3 },
    { label: 'Imgflip', handler: () => searchImgflipTemplates(keyword), sampleSize: 3 },
    { label: 'Giphy', handler: () => searchGiphy(keyword), sampleSize: 3 },
    { label: 'Tenor', handler: () => searchTenor(keyword), sampleSize: 2 },
    { label: 'Bilibili', handler: () => searchBilibiliMemes(keyword), sampleSize: 5 },
    { label: 'Reddit', handler: () => searchRedditMemes(keyword), sampleSize: 4 },
    { label: 'Weibo SuperTopic', handler: () => searchWeiboMemes(keyword), sampleSize: 5 },
    { label: 'Doutula', handler: () => searchDoutula(keyword), sampleSize: 5 },
    { label: 'Fabiaoqing', handler: () => searchFabiaoqing(keyword), sampleSize: 5 },
    { label: 'Qianku', handler: () => searchQianku(keyword), sampleSize: 5 },
    { label: 'Huaban', handler: () => searchHuaban(keyword), sampleSize: 5 },
    { label: 'Sogou', handler: () => searchSogouMemes(keyword), sampleSize: 3 },
    { label: 'Local-Fuse', handler: () => searchLocalPrecise(keyword), sampleSize: 1 },
    { label: 'DuckDuckGo', handler: () => searchImagesDDG(`${keyword} 表情包`), sampleSize: 3 },
  ];
}

export async function buildMemeFromCommand(command = '') {
  const { templateKeyword, memeText } = parseCommandSmart(command);
  let template = null;
  let isAnimated = false;
  let source = '';

  console.log(`[meme-provider] 🎯 Keywords: "${templateKeyword}" | Text: "${memeText}"`);

  if (templateKeyword) {
    const searchSteps = getSearchSteps(templateKeyword);
    for (const step of searchSteps) {
      if (template) break;
      try {
        console.log(
          `[meme-provider] 🔍 Searching ${step.label} for: ${templateKeyword}`
        );
        const results = await step.handler();
        const pick = pickRandomResult(results, step.sampleSize);
        if (pick?.url) {
          template = pick;
          source = pick.source || step.label;
          isAnimated = Boolean(pick.animated);
        }
      } catch (err) {
        console.warn(`[${step.label}] search failed`, err.message);
      }
    }
  }

  if (!template) {
    const rand = LOCAL_MEMES[Math.floor(Math.random() * LOCAL_MEMES.length)];
    template = { name: rand.names[0], url: rand.url };
    source = 'Random-Local-Fallback';
  }

  const resolvedSource = source || template.source || 'Unknown';
  source = resolvedSource;

  console.log(`[meme-provider] ✅ Match: [${resolvedSource}] ${template.name || ''} (${template.url})`);

  if (
    isAnimated ||
    template.url.endsWith('.gif') ||
    (!memeText && (source === 'Doutula' || source === 'Sogou'))
  ) {
    try {
      const buffer = await fetchImageBuffer(template.url, {
        referer: template.referer,
      });
      return { imageBuffer: buffer, prompt: memeText, template };
    } catch (e) {
      console.warn('Image download failed, fallback to local gen');
    }
  }

  const prompt = memeText || ' ';
  const cacheKey = `${template.url}_${prompt}`;
  const cached = outputCache.get(cacheKey);
  if (cached && Date.now() - cached.time < config.memeCacheTtlMs) {
    return { imageBuffer: cached.buffer, prompt, template };
  }

  try {
    const buffer = await generateImageWithJimp(template.url, prompt, template.referer);
    outputCache.set(cacheKey, { buffer, time: Date.now() });
    return { imageBuffer: buffer, prompt, template };
  } catch (err) {
    console.error(
      '[meme-provider] ❌ Local gen failed, try fallback download',
      err.message
    );
    // 兜底尝试直接下载，如果还不行，就抛错
    try {
      const buffer = await fetchImageBuffer(template.url, { referer: template.referer });
      return { imageBuffer: buffer, prompt, template };
    } catch (finalErr) {
      console.error('Final download failed:', finalErr.message);
      // 最后的最后，返回本地兜底图（熊猫头）
      const fallbackUrl = LOCAL_MEMES[0].url;
      const buffer = await fetchImageBuffer(fallbackUrl);
      return { imageBuffer: buffer, prompt: '图片加载失败', template: LOCAL_MEMES[0] };
    }
  }
}

// 增强版下载器：支持重试、自动切换 Referer
async function fetchImageBuffer(url, options = {}, retry = 1) {
  try {
    const isHttps = url.startsWith('https:');
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer:
        options.referer ??
        (url.includes('doutu')
          ? 'https://www.pkdoutu.com/'
          : url.includes('fabiaoqing')
          ? 'https://www.fabiaoqing.com/'
          : url.includes('588ku')
          ? 'https://588ku.com/'
          : url.includes('duitang')
          ? 'https://www.duitang.com/'
          : ''),
    };

    const fetchOptions = {
      headers,
      timeout: 15_000,
    };

    if (isHttps) {
      fetchOptions.agent = httpsAgent;
    }

    const res = await fetch(url, fetchOptions);
    if (res.status === 403 && retry > 0) {
        // 403 可能是防盗链，尝试换 Referer 重试
        console.warn(`[fetch] 403 forbidden for ${url}, retrying...`);
        return fetchImageBuffer(
          url,
          { referer: options.referer || 'https://www.google.com/' },
          retry - 1
        ); // 递归重试，这里简单重试逻辑可以优化
    }
    
    if (!res.ok) throw new Error(`http ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
      throw new Error(`fetch failed: ${err.message}`);
  }
}

async function generateImageWithJimp(imageUrl, text, referer) {
  const buffer = await fetchImageBuffer(imageUrl, { referer });
  const image = await Jimp.read(buffer);
  try {
    if (text && text.trim()) {
        const font = await loadFont(SANS_32_WHITE);
        const x = 10;
        const y = image.height - 45;
        image.print({ font, x: x+2, y: y+2, text });
        image.print({ font, x, y, text });
    }
  } catch (e) {}
  return await image.getBuffer('image/png');
}

function parseCommandSmart(raw) {
  let text = raw.trim();
  
  // 1. 显式配文关键字提取：配文/文字/字样/写上 + 冒号/空格 + 内容
  // 匹配模式： (配文|文字|字样)[:：\s]+(.+)$
  const explicitTextMatch = text.match(/(配文|文字|字样|写)[:：\s]+(.+)$/);
  if (explicitTextMatch) {
      const memeText = explicitTextMatch[2].trim();
      // 剩下的部分作为关键词
      let keyword = text.replace(explicitTextMatch[0], '').trim();
      // 如果关键词为空，说明用户只说了“配文xxx”，那关键词可能需要上下文，这里暂且留空
      return { templateKeyword: keyword, memeText };
  }

  // 2. 引号提取
  const matchQuote = text.match(/[:：](.+)$/) || text.match(/["“](.+?)["”]/);
  if (matchQuote) {
    return { templateKeyword: raw.replace(matchQuote[0], '').trim(), memeText: matchQuote[1].trim() };
  }

  const stopWords = ['给我', '一张', '个', '的', '表情', '包', '图', '生成', '来', '整'];
  let clean = text;
  stopWords.forEach(w => clean = clean.replace(w, ''));
  clean = clean.trim();
  
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
      return { templateKeyword: parts[0], memeText: parts.slice(1).join(' ') };
  }
  return { templateKeyword: clean, memeText: '' }; 
}

async function searchGiphy(keyword) {
  if (!keyword) return [];
  try {
    const url = `${GIPHY_SEARCH_URL}?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
      keyword
    )}&limit=5&rating=pg-13`;
    const res = await fetch(url, { timeout: 5000 });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? [])
      .map((item) => {
        const url =
          item.images?.downsized_medium?.url ||
          item.images?.downsized?.url ||
          item.images?.original?.url;
        if (!url) return null;
        return {
          name: item.title || keyword,
          url,
          source: 'Giphy',
          referer: 'https://giphy.com/',
          animated: true,
        };
      })
      .filter(Boolean);
  } catch (e) {
    console.warn('[giphy] search failed', e.message);
    return [];
  }
}
