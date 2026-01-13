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

// -------------------- helpers --------------------
function isHttpUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}
function isDataUri(s) {
  return typeof s === 'string' && /^data:/i.test(s);
}

function normalizeMime(mime) {
  if (!mime) return null;
  if (mime === 'image/jpg') return 'image/jpeg';
  return mime;
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


async function buildInputImage({ imageUri, base64, mime }) {
  if (base64) {
    const safeMime = normalizeMime(mime) || 'image/jpeg';
    return `data:${safeMime};base64,${base64}`;
  }
  if (isHttpUrl(imageUri) || isDataUri(imageUri)) return imageUri;
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

async function getExifOrientationAsync({ imageUri, base64, mime }) {
  const maybeJpeg = !mime || /^image\/jpe?g$/i.test(String(mime));
  if (!maybeJpeg) return null;

  try {
    if (base64) {
      const bytes = base64ToBytes(base64, 64 * 1024);
      return getExifOrientationFromJpegBytes(bytes);
    }

    if (typeof imageUri === 'string' && imageUri.startsWith('file://')) {
      const path = imageUri.replace(/^file:\/\//i, '');
      const chunk = await RNFS.read(path, 64 * 1024, 0, 'base64');
      const bytes = base64ToBytes(chunk, 64 * 1024);
      return getExifOrientationFromJpegBytes(bytes);
    }
  } catch {
    // ignore
  }

  return null;
}

function rotationDegreesFromExif(orientation) {
  if (orientation === 6) return 90;
  if (orientation === 8) return 270;
  if (orientation === 3) return 180;
  return 0;
}

async function rotatePngFileWithSkia({ uri, degrees }) {
  const rot = ((degrees % 360) + 360) % 360;

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
  const imageUri = route?.params?.imageUri || null;
  const base64 = route?.params?.base64 || null;
  const mime = normalizeMime(route?.params?.mime) || null;

  const inputDataUri = base64 ? `data:${mime || 'image/jpeg'};base64,${base64}` : null;
  const previewUri =
    imageUri || inputDataUri;

  // Progress + status
  const steps = React.useMemo(
    () => [
      { key: 'detect', title: 'Detecting subject', sub: 'Finding the main object in your photo.' },
      { key: 'prep', title: 'Preparing', sub: 'Optimizing edges for best cutout.' },
      { key: 'remove', title: 'Removing background', sub: 'AI is separating foreground and background.' },
      { key: 'finish', title: 'Finalizing', sub: 'Cleaning edges and exporting PNG.' },
    ],
    []
  );

  const [statusTitle, setStatusTitle] = React.useState(steps[0].title);
  const [statusSub, setStatusSub] = React.useState(steps[0].sub);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [isWorking, setIsWorking] = React.useState(true);
  const [percent, setPercent] = React.useState(6);

  const startedRef = React.useRef(false);
  const canceledRef = React.useRef(false);

  // Anim values
  const progressA = React.useRef(new Animated.Value(0.06)).current; // 0..1
  const scanY = React.useRef(new Animated.Value(0)).current;
  const glow = React.useRef(new Animated.Value(0)).current;
  const shimmer = React.useRef(new Animated.Value(-1)).current;
  const iconBob = React.useRef(new Animated.Value(0)).current;

  const [cardSize, setCardSize] = React.useState({ w: 0, h: 0 });

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
        setStepIndex(nextStep);
        setStatusTitle(steps[nextStep].title);
        setStatusSub(steps[nextStep].sub);
      }

      setPercent(Math.round(value * 100));
    });
    return () => progressA.removeListener(id);
  }, [progressA, stepIndex, steps]);

  // Fake progress to 90% while network runs
  React.useEffect(() => {
    const anim = Animated.timing(progressA, {
      toValue: 0.92,
      duration: 5200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [progressA]);

  // -------------------- processing --------------------
  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!imageUri && !base64) {
      Alert.alert('No image', 'Please select an image first.');
      navigation.goBack();
      return;
    }

    (async () => {
      try {
        setIsWorking(true);

        const inputDims = await getImageSizeAsync(previewUri).catch(() => null);

        const exifOrientation =
          Platform.OS === 'ios' ? await getExifOrientationAsync({ imageUri, base64, mime }) : null;
        const rotationDegrees = rotationDegreesFromExif(exifOrientation);

        const inputImage = await buildInputImage({ imageUri, base64, mime });

        if (canceledRef.current) return;

        const { data, error } = await supabase.functions.invoke('smart-api', {
          body: {
            inputImage,
            outputFormat: 'PNG',
            outputQuality: 85,
            outputType: ['URL'],
            includeCost: false,
          },
        });

        if (canceledRef.current) return;
        if (error) throw new Error(error.message || 'Background removal failed.');

        const outUrl = data?.images?.[0]?.url || data?.imageUrl || data?.url;
        if (!outUrl) throw new Error('No output image returned.');

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

          const outDims = await getImageSizeAsync(localCutoutUri).catch(() => null);
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

            if (shouldRotateCutout) {
              try {
                localCutoutUri = await rotatePngFileWithSkia({
                  uri: localCutoutUri,
                  degrees: rotationDegrees,
                });
              } catch (e) {
                // ignore: falls back to unrotated cutout
              }
            }
          }
        } catch (downloadError) {
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
          });
        }, 350);
      } catch (e) {
        if (canceledRef.current) return;
        setIsWorking(false);
        Alert.alert('Error', e?.message || 'Something went wrong.', [
          { text: 'Back', onPress: () => navigation.goBack() },
        ]);
      }
    })();
  }, [navigation, imageUri, base64, mime, previewUri, progressA]);

  const onCancel = React.useCallback(() => {
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
  }, [navigation]);

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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Soft background accents */}
      <View pointerEvents="none" style={styles.bgBlobA} />
      <View pointerEvents="none" style={styles.bgBlobB} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn} activeOpacity={0.85}>
            <Text style={styles.chev}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Connected</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Background Removal',
                'We process your photo on the server and return a transparent PNG cutout. This usually takes a few seconds.'
              );
            }}
            style={styles.headerBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.help}>?</Text>
          </TouchableOpacity>
        </View>

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
              <Text style={styles.hSub} numberOfLines={2}>
                {statusSub}
              </Text>
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
            <Text style={styles.cardTip} numberOfLines={1}>
              Keep app open — we’ll send you to the editor automatically
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

  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 2 },
    }),
  },
  chev: { fontSize: 30, color: TEXT, marginTop: Platform.select({ ios: -3, android: -2 }) },
  help: { fontSize: 18, fontWeight: '900', color: TEXT },

  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  liveText: { fontSize: 12, fontWeight: '900', color: '#1D4ED8' },

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
  hSub: { marginTop: 2, fontSize: 12.5, fontWeight: '700', color: SUB, lineHeight: 16 },

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
  cardTip: { marginTop: 3, fontSize: 11.5, fontWeight: '800', color: SUB },

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
