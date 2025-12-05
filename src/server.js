import http from 'node:http';
import crypto from 'node:crypto';
import process from 'node:process';
import { Buffer } from 'node:buffer';

import { config, resolveFeishuCredentials } from './config.js';
import { buildMemeFromCommand } from './meme-provider.js';
import { replyText, replyWithImage, uploadImageFromBuffer } from './feishu-client.js';

const credentials = resolveFeishuCredentials();

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;

    if (pathname === '/feishu/event') {
      await handleFeishuRoute(req, res);
    } else if (req.method === 'GET' && pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    }
  } catch (err) {
    console.error('[server] unexpected error', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'internal error' }));
  }
});

server.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
  if (credentials.encryptKey) {
    console.log('[server] signature verification enabled');
  }
});

async function handleFeishuRoute(req, res) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', detail: 'POST Feishu events here' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }

  const { rawBody, json } = await readJsonBody(req);

  if (!json) {
    console.error('[DEBUG] Empty or invalid JSON body');
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid json' }));
    return;
  }

  console.log('[DEBUG] Received JSON:', JSON.stringify(json, null, 2));

  if (credentials.encryptKey) {
    const ok = verifyLarkSignature(req.headers, rawBody, credentials.encryptKey);
    if (!ok) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid signature' }));
      return;
    }
  }

  if (json.type === 'url_verification') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ challenge: json.challenge }));
    return;
  }

  // 兼容 V2.0 事件结构与旧版验证请求
  const requestToken = json.token || json.header?.token;

  if (requestToken !== credentials.verificationToken) {
    console.error(`[DEBUG] Token mismatch! Received: ${requestToken}, Expected: ${credentials.verificationToken}`);
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid token' }));
    return;
  }

  // 兼容 V2.0 和 V1.0 的事件回调判断
  // V2.0: schema="2.0", header.event_type="im.message.receive_v1"
  // V1.0: type="event_callback"
  const isEventCallback = json.type === 'event_callback' || json.schema === '2.0';

  if (isEventCallback) {
    // 立即返回成功，避免飞书重试
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 0 }));

    // 异步处理业务
    console.log('[DEBUG] Dispatching event to processMessageEvent');
    processMessageEvent(json.event).catch((err) => {
      console.error('[server] processMessageEvent fatal error:', err);
    });
    return;
  }
}

async function processMessageEvent(event) {
  if (!event?.message) {
    return;
  }

  const message = event.message;
  const chatType = message.chat_type;
  const mentions = message.mentions || [];
  
    // 1. 群聊逻辑：必须 @ 机器人
  if (chatType === 'group') {
    // 检查 mentions 列表里是否有当前机器人的条目
    // 飞书事件中，@机器人 的 mention 条目通常没有 user_id，或者 name 正是机器人名
    // 这里我们约定：
    // 1. 如果 mentions 为空，说明没有 @ 任何人，肯定不处理（除非开启全员监听，但这里要求必须 @）
    // 2. 如果 mentions 不为空，遍历所有 mention，看是否存在 is_bot=true 或没有 user_id 的条目
    //    注意：飞书 mention 结构里，机器人通常没有 user_id，或者有 open_id 但 tenant_key 可能不同
    //    最稳妥的方式是：检查 message.content 中是否包含 @机器人 的 key
    
    // 简化策略：如果 mentions 里全是真实用户（有 user_id），那就一定不是 @ 机器人
    // 只要有一个 mention 没有 user_id，就认为是机器人（或 @所有人）
    const hasBotMention = mentions.some((m) => !m.id?.user_id);
    
    if (!hasBotMention) {
      console.log('[bot] ignore group message (mention does not target bot)');
      return;
    }
  }

  const messageId = message.message_id;
  
  // 2. 指令提取优化
  // 先拿到 clean text
  let commandText = extractCommand(message.content ?? '');
  
  // 如果是群聊，再次尝试移除可能残留的 @机器人 文本（如果 extractCommand 没清理干净）
  if (chatType === 'group' && mentions.length > 0) {
      // 遍历所有 mention，把它们的名字从 commandText 里删掉
      mentions.forEach(m => {
          if (m.name) {
              commandText = commandText.replace(m.name, '').trim();
          }
          // 也可以 replace key 如 @_user_1
          if (m.key) {
              commandText = commandText.replace(m.key, '').trim();
          }
      });
  }
  
  // 清理多余空格
  const command = commandText.replace(/\s+/g, ' ').trim();

  console.log(`[bot] received command: "${command || '(empty)'}" from ${messageId} (type: ${chatType})`);
  
  if (!command) {
      // 如果 @ 了但没说话，或者只发了个 @，就不回图了，或者回个问号
      return; 
  }

  try {
    console.log('[bot] fetching meme template...');
    const meme = await buildMemeFromCommand(command);
    console.log(`[bot] meme generated locally, size: ${meme.imageBuffer?.length}`);
    
    console.log('[bot] uploading to feishu...');
    const imageKey = await uploadImageFromBuffer(meme.imageBuffer);
    console.log(`[bot] image uploaded, key: ${imageKey}`);
    
    await replyWithImage(messageId, imageKey);
    console.log(`[bot] replied with meme ${meme.template.name}`);
  } catch (err) {
    console.error('[bot] failed to send meme', err);
    await safeReplyText(messageId, '表情生成出了点问题，稍后再试试吧~');
  }
}

async function safeReplyText(messageId, text) {
  try {
    await replyText(messageId, text);
  } catch (err) {
    console.error('[bot] fallback text failed', err);
  }
}

function extractCommand(content) {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    if (parsed?.text) {
      return cleanupText(parsed.text);
    }
  } catch (err) {
    // ignore
  }
  return cleanupText(content);
}

function cleanupText(text) {
  // 移除 <at> 标签
  let clean = text.replace(/<at[^>]*?>.*?<\/at>/g, '');
  // 移除 @_user_1 这种占位符
  clean = clean.replace(/@_user_\d+/g, '');
  // 移除开头可能的 @ 符号和空格
  return clean.replace(/^@/, '').replace(/\s+/g, ' ').trim();
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody) {
    return { rawBody: '', json: null };
  }
  try {
    return { rawBody, json: JSON.parse(rawBody) };
  } catch (err) {
    console.error('[server] json parse error', err.message);
    return { rawBody, json: null };
  }
}

function verifyLarkSignature(headers, rawBody, encryptKey) {
  const timestamp = headers['x-lark-request-timestamp'];
  const nonce = headers['x-lark-request-nonce'];
  const signature = headers['x-lark-signature'];

  if (!timestamp || !nonce || !signature) {
    console.warn('[server] missing signature headers');
    return false;
  }

  const baseString = `${timestamp}${nonce}${encryptKey}${rawBody}`;
  const digest = crypto.createHash('sha256').update(baseString).digest('hex');
  return digest === signature;
}

process.on('SIGINT', () => {
  console.log('\n[server] stopping');
  server.close(() => process.exit(0));
});
