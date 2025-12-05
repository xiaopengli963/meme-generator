// 模拟 DuckDuckGo 图片搜索
// 参考开源实现，DDG 的图片搜索接口不需要 API Key，但需要特定的 token 流程
// 流程: 
// 1. GET /?q=xxx (获取 vqd token)
// 2. GET /i.js?q=xxx&vqd=token (获取图片结果)

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function searchImagesDDG(query) {
  try {
    const vqd = await getVqd(query);
    if (!vqd) return [];

    const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA }
    });

    if (!res.ok) return [];
    const data = await res.json();
    
    // 返回前 5 张图的 URL
    // results: [ { image: "url...", title: "..." }, ... ]
    return (data.results || []).slice(0, 5).map(item => ({
      url: item.image,
      name: item.title || query,
      source: 'DuckDuckGo',
      referer: 'https://duckduckgo.com/'
    }));
  } catch (err) {
    console.warn('[ddg] search failed:', err.message);
    return [];
  }
}

async function getVqd(query) {
  try {
    const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`, {
      headers: { 'User-Agent': UA }
    });
    const text = await res.text();
    
    // 从 HTML 中提取 vqd='4-1234567890...'
    const match = text.match(/vqd=['"]([\d-]+)['"]/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

