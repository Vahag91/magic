import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import ImageEditor from '@react-native-community/image-editor';

import ArrowBackIcon from '../components/icons/ArrowBackIcon';
import { useError } from '../providers/ErrorProvider';
import { createLogger } from '../logger';
import { normalizeImageOrientation } from '../lib/image/orientation';
import { stripFileScheme } from '../utils';
import i18n from '../localization/i18n';

const RATIOS = [
  { key: '1:1', label: '1:1', value: 1 },
  { key: '3:4', label: '3:4', value: 3 / 4 },
  { key: '4:3', label: '4:3', value: 4 / 3 },
  { key: '9:16', label: '9:16', value: 9 / 16 },
  { key: '16:9', label: '16:9', value: 16 / 9 },
];

const cropLogger = createLogger('CropScreen');

function normalizeImageUri(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.uri || value.url || null;
  return String(value);
}

function formatUriForLog(uri) {
  const s = String(uri || '');
  if (!s) return '';
  if (/^data:/i.test(s)) return `data:... (len ${s.length})`;
  return s.length > 160 ? `${s.slice(0, 160)}...` : s;
}

function mimeFromUri(uri, fallback = 'image/jpeg') {
  const clean = String(uri || '').split('?')[0].split('#')[0];
  const ext = (clean.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return fallback;
}


function isFullFrameCrop(cropRect, pixelSize) {
  if (!cropRect || !pixelSize) return false;
  const offX = Number(cropRect?.offset?.x) || 0;
  const offY = Number(cropRect?.offset?.y) || 0;
  const w = Number(cropRect?.size?.width) || 0;
  const h = Number(cropRect?.size?.height) || 0;
  return offX === 0 && offY === 0 && w === Number(pixelSize.width) && h === Number(pixelSize.height);
}
function parseDataUriBase64(input) {
  const s = String(input || '');
  const m = s.match(/^data:([^;]+);base64,(.*)$/i);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

// SUPER useful to see what the picker actually gave you
function detectFormatFromBase64Head(base64) {
  const s = String(base64 || '').slice(0, 40);
  // JPEG often starts with /9j/
  if (s.startsWith('/9j/')) return 'jpeg';
  // PNG starts with iVBORw0KGgo
  if (s.startsWith('iVBORw0KGgo')) return 'png';
  // WEBP often starts with UklGR (RIFF)
  if (s.startsWith('UklGR')) return 'webp';
  // HEIC/HEIF: many start with AAAA...ftypheic / ftypheif
  if (s.includes('ZnR5cG')) {
    // "ftyp" base64 fragment is "ZnR5cA"
    // try to detect heic/heif by common fragments:
    if (s.toLowerCase().includes('aGVpYw') || s.toLowerCase().includes('aGVpZg')) return 'heic/heif';
    return 'ftyp(container)';
  }
  return 'unknown';
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

function centerCrop({ width, height, ratio }) {
  const srcW = Math.max(1, Math.round(width || 0));
  const srcH = Math.max(1, Math.round(height || 0));
  const srcRatio = srcW / srcH;

  let cropW = srcW;
  let cropH = srcH;

  if (srcRatio > ratio) {
    cropH = srcH;
    cropW = Math.round(srcH * ratio);
  } else {
    cropW = srcW;
    cropH = Math.round(srcW / ratio);
  }

  const offsetX = Math.max(0, Math.round((srcW - cropW) / 2));
  const offsetY = Math.max(0, Math.round((srcH - cropH) / 2));

  return {
    offset: { x: offsetX, y: offsetY },
    size: { width: cropW, height: cropH },
  };
}

async function writeTempFromBase64({ base64, mime, tag }) {
  const safeMime = String(mime || 'image/jpeg').toLowerCase();

  // IMPORTANT: do NOT lie about extension. If it's heic/webp and you write ".jpg" it will break.
  const ext =
    safeMime.includes('png') ? 'png' :
    safeMime.includes('webp') ? 'webp' :
    safeMime.includes('heic') ? 'heic' :
    safeMime.includes('heif') ? 'heif' :
    'jpg';

  const filePath = `${RNFS.CachesDirectoryPath}/crop_input_${tag}_${Date.now()}.${ext}`;
  await RNFS.writeFile(filePath, String(base64 || ''), 'base64');
  return `file://${filePath}`;
}

async function safeStat(uri) {
  try {
    const p = stripFileScheme(uri);
    const st = await RNFS.stat(p);
    return { size: st.size, path: st.path, isFile: st.isFile(), mtime: st.mtime };
  } catch (e) {
    return null;
  }
}

export default function CropScreen({ navigation, route }) {
  const { showError, showAppError } = useError();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const imageUri = normalizeImageUri(route?.params?.imageUri);
  const base64Param = route?.params?.base64 || null;
  const mimeParam = route?.params?.mime || null;
  const flow = route?.params?.flow || 'backgroundRemoval';

  const debugLogs = typeof __DEV__ !== 'undefined' && __DEV__;
  const logIf = React.useCallback(
    (event, payload) => {
      if (!debugLogs) return;
      cropLogger.log(event, payload);
      // also to Metro console
      // eslint-disable-next-line no-console
      console.log(`[CropScreen] ${event}`, payload || '');
    },
    [debugLogs],
  );

  const [ratioKey, setRatioKey] = React.useState('3:4');
  const [imageSize, setImageSize] = React.useState(null);
  const [isWorking, setIsWorking] = React.useState(false);

  const ratioValue = React.useMemo(() => {
    return RATIOS.find(r => r.key === ratioKey)?.value || RATIOS[0].value;
  }, [ratioKey]);

  const frameSize = React.useMemo(() => {
    const maxWidth = Math.max(240, screenW - 32);
    const maxHeight = Math.max(240, screenH * 0.58);
    const frameWidth = Math.min(maxWidth, maxHeight * ratioValue);
    const frameHeight = frameWidth / ratioValue;
    return { width: frameWidth, height: frameHeight };
  }, [ratioValue, screenH, screenW]);

  React.useEffect(() => {
    const guessed = mimeFromUri(imageUri, 'unknown');
    const parsed = parseDataUriBase64(base64Param);
    const rawBase64 = parsed?.base64 ? parsed.base64 : base64Param;
    const headType = rawBase64 ? detectFormatFromBase64Head(rawBase64) : null;

    logIf('route:params', {
      platform: Platform.OS,
      imageUri: formatUriForLog(imageUri),
      imageUriMimeGuess: guessed,
      mimeParam,
      flow,
      hasBase64: Boolean(base64Param),
      base64IsDataUri: Boolean(parsed),
      base64Len: base64Param ? String(base64Param).length : 0,
      base64HeadType: headType,
      imageUriScheme: String(imageUri || '').split(':')[0] || '',
    });
  }, [base64Param, flow, imageUri, logIf, mimeParam]);

  // Preview sizing (does not mean pixels are baked!)
  React.useEffect(() => {
    if (!imageUri) return;
    setImageSize(null);

    logIf('preview:getSize:start', { imageUri: formatUriForLog(imageUri) });

    Image.getSize(
      imageUri,
      (width, height) => {
        setImageSize({ width, height });
        logIf('preview:getSize:ok', { width, height });
      },
      (err) => {
        logIf('preview:getSize:error', { message: err?.message || String(err) });
        showError();
      },
    );
  }, [imageUri, logIf, showError]);

  const handleDone = React.useCallback(async () => {
    if (isWorking) return;
    if (!imageUri && !base64Param) return;

    setIsWorking(true);

    const tempUris = new Set();
    let nextUri = null;

    try {
      if (!ImageEditor?.cropImage) {
        Alert.alert(i18n.t('cropScreen.missingDependency'), i18n.t('cropScreen.imageEditorRequired'));
        return;
      }

      let workingBase64 = base64Param;
      let workingMime = mimeParam || mimeFromUri(imageUri, 'image/jpeg');
      let tempInputUri = null;

      const parsed = parseDataUriBase64(workingBase64);
      if (parsed?.base64) {
        workingBase64 = parsed.base64;
        workingMime = parsed.mime || workingMime;
      }

      const headType = workingBase64 ? detectFormatFromBase64Head(workingBase64) : null;

      logIf('input:before', {
        imageUri: formatUriForLog(imageUri),
        workingMime,
        usedBase64: Boolean(workingBase64),
        base64HeadType: headType,
      });

      if (workingBase64) {
        tempInputUri = await writeTempFromBase64({
          base64: workingBase64,
          mime: workingMime,
          tag: 'input',
        });
        tempUris.add(tempInputUri);
      } else {
        tempInputUri = imageUri;
      }

      const normalized = await normalizeImageOrientation({
        uri: tempInputUri,
        mime: workingMime,
      });

      if (normalized) {
        logIf('input:normalized', {
          uri: normalized.uri,
          width: normalized.width,
          height: normalized.height,
        });
        tempInputUri = normalized.uri;
        tempUris.add(tempInputUri);
      }

      const stIn = await safeStat(tempInputUri);
      logIf('input:normalized', {
        tempInputUri: formatUriForLog(tempInputUri),
        stat: stIn,
      });

      const pixelSize = await getImageSizeAsync(tempInputUri);
      logIf('input:pixelSize', pixelSize);

      if (!pixelSize?.width || !pixelSize?.height) {
        throw new Error('Failed to read image size for cropping');
      }

      const cropRect = centerCrop({
        width: pixelSize.width,
        height: pixelSize.height,
        ratio: ratioValue,
      });

      logIf('crop:request', { ratioKey, ratioValue, cropRect });

      const isFull = isFullFrameCrop(cropRect, pixelSize);
      let croppedResult = null;
      if (isFull) {
        logIf('crop:skip', {
          reason: 'full-frame crop; avoid ImageEditor re-encode rotation',
          nextUri: formatUriForLog(tempInputUri),
        });
      } else {
        croppedResult = await ImageEditor.cropImage(tempInputUri, cropRect);
        if (croppedResult?.uri) {
          tempUris.add(croppedResult.uri);
        }
      }

      const croppedUriRaw = normalizeImageUri(croppedResult) || tempInputUri;
      nextUri = String(croppedUriRaw).startsWith('file://') ? croppedUriRaw : `file://${croppedUriRaw}`;
      const stOut = await safeStat(nextUri);

      const nextMimeGuess = mimeFromUri(nextUri, 'image/jpeg');
      logIf('crop:result', {
        croppedResult,
        nextUri: formatUriForLog(nextUri),
        nextMimeGuess,
        stat: stOut,
      });

      let nextBase64 = null;
      if (flow !== 'objectRemoval') {
        const path = stripFileScheme(nextUri);
        nextBase64 = await RNFS.readFile(path, 'base64');
        logIf('out:base64', {
          len: nextBase64 ? nextBase64.length : 0,
          headType: nextBase64 ? detectFormatFromBase64Head(nextBase64) : null,
        });
      }

      const cropMeta = {
        ratio: ratioValue,
        ratioLabel: ratioKey,
        sourceSize: pixelSize,
        cropRect,
        outputSize: cropRect?.size ? { ...cropRect.size } : null,
        bakedBy: workingBase64 ? 'picker-base64-file' : 'uri-fallback',
        inputMime: workingMime,
        outputMimeGuess: nextMimeGuess,
      };

      logIf('nav:next', { flow, cropMeta });

      if (flow === 'objectRemoval') {
        navigation.replace('ObjectRemover', {
          imageUri: nextUri,
          mimeType: nextMimeGuess,
          cropMeta,
        });
        return;
      }

      navigation.replace('RemoveBackgroundProcessing', {
        imageUri: nextUri,
        base64: nextBase64,
        mime: nextMimeGuess,
        cropMeta,
      });
    } catch (e) {
      logIf('crop:error', { message: e?.message || String(e), stack: e?.stack });
      showAppError(e, { retry: handleDone, retryLabel: 'Try again' });
    } finally {
      setIsWorking(false);
      for (const uri of tempUris) {
        if (uri && uri !== nextUri) {
          try {
            const p = stripFileScheme(uri);
            await RNFS.unlink(p);
            logIf('cleanup:temp', { deleted: p });
          } catch (err) {
            logIf('cleanup:error', { uri, message: err?.message });
          }
        }
      }
    }
  }, [
    base64Param,
    flow,
    imageUri,
    isWorking,
    logIf,
    mimeParam,
    navigation,
    ratioKey,
    ratioValue,
    showAppError,
  ]);

  if (!imageUri) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>{i18n.t('cropScreen.noImageSelected')}</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.backPill}>
            <Text style={styles.backPillText}>{i18n.t('cropScreen.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowBackIcon size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{i18n.t('cropScreen.cropTitle')}</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <View style={styles.previewWrap}>
        <View style={[styles.cropFrame, { width: frameSize.width, height: frameSize.height }]}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          <View style={styles.grid}>
            <View style={[styles.gridLineV, { left: '33.33%' }]} />
            <View style={[styles.gridLineV, { left: '66.66%' }]} />
            <View style={[styles.gridLineH, { top: '33.33%' }]} />
            <View style={[styles.gridLineH, { top: '66.66%' }]} />
          </View>
          <View style={styles.cropBorder} />
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.ratioRow}>
          {RATIOS.map(r => {
            const isActive = r.key === ratioKey;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRatioKey(r.key)}
                style={[styles.ratioBtn, isActive && styles.ratioBtnActive]}
              >
                <Text style={[styles.ratioText, isActive && styles.ratioTextActive]}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={handleDone} style={styles.doneBtn} disabled={isWorking}>
          {isWorking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.doneText}>{i18n.t('cropScreen.doneButton')}</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0D12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 6 },
  headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  iconBtnPlaceholder: { width: 36, height: 36 },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  cropFrame: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#0F172A' },
  image: { ...StyleSheet.absoluteFillObject },
  grid: { ...StyleSheet.absoluteFillObject },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  cropBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 18 },
  sheet: { backgroundColor: '#111827', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetHandle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 999, backgroundColor: 'rgba(148,163,184,0.4)', marginBottom: 14 },
  ratioRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 16 },
  ratioBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2B3447' },
  ratioBtnActive: { borderColor: '#6D5CE7', backgroundColor: 'rgba(109,92,231,0.15)' },
  ratioText: { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },
  ratioTextActive: { color: '#A78BFA' },
  doneBtn: { height: 48, borderRadius: 999, backgroundColor: '#7C5CFF', alignItems: 'center', justifyContent: 'center' },
  doneText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  backPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: '#1F2937' },
  backPillText: { color: '#F8FAFC', fontWeight: '700' },
});