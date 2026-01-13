import { Alert } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_BASE } from '../config/supabase';

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
  if (!seedUri || !maskDataUri) {
    Alert.alert('Remove Object', 'Missing image or mask.');
    return null;
  }

  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  if (!w || !h) {
    Alert.alert('Remove Object', 'Invalid image size.');
    return null;
  }

  try {
    const seedImage = await ensureImageDataUri(seedUri, signal);
    if (!seedImage) throw new Error('Could not prepare input image.');

    const res = await fetch(`${SUPABASE_BASE}/functions/v1/object-removal`, {
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

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error || json?.message || `Request failed (${res.status})`);
    }

    const imageURL =
      json?.imageURL ||
      json?.imageUrl ||
      json?.url ||
      json?.data?.imageURL ||
      json?.data?.imageUrl ||
      json?.data?.url;

    if (!imageURL) throw new Error('No imageURL returned.');
    return imageURL;
  } catch (e) {
    if (e?.name === 'AbortError') return null;
    Alert.alert('Remove Object', e?.message || 'Something went wrong.');
    return null;
  }
}

