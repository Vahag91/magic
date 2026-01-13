import * as React from 'react';
import { View, Text, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, common } from '../styles';
import { SimpleHeader } from '../components';
import MaskCanvasSkia from '../components/MaskCanvasSkia';
import BrushToolbar from '../components/BrushToolbar';
import LoadingOverlay from '../components/LoadingOverlay';
import { exportMaskToDataUri } from '../lib/objectRemoval/maskExport';
import { getRunwareSafeSize } from '../lib/objectRemoval/runwareSize';
import { resizeSeedToDataUri } from '../lib/objectRemoval/seedResize';
import { removeObjectRunware } from '../api/removeObjectRunware';
import { CANVAS_WIDTH } from './BackgroundEditor/styles';

const TEXT = colors.text || '#111827';
const SUB = colors.muted || '#6B7280';

function clipText(value, maxLen) {
  const text = typeof value === 'string' ? value : '';
  const max = Math.max(0, Math.round(Number(maxLen) || 0));
  if (!max || text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}


function requestPayloadToDebugJson(payload) {
  if (!payload) return '';

  const seedImageText = payload?.seedImage
    ? `${clipText(payload.seedImage, 220)} (len ${payload.seedImage.length})`
    : 'generating…';

  const maskImageText = payload?.maskImage
    ? `${clipText(payload.maskImage, 220)} (len ${payload.maskImage.length})`
    : 'generating…';

  return JSON.stringify(
    {
      seedImage: seedImageText,
      maskImage: maskImageText,
      width: payload?.width,
      height: payload?.height,
    },
    null,
    2,
  );
}

function strokeInkScore(strokes) {
  const list = Array.isArray(strokes) ? strokes : [];
  let score = 0;

  for (let s = 0; s < list.length; s += 1) {
    const stroke = list[s];
    const pts = Array.isArray(stroke?.points) ? stroke.points : [];
    const size = Math.max(1, Number(stroke?.size) || 1);
    if (!pts.length) continue;

    if (pts.length === 1) {
      score += size * 0.8;
      continue;
    }

    for (let i = 1; i < pts.length; i += 1) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      score += Math.sqrt(dx * dx + dy * dy);
    }
  }

  return score;
}

