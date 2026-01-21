import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { decode as base64Decode } from 'base-64';
import { ImageFormat, Skia } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import { supabase } from '../services/supabaseClient';
import { isSupabaseConfigured } from '../config/supabase';
import { common } from '../styles';
import { useError } from '../providers/ErrorProvider';
import { createAppError } from '../lib/errors';
import { createLogger } from '../logger';

// If you have these icons, use them. Otherwise, the code falls back to text.
import { ProcessingMagicIcon } from '../components/icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_WIDTH - 36, 420);
const CARD_H = Math.round(CARD_W * 1.15);

// Theme (production-safe: no dependency on your theme file)
const PRIMARY = '#3B82F6';
const ACCENT = '#8B5CF6';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const SUB = '#64748B';
const BORDER = 'rgba(15, 23, 42, 0.08)';
const removeBackgroundProcessingLogger = createLogger('RemoveBackgroundProcessing');

// -------------------- helpers --------------------
function isHttpUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}
function isDataUri(s) {
  return typeof s === 'string' && /^data:/i.test(s);
}
function isLocalUri(s) {
  return typeof s === 'string' && (/^(file|content):\/\//i.test(s) || s.startsWith('/'));
}
function isDev() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}
function formatUriForLog(uri) {
  const s = String(uri || '');
  if (!s) return '';
  if (/^data:/i.test(s)) return `data:… (len ${s.length})`;
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
}
function formatResponseForLog(data) {
  if (!data || typeof data !== 'object') return { type: typeof data };
  const keys = Object.keys(data);
  const images = Array.isArray(data?.images) ? data.images : [];
  const firstUrl = images?.[0]?.url || images?.[0]?.imageURL || images?.[0]?.imageUrl || null;
  return {
    keys,
    status: data?.status || null,
    provider: data?.provider || null,
    model: data?.model || null,
    outputFormat: data?.outputFormat || null,
    imageCount: images.length,
    firstUrl: firstUrl ? formatUriForLog(firstUrl) : null,
  };
}
function normalizeImageUri(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.uri || value.url || null;
  return String(value);
}

function normalizeMime(mime) {
  if (!mime) return null;
  if (mime === 'image/jpg') return 'image/jpeg';
  return mime;
}
function guessMimeFromUri(uri) {
  const clean = String(uri || '').split('?')[0].split('#')[0];
  if (/\.png$/i.test(clean)) return 'image/png';
  if (/\.jpe?g$/i.test(clean)) return 'image/jpeg';
  if (/\.webp$/i.test(clean)) return 'image/webp';
  return null;
}

