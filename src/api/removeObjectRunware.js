import {
  SUPABASE_ANON_KEY,
  SUPABASE_BASE,
  isSupabaseConfigured,
  createSupabaseConfigError,
} from '../config/supabase';
import { createAppError } from '../lib/errors';
import { requestJson } from '../lib/request';
import { createLogger } from '../logger';

function isHttpUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}

function isDataUri(s) {
  return typeof s === 'string' && /^data:/i.test(s);
}

async function uriToDataUri(uri, signal) {
  const res = await fetch(uri, { signal });
  if (!res.ok) throw new Error('Failed to read image.');
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

async function ensureImageDataUri(seedUri, signal) {
  if (!seedUri) return null;
  if (isDataUri(seedUri) || isHttpUrl(seedUri)) return seedUri;
  return await uriToDataUri(seedUri, signal);
}

const runwareLogger = createLogger('ObjectRemoverRunware');

export async function removeObjectRunware({
  seedUri,
  maskDataUri, // data:image/png;base64,...
  width,
  height,
  meta,
  signal,
  debug = false,
}) {
  if (!isSupabaseConfigured) throw createSupabaseConfigError();
  if (!seedUri || !maskDataUri) throw createAppError('invalid_input');

  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  if (!w || !h) throw createAppError('invalid_image_size');

  try {
    if (debug) {
      runwareLogger.log('runware:request', {
        seedKind: isDataUri(seedUri) ? 'data' : isHttpUrl(seedUri) ? 'http' : 'other',
        seedLen: String(seedUri || '').length,
        maskLen: String(maskDataUri || '').length,
        width: w,
        height: h,
        meta,
      });
    }
    const seedImage = await ensureImageDataUri(seedUri, signal);
    if (!seedImage) throw createAppError('invalid_input_image');

    const json = await requestJson(`${SUPABASE_BASE}/functions/v1/object-removal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        seedImage,
        maskImage: maskDataUri,
        width: w,
        height: h,
        meta: meta || null,
      }),
      signal,
      timeoutMs: 60000,
      timeoutRetries: 1,
      timeoutBackoffMs: 1000,
    });

    const imageURL =
      json?.imageURL ||
      json?.imageUrl ||
      json?.url ||
      json?.data?.imageURL ||
      json?.data?.imageUrl ||
      json?.data?.url;

    if (!imageURL) throw createAppError('invalid_response', { meta: { hasJson: Boolean(json) } });
    return imageURL;
  } catch (e) {
    if (e?.name === 'AbortError') return null;
    throw e;
  }
}
