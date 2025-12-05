import { resolveFeishuCredentials } from './config.js';

const API_BASE = 'https://open.feishu.cn/open-apis';
let cachedToken = '';
let tokenExpiresAt = 0;

export async function getTenantAccessToken(force = false) {
  const now = Date.now();
  if (!force && cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const { appId, appSecret } = resolveFeishuCredentials();
  const response = await fetch(`${API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    signal: createTimeoutSignal(5000),
  });

  if (!response.ok) {
    throw new Error(`feishu token http error: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.code !== 0) {
    throw new Error(`feishu token error: ${payload.msg}`);
  }

  cachedToken = payload.tenant_access_token;
  tokenExpiresAt = now + (payload.expire ?? 3600) * 1000;
  return cachedToken;
}

export async function uploadImageFromBuffer(buffer) {
  const token = await getTenantAccessToken();
  
  const form = new FormData();
  form.append('image_type', 'message');
  form.append('image', new Blob([buffer]), 'meme.png');

  const uploadResponse = await fetch(`${API_BASE}/im/v1/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: createTimeoutSignal(20_000),
  });

  const payload = await uploadResponse.json();
  if (payload.code !== 0) {
    throw new Error(`upload image failed: ${payload.msg}`);
  }

  return payload.data.image_key;
}

export async function uploadImageFromUrl(imageUrl) {
    const token = await getTenantAccessToken();
    
    console.log(`[feishu-client] downloading: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: createTimeoutSignal(20_000),
    });

    if (!imageResponse.ok) {
      throw new Error(`download image failed: ${imageResponse.status}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    // 兼容旧逻辑：内部转调 uploadImageFromBuffer
    return uploadImageFromBuffer(arrayBuffer);
}

export async function replyWithImage(messageId, imageKey) {
  const token = await getTenantAccessToken();
  const response = await fetch(`${API_BASE}/im/v1/messages/${messageId}/reply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      msg_type: 'image',
      content: JSON.stringify({ image_key: imageKey }),
    }),
    signal: createTimeoutSignal(5000),
  });

  const payload = await response.json();
  if (payload.code !== 0) {
    throw new Error(`reply image failed: ${payload.msg}`);
  }

  return payload.data;
}

export async function replyText(messageId, text) {
  const token = await getTenantAccessToken();
  const response = await fetch(`${API_BASE}/im/v1/messages/${messageId}/reply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      msg_type: 'text',
      content: JSON.stringify({ text }),
    }),
    signal: createTimeoutSignal(5000),
  });

  const payload = await response.json();
  if (payload.code !== 0) {
    throw new Error(`reply text failed: ${payload.msg}`);
  }
  return payload.data;
}

function createTimeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}
