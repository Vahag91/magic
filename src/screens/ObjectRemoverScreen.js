import * as React from 'react';
import { View, Text, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, common } from '../styles';
import { useError } from '../providers/ErrorProvider';
import MaskCanvasSkia from '../components/MaskCanvasSkia';
import BrushToolbar from '../components/BrushToolbar';
import LoadingOverlay from '../components/LoadingOverlay';
import { GEMINI_API_KEY } from '../config/gemini';
import { getRunwareSafeSize } from '../lib/objectRemoval/runwareSize';
import { exportMaskToDataUri } from '../lib/objectRemoval/maskExport';
import { resizeSeedToDataUri, resizeSeedToFileUri } from '../lib/objectRemoval/seedResize';
import { exportMarkedImageToDataUri } from '../lib/objectRemoval/markedExport';
import { removeObjectWithGeminiInpainting } from '../api/removeObjectGemini';
import { removeObjectRunware } from '../api/removeObjectRunware';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './BackgroundEditor/styles';
import { createLogger } from '../logger';
import i18n from '../localization/i18n';

const TEXT = colors.text || '#111827';
const SUB = colors.muted || '#6B7280';
const objectRemoverLogger = createLogger('ObjectRemoverScreen');

function logIf(debug, event, payload) {
  if (!debug) return;
  objectRemoverLogger.log(event, payload);
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
  const { showError, showAppError } = useError();
  const insets = useSafeAreaInsets();
  const debugLogs = typeof __DEV__ !== 'undefined' && __DEV__;

  const imageUri = route?.params?.imageUri || null;
  const mimeType = route?.params?.mimeType || null;
  const exifOrientation = route?.params?.exifOrientation || null;
  const cropMeta = route?.params?.cropMeta || null;
  const paramW = Number(route?.params?.width) || 0;
  const paramH = Number(route?.params?.height) || 0;

  React.useEffect(() => {
    const debugLogs = typeof __DEV__ !== 'undefined' && __DEV__;
    logIf(debugLogs, 'route:params', {
      imageUri,
      mimeType,
      exifOrientation,
      width: paramW || null,
      height: paramH || null,
    });
  }, [exifOrientation, imageUri, mimeType, paramH, paramW]);

  const [effectiveUri, setEffectiveUri] = React.useState(imageUri);
  const [isPreparingInput, setIsPreparingInput] = React.useState(true);

  const [imageSize, setImageSize] = React.useState({
    width: paramW,
    height: paramH,
  });

  const [mode, setMode] = React.useState('draw'); // draw | erase
  const [brushSize, setBrushSize] = React.useState(22); // screen px

  const [strokes, setStrokesState] = React.useState([]);
  const [redoStrokes, setRedoStrokes] = React.useState([]);

  const [isWorking, setIsWorking] = React.useState(false);
  const [workingText, setWorkingText] = React.useState(i18n.t('objectRemoverScreen.removingObjectText'));
  const [requestPreview, setRequestPreview] = React.useState(null);
  const abortRef = React.useRef(null);

  React.useEffect(() => {
    if (!imageUri) return;
    let alive = true;

    setIsPreparingInput(true);
    setEffectiveUri(imageUri);

    (async () => {
      try {
        // Keep the original camera/library photo as-is. Do not rotate/re-encode here.
        Image.getSize(
          imageUri,
          (width, height) => {
            if (!alive) return;
            setImageSize({ width, height });
            setIsPreparingInput(false);
          },
          () => {
            if (!alive) return;
            setIsPreparingInput(false);
            showError();
          },
        );
      } catch {
        if (!alive) return;
        setIsPreparingInput(false);
        setEffectiveUri(imageUri);
      }
    })();

    return () => {
      alive = false;
    };
  }, [exifOrientation, imageUri, mimeType, showError]);

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
    Alert.alert(i18n.t('objectRemoverScreen.resetMaskConfirmationTitle'), i18n.t('objectRemoverScreen.resetMaskConfirmationMessage'), [
      { text: i18n.t('exportScreen.alertCancelButton'), style: 'cancel' },
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

    Alert.alert(i18n.t('objectRemoverScreen.cancelConfirmationTitle'), i18n.t('objectRemoverScreen.cancelConfirmationMessage'), [
      { text: i18n.t('exportScreen.alertKeepWaitingButton'), style: 'cancel' },
      {
        text: i18n.t('exportScreen.alertCancelButton'),
        style: 'destructive',
        onPress: () => {
          abortRef.current?.abort?.();
          setIsWorking(false);
          navigation.goBack();
        },
      },
    ]);
  }, [isWorking, navigation]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerBackOnPress: onBack,
      headerBackVisible: true,
    });
  }, [navigation, onBack]);

  const onSubmit = React.useCallback(async () => {
    if (isWorking) return;
    if (!effectiveUri) return;
    if (!canSubmit) {
      Alert.alert(i18n.t('objectRemoverScreen.removeObjectTitle'), i18n.t('objectRemoverScreen.paintObjectToRemoveMessage'));
      return;
    }

    const srcW = imageSize.width;
    const srcH = imageSize.height;
    if (!srcW || !srcH) return;

    let target;
    try {
      target = getRunwareSafeSize({ width: srcW, height: srcH });
    } catch {
      Alert.alert(i18n.t('objectRemoverScreen.removeObjectTitle'), i18n.t('objectRemoverScreen.invalidImageSize'));
      return;
    }
    const outputRatio = target.width && target.height ? target.width / target.height : null;
    const canvasDisplayWidth = CANVAS_WIDTH;
    const canvasDisplayHeight = outputRatio ? canvasDisplayWidth / outputRatio : CANVAS_HEIGHT;

    const controller = new AbortController();
    abortRef.current = controller;

    setIsWorking(true);
    setWorkingText(i18n.t('objectRemoverScreen.preparingImageText'));
    setRequestPreview(null);

    try {
      const hasGeminiKey = Boolean(String(GEMINI_API_KEY || '').trim());
      const debugLogs = typeof __DEV__ !== 'undefined' && __DEV__;

      logIf(debugLogs, 'submit', {
        provider: hasGeminiKey ? 'gemini' : 'runware',
        srcW,
        srcH,
        targetW: target.width,
        targetH: target.height,
        strokes: strokes.length,
        mimeType,
        cropMeta,
      });

      if (hasGeminiKey) {
        const resized = await resizeSeedToFileUri({
          uri: effectiveUri,
          sourceWidth: srcW,
          sourceHeight: srcH,
          targetWidth: target.width,
          targetHeight: target.height,
          format: 'png',
        });

        if (controller.signal.aborted) return;

        setWorkingText(i18n.t('objectRemoverScreen.markingSelectionText'));
        const markedDataUri = await exportMarkedImageToDataUri({
          seedResizedUri: resized.uri,
          strokes,
          width: target.width,
          height: target.height,
          sourceWidth: srcW,
          sourceHeight: srcH,
        });

        setWorkingText(i18n.t('objectRemoverScreen.removingObjectText'));
        setRequestPreview({ imageUri: markedDataUri });
        const resultUri = await removeObjectWithGeminiInpainting({
          markedImageBase64: markedDataUri,
          mimeType: 'image/png',
          debug: debugLogs,
        });

        if (!resultUri) return;

        logIf(debugLogs, 'export:navigate', {
          width: target.width,
          height: target.height,
          canvasDisplayWidth,
          canvasDisplayHeight,
        });
        navigation.navigate('Export', {
          resultUri,
          width: target.width,
          height: target.height,
          canvasDisplayWidth,
          canvasDisplayHeight,
        });
      } else {
        const seedDataUri = await resizeSeedToDataUri({
          uri: effectiveUri,
          sourceWidth: srcW,
          sourceHeight: srcH,
          targetWidth: target.width,
          targetHeight: target.height,
        });

        if (controller.signal.aborted) return;

        setWorkingText(i18n.t('objectRemoverScreen.exportingMaskText'));
        const maskDataUri = exportMaskToDataUri({
          strokes,
          width: target.width,
          height: target.height,
          sourceWidth: srcW,
          sourceHeight: srcH,
        });

        setWorkingText(i18n.t('objectRemoverScreen.removingObjectText'));
        setRequestPreview({ imageUri: seedDataUri, maskUri: maskDataUri });
        const imageURL = await removeObjectRunware({
          seedUri: seedDataUri,
          maskDataUri,
          width: target.width,
          height: target.height,
          meta: {
            crop: cropMeta || null,
            inputSize: { width: srcW, height: srcH },
            outputSize: { width: target.width, height: target.height },
          },
          signal: controller.signal,
          debug: debugLogs,
        });

        if (!imageURL) return;

        logIf(debugLogs, 'export:navigate', {
          width: target.width,
          height: target.height,
          canvasDisplayWidth,
          canvasDisplayHeight,
        });
        navigation.navigate('Export', {
          resultUri: imageURL,
          width: target.width,
          height: target.height,
          canvasDisplayWidth,
          canvasDisplayHeight,
        });
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        showAppError(e, { retry: onSubmit, retryLabel: 'Try again' });
      }
    } finally {
      abortRef.current = null;
      setIsWorking(false);
      setRequestPreview(null);
    }
  }, [
    canSubmit,
    cropMeta,
    effectiveUri,
    imageSize.height,
    imageSize.width,
    isWorking,
    mimeType,
    navigation,
    showAppError,
    strokes,
  ]);

  const showSizeLoader = isPreparingInput || !imageSize.width || !imageSize.height;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.root}>
        <View style={styles.content}>
          {!imageUri ? (
            <View style={styles.center}>
              <Text style={styles.title}>{i18n.t('objectRemoverScreen.noImageSelected')}</Text>
              <Text style={styles.sub}>{i18n.t('objectRemoverScreen.goBackAndPickImage')}</Text>
            </View>
          ) : showSizeLoader ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.sub}>{isPreparingInput ? i18n.t('objectRemoverScreen.preparingImageText') : i18n.t('objectRemoverScreen.loadingImageText')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.previewWrap}>
                <MaskCanvasSkia
                  imageUri={effectiveUri}
                  imageWidth={imageSize.width}
                  imageHeight={imageSize.height}
                  brushSize={brushSize}
                  mode={mode}
                  strokes={strokes}
                  setStrokes={addStroke}
                  disabled={isWorking || isPreparingInput}
                />
              </View>

              <Text style={styles.help}>
                {i18n.t('objectRemoverScreen.paintOverHelpText')}
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

        <LoadingOverlay visible={isWorking} message={workingText} preview={requestPreview} />
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
});
