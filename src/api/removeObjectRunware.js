import { SUPABASE_ANON_KEY, SUPABASE_BASE } from '../config/supabase';
import { createAppError } from '../lib/errors';
import { requestJson } from '../lib/request';

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

export async function removeObjectRunware({
  seedUri,
  maskDataUri, // data:image/png;base64,...
  width,
  height,
  signal,
}) {
  if (!seedUri || !maskDataUri) throw createAppError('invalid_input');

  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  if (!w || !h) throw createAppError('invalid_image_size');

  try {
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
      }),
      signal,
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
