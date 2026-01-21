

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import { CameraRoll, iosRequestAddOnlyGalleryPermission } from '@react-native-camera-roll/camera-roll';
import Share from 'react-native-share';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import { ImageFormat, Skia } from '@shopify/react-native-skia';
import { supabase } from '../services/supabaseClient';
import { getDefaultExportFormat, getHdProcessingEnabled } from '../lib/settings';
import { isSupabaseConfigured, createSupabaseConfigError } from '../config/supabase';
import { createLogger } from '../logger';

import {
  TransparentIcon,
  BackgroundIcon,
  HDIcon,
  SaveIcon,
  ShareIcon,
  CheckIcon,
} from '../components/icons';
import { colors } from '../styles';
import { CANVAS_WIDTH } from './BackgroundEditor/styles';
import { useSubscription } from '../providers/SubscriptionProvider';

const PRIMARY = colors.brandBlue || '#2563EB';
const BG = '#FFFFFF';
const TEXT = '#111827';
const SUB = '#6B7280';
const BORDER = '#E5E7EB';
const exportLogger = createLogger('ExportScreen');

// ✅ Base64 Checkerboard Pattern (offline-safe)
const CHECKERBOARD_PATTERN =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAH0lEQVQ4T2N89+7dfwYkYGRkpIAzGs4YDY9Rw4c6HgMAPYR7AaVOp1wAAAAASUVORK5CYII=';

const TiledCheckerboard = () => (
  <View style={styles.tiledContainer}>
    <Image source={{ uri: CHECKERBOARD_PATTERN }} style={styles.tiledImage} resizeMode="repeat" />
  </View>
);

// ---------------------- Helpers ----------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeExportFormat(format) {
  const f = String(format || '').toLowerCase();
  return f === 'jpg' || f === 'jpeg' ? 'jpg' : 'png';
}

function exportMimeFromFormat(format) {
  return normalizeExportFormat(format) === 'jpg' ? 'image/jpeg' : 'image/png';
}

function exportExtFromFormat(format) {
  return normalizeExportFormat(format) === 'jpg' ? 'jpg' : 'png';
}

function formatUriForLog(uri) {
  const s = String(uri || '');
  if (!s) return '';
  if (/^data:/i.test(s)) return `data:… (len ${s.length})`;
  return s.length > 180 ? `${s.slice(0, 180)}…` : s;
}


function isHttpUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}
function isDataUri(s) {
  return typeof s === 'string' && /^data:/i.test(s);
}
function isLocalUri(s) {
  return typeof s === 'string' && (/^(file|content):\/\//i.test(s) || s.startsWith('/'));
}
function parseDataUri(uri) {
  const clean = String(uri || '').replace(/\s/g, '');
  const match = /^data:([^;]+);base64,(.+)$/i.exec(clean);
  if (!match) return null;
  return { mime: match[1] || 'application/octet-stream', base64: match[2] || '' };
}
function extensionFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpg' || m === 'image/jpeg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  return 'png';
}
function extensionFromUrl(url) {
  const clean = String(url || '').split('?')[0].split('#')[0];
  const match = /\.(png|jpe?g|webp)$/i.exec(clean);
  if (!match) return 'png';
  const ext = String(match[1] || '').toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext;
}
function stripFileScheme(uri) {
  return String(uri || '').replace(/^file:\/\//i, '');
}

function getImageSizeAsync(uri) {
  return new Promise((resolve, reject) => {
    if (!uri) return resolve(null);
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

function guessMimeFromUri(uri) {
  const s = String(uri || '');
  if (!s) return null;
  if (isDataUri(s)) return parseDataUri(s)?.mime || null;

  const clean = s.split('?')[0].split('#')[0];
  if (/\.png$/i.test(clean)) return 'image/png';
  if (/\.jpe?g$/i.test(clean)) return 'image/jpeg';
  if (/\.webp$/i.test(clean)) return 'image/webp';
  return null;
}

async function fileUriToDataUri(uri, mimeFallback = 'image/jpeg') {
  const path = uri.startsWith('file://') ? stripFileScheme(uri) : uri;
  const base64 = await RNFS.readFile(path, 'base64');
  const mime = guessMimeFromUri(uri) || mimeFallback;
  return `data:${mime};base64,${String(base64 || '').replace(/\s+/g, '')}`;
}

async function uriToDataUri(uri) {
  if (isLocalUri(uri)) {
    try {
      return await fileUriToDataUri(uri);
    } catch {
      // Fall through for URIs RNFS can't resolve.
    }
  }
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

async function skiaDataFromUri(uri) {
  const u = String(uri || '');
  if (!u) throw new Error('Missing image.');

  if (isDataUri(u)) {
    const parsed = parseDataUri(u);
    if (!parsed?.base64) throw new Error('Invalid image data.');
    return Skia.Data.fromBase64(parsed.base64);
  }

  try {
    return await Skia.Data.fromURI(u);
  } catch {
    const dataUri = await uriToDataUri(u);
    const parsed = parseDataUri(dataUri);
    if (!parsed?.base64) throw new Error('Could not read image data.');
    return Skia.Data.fromBase64(parsed.base64);
  }
}

async function getDecodedImageSize(uri) {
  const u = String(uri || '');
  if (!u) return null;

  try {
    const size = await getImageSizeAsync(u);
    if (size?.width && size?.height) return size;
  } catch {
    // fall through
  }

  try {
    const data = await skiaDataFromUri(u);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) return null;
    const width = image.width();
    const height = image.height();
    image.dispose?.();
    if (!width || !height) return null;
    return { width, height };
  } catch {
    return null;
  }
}

function pickHdUpscaleFactor({ width, height }) {
  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  if (!w || !h) return 2;

  // "HD" means: try to reach a ~4K long side, without over-upscaling large inputs.
  const longSide = Math.max(w, h);
  const targetLongSide = 4000;
  const required = targetLongSide / longSide;

  if (required <= 1.05) return 1;
  if (required <= 2) return 2;
  if (required <= 4) return 4;
  return 8; // Edge function clamps to 8
}

async function ensureUpscaleInputImage(inputUri, log) {
  const uri = String(inputUri || '');
  if (!uri) throw new Error('Missing image for upscale.');

  if (isHttpUrl(uri) || isDataUri(uri)) return uri;

  if (uri.startsWith('file://') || uri.startsWith('/')) {
    const dataUri = await fileUriToDataUri(uri, 'image/png');
    log?.('upscale:input:file->data', { bytesApprox: Math.round(dataUri.length * 0.75), mime: guessMimeFromUri(uri) });
    return dataUri;
  }

  const dataUri = await uriToDataUri(uri);
  log?.('upscale:input:uri->data', { bytesApprox: Math.round(dataUri.length * 0.75) });
  return dataUri;
}

function upscaleOutputFormatForExport(format) {
  return normalizeExportFormat(format) === 'png' ? 'PNG' : 'JPEG';
}

async function upscaleImageViaSupabase({ inputUri, exportFormat, upscaleFactor, log }) {
  if (!isSupabaseConfigured) throw createSupabaseConfigError();
  const inputImage = await ensureUpscaleInputImage(inputUri, log);
  const outputFormat = upscaleOutputFormatForExport(exportFormat);

  log?.('upscale:invoke', { outputFormat, upscaleFactor });
  const { data, error } = await supabase.functions.invoke('upscale-function', {
    body: {
      inputImage,
      outputFormat,
      outputType: ['URL'],
      includeCost: false,
      upscaleFactor,
    },
  });
  if (error) throw new Error(error?.message || 'Upscale failed.');
  if (data?.error) throw new Error(data?.message || data?.error || 'Upscale failed.');

  const upscaledUri = data?.images?.[0]?.url || data?.images?.[0]?.imageURL || data?.images?.[0]?.imageUrl;
  if (!upscaledUri) throw new Error('Upscale returned no image.');

  log?.('upscale:ok', { uri: formatUriForLog(upscaledUri) });
  return { uri: String(upscaledUri) };
}

async function transcodeImageToCache({ uri, format, quality = 92, backgroundColor = '#FFFFFF', log }) {
  const outFormat = normalizeExportFormat(format);
  const ext = exportExtFromFormat(outFormat);
  const outPath = `${RNFS.CachesDirectoryPath}/export-${Date.now()}.${ext}`;
  const outUri = `file://${outPath}`;

  log?.('transcode:start', { uri: formatUriForLog(uri), outFormat, outPath });

  const data = await skiaDataFromUri(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not decode image for export.');

  const w = image.width();
  const h = image.height();
  if (!w || !h) throw new Error('Invalid image size for export.');

  const surface = Skia.Surface.Make(w, h);
  if (!surface) throw new Error('Could not create export surface.');

  let snapshot = null;
  try {
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color(outFormat === 'jpg' ? backgroundColor : '#00000000'));
    canvas.drawImage(image, 0, 0);

    surface.flush?.();
    image.dispose?.();

    snapshot = surface.makeImageSnapshot();
    if (!snapshot) throw new Error('Export snapshot failed.');
  } finally {
    surface.dispose?.();
  }

  const skFormat = outFormat === 'jpg' ? ImageFormat.JPEG : ImageFormat.PNG;
  const q = outFormat === 'jpg' ? Math.max(1, Math.min(100, Number(quality) || 92)) : 100;
  const base64 = snapshot.encodeToBase64(skFormat, q);
  snapshot.dispose?.();

  if (!base64) throw new Error('Export encoding failed.');
  await RNFS.writeFile(outPath, base64, 'base64');

  log?.('transcode:done', { outUri: formatUriForLog(outUri), w, h, outFormat });

  return { uri: outUri, cleanupPath: outPath, width: w, height: h, mime: exportMimeFromFormat(outFormat) };
}

function isIOSNotReadySaveError(err) {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === 'E_UNABLE_TO_SAVE' ||
    msg.includes('unknown error from a native module') ||
    msg.includes('unable to save')
  );
}

/**
 * Ensures the file is on disk (not base64, not http) so CameraRoll can read it.
 */
async function prepareLocalAssetUriForSave(uri, log) {
  if (!uri) throw new Error('Missing image to save.');
  log?.('prepare:start', { uri: formatUriForLog(uri) });

  // Already a local file
  if (uri.startsWith('file://') || uri.startsWith('/')) {
    const safeUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    log?.('prepare:local', { uri: formatUriForLog(safeUri) });
    return { uri: safeUri, cleanupPath: null };
  }

  // Provider URIs
  if (uri.startsWith('content://') || uri.startsWith('ph://')) {
    log?.('prepare:providerUri', { uri: formatUriForLog(uri) });
    return { uri, cleanupPath: null };
  }

  // Base64 data URI -> write to cache
  if (isDataUri(uri)) {
    const parsed = parseDataUri(uri);
    if (!parsed?.base64) throw new Error('Invalid image data.');
    const ext = extensionFromMime(parsed.mime);
    const path = `${RNFS.CachesDirectoryPath}/export-${Date.now()}.${ext}`;
    log?.('prepare:dataUri->file', { mime: parsed.mime, path, base64Len: parsed.base64.length });
    await RNFS.writeFile(path, parsed.base64, 'base64');
    return { uri: `file://${path}`, cleanupPath: path };
  }

  // Remote URL -> download to cache
  if (isHttpUrl(uri)) {
    const ext = extensionFromUrl(uri);
    const path = `${RNFS.CachesDirectoryPath}/export-${Date.now()}.${ext}`;
    log?.('prepare:http->download', { url: formatUriForLog(uri), path });

    const result = await RNFS.downloadFile({ fromUrl: uri, toFile: path }).promise;
    log?.('prepare:download:done', { statusCode: result?.statusCode });

    if (result?.statusCode && result.statusCode >= 400) {
      throw new Error(`Download failed (${result.statusCode}).`);
    }

    return { uri: `file://${path}`, cleanupPath: path };
  }

  throw new Error('Unsupported image URI format.');
}

/**
 * Permission handler
 */
async function ensureSavePermission(log) {
  if (Platform.OS === 'ios') {
    const status = await iosRequestAddOnlyGalleryPermission();
    log?.('permission:ios', { status });
    return {
      granted: status === 'granted' || status === 'limited',
      shouldOpenSettings: status === 'blocked' || status === 'denied',
    };
  }

  if (Platform.OS !== 'android') return { granted: true, shouldOpenSettings: false };

  const api = Number(Platform.Version);
  log?.('permission:android:api', { api });

  // Android 10+ (API 29+) typically OK for add-only
  if (api >= 29) {
    log?.('permission:android:>=29', { granted: true });
    return { granted: true, shouldOpenSettings: false };
  }

  // Android < 29 requires WRITE_EXTERNAL_STORAGE
  const perm = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  const has = await PermissionsAndroid.check(perm);
  log?.('permission:android:<29:check', { perm, has });

  if (has) return { granted: true, shouldOpenSettings: false };

  const status = await PermissionsAndroid.request(perm, {
    title: 'Storage Permission',
    message: 'Magic Studio needs access to save photos to your gallery.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  log?.('permission:android:<29:request', { perm, status });

  return {
    granted: status === PermissionsAndroid.RESULTS.GRANTED,
    shouldOpenSettings: status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
  };
}

/**
 * iOS readiness: warm up Photos & wait until it responds.
 * IMPORTANT: This prevents first-install “E_UNABLE_TO_SAVE” in many cases.
 */
async function waitForIOSPhotosReady(log) {
  if (Platform.OS !== 'ios') return true;

  // total wait budget
  const timeoutMs = 4000;
  const start = Date.now();

  // We do a few probes; if albums/photos query succeeds, Photos is “awake”.
  // Backoff delays: 150, 250, 400, 600, 800...
  const delays = [150, 250, 400, 600, 800, 900];

  log?.('ios:photosReady:begin', { timeoutMs });

  // First: a tiny initial delay (let iOS settle permission/UI)
  await sleep(200);

  while (Date.now() - start < timeoutMs) {
    try {
      // Try albums first (usually lighter)
      await CameraRoll.getAlbums({ assetType: 'Photos' });
      // Extra short delay after first successful probe
      await sleep(150);

      // Optional: also probe getPhotos (some devices behave better after one call)
      await CameraRoll.getPhotos({ first: 1, assetType: 'Photos' });

      log?.('ios:photosReady:ok', { ms: Date.now() - start });
      return true;
    } catch (e) {
      const elapsed = Date.now() - start;
      log?.('ios:photosReady:probeFail', { ms: elapsed, message: e?.message || String(e) });

      const nextDelay = delays[Math.min(delays.length - 1, Math.floor(elapsed / 500))];
      await sleep(nextDelay);
    }
  }

  log?.('ios:photosReady:timeout', { ms: Date.now() - start });
  return false;
}

/**
 * Save with a SMALL retry, but only after readiness wait.
 * (This keeps behavior “single tap” even in edge cases)
 */
async function saveToCameraRollAfterReady(preparedUri, log) {
  // 2 attempts max on iOS, 1 on Android
  const attempts = Platform.OS === 'ios' ? 2 : 1;
  const backoff = [0, 900];

  let lastErr = null;

  for (let i = 0; i < attempts; i++) {
    try {
      if (i > 0) {
        log?.('save:retryDelay', { attempt: i + 1, ms: backoff[i] });
        await sleep(backoff[i]);
      }

      const saved = await CameraRoll.saveAsset(preparedUri, { type: 'photo' });
      return saved;
    } catch (e) {
      lastErr = e;
      log?.('save:attemptFailed', { attempt: i + 1, code: e?.code, message: e?.message });

      // Only retry iOS not-ready error; otherwise throw
      if (Platform.OS !== 'ios' || !isIOSNotReadySaveError(e) || i === attempts - 1) {
        throw e;
      }
    }
  }

  throw lastErr;
}

// ---------------------- Component ----------------------

export default function ExportScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { isPremium } = useSubscription();
  const resultUri = route?.params?.resultUri;
  const resultWidth = route?.params?.width || 1080;
  const resultHeight = route?.params?.height || 1350;
  const previewWidth = route?.params?.canvasDisplayWidth || CANVAS_WIDTH;
  const previewHeight = route?.params?.canvasDisplayHeight || null;
  const debugLogs = typeof __DEV__ !== 'undefined' && __DEV__;

  const [format, setFormat] = useState('png');
  const [resolution, setResolution] = useState('original');
  const [isSaving, setIsSaving] = useState(false);
  const [inputSize, setInputSize] = useState(null);
  const didUserChangeFormatRef = useRef(false);
  const didUserChangeResolutionRef = useRef(false);

  const log = useCallback(
    (event, payload) => {
      if (!debugLogs) return;
      exportLogger.log(event, payload);
    },
    [debugLogs],
  );

  useEffect(() => {
    log('route:params', {
      resultUri: formatUriForLog(resultUri),
      resultWidth,
      resultHeight,
      previewWidth,
      previewHeight,
    });
  }, [log, previewHeight, previewWidth, resultHeight, resultUri, resultWidth]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const saved = await getDefaultExportFormat();
      if (!alive) return;
      if (didUserChangeFormatRef.current) return;
      setFormat(saved);
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const enabled = await getHdProcessingEnabled({ fallback: isPremium });
      if (!alive) return;
      if (didUserChangeResolutionRef.current) return;
      setResolution(isPremium && enabled ? 'hd' : 'original');
    })();

    return () => {
      alive = false;
    };
  }, [isPremium]);

  useEffect(() => {
    let alive = true;
    setInputSize(null);
    if (!resultUri) return () => {};

    (async () => {
      const size = await getDecodedImageSize(resultUri);
      log('input:decodedSize', size);
      if (!alive) return;
      if (size?.width && size?.height) setInputSize(size);
    })();

    return () => {
      alive = false;
    };
  }, [resultUri]);

  const effectiveWidth = inputSize?.width || Math.round(Number(resultWidth) || 0);
  const effectiveHeight = inputSize?.height || Math.round(Number(resultHeight) || 0);
  const aspectRatio =
    effectiveWidth && effectiveHeight ? effectiveWidth / effectiveHeight : Number(resultWidth) / Number(resultHeight);

  const isHdSelected = resolution === 'hd' && isPremium;
  const hdUpscaleFactor = isHdSelected
    ? pickHdUpscaleFactor({ width: effectiveWidth, height: effectiveHeight })
    : 1;

  const upscaleCacheRef = useRef({
    cacheKey: null,
    upscaledUri: null,
    inFlightKey: null,
    inFlightPromise: null,
  });

  useEffect(() => {
    log('input:effective', { effectiveWidth, effectiveHeight, aspectRatio });
  }, [aspectRatio, effectiveHeight, effectiveWidth, log]);

  useEffect(() => {
    log('ui:format', { format });
  }, [format, log]);

  useEffect(() => {
    log('ui:resolution', { resolution, isPremium });
  }, [isPremium, log, resolution]);

  const getHdUpscaledUri = useCallback(async () => {
    const factor = pickHdUpscaleFactor({ width: effectiveWidth, height: effectiveHeight });

    if (factor <= 1) return resultUri;

    // Always upscale to a high-quality PNG intermediate, then export pipeline converts to PNG/JPG.
    // This avoids double-JPEG compression and lets Save/Share reuse the same upscale result.
    const cacheKey = `png|${factor}|${String(resultUri || '').slice(0, 120)}`;
    if (upscaleCacheRef.current.cacheKey === cacheKey && upscaleCacheRef.current.upscaledUri) {
      log('upscale:cacheHit', { uri: formatUriForLog(upscaleCacheRef.current.upscaledUri) });
      return upscaleCacheRef.current.upscaledUri;
    }

    if (upscaleCacheRef.current.inFlightKey === cacheKey && upscaleCacheRef.current.inFlightPromise) {
      return await upscaleCacheRef.current.inFlightPromise;
    }

    const promise = (async () => {
      try {
        const upscaled = await upscaleImageViaSupabase({
          inputUri: resultUri,
          exportFormat: 'png',
          upscaleFactor: factor,
          log,
        });

        upscaleCacheRef.current.cacheKey = cacheKey;
        upscaleCacheRef.current.upscaledUri = upscaled.uri;
        return upscaled.uri;
      } finally {
        if (upscaleCacheRef.current.inFlightKey === cacheKey) {
          upscaleCacheRef.current.inFlightKey = null;
          upscaleCacheRef.current.inFlightPromise = null;
        }
      }
    })();

    upscaleCacheRef.current.inFlightKey = cacheKey;
    upscaleCacheRef.current.inFlightPromise = promise;
    return await promise;
  }, [effectiveHeight, effectiveWidth, log, resultUri]);

  const onSave = async () => {
    if (!resultUri) return;
    if (isSaving) return;

    setIsSaving(true);
    const cleanupPaths = [];

    try {
      log('save:config', {
        format,
        resolution,
        effectiveWidth,
        effectiveHeight,
        previewWidth,
        previewHeight,
        aspectRatio,
      });
      log('save:tap', { uri: formatUriForLog(resultUri), platform: Platform.OS, version: Platform.Version });

      // 1) Permission
      const permission = await ensureSavePermission(log);
      log('save:permission', permission);

      if (!permission?.granted) {
        Alert.alert(
          'Permission Required',
          Platform.OS === 'ios'
            ? 'Please allow Photos access to save images.'
            : 'Storage permission is required to save images.',
          permission?.shouldOpenSettings
            ? [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            : [{ text: 'OK' }],
        );
        return;
      }

      // 2) WAIT until Photos is ready (iOS only) BEFORE saving
      if (Platform.OS === 'ios') {
        log('save:ios:waitingForPhotosReady', {});

        const ready = await waitForIOSPhotosReady(log);
        if (!ready) {
          // If Photos doesn't become ready within a short window, show message once
          Alert.alert(
            'Preparing Photos…',
            'Photos is still initializing. Please try again in a moment.',
          );
          return;
        }
      }

      // 3) For HD export, try server upscale first (fallbacks to local export if it fails)
      let inputUri = resultUri;
      if (isHdSelected) {
        try {
          inputUri = await getHdUpscaledUri();
        } catch (e) {
          log('save:upscaleFailed', { message: e?.message || String(e) });
          inputUri = resultUri;
        }
      }
      const usedUpscaledInput = isHdSelected && inputUri !== resultUri;

      // 4) Prepare file (download/base64 -> local file)
      const prepared = await prepareLocalAssetUriForSave(inputUri, log);
      if (prepared.cleanupPath) cleanupPaths.push(prepared.cleanupPath);
      log('save:prepared', { preparedUri: formatUriForLog(prepared.uri), cleanupPath: prepared.cleanupPath || null });

      // 5) Convert to selected export format
      let transcoded;
      try {
        transcoded = await transcodeImageToCache({
          uri: prepared.uri,
          format,
          quality: 92,
          backgroundColor: '#FFFFFF',
          log,
        });
      } catch (e) {
        // HD export can fail on low-memory devices; fall back to original-size export.
        if (!isHdSelected) throw e;
        log('save:hdFallback', { message: e?.message || String(e) });
        const fallbackSourceUri = usedUpscaledInput ? resultUri : prepared.uri;
        const fallbackPrepared = usedUpscaledInput
          ? await prepareLocalAssetUriForSave(fallbackSourceUri, log)
          : { uri: fallbackSourceUri, cleanupPath: null };
        if (fallbackPrepared.cleanupPath) cleanupPaths.push(fallbackPrepared.cleanupPath);

        transcoded = await transcodeImageToCache({
          uri: fallbackPrepared.uri,
          format,
          quality: 92,
          backgroundColor: '#FFFFFF',
          log,
        });
      }
      if (transcoded.cleanupPath) cleanupPaths.push(transcoded.cleanupPath);
      log('save:transcoded', { outUri: formatUriForLog(transcoded.uri), mime: transcoded.mime });

      // 3.5) Ensure file exists + size (helps catch timing issues)
      const path = stripFileScheme(transcoded.uri);
      const stat = await RNFS.stat(path);
      log('file:ready', { path, size: stat?.size });

      // 6) Save (after readiness wait)
      const saved = await saveToCameraRollAfterReady(transcoded.uri, log);

      // Different CameraRoll versions return different shapes
      const savedUri =
        typeof saved === 'string'
          ? saved
          : saved?.node?.image?.uri
            ? saved.node.image.uri
            : saved?.uri
              ? saved.uri
              : null;

      log('save:saved', { savedUri });

      Alert.alert('Success', 'Image saved to Photos!', [
        { text: 'Great', onPress: () => navigation.popToTop() },
      ]);
    } catch (error) {
      log('save:error', { message: error?.message, code: error?.code, name: error?.name });

      // If we still get the iOS first-time error, don’t confuse user with a hard fail message
      if (Platform.OS === 'ios' && isIOSNotReadySaveError(error)) {
        Alert.alert(
          'Preparing Photos…',
          'Photos is still initializing. Please try again in a moment.',
        );
      } else {
        Alert.alert('Error', 'Could not save image.');
      }
    } finally {
      setIsSaving(false);
      for (const p of cleanupPaths) {
        if (!p) continue;
        RNFS.unlink(stripFileScheme(p)).catch(() => {});
      }
    }
  };

  const onShare = async () => {
    if (!resultUri) return;

    const cleanupPaths = [];
    try {
      log('share:config', {
        format,
        resolution,
        effectiveWidth,
        effectiveHeight,
        previewWidth,
        previewHeight,
        aspectRatio,
      });
      let inputUri = resultUri;
      if (isHdSelected) {
        try {
          inputUri = await getHdUpscaledUri();
        } catch (e) {
          log('share:upscaleFailed', { message: e?.message || String(e) });
          inputUri = resultUri;
        }
      }
      const usedUpscaledInput = isHdSelected && inputUri !== resultUri;

      const prepared = await prepareLocalAssetUriForSave(inputUri, log);
      if (prepared.cleanupPath) cleanupPaths.push(prepared.cleanupPath);

      let transcoded;
      try {
        transcoded = await transcodeImageToCache({
          uri: prepared.uri,
          format,
          quality: 92,
          backgroundColor: '#FFFFFF',
          log,
        });
      } catch (e) {
        if (!isHdSelected) throw e;
        log('share:hdFallback', { message: e?.message || String(e) });
        const fallbackSourceUri = usedUpscaledInput ? resultUri : prepared.uri;
        const fallbackPrepared = usedUpscaledInput
          ? await prepareLocalAssetUriForSave(fallbackSourceUri, log)
          : { uri: fallbackSourceUri, cleanupPath: null };
        if (fallbackPrepared.cleanupPath) cleanupPaths.push(fallbackPrepared.cleanupPath);

        transcoded = await transcodeImageToCache({
          uri: fallbackPrepared.uri,
          format,
          quality: 92,
          backgroundColor: '#FFFFFF',
          log,
        });
      }
      if (transcoded.cleanupPath) cleanupPaths.push(transcoded.cleanupPath);

      await Share.open({
        url: transcoded.uri,
        type: transcoded.mime,
        failOnCancel: false,
      });
    } catch {
      // ignore
    } finally {
      for (const p of cleanupPaths) {
        if (!p) continue;
        RNFS.unlink(stripFileScheme(p)).catch(() => {});
      }
    }
  };

  const handleProFeature = useCallback(() => {
    if (isPremium) {
      didUserChangeResolutionRef.current = true;
      setResolution('hd');
      return;
    }
    navigation?.navigate?.('Paywall');
  }, [isPremium, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Preview */}
          <View
            style={[
              styles.previewWrap,
              { width: previewWidth },
              previewHeight ? { height: previewHeight } : { aspectRatio },
            ]}
          >
            <TiledCheckerboard />

            <View style={styles.previewInner}>
              {resultUri ? (
                <Image source={{ uri: resultUri }} style={styles.previewImg} resizeMode="contain" />
              ) : (
                <Text style={{ color: SUB, fontWeight: '700' }}>No exported image</Text>
              )}
            </View>

            <View style={styles.infoPill}>
              {format === 'png' ? <TransparentIcon size={16} color="#fff" /> : <BackgroundIcon size={16} color="#fff" />}
              <Text style={styles.infoPillText}>
                {format.toUpperCase()} •{' '}
                {isHdSelected
                  ? `HD${hdUpscaleFactor > 1 ? ` ×${hdUpscaleFactor}` : ''}`
                  : `${effectiveWidth}x${effectiveHeight}`}
              </Text>
            </View>
          </View>

          {/* Format Selection */}
          <Text style={styles.sectionLabel}>FORMAT</Text>
          <View style={styles.grid2}>
            <FormatCard
              active={format === 'png'}
              title="PNG"
              subtitle="Transparent"
              iconName="png"
              onPress={() => {
                didUserChangeFormatRef.current = true;
                setFormat('png');
              }}
            />

            <FormatCard
              active={format === 'jpg'}
              disabled={false}
              title="JPG"
              subtitle="Smaller • No transparency"
              iconName="jpg"
              onPress={() => {
                didUserChangeFormatRef.current = true;
                setFormat('jpg');
              }}
            />
          </View>

          {/* Resolution Selection */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>RESOLUTION</Text>
          <ResolutionCard
            active={resolution === 'original'}
            title="Original"
            subtitle={`${effectiveWidth} x ${effectiveHeight} px`}
            onPress={() => {
              didUserChangeResolutionRef.current = true;
              setResolution('original');
            }}
          />
          <ResolutionCardPro
            active={resolution === 'hd'}
            title="HD Upscale"
            subtitle="AI Upscale • Better quality"
            onPress={handleProFeature}
          />

          {/* Pro Upgrade Card */}
          {!isPremium ? (
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeGlow} />
              <View style={styles.upgradeRow}>
                <View style={styles.upgradeCopy}>
                  <Text style={styles.upgradeTitle}>Upgrade for HD export</Text>
                  <Text style={styles.upgradeText}>Get AI-upscaled exports and remove watermarks.</Text>
                </View>
                <Pressable
                  onPress={handleProFeature}
                  style={({ pressed }) => [styles.tryProBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.tryProText}>Try Pro</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Actions */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 18 }]}>
            <Pressable
              onPress={onSave}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryPressed,
                isSaving && { opacity: 0.7 },
              ]}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Preparing…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Save to Photos</Text>
                  <SaveIcon size={22} color="#fff" />
                </>
              )}
            </Pressable>

            <Pressable
              onPress={onShare}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryBtnText}>Share</Text>
              <ShareIcon size={20} color={PRIMARY} />
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ---------------------- Subcomponents ----------------------

