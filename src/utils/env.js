import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const envFiles = ['.env.local', '.env', 'sample.env', 'env.sample'];
export const loadedEnvFiles = [];

for (const file of envFiles) {
  const fullPath = path.join(projectRoot, file);
  if (!fs.existsSync(fullPath)) continue;
  try {
    applyEnvFromFile(fullPath);
    loadedEnvFiles.push(fullPath);
  } catch (err) {
    console.warn(`[env] skip ${fullPath}: ${err.message}`);
  }
}

function applyEnvFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!key) continue;
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function requiredEnv(key) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function optionalEnv(key, defaultValue) {
  const value = process.env[key];
  return value === undefined || value === '' ? defaultValue : value;
}

export function collectMissingEnv(keys) {
  return keys.filter((key) => {
    const value = process.env[key];
    return value === undefined || value === '';
  });
}
