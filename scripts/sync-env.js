const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const OUT_PATH = path.join(ROOT, 'src', 'config', 'env.local.js');

const DEFAULT_KEYS = [
  'SUPABASE_BASE',
  'SUPABASE_ANON_KEY',
  'GEMINI_API_KEY',
  'GEMINI_IMAGE_MODEL',
  'REVENUE_PUBLIC_IOS',
  'REVENUE_PUBLIC_ANDROID',
  'REVENUE_ENTITLEMENT_ID',
];

function stripQuotes(value) {
  const match = /^(['"])(.*)\1$/.exec(value);
  return match ? match[2] : value;
}

function parseEnv(content) {
  const env = {};
  const lines = String(content || '').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const cleaned = trimmed.startsWith('export ') ? trimmed.slice(7) : trimmed;
    const eq = cleaned.indexOf('=');
    if (eq === -1) continue;

    const key = cleaned.slice(0, eq).trim();
    if (!key) continue;

    let value = cleaned.slice(eq + 1).trim();
    value = value.replace(/;+\s*$/, '');
    value = stripQuotes(value);
    env[key] = value;
  }

  return env;
}

function buildEnvObject(parsed) {
  const out = {};
  for (const key of DEFAULT_KEYS) {
    out[key] = parsed[key] || '';
  }
  return out;
}

function writeEnvFile(envObj) {
  const header = '// Auto-generated from .env by scripts/sync-env.js\n';
  const body = `export const ENV = ${JSON.stringify(envObj, null, 2)};\n`;
  fs.writeFileSync(OUT_PATH, header + body, 'utf8');
}

const exists = fs.existsSync(ENV_PATH);
const parsed = exists ? parseEnv(fs.readFileSync(ENV_PATH, 'utf8')) : {};
writeEnvFile(buildEnvObject(parsed));