function FormatCard({ active, disabled, title, subtitle, iconName, onPress }) {
  const IconComponent = iconName === 'png' ? TransparentIcon : BackgroundIcon;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.formatCard,
        active && styles.formatCardActive,
        disabled && styles.formatCardDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {active ? (
        <View style={styles.checkBadge}>
          <CheckIcon size={16} color="#FFFFFF" />
        </View>
      ) : null}

      <View style={[styles.formatIcon, active ? styles.formatIconActive : null]}>
        <IconComponent size={22} color={active ? PRIMARY : '#9CA3AF'} />
      </View>

      <Text style={styles.formatTitle}>{title}</Text>
      <Text style={styles.formatSub}>{subtitle}</Text>
    </Pressable>
  );
}

function ResolutionCard({ active, title, subtitle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.resCard, active && styles.resCardActive, pressed && styles.pressed]}
    >
      <View style={styles.resLeft}>
        <Radio active={active} />
        <View>
          <Text style={styles.resTitle}>{title}</Text>
          <Text style={styles.resSub}>{subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ResolutionCardPro({ active, title, subtitle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resCardPro,
        active && styles.resCardProActive,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.resProStripe} />
      <View style={[styles.resLeft, { paddingLeft: 8 }]}>
        <Radio active={active} strong />
        <View>
          <View style={styles.hdRow}>
            <Text style={styles.resTitle}>{title}</Text>
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.resSub}>{subtitle}</Text>
        </View>
      </View>
      <HDIcon size={34} color="rgba(80,132,193,0.18)" />
    </Pressable>
  );
}

