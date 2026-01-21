import { ENV } from './env.local';

function normalizeEnvValue(value) {
  if (value == null) return '';
  const str = String(value).trim();
  if (!str) return '';
  const match = /^(['"])(.*)\1$/.exec(str);
  return match ? match[2] : str;
}

export function readEnv(key, fallback = '') {
  const root = typeof global !== 'undefined' ? global : {};
  const fromProcess = root?.process?.env?.[key];
  const fromGlobal = root?.__ENV__?.[key];
  const fromLocal = ENV?.[key];
  const value = normalizeEnvValue(fromProcess ?? fromGlobal ?? fromLocal);
  if (!value) return fallback;
  return value;
}
