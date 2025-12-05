const KEYWORD_GROUPS = [
  { tag: 'happy', keywords: ['开心', '快乐', '高兴', '喜', '哈哈', '乐'] },
  { tag: 'thumbs', keywords: ['点赞', '赞', '给力', '棒', '优秀', '牛'] },
  { tag: 'support', keywords: ['加油', '冲', '冲鸭', '上啊', '鼓励', '一起'] },
  { tag: 'angry', keywords: ['生气', '愤怒', '爆炸', '火大', '怒'] },
  { tag: 'embarrassed', keywords: ['无语', '尴尬', '汗', 'speechless', '窘'] },
  { tag: 'sad', keywords: ['难过', '伤心', '哭', '委屈', 'emo', '心碎'] },
  { tag: 'surprised', keywords: ['惊讶', '震惊', '哇塞', '卧槽', '？！'] },
  { tag: 'question', keywords: ['疑惑', '黑人', '问号', 'why', '啥'] },
  { tag: 'lazy', keywords: ['摸鱼', '躺平', '咸鱼', '摆烂', '划水', '累了'] },
  { tag: 'eatmelon', keywords: ['吃瓜', '围观', '八卦', '看戏'] },
  { tag: 'funny', keywords: ['搞笑', '沙雕', '梗图', '逗', '有趣'] },
];

const CURATED_MEMES = [
  {
    name: '熊猫点赞',
    tags: ['thumbs', 'happy', 'support', 'funny'],
    url: 'http://img.doutupk.com/production/uploads/image/2020/03/15/20200315274880_xLIChD.jpg',
  },
  {
    name: '熊猫挥手',
    tags: ['happy', 'funny', 'support'],
    url: 'http://img.doutupk.com/production/uploads/image/2019/07/18/20190718410950_DeYwhk.gif',
  },
  {
    name: '狗头冲鸭',
    tags: ['support', 'thumbs', 'funny'],
    url: 'http://img.doutupk.com/production/uploads/image/2018/01/02/20180102899964_QhcLtA.gif',
  },
  {
    name: '吃瓜群众',
    tags: ['eatmelon', 'funny'],
    url: 'http://img.doutupk.com/production/uploads/image/2017/11/27/20171127047670_dZlJjy.jpg',
  },
  {
    name: '熊猫崩溃',
    tags: ['angry', 'sad', 'funny'],
    url: 'http://img.doutupk.com/production/uploads/image/2018/02/17/20180217833888_gyPiGh.jpg',
  },
  {
    name: '黑人问号',
    tags: ['question', 'surprised', 'funny'],
    url: 'https://i.imgflip.com/10lggx.jpg',
  },
  {
    name: '狗头保命',
    tags: ['funny', 'question'],
    url: 'https://i.imgflip.com/4t0m5.jpg',
  },
  {
    name: '流汗无语',
    tags: ['embarrassed', 'funny'],
    url: 'http://img.doutupk.com/production/uploads/image/2018/02/26/20180226578911_wBvYhJ.gif',
  },
  {
    name: '熊猫哭哭',
    tags: ['sad', 'embarrassed'],
    url: 'http://img.doutupk.com/production/uploads/image/2018/06/06/20180606225766_wSViBH.jpg',
  },
  {
    name: '沙雕崩溃',
    tags: ['embarrassed', 'angry', 'funny'],
    url: 'http://img.doutupk.com/production/uploads/image/2018/02/17/20180217833888_gyPiGh.jpg',
  },
  {
    name: '摸鱼划水',
    tags: ['lazy', 'sad', 'funny'],
    url: 'http://img.doutupk.com/production/uploads/image/2018/02/26/20180226578911_wBvYhJ.gif',
  },
  {
    name: '震惊小哥',
    tags: ['surprised', 'question', 'funny'],
    url: 'https://i.imgflip.com/30zz5g.jpg',
  },
  {
    name: '猴子回头',
    tags: ['embarrassed', 'question', 'funny'],
    url: 'https://i.imgflip.com/3lmzyx.jpg',
  },
  {
    name: '小丑无奈',
    tags: ['funny', 'sad', 'embarrassed'],
    url: 'https://i.imgflip.com/38el31.jpg',
  },
];

function normalizeKeyword(keyword = '') {
  return keyword.trim();
}

function detectTags(keyword) {
  if (!keyword) return [];
  const lowered = keyword.toLowerCase();
  const tags = new Set();
  KEYWORD_GROUPS.forEach((group) => {
    if (
      group.keywords.some((kw) => keyword.includes(kw) || lowered.includes(kw.toLowerCase()))
    ) {
      tags.add(group.tag);
    }
  });
  return Array.from(tags);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function searchPopularMemes(keyword = '') {
  const cleanKeyword = normalizeKeyword(keyword);
  const matchedTags = detectTags(cleanKeyword);

  let pool = [];
  if (matchedTags.length > 0) {
    pool = CURATED_MEMES.filter((meme) =>
      meme.tags.some((tag) => matchedTags.includes(tag))
    );
  } else if (!cleanKeyword) {
    pool = CURATED_MEMES;
  }

  if (!pool.length) {
    return [];
  }

  const sampled = shuffle(pool.slice()).slice(0, Math.min(4, pool.length));
  return sampled.map((item) => ({
    name: item.name,
    url: item.url,
    source: 'Hot-Funny',
  }));
}