function Radio({ active, strong }) {
  if (!active) return <View style={styles.radioOff} />;
  return <View style={[styles.radioOn, strong && { borderWidth: 6 }]} />;
}

// ---------------------- Styles ----------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  root: { flex: 1, backgroundColor: BG },

  header: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: TEXT },
  headerSpacer: { width: 42 },

  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  primaryPressed: { opacity: 0.95, transform: [{ scale: 0.985 }] },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },

  previewWrap: {
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#F3F4F6',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 3 },
    }),
  },
  previewInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '100%', height: '100%' },

  tiledContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#FFF' },
  tiledImage: { width: '100%', height: '100%', opacity: 0.15 },

  infoPill: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    backgroundColor: 'rgba(0,0,0,0.60)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  sectionLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1, color: '#6B7280', marginBottom: 10 },
  grid2: { flexDirection: 'row', gap: 12 },

  formatCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 116,
  },
  formatCardActive: { borderWidth: 2, borderColor: PRIMARY, backgroundColor: '#EFF6FF' },
  formatCardDisabled: { opacity: 0.55 },

  checkBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  formatIconActive: { backgroundColor: '#FFFFFF' },
  formatTitle: { fontSize: 16, fontWeight: '900', color: TEXT },
  formatSub: { fontSize: 12, fontWeight: '700', color: SUB, marginTop: 4 },

  resCard: { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', marginBottom: 10 },
  resCardActive: { borderColor: PRIMARY, borderWidth: 1.5 },

  resCardPro: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.06)',
    marginBottom: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resCardProActive: { backgroundColor: 'rgba(37,99,235,0.08)' },
  resProStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: PRIMARY },

  resLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resTitle: { fontSize: 16, fontWeight: '900', color: TEXT },
  resSub: { fontSize: 12, fontWeight: '700', color: SUB, marginTop: 3 },

  radioOff: { width: 20, height: 20, borderRadius: 999, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  radioOn: { width: 20, height: 20, borderRadius: 999, borderWidth: 5, borderColor: PRIMARY, backgroundColor: '#fff' },

  hdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#F59E0B' },
  proPillText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },

  upgradeCard: { borderRadius: 16, padding: 16, backgroundColor: '#111827', overflow: 'hidden' },
  upgradeGlow: { position: 'absolute', right: -10, top: -10, width: 120, height: 120, borderRadius: 999, backgroundColor: PRIMARY, opacity: 0.18 },
  upgradeCopy: { flex: 1, paddingRight: 14 },
  upgradeRow: { flexDirection: 'row', alignItems: 'center' },
  upgradeTitle: { color: '#fff', fontWeight: '900', fontSize: 14, marginBottom: 4 },
  upgradeText: { color: '#D1D5DB', fontWeight: '600', fontSize: 12, lineHeight: 16 },
  tryProBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  tryProText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  bottomBar: { marginTop: 18, paddingHorizontal: 2, paddingTop: 14 },
  primaryBtn: { height: 56, borderRadius: 999, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

  secondaryBtn: { height: 48, borderRadius: 999, marginTop: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: 'transparent' },
  secondaryBtnText: { color: PRIMARY, fontSize: 17, fontWeight: '900' },
});
