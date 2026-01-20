export function readEnv(key, fallback = '') {
  const root = typeof global !== 'undefined' ? global : {};
  const value = root?.process?.env?.[key];
  if (value == null || value === '') return fallback;
  return String(value);
}
