import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_EXPORT_FORMAT = 'png';
export const DEFAULT_EXPORT_FORMAT_STORAGE_KEY = '@magicstudio:defaultExportFormat';
export const HD_PROCESSING_ENABLED_STORAGE_KEY = '@magicstudio:hdProcessingEnabled';

export function normalizeExportFormat(format) {
  const f = String(format || '').toLowerCase();
  return f === 'jpg' || f === 'jpeg' ? 'jpg' : 'png';
}

export async function getDefaultExportFormat() {
  try {
    const raw = await AsyncStorage.getItem(DEFAULT_EXPORT_FORMAT_STORAGE_KEY);
    if (raw == null) return DEFAULT_EXPORT_FORMAT;
    return normalizeExportFormat(raw);
  } catch {
    return DEFAULT_EXPORT_FORMAT;
  }
}

export async function setDefaultExportFormat(format) {
  const normalized = normalizeExportFormat(format);
  try {
    await AsyncStorage.setItem(DEFAULT_EXPORT_FORMAT_STORAGE_KEY, normalized);
  } catch {
    // noop
  }
  return normalized;
}

export async function getHdProcessingEnabled({ fallback = false } = {}) {
  try {
    const raw = await AsyncStorage.getItem(HD_PROCESSING_ENABLED_STORAGE_KEY);
    if (raw == null) return Boolean(fallback);

    const normalized = String(raw).trim().toLowerCase();
    if (normalized === '1' || normalized === 'true') return true;
    if (normalized === '0' || normalized === 'false') return false;

    return Boolean(fallback);
  } catch {
    return Boolean(fallback);
  }
}

export async function setHdProcessingEnabled(enabled) {
  const value = enabled ? '1' : '0';
  try {
    await AsyncStorage.setItem(HD_PROCESSING_ENABLED_STORAGE_KEY, value);
  } catch {
    // noop
  }
  return Boolean(enabled);
}