function getImageSizeAsync(uri) {
  return new Promise((resolve, reject) => {
    if (!uri) return resolve(null);
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

async function uriToDataUri(uri) {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Failed to read selected image.');
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image.'));
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

async function localUriToDataUri(uri, mime) {
  const safeMime = normalizeMime(mime) || guessMimeFromUri(uri) || 'image/jpeg';
  const path = uri.startsWith('file://') ? uri.replace(/^file:\/\//i, '') : uri;
  const base64 = await RNFS.readFile(path, 'base64');
  return `data:${safeMime};base64,${String(base64 || '').replace(/\s+/g, '')}`;
}


async function buildInputImage({ imageUri, base64, mime }) {
  if (base64) {
    const safeMime = normalizeMime(mime) || 'image/jpeg';
    return  `data:${safeMime};base64,${String(base64 || '').replace(/\s+/g, '')}`;
  }
  if (isHttpUrl(imageUri) || isDataUri(imageUri)) return imageUri;
  if (isLocalUri(imageUri)) {
    try {
      return await localUriToDataUri(imageUri, mime);
    } catch {
      // Fallback to fetch for cases RNFS can't read (ex: provider URIs).
    }
  }
  return await uriToDataUri(imageUri);
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
          isLittle
            ? ((bytes[i] | (bytes[i + 1] << 8)) >>> 0)
            : (((bytes[i] << 8) | bytes[i + 1]) >>> 0);
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

async function getExifOrientationAsync({ imageUri, base64, mime, debug = false }) {
  const maybeJpeg = !mime || /^image\/jpe?g$/i.test(String(mime));
  if (!maybeJpeg) {
    if (debug) {
      removeBackgroundProcessingLogger.log('exif:skip', { reason: 'non-jpeg', mime });
    }
    return null;
  }

  try {
    if (base64) {
      const bytes = base64ToBytes(base64, 64 * 1024);
      if (debug) {
        removeBackgroundProcessingLogger.log('exif:source', {
          source: 'base64',
          bytes: bytes.length,
        });
      }
      const orientation = getExifOrientationFromJpegBytes(bytes);
      if (debug) removeBackgroundProcessingLogger.log('exif:result', { orientation });
      return orientation;
    }

    if (typeof imageUri === 'string' && imageUri.startsWith('file://')) {
      const path = imageUri.replace(/^file:\/\//i, '');
      const chunk = await RNFS.read(path, 64 * 1024, 0, 'base64');
      const bytes = base64ToBytes(chunk, 64 * 1024);
      if (debug) {
        removeBackgroundProcessingLogger.log('exif:source', {
          source: 'file',
          uri: formatUriForLog(imageUri),
          bytes: bytes.length,
        });
      }
      const orientation = getExifOrientationFromJpegBytes(bytes);
      if (debug) removeBackgroundProcessingLogger.log('exif:result', { orientation });
      return orientation;
    }

    if (debug) {
      removeBackgroundProcessingLogger.log('exif:skip', {
        reason: 'unsupported_uri',
        uri: formatUriForLog(imageUri),
      });
    }
  } catch (error) {
    if (debug) {
      removeBackgroundProcessingLogger.log('exif:error', { message: error?.message || String(error) });
    }
  }

  return null;
}

function rotationDegreesFromExif(orientation) {
  if (orientation === 6) return 90;
  if (orientation === 8) return 270;
  if (orientation === 3) return 180;
  return 0;
}

async function rotatePngFileWithSkia({ uri, degrees, debug = false }) {
  const rot = ((degrees % 360) + 360) % 360;
  if (debug) {
    removeBackgroundProcessingLogger.log('rotate:skia:start', {
      uri: formatUriForLog(uri),
      degrees,
      rot,
    });
  }

  let data;
  try {
    data = await Skia.Data.fromURI(uri);
  } catch (e) {
    throw new Error(`rotate_cutout_skia: fromURI failed: ${e?.message || String(e)}`);
  }

  let image;
  try {
    image = Skia.Image.MakeImageFromEncoded(data);
  } catch (e) {
    throw new Error(`rotate_cutout_skia: decode failed: ${e?.message || String(e)}`);
  }
  if (!image) throw new Error('rotate_cutout_skia: Skia failed to decode image.');

  const w = image.width();
  const h = image.height();
  const outW = rot === 90 || rot === 270 ? h : w;
  const outH = rot === 90 || rot === 270 ? w : h;
  if (debug) {
    removeBackgroundProcessingLogger.log('rotate:skia:dimensions', {
      w,
      h,
      outW,
      outH,
    });
  }

  const surface = Skia.Surface.Make(outW, outH);
  if (!surface) throw new Error('rotate_cutout_skia: Skia surface creation failed.');

  const canvas = surface.getCanvas();
  try {
    canvas.clear(Skia.Color('#00000000'));
  } catch (e) {
    throw new Error(`rotate_cutout_skia: canvas.clear failed: ${e?.message || String(e)}`);
  }
  canvas.save();

  try {
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
  } catch (e) {
    throw new Error(`rotate_cutout_skia: transform failed: ${e?.message || String(e)}`);
  }

  try {
    canvas.drawImage(image, 0, 0);
  } catch (e) {
    throw new Error(`rotate_cutout_skia: drawImage failed: ${e?.message || String(e)}`);
  }
  canvas.restore();
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  if (!snapshot) throw new Error('rotate_cutout_skia: snapshot failed.');

  let outBase64;
  try {
    outBase64 = snapshot.encodeToBase64(ImageFormat.PNG, 100);
  } catch (e) {
    throw new Error(`rotate_cutout_skia: encode failed: ${e?.message || String(e)}`);
  }

  const outPath = `${RNFS.CachesDirectoryPath}/cutout-rotated-${Date.now()}.png`;
  await RNFS.writeFile(outPath, outBase64, 'base64');
  if (debug) {
    removeBackgroundProcessingLogger.log('rotate:skia:done', { outUri: formatUriForLog(outPath) });
  }
  return `file://${outPath}`;
}

async function downloadCutoutToCache(url) {
  const fileName = `cutout-${Date.now()}.png`;
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  const result = await RNFS.downloadFile({ fromUrl: url, toFile: path }).promise;
  if (result.statusCode && result.statusCode >= 400) {
    throw new Error(`Download failed with status ${result.statusCode}`);
  }
  return `file://${path}`;
}

// -------------------- main --------------------
export default function RemoveBackgroundProcessingScreen({ navigation, route }) {
  const { showAppError, showError } = useError();
  const debugLogs = isDev();
  const logIf = React.useCallback(
    (event, payload) => {
      if (!debugLogs) return;
      removeBackgroundProcessingLogger.log(event, payload);
    },
    [debugLogs],
  );
  const imageUri = normalizeImageUri(route?.params?.imageUri);
  const base64 = route?.params?.base64 || null;
  const mime = normalizeMime(route?.params?.mime) || null;
  const cropMeta = route?.params?.cropMeta || null;

  const inputDataUri = base64 ? `data:${mime || 'image/jpeg'};base64,${base64}` : null;
  const previewUri =
    imageUri || inputDataUri;

  // Progress + status
  const steps = React.useMemo(
    () => [
      { key: 'detect', title: 'Detecting subject' },
      { key: 'prep', title: 'Preparing' },
      { key: 'remove', title: 'Removing background' },
      { key: 'finish', title: 'Finalizing' },
    ],
    []
  );

  const [statusTitle, setStatusTitle] = React.useState(steps[0].title);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [isWorking, setIsWorking] = React.useState(true);
  const [percent, setPercent] = React.useState(6);

  const canceledRef = React.useRef(false);
  const [runId, setRunId] = React.useState(0);
  const processedRunIdRef = React.useRef(null);
  const configErrorShownRef = React.useRef(false);

  // Anim values
  const progressA = React.useRef(new Animated.Value(0.06)).current; // 0..1
  const scanY = React.useRef(new Animated.Value(0)).current;
  const glow = React.useRef(new Animated.Value(0)).current;
  const shimmer = React.useRef(new Animated.Value(-1)).current;
  const iconBob = React.useRef(new Animated.Value(0)).current;

  const [cardSize, setCardSize] = React.useState({ w: 0, h: 0 });

  const retry = React.useCallback(() => {
    canceledRef.current = false;
    setStatusTitle(steps[0].title);
    setStepIndex(0);
    setPercent(6);
    setIsWorking(true);
    progressA.setValue(0.06);
    setRunId((prev) => prev + 1);
  }, [progressA, steps]);

  // -------------------- animations --------------------
  React.useEffect(() => {
    // glow pulse
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );

    // icon bob
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconBob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(iconBob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    glowLoop.start();
    bobLoop.start();

    return () => {
      glowLoop.stop();
      bobLoop.stop();
    };
  }, [glow, iconBob]);

  React.useEffect(() => {
    if (!cardSize.h || !cardSize.w) return;

    // scan line loop (top->bottom)
    scanY.setValue(-40);
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, {
          toValue: cardSize.h + 40,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanY, { toValue: -40, duration: 0, useNativeDriver: true }),
      ])
    );

    // shimmer sweep loop
    shimmer.setValue(-1);
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
      ])
    );

    scanLoop.start();
    shimmerLoop.start();

    return () => {
      scanLoop.stop();
      shimmerLoop.stop();
    };
  }, [cardSize.h, cardSize.w, scanY, shimmer]);

  // Drive step changes based on progress value (feels “real”)
  React.useEffect(() => {
    const id = progressA.addListener(({ value }) => {
      const nextStep =
        value < 0.28 ? 0 :
        value < 0.55 ? 1 :
        value < 0.84 ? 2 : 3;

      if (nextStep !== stepIndex) {
        logIf('step:change', {
          from: steps[stepIndex]?.key,
          to: steps[nextStep]?.key,
          value: Math.round(value * 100),
        });
        setStepIndex(nextStep);
        setStatusTitle(steps[nextStep].title);
      }

      setPercent(Math.round(value * 100));
    });
    return () => progressA.removeListener(id);
  }, [logIf, progressA, stepIndex, steps]);

  // Fake progress to 90% while network runs
  React.useEffect(() => {
    progressA.setValue(0.06);
    const anim = Animated.timing(progressA, {
      toValue: 0.92,
      duration: 5200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [progressA, runId]);

  // -------------------- processing --------------------
  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      if (!configErrorShownRef.current) {
        configErrorShownRef.current = true;
        setIsWorking(false);
        showError({
          title: 'Setup required',
          message:
            'Supabase is not configured. Set SUPABASE_BASE and SUPABASE_ANON_KEY in .env, then restart Metro.',
          retry: () => navigation.goBack(),
          retryLabel: 'Go back',
        });
      }
      return;
    }

    logIf('process:start', {
      imageUri: formatUriForLog(imageUri),
      hasBase64: Boolean(base64),
      mime,
      previewUri: formatUriForLog(previewUri),
      cropMeta,
    });

    if (processedRunIdRef.current === runId) return;
    processedRunIdRef.current = runId;

    if (!imageUri && !base64) {
      Alert.alert('No image', 'Please select an image first.');
      navigation.goBack();
      return;
    }

    (async () => {
      try {
        canceledRef.current = false;
        setIsWorking(true);

        const inputDims = await getImageSizeAsync(previewUri).catch(() => null);
        logIf('input:size', { uri: formatUriForLog(previewUri), ...(inputDims || {}) });

        logIf('input:source', {
          platform: Platform.OS,
          imageUri: formatUriForLog(imageUri),
          previewUri: formatUriForLog(previewUri),
          imageUriKind: isDataUri(imageUri) ? 'data' : isHttpUrl(imageUri) ? 'http' : isLocalUri(imageUri) ? 'local' : imageUri ? 'other' : null,
          previewUriKind: isDataUri(previewUri) ? 'data' : isHttpUrl(previewUri) ? 'http' : isLocalUri(previewUri) ? 'local' : previewUri ? 'other' : null,
          hasBase64: Boolean(base64),
          base64Len: base64 ? base64.length : 0,
          mime,
        });

        const exifOrientation =
          Platform.OS === 'ios' ? await getExifOrientationAsync({ imageUri, base64, mime, debug: debugLogs }) : null;
        if (Platform.OS !== 'ios') {
          logIf('input:exif:skip', { platform: Platform.OS });
        }
        const rotationDegrees = rotationDegreesFromExif(exifOrientation);
        logIf('input:exif', { exifOrientation, rotationDegrees });

        const inputImage = await buildInputImage({ imageUri, base64, mime });
        logIf('input:image', {
          kind: isDataUri(inputImage) ? 'data' : isHttpUrl(inputImage) ? 'http' : 'other',
          length: String(inputImage || '').length,
        });

        if (canceledRef.current) return;

        const payload = {
          inputImage,
          outputFormat: 'PNG',
          outputQuality: 85,
          outputType: 'URL',
          includeCost: false,
          inputSize: inputDims || cropMeta?.outputSize || null,
          crop: cropMeta || null,
          debug: true
        };

        logIf('smart-api:request', {
          inputType: isDataUri(inputImage) ? 'data' : isHttpUrl(inputImage) ? 'http' : 'other',
          inputLen: String(inputImage || '').length,
          inputSize: payload.inputSize,
          crop: cropMeta ? { ratio: cropMeta.ratio, ratioLabel: cropMeta.ratioLabel } : null,
        });

        const requestStartedAt = Date.now();
        let invokeResult = null;
        try {
          invokeResult = await supabase.functions.invoke('smart-api', {
            body: payload,
          });
        } catch (invokeError) {
          logIf('smart-api:invoke:throw', {
            message: invokeError?.message || String(invokeError),
            name: invokeError?.name,
          });
          throw invokeError;
        }
        const requestMs = Date.now() - requestStartedAt;
        const { data, error } = invokeResult || {};
        logIf('smart-api:invoke:done', { ms: requestMs, hasData: Boolean(data), hasError: Boolean(error) });

        if (canceledRef.current) return;
        if (error) {
          logIf('smart-api:error', {
            message: error?.message || String(error),
            status: error?.status,
            name: error?.name,
            details: error?.details,
            hint: error?.hint,
            ms: requestMs,
          });
          throw createAppError('background_removal_failed', { cause: error });
        }

        logIf('smart-api:response', formatResponseForLog(data));
        const outUrl = data?.images?.[0]?.url || data?.imageUrl || data?.url;
        if (!outUrl) throw new Error('No output image returned.');
        logIf('smart-api:response:summary', {
          hasImages: Array.isArray(data?.images),
          imageCount: data?.images?.length || 0,
          status: data?.status || null,
          model: data?.model || null,
        });
        logIf('output:url', { outUrl: formatUriForLog(outUrl) });

        // Smoothly complete UI
        await new Promise((r) => {
          Animated.timing(progressA, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start(() => r());
        });

        const finishedAt = Date.now();
        let localCutoutUri = outUrl;

        try {
          localCutoutUri = await downloadCutoutToCache(outUrl);
          logIf('output:downloaded', { uri: formatUriForLog(localCutoutUri) });

          const outDims = await getImageSizeAsync(localCutoutUri).catch(() => null);
          logIf('output:size', outDims);
          if (inputDims && outDims) {
            const inputPortrait = inputDims.height > inputDims.width;
            const outPortrait = outDims.height > outDims.width;
            const inputRatio =
              inputDims.width && inputDims.height ? inputDims.width / inputDims.height : null;
            const outRatio = outDims.width && outDims.height ? outDims.width / outDims.height : null;
            const ratioTol = 0.08;
            const reciprocal = typeof inputRatio === 'number' && inputRatio ? 1 / inputRatio : null;
            const ratioSwapLikely =
              typeof inputRatio === 'number' &&
              typeof outRatio === 'number' &&
              typeof reciprocal === 'number' &&
              Math.abs(outRatio - reciprocal) < ratioTol &&
              Math.abs(outRatio - inputRatio) > ratioTol;

            const canRotateFile =
              typeof localCutoutUri === 'string' && localCutoutUri.startsWith('file://');
            const shouldRotateCutout =
              ratioSwapLikely && canRotateFile && (rotationDegrees === 90 || rotationDegrees === 270);
            logIf('output:ratio', {
              inputRatio,
              outRatio,
              reciprocal,
              ratioSwapLikely,
              inputDims,
              outDims,
            });
            logIf('output:rotate', {
              ratioSwapLikely,
              canRotateFile,
              rotationDegrees,
              shouldRotateCutout,
            });

            if (shouldRotateCutout) {
              try {
                localCutoutUri = await rotatePngFileWithSkia({
                  uri: localCutoutUri,
                  degrees: rotationDegrees,
                  debug: debugLogs,
                });
                logIf('output:rotated', { uri: formatUriForLog(localCutoutUri) });
              } catch (e) {
                logIf('output:rotate:error', { message: e?.message || String(e) });
                // ignore: falls back to unrotated cutout
              }
            }
          }
        } catch (downloadError) {
          logIf('output:download:error', { message: downloadError?.message || String(downloadError) });
          localCutoutUri = outUrl;
        }

        if (canceledRef.current) return;

        setIsWorking(false);

        // tiny delay so user sees “100%”
        setTimeout(() => {
          navigation.replace('BackgroundEditor', {
            subjectUri: localCutoutUri,
            originalUri: imageUri,
            processingFinishedAt: finishedAt,
            cropMeta,
          });
        }, 350);
      } catch (e) {
        if (canceledRef.current) return;
        setIsWorking(false);
        showAppError(e, { retry, retryLabel: 'Try again' });
      }
    })();
  }, [
    base64,
    cropMeta,
    imageUri,
    logIf,
    mime,
    navigation,
    previewUri,
    progressA,
    retry,
    runId,
    showAppError,
    showError,
  ]);

  const onCancel = React.useCallback(() => {
    if (!isWorking) {
      navigation.goBack();
      return;
    }
    Alert.alert('Cancel processing?', 'Your cutout won’t be generated.', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => {
          canceledRef.current = true;
          navigation.goBack();
        },
      },
    ]);
  }, [isWorking, navigation]);

  const onHelp = React.useCallback(() => {
    Alert.alert(
      'Background Removal',
      'We process your photo on the server and return a transparent PNG cutout. This usually takes a few seconds.',
    );
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerBackOnPress: onCancel,
      headerBackVisible: true,
      headerRight: () => (
        <TouchableOpacity onPress={onHelp} style={common.headerBtn} activeOpacity={0.85}>
          <Text style={styles.help}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, onCancel, onHelp]);

  // -------------------- derived anim styles --------------------
  const progressWidth = progressA.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.34],
  });

  const bobY = iconBob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const shimmerX = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-cardSize.w, cardSize.w],
  });

  const StepPill = ({ index, label }) => {
    const active = index === stepIndex;
    const done = index < stepIndex;
    return (
      <View style={[styles.stepPill, active && styles.stepPillActive, done && styles.stepPillDone]}>
        <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]} />
        <Text style={[styles.stepLabel, active && styles.stepLabelActive, done && styles.stepLabelDone]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Soft background accents */}
      <View pointerEvents="none" style={styles.bgBlobA} />
      <View pointerEvents="none" style={styles.bgBlobB} />

      <View style={styles.container}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.iconWrap}>
              <Animated.View
                style={[
                  styles.iconGlow,
                  { opacity: glowOpacity, transform: [{ scale: glowScale }] },
                ]}
              />
              <Animated.View style={{ transform: [{ translateY: bobY }] }}>
                <View style={styles.iconCore}>
                  <ProcessingMagicIcon size={32} color="#fff" />
                </View>
              </Animated.View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.hTitle}>Removing Background</Text>
            </View>
          </View>

          <View style={styles.heroRight}>
            <Text style={styles.percentText}>{percent}%</Text>
            <Text style={styles.percentHint}>done</Text>
          </View>
        </View>

        {/* Preview Card */}
        <View
          style={styles.card}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setCardSize({ w: width, h: height });
          }}
        >
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, { backgroundColor: '#E2E8F0' }]} />
          )}

          {/* contrast overlay */}
          <View style={styles.overlay} />

          {/* shimmer sweep */}
          {!!cardSize.w && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shimmer,
                { transform: [{ translateX: shimmerX }, { rotate: '-12deg' }] },
              ]}
            />
          )}

          {/* scan band */}
          {!!cardSize.h && (
            <Animated.View pointerEvents="none" style={[styles.scanBand, { transform: [{ translateY: scanY }] }]}>
              <View style={styles.scanGlow} />
              <View style={styles.scanLine} />
            </Animated.View>
          )}

          {/* bottom status */}
          <View style={styles.cardBottom}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {statusTitle}
            </Text>
          </View>

          {/* small “processing” chip */}
          <View style={styles.processingChip}>
            <View style={styles.processingDot} />
            <Text style={styles.processingText}>{isWorking ? 'Processing' : 'Finishing'}</Text>
          </View>
        </View>

        {/* Steps (more user-friendly than one line status) */}
        <View style={styles.stepsRow}>
          <StepPill index={0} label="Detect" />
          <StepPill index={1} label="Prepare" />
          <StepPill index={2} label="Remove" />
          <StepPill index={3} label="Finish" />
        </View>

        {/* Progress */}
        <View style={styles.progressWrap}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width: progressWidth }]} />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.9}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Tip: For best results use images with clear subject & good lighting.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// -------------------- styles --------------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  bgBlobA: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: PRIMARY,
    opacity: 0.10,
  },
  bgBlobB: {
    position: 'absolute',
    bottom: -90,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: ACCENT,
    opacity: 0.10,
  },

  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    alignItems: 'center',
  },
  help: { fontSize: 18, fontWeight: '900', color: TEXT },

  hero: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  iconGlow: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: PRIMARY,
  },
  iconCore: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hTitle: { fontSize: 18, fontWeight: '900', color: TEXT },

  heroRight: { alignItems: 'flex-end', paddingLeft: 10 },
  percentText: { fontSize: 18, fontWeight: '900', color: TEXT },
  percentHint: { marginTop: 2, fontSize: 11, fontWeight: '800', color: SUB },

  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 22, shadowOffset: { width: 0, height: 14 } },
      android: { elevation: 6 },
    }),
  },
  image: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', opacity: 0.22 },

  shimmer: {
    position: 'absolute',
    top: -60,
    left: 0,
    width: 160,
    height: '160%',
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  scanBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 90,
  },
  scanGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 90,
    backgroundColor: PRIMARY,
    opacity: 0.12,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 44,
    height: 2,
    backgroundColor: '#fff',
    opacity: 0.9,
    shadowColor: PRIMARY,
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },

  processingChip: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22C55E',
  },
  processingText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  cardBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  cardTitle: { fontSize: 13, fontWeight: '900', color: TEXT },

  stepsRow: {
    width: CARD_W,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  stepPill: {
    flex: 1,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepPillActive: {
    borderColor: 'rgba(59,130,246,0.40)',
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  stepPillDone: {
    borderColor: 'rgba(34,197,94,0.25)',
    backgroundColor: 'rgba(34,197,94,0.06)',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  stepDotActive: { backgroundColor: PRIMARY },
  stepDotDone: { backgroundColor: '#22C55E' },
  stepLabel: { flex: 1, fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.55)' },
  stepLabelActive: { color: TEXT },
  stepLabelDone: { color: 'rgba(15,23,42,0.72)' },

  progressWrap: { width: CARD_W, marginTop: 10 },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.25)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },

  actions: {
    width: CARD_W,
    marginTop: 14,
    alignItems: 'center',
  },
  cancelBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
  },
  cancelText: { color: '#EF4444', fontSize: 14, fontWeight: '900' },
  footerNote: {
    marginTop: 10,
    fontSize: 11.5,
    fontWeight: '700',
    color: SUB,
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 15,
  },
});
