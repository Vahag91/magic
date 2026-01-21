/* eslint-disable no-bitwise */
import { decode as base64Decode } from 'base-64';
import { ImageFormat, Skia } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import { createLogger } from './logger';

function isDev() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

const EXIF_SCAN_BYTES = 256 * 1024;
const normalizeOrientationLogger = createLogger('NormalizeOrientation');

function logIf(debug, tag, event, payload) {
  if (!debug) return;
  const label = tag ? `${tag}:${event}` : event;
  normalizeOrientationLogger.log(label, payload);
}

function shortUri(uri) {
  const s = String(uri || '');
  if (!s) return s;
  if (s.startsWith('data:')) return `${s.slice(0, 32)}…`;
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
}

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

function base64ToBytes(base64, maxBytes) {
  const clean = String(base64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
  if (!clean) return new Uint8Array(0);

  const maxChars = maxBytes ? Math.min(clean.length, Math.ceil(maxBytes / 3) * 4) : clean.length;
  const aligned = maxChars - (maxChars % 4);
  const prefix = clean.slice(0, Math.max(0, aligned));

  const bin = base64Decode(prefix);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function getExifOrientationFromJpegBytes(bytes) {
  if (!bytes || bytes.length < 4) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null; // SOI

  const readU16BE = (i) => ((bytes[i] << 8) | bytes[i + 1]) >>> 0;
  let offset = 2;

  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break; // SOS / EOI

    const length = readU16BE(offset + 2);
    if (length < 2) return null;

    const segmentStart = offset + 4;
    if (marker === 0xe1 && segmentStart + 6 <= bytes.length) {
      // "Exif\0\0"
      if (
        bytes[segmentStart] === 0x45 &&
        bytes[segmentStart + 1] === 0x78 &&
        bytes[segmentStart + 2] === 0x69 &&
        bytes[segmentStart + 3] === 0x66 &&
        bytes[segmentStart + 4] === 0x00 &&
        bytes[segmentStart + 5] === 0x00
      ) {
        const tiff = segmentStart + 6;
        if (tiff + 8 > bytes.length) return null;

        const isLittle = bytes[tiff] === 0x49 && bytes[tiff + 1] === 0x49;
        const isBig = bytes[tiff] === 0x4d && bytes[tiff + 1] === 0x4d;
        if (!isLittle && !isBig) return null;

        const readU16 = (i) =>
          isLittle ? ((bytes[i] | (bytes[i + 1] << 8)) >>> 0) : (((bytes[i] << 8) | bytes[i + 1]) >>> 0);
        const readU32 = (i) =>
          isLittle
            ? ((bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0)
            : (((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0);

        if (readU16(tiff + 2) !== 0x002a) return null;
        const ifdOffset = readU32(tiff + 4);
        const ifd = tiff + ifdOffset;
        if (ifd + 2 > bytes.length) return null;

        const count = readU16(ifd);
        for (let n = 0; n < count; n += 1) {
          const entry = ifd + 2 + n * 12;
          if (entry + 12 > bytes.length) break;

          const tag = readU16(entry);
          if (tag !== 0x0112) continue; // Orientation

          const type = readU16(entry + 2);
          const valueCount = readU32(entry + 4);
          if (type !== 3 || valueCount !== 1) return null;

          const value = readU16(entry + 8);
          return value >= 1 && value <= 8 ? value : null;
        }
      }
    }

    offset += 2 + length;
  }

  return null;
}

function rotationDegreesFromExif(orientation) {
  if (orientation === 6) return 90;
  if (orientation === 8) return 270;
  if (orientation === 3) return 180;
  return 0;
}

function isMaybeJpeg({ uri, mimeType }) {
  if (mimeType && !/^image\/jpe?g$/i.test(String(mimeType))) return false;
  const u = String(uri || '');
  if (/\.jpe?g(\?|#|$)/i.test(u)) return true;
  return !mimeType; // unknown type -> attempt
}

function toHex2(n) {
  return Number(n).toString(16).padStart(2, '0');
}

function bytesSignature(bytes, len = 8) {
  const b = bytes instanceof Uint8Array ? bytes : null;
  if (!b || !b.length) return null;
  const take = Math.min(b.length, Math.max(0, len));
  let out = '';
  for (let i = 0; i < take; i += 1) out += `${toHex2(b[i])}${i === take - 1 ? '' : ' '}`;
  return out;
}

export function getExifOrientationFromJpegBase64(base64, maxBytes = EXIF_SCAN_BYTES) {
  try {
    const s = String(base64 || '');
    const idx = s.indexOf('base64,');
    const raw = idx === -1 ? s : s.slice(idx + 'base64,'.length);
    const bytes = base64ToBytes(raw, maxBytes);
    return getExifOrientationFromJpegBytes(bytes);
  } catch {
    return null;
  }
}

export async function getExifOrientationFromUri({ uri, debug, tag }) {
  try {
    if (typeof uri !== 'string') return null;

    if (uri.startsWith('file://')) {
      const path = uri.replace(/^file:\/\//i, '');
      let chunk;
      let method = 'read';
      try {
        chunk = await RNFS.read(path, EXIF_SCAN_BYTES, 0, 'base64');
      } catch (e) {
        logIf(debug, tag, 'exif:file:readError', { uri: shortUri(uri), message: e?.message || String(e) });
        method = 'readFile';
        try {
          chunk = await RNFS.readFile(path, 'base64');
        } catch (e2) {
          logIf(debug, tag, 'exif:file:readFileError', { uri: shortUri(uri), message: e2?.message || String(e2) });
          return null;
        }
      }

      const bytes = base64ToBytes(chunk, EXIF_SCAN_BYTES);
      const orientation = getExifOrientationFromJpegBytes(bytes);
      logIf(debug, tag, 'exif:file', { uri: shortUri(uri), orientation, method });
      if (orientation == null) {
        logIf(debug, tag, 'exif:file:debug', {
          bytesLen: bytes.length,
          sig: bytesSignature(bytes),
          isJpegSOI: bytes.length >= 2 ? bytes[0] === 0xff && bytes[1] === 0xd8 : null,
        });
      }
      return orientation;
    }

    // content:// or other schemes: fetch + inspect first chunk
    let dataUri;
    try {
      dataUri = await uriToDataUri(uri);
    } catch (e) {
      logIf(debug, tag, 'exif:fetch:readError', { uri: shortUri(uri), message: e?.message || String(e) });
      return null;
    }
    const base64 = String(dataUri || '');
    const idx = base64.indexOf('base64,');
    if (idx === -1) return null;
    const bytes = base64ToBytes(base64.slice(idx + 'base64,'.length), EXIF_SCAN_BYTES);
    const orientation = getExifOrientationFromJpegBytes(bytes);
    logIf(debug, tag, 'exif:fetch', { uri: shortUri(uri), orientation });
    return orientation;
  } catch (e) {
    logIf(debug, tag, 'exif:error', { uri: shortUri(uri), message: e?.message || String(e) });
    return null;
  }
}

async function skiaDataFromUri(uri) {
  try {
    return await Skia.Data.fromURI(uri);
  } catch {
    const dataUri = await uriToDataUri(uri);
    const s = String(dataUri || '');
    const idx = s.indexOf('base64,');
    if (idx === -1) throw new Error('Could not read image data.');
    const base64 = s.slice(idx + 'base64,'.length);
    return Skia.Data.fromBase64(base64);
  }
}

function drawRotatedToSurface({ surface, image, rot, outW, outH }) {
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('#00000000'));
  canvas.save();

  if (rot === 90) {
    canvas.translate(outW, 0);
    canvas.rotate(90, 0, 0);
  } else if (rot === 180) {
    canvas.translate(outW, outH);
    canvas.rotate(180, 0, 0);
  } else if (rot === 270) {
    canvas.translate(0, outH);
    canvas.rotate(270, 0, 0);
  }
  canvas.drawImage(image, 0, 0);
  canvas.restore();
  surface.flush();
}

function snapshotToPngFile(snapshot, prefix = 'img') {
  const outBase64 = snapshot.encodeToBase64(ImageFormat.PNG, 100);
  if (!outBase64) throw new Error('Encoding failed.');

  const outPath = `${RNFS.CachesDirectoryPath}/${prefix}-${Date.now()}.png`;
  return RNFS.writeFile(outPath, outBase64, 'base64').then(() => `file://${outPath}`);
}

/**
 * ✅ Fixes your exact bug:
 * - Decodes original bytes (JPEG with EXIF)
 * - Rotates pixels to upright using EXIF orientation
 * - Crops in the upright coordinate space
 * - Encodes PNG (no EXIF -> cannot rotate wrongly later)
 */
export async function normalizeAndCropToPng({
  uri,
  mimeType,
  exifOrientation,
  cropRect,
  debug = isDev(),
  tag = 'normalizeAndCrop',
}) {
  if (!uri) return { uri: null, mimeType: 'image/png' };

  const providedOrientation = Number(exifOrientation) || null;
  const maybeJpeg = providedOrientation ? true : isMaybeJpeg({ uri, mimeType });

  const orientation =
    providedOrientation || (maybeJpeg ? await getExifOrientationFromUri({ uri, debug, tag }) : 1);

  const degrees = rotationDegreesFromExif(orientation);
  const rot = ((degrees % 360) + 360) % 360;

  logIf(debug, tag, 'input', {
    uri: shortUri(uri),
    mimeType: mimeType ? String(mimeType) : null,
    orientation,
    degrees: rot,
    cropRect,
  });

  // 1) Decode
  const data = await skiaDataFromUri(uri);
  const img = Skia.Image.MakeImageFromEncoded(data);
  if (!img) throw new Error('Skia failed to decode image.');

  // 2) Make upright image snapshot
  let uprightSnapshot = null;
  let uprightW = img.width();
  let uprightH = img.height();

  if (rot === 90 || rot === 270) {
    uprightW = img.height();
    uprightH = img.width();
  }

  if (rot) {
    const surface = Skia.Surface.Make(uprightW, uprightH);
    if (!surface) throw new Error('Skia surface creation failed (upright).');
    drawRotatedToSurface({ surface, image: img, rot, outW: uprightW, outH: uprightH });
    uprightSnapshot = surface.makeImageSnapshot();
  } else {
    // snapshot directly (still no EXIF afterwards)
    const surface = Skia.Surface.Make(uprightW, uprightH);
    if (!surface) throw new Error('Skia surface creation failed (copy).');
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('#00000000'));
    canvas.drawImage(img, 0, 0);
    surface.flush();
    uprightSnapshot = surface.makeImageSnapshot();
  }

  if (!uprightSnapshot) throw new Error('Snapshot failed (upright).');

  // 3) Crop in upright space
  const x = Math.max(0, Math.round(cropRect?.offset?.x || 0));
  const y = Math.max(0, Math.round(cropRect?.offset?.y || 0));
  const cw = Math.max(1, Math.round(cropRect?.size?.width || uprightW));
  const ch = Math.max(1, Math.round(cropRect?.size?.height || uprightH));

  const cropSurface = Skia.Surface.Make(cw, ch);
  if (!cropSurface) throw new Error('Skia surface creation failed (crop).');

  const cropCanvas = cropSurface.getCanvas();
  cropCanvas.clear(Skia.Color('#00000000'));

  const src = Skia.XYWHRect(x, y, cw, ch);
  const dst = Skia.XYWHRect(0, 0, cw, ch);
  cropCanvas.drawImageRect(uprightSnapshot, src, dst);

  cropSurface.flush();

  const croppedSnapshot = cropSurface.makeImageSnapshot();
  if (!croppedSnapshot) throw new Error('Snapshot failed (crop).');

  // 4) Encode to PNG file (no EXIF)
  const outUri = await snapshotToPngFile(croppedSnapshot, 'crop-upright');

  logIf(debug, tag, 'done', {
    outUri: shortUri(outUri),
    outW: cw,
    outH: ch,
    outputMime: 'image/png',
  });

  return { uri: outUri, mimeType: 'image/png', width: cw, height: ch };
}
/* eslint-enable no-bitwise */