// 模拟搜狗表情搜索
// 这是一个非官方 API，通过模拟网页请求获取数据
// URL: https://pic.sogou.com/napi/wap/pic?query={keyword}&start=0&len=10&reqType=ajax&reqFrom=wap_result

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36';

export async function searchSogouMemes(query) {
  try {
    // 搜狗表情搜索接口
    // query: 关键词
    const url = `https://pic.sogou.com/napi/wap/pic?query=${encodeURIComponent(query)}&start=0&len=5&reqType=ajax&reqFrom=wap_result`;
    
    const res = await fetch(url, {
      headers: { 
        'User-Agent': UA,
        'Referer': 'https://pic.sogou.com/pic/emo/index.jsp'
      }
    });

    if (!res.ok) return [];
    const json = await res.json();

    if (json && json.items && Array.isArray(json.items)) {
      // 提取图片 URL
      return json.items.map(item => ({
        url: item.picUrl,
        name: item.title || query,
        source: 'Sogou',
        referer: 'https://pic.sogou.com/'
      })).filter(item => item.url);
    }
    return [];
  } catch (err) {
    console.warn('[sogou] search failed:', err.message);
    return [];
  }
}

