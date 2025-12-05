import fetch from 'node-fetch';

const SUBREDDITS = ['memes', 'dankmemes', 'AdviceAnimals', 'me_irl'];
const USER_AGENT = 'FeishuMemeBot/1.0 (+https://open.feishu.cn/)';

function isImageUrl(url = '') {
  return /\.(gif|png|jpg|jpeg|webp)$/i.test(url);
}

export async function searchRedditMemes(keyword) {
  if (!keyword) return [];
  const encoded = encodeURIComponent(keyword);
  const items = [];
  for (const sub of SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encoded}&restrict_sr=1&sort=top&t=month&limit=5`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10_000,
      });
      if (!res.ok) continue;
      const json = await res.json();
      const children = json?.data?.children ?? [];
      children.forEach((child) => {
        const data = child.data;
        const imageUrl =
          data?.url_overridden_by_dest ||
          data?.url ||
          data?.preview?.images?.[0]?.source?.url;
        if (!imageUrl || !isImageUrl(imageUrl)) return;
        items.push({
          name: data.title || keyword,
          url: imageUrl.replace(/&amp;/g, '&'),
          source: `Reddit/${sub}`,
          referer: `https://www.reddit.com${data.permalink || ''}`,
          animated: imageUrl.endsWith('.gif'),
        });
      });
      if (items.length >= 5) break;
    } catch (err) {
      console.warn('[reddit] search failed', err.message);
    }
  }
  return items.slice(0, 5);
}


