import { searchImagesDDG } from './ddg-search.js';

const BLOCKED_HOSTS = ['img.zhaotu.com', 'pic.ibaotu.com'];

const themedConfigs = {
  wechat: { suffix: ' 微信 表情包', source: 'WeChat' },
  bilibili: { suffix: ' B站 表情包', source: 'Bilibili' },
  weibo: { suffix: ' 微博 超话 表情包', source: 'Weibo SuperTopic' },
};

function isBlocked(url = '') {
  try {
    const { hostname } = new URL(url);
    return BLOCKED_HOSTS.includes(hostname);
  } catch {
    return true;
  }
}

async function themedSearch(keyword, type) {
  if (!keyword) return [];
  const config = themedConfigs[type];
  if (!config) return [];
  const results = await searchImagesDDG(`${keyword}${config.suffix}`);
  return results
    .filter((item) => item.url && !isBlocked(item.url))
    .map((item) => ({
      ...item,
      source: config.source,
    }));
}

export function searchWeChatMemes(keyword) {
  return themedSearch(keyword, 'wechat');
}

export function searchBilibiliMemes(keyword) {
  return themedSearch(keyword, 'bilibili');
}

export function searchWeiboMemes(keyword) {
  return themedSearch(keyword, 'weibo');
}


