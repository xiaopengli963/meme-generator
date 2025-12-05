import { optionalEnv, requiredEnv } from './utils/env.js';

export const REQUIRED_ENV_KEYS = [
  'FEISHU_APP_ID',
  'FEISHU_APP_SECRET',
  'FEISHU_VERIFICATION_TOKEN'
];

export const config = {
  port: Number(optionalEnv('PORT', '3000')),
  memeCacheTtlMs: Number(optionalEnv('MEME_CACHE_TTL', '10')) * 60_000,
};

export function resolveFeishuCredentials() {
  return {
    appId: requiredEnv('FEISHU_APP_ID'),
    appSecret: requiredEnv('FEISHU_APP_SECRET'),
    verificationToken: requiredEnv('FEISHU_VERIFICATION_TOKEN'),
    encryptKey: optionalEnv('FEISHU_ENCRYPT_KEY', ''),
  };
}
