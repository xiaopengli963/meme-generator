import process from 'node:process';
import { collectMissingEnv, loadedEnvFiles } from '../src/utils/env.js';
import { REQUIRED_ENV_KEYS } from '../src/config.js';

const missing = collectMissingEnv(REQUIRED_ENV_KEYS);

if (loadedEnvFiles.length) {
  console.log(`[env-check] loaded env files: ${loadedEnvFiles.join(', ')}`);
} else {
  console.log('[env-check] no .env file loaded (using shell env only)');
}

if (missing.length) {
  console.error(`[env-check] missing variables: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('[env-check] all required environment variables are set');
}
