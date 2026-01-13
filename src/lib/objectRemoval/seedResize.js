import ImageEditor from '@react-native-community/image-editor';

async function uriToDataUri(uri) {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Failed to read image.');
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

export async function resizeSeedToDataUri({
  uri,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
}) {
  if (!uri) throw new Error('Missing seed image.');

  const sw = Math.round(Number(sourceWidth) || 0);
  const sh = Math.round(Number(sourceHeight) || 0);
  const tw = Math.round(Number(targetWidth) || 0);
  const th = Math.round(Number(targetHeight) || 0);

  if (!sw || !sh || !tw || !th) throw new Error('Invalid resize parameters.');

  // Scale without cropping: crop full image, then set displaySize.
  const result = await ImageEditor.cropImage(uri, {
    offset: { x: 0, y: 0 },
    size: { width: sw, height: sh },
    displaySize: { width: tw, height: th },
    resizeMode: 'contain', // iOS only; aspect matches anyway
    quality: 1,
    format: 'jpeg',
    includeBase64: true,
  });

  const mime = result?.type || 'image/jpeg';
  if (result?.base64) {
    return `data:${mime};base64,${result.base64}`;
  }

  if (result?.uri) return await uriToDataUri(result.uri);
  throw new Error('Failed to resize image.');
}