export default function ObjectRemoverScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const imageUri = route?.params?.imageUri || null;
  const showRequestPayload = __DEV__ || route?.params?.showRequestPayload === true;
  const paramW = Number(route?.params?.width) || 0;
  const paramH = Number(route?.params?.height) || 0;

  const [imageSize, setImageSize] = React.useState({
    width: paramW,
    height: paramH,
  });

  const [mode, setMode] = React.useState('draw'); // draw | erase
  const [brushSize, setBrushSize] = React.useState(22); // screen px

  const [strokes, setStrokesState] = React.useState([]);
  const [redoStrokes, setRedoStrokes] = React.useState([]);

  const [isWorking, setIsWorking] = React.useState(false);
  const [workingText, setWorkingText] = React.useState('Removing object…');
  const [requestPayload, setRequestPayload] = React.useState(null);
  const abortRef = React.useRef(null);

  React.useEffect(() => {
    if (!imageUri) return;

    let alive = true;
    Image.getSize(
      imageUri,
      (width, height) => {
        if (!alive) return;
        setImageSize((prev) => {
          if (prev?.width === width && prev?.height === height) return prev;
          return { width, height };
        });
      },
      () => {
        if (!alive) return;
        Alert.alert('Remove Object', 'Could not load image size.');
      },
    );
    return () => {
      alive = false;
    };
  }, [imageUri, paramH, paramW]);

  React.useEffect(() => {
    return () => abortRef.current?.abort?.();
  }, []);

  const canUndo = strokes.length > 0;
  const canRedo = redoStrokes.length > 0;

  const canSubmit = React.useMemo(() => {
    const w = imageSize.width;
    const h = imageSize.height;
    if (!w || !h) return false;
    if (!strokes.length) return false;
    const minScore = Math.max(30, Math.max(w, h) * 0.003);
    return strokeInkScore(strokes) >= minScore;
  }, [imageSize.height, imageSize.width, strokes]);

  const addStroke = React.useCallback((updater) => {
    setRedoStrokes([]);
    setStrokesState(updater);
  }, []);

  const onUndo = React.useCallback(() => {
    setStrokesState((prev) => {
      if (!prev.length) return prev;
      const next = prev.slice(0, -1);
      const last = prev[prev.length - 1];
      setRedoStrokes((r) => [...r, last]);
      return next;
    });
  }, []);

  const onRedo = React.useCallback(() => {
    setRedoStrokes((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setStrokesState((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const onReset = React.useCallback(() => {
    if (!strokes.length) return;
    Alert.alert('Reset mask?', 'This will clear your painted mask.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setStrokesState([]);
          setRedoStrokes([]);
        },
      },
    ]);
  }, [strokes.length]);

  const onBack = React.useCallback(() => {
    if (!isWorking) {
      navigation.goBack();
      return;
    }

    Alert.alert('Cancel?', 'Stop removing the object?', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => {
          abortRef.current?.abort?.();
          setIsWorking(false);
          setRequestPayload(null);
          navigation.goBack();
        },
      },
    ]);
  }, [isWorking, navigation]);

  const onSubmit = React.useCallback(async () => {
    if (isWorking) return;
    if (!imageUri) return;
    if (!canSubmit) {
      Alert.alert('Remove Object', 'Paint over the object you want to remove.');
      return;
    }

    const srcW = imageSize.width;
    const srcH = imageSize.height;
    if (!srcW || !srcH) return;

    let target;
    try {
      target = getRunwareSafeSize({ width: srcW, height: srcH });
    } catch {
      Alert.alert('Remove Object', 'Invalid image size.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsWorking(true);
    setWorkingText('Preparing image…');
    setRequestPayload({
      seedImage: null,
      maskImage: null,
      width: target.width,
      height: target.height,
    });

    try {
      const seedDataUri = await resizeSeedToDataUri({
        uri: imageUri,
        sourceWidth: srcW,
        sourceHeight: srcH,
        targetWidth: target.width,
        targetHeight: target.height,
      });

      if (controller.signal.aborted) return;

      setRequestPayload((prev) => (prev ? { ...prev, seedImage: seedDataUri } : prev));
      setWorkingText('Exporting mask…');
      const maskDataUri = exportMaskToDataUri({
        strokes,
        width: target.width,
        height: target.height,
        sourceWidth: srcW,
        sourceHeight: srcH,
      });

      setRequestPayload((prev) => (prev ? { ...prev, maskImage: maskDataUri } : prev));
      setWorkingText('Removing object…');
      const imageURL = await removeObjectRunware({
        seedUri: seedDataUri,
        maskDataUri,
        width: target.width,
        height: target.height,
        signal: controller.signal,
      });

      if (!imageURL) return;

      navigation.navigate('Export', {
        resultUri: imageURL,
        width: target.width,
        height: target.height,
        canvasDisplayWidth: CANVAS_WIDTH,
      });
    } catch (e) {
      if (e?.name !== 'AbortError') {
        Alert.alert('Remove Object', e?.message || 'Something went wrong.');
      }
    } finally {
      abortRef.current = null;
      setIsWorking(false);
      setRequestPayload(null);
    }
  }, [canSubmit, imageSize.height, imageSize.width, imageUri, isWorking, navigation, strokes]);

  const showSizeLoader = !imageSize.width || !imageSize.height;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <SimpleHeader title="Remove Object" onBack={onBack} />

        <View style={styles.content}>
          {!imageUri ? (
            <View style={styles.center}>
              <Text style={styles.title}>No image selected</Text>
              <Text style={styles.sub}>Go back and pick an image.</Text>
            </View>
          ) : showSizeLoader ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.sub}>Loading image…</Text>
            </View>
          ) : (
            <>
              <View style={styles.previewWrap}>
                <MaskCanvasSkia
                  imageUri={imageUri}
                  imageWidth={imageSize.width}
                  imageHeight={imageSize.height}
                  brushSize={brushSize}
                  mode={mode}
                  strokes={strokes}
                  setStrokes={addStroke}
                  disabled={isWorking}
                />
              </View>

              <Text style={styles.help}>
                Paint over what you want removed. Use eraser to restore.
              </Text>
            </>
          )}
        </View>

        <BrushToolbar
          mode={mode}
          onModeChange={setMode}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          onUndo={onUndo}
          onRedo={onRedo}
          onReset={onReset}
          onSubmit={onSubmit}
          isWorking={isWorking}
          canUndo={canUndo}
          canRedo={canRedo}
          canSubmit={canSubmit}
          bottomInset={insets.bottom}
        />

        <LoadingOverlay visible={isWorking} message={workingText}>
          {showRequestPayload && requestPayload ? (
            <View style={styles.payloadWrap}>
              <Text style={styles.payloadTitle}>Request payload</Text>

              <View style={styles.payloadImages}>
                {requestPayload?.seedImage ? (
                  <Image
                    source={{ uri: requestPayload.seedImage }}
                    style={styles.payloadImage}
                    resizeMode="cover"
                  />
                ) : null}
                {requestPayload?.maskImage ? (
                  <Image
                    source={{ uri: requestPayload.maskImage }}
                    style={styles.payloadImage}
                    resizeMode="cover"
                  />
                ) : null}
              </View>

              <Text selectable style={styles.payloadCode}>
                {requestPayloadToDebugJson(requestPayload)}
              </Text>
            </View>
          ) : null}
        </LoadingOverlay>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: common.safeWhite,
  root: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },
  previewWrap: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  help: { marginTop: 10, color: SUB, fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '900', color: TEXT },
  sub: { marginTop: 8, fontSize: 12, fontWeight: '700', color: SUB },
  payloadWrap: {
    width: '100%',
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(17,24,39,0.06)',
  },
  payloadTitle: { fontSize: 12, fontWeight: '900', color: TEXT, marginBottom: 10 },
  payloadImages: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  payloadImage: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  payloadCode: { fontSize: 10, fontWeight: '700', color: '#111827' },
});
