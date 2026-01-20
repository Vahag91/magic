import React, { useState, useMemo, useRef, useCallback } from 'react';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useError } from '../../providers/ErrorProvider';

import { PALETTE } from './constants';
import { saveSkiaSnapshotToCache } from './helpers';
import { styles, CANVAS_WIDTH, CANVAS_HEIGHT } from './styles';

import SkiaBackgroundPreview from './SkiaBackgroundPreview';
import FloatingTools from './FloatingTools';
import EditorSheet from './EditorSheet';

export default function BackgroundEditorScreen({ navigation, route }) {
  const { showError, showAppError } = useError();
  const paramResult = route?.params?.subjectUri;
  const paramOriginal = route?.params?.originalUri;

  const cutoutUri = paramResult || null;
  const originalUri = paramOriginal || paramResult || null;
  const hasInput = Boolean(cutoutUri || originalUri);

  const [subjectVariant, setSubjectVariant] = useState(
    paramResult ? 'cutout' : 'original',
  );
  const [mode, setMode] = useState('transparent');
  const [showCheckerboard, setShowCheckerboard] = useState(true);
  const [blurStrength, setBlurStrength] = useState(10);
  const [dimBackground, setDimBackground] = useState(10);
  const [gradientAngle, setGradientAngle] = useState(30);
  const [gradientIntensity, setGradientIntensity] = useState(70);
  const [selectedColor, setSelectedColor] = useState(PALETTE[2]);
  const [gradientStartColor, setGradientStartColor] = useState(PALETTE[2]);
  const [gradientEndColor, setGradientEndColor] = useState(PALETTE[4]);
  const [bgImageUri, setBgImageUri] = useState(null);
  const [bgFilters, setBgFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
  });
  const [subjectFilters, setSubjectFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
  });
  const [shadow, setShadow] = useState({
    enabled: false,
    blur: 10,
    opacity: 50,
    x: 10,
    y: 10,
  });

  const [activeLayer, setActiveLayer] = useState('subject');
  const [subjectTool, setSubjectTool] = useState('move');
  const [subjectTransform, setSubjectTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [brushSettings, setBrushSettings] = useState({ size: 30 });
  const [eraserPaths, setEraserPaths] = useState([]);
  const [redoPaths, setRedoPaths] = useState([]);
  const [bgTool, setBgTool] = useState('move');
  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [bgOpacity, setBgOpacity] = useState(100);

  const [textLayers, setTextLayers] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [textFocusToken, setTextFocusToken] = useState(0);

  const activeSubjectUri = useMemo(
    () => (subjectVariant === 'cutout' ? cutoutUri : originalUri),
    [subjectVariant, cutoutUri, originalUri],
  );

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo' });
      const asset = result?.assets?.[0];
      if (asset?.uri) {
        setBgImageUri(asset.uri);
        setBgTransform({ x: 0, y: 0, scale: 1 });
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSetMode = newMode => {
    if (newMode === 'clear') {
      setMode('transparent');
      setBlurStrength(10);
      setDimBackground(10);
      setSelectedColor(PALETTE[2]);
      setGradientStartColor(PALETTE[2]);
      setGradientEndColor(PALETTE[4]);
      setGradientAngle(30);
      setGradientIntensity(70);
      setBgImageUri(null);
      setBgFilters({ brightness: 100, contrast: 100, saturation: 100, sepia: 0 });
      setSubjectFilters({ brightness: 100, contrast: 100, saturation: 100, sepia: 0 });
      setBgTransform({ x: 0, y: 0, scale: 1 });
      setBgOpacity(100);
    } else {
      setMode(newMode);
    }
  };

  const previewRef = useRef(null);

  const handleUndo = useCallback(() => {
    setEraserPaths(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setRedoPaths(r => [...r, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoPaths(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setEraserPaths(p => [...p, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const snap = previewRef.current?.makeImageSnapshot();
      if (!snap?.image) {
        showError();
        return;
      }
      const { image, width, height } = snap;
      try {
        const saved = await saveSkiaSnapshotToCache({
          skImage: image,
          width,
          height,
        });
        navigation.navigate('Export', {
          resultUri: saved.uri,
          width: saved.width,
          height: saved.height,
          canvasDisplayWidth: CANVAS_WIDTH,
          canvasDisplayHeight: CANVAS_HEIGHT,
        });
      } finally {
        image.dispose();
      }
    } catch (e) {
      showAppError(e, { retry: handleSave, retryLabel: 'Try again' });
    }
  }, [navigation, showAppError, showError]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: hasInput
        ? () => (
            <TouchableOpacity onPress={handleSave} style={styles.headerBtnPrimary} activeOpacity={0.9}>
              <Text style={styles.headerBtnTextPrimary}>Save</Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [handleSave, hasInput, navigation]);

  const handleAddText = ({ x, y, focus = false } = {}) => {
    const xPos = typeof x === 'number' ? x : CANVAS_WIDTH / 2;
    const yPos = typeof y === 'number' ? y : CANVAS_HEIGHT / 2;
    const newText = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'Double tap',
      color: '#FFFFFF',
      fontSize: 40,
      x: xPos - 80,
      y: yPos,
    };
    setTextLayers(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
    setActiveLayer('text');
    if (focus) setTextFocusToken(t => t + 1);
  };

  const requestTextFocus = useCallback((id) => {
    if (!id) return;
    setActiveLayer('text');
    setSelectedTextId(id);
    setTextFocusToken(t => t + 1);
  }, []);

  if (!hasInput) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No image selected</Text>
          <Text style={styles.emptySub}>Go back and pick an image.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.emptyBtn} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const preview = (
    <View style={styles.previewContainer}>
      <SkiaBackgroundPreview
        ref={previewRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        subjectUri={activeSubjectUri}
        originalUri={originalUri}
        autoAlignSubjectBottom={subjectVariant === 'cutout'}
        bgImageUri={bgImageUri}
        mode={mode}
        showCheckerboard={showCheckerboard}
        blurStrength={blurStrength}
        dimBackground={dimBackground}
        gradientAngle={gradientAngle}
        gradientIntensity={gradientIntensity}
        selectedColor={selectedColor}
        gradientStartColor={gradientStartColor}
        gradientEndColor={gradientEndColor}
        bgOpacity={bgOpacity}
        subjectFilters={subjectFilters}
        bgFilters={bgFilters}
        shadow={shadow}
        subjectTransform={subjectTransform}
        onSubjectTransformChange={setSubjectTransform}
        subjectTool={subjectTool}
        brushSettings={brushSettings}
        bgTransform={bgTransform}
        onBgTransformChange={setBgTransform}
        bgTool={bgTool}
        eraserPaths={eraserPaths}
        setEraserPaths={setEraserPaths}
        setRedoPaths={setRedoPaths}
        textLayers={textLayers}
        activeLayer={activeLayer}
        selectedTextId={selectedTextId}
        onSelectText={setSelectedTextId}
        onUpdateText={(id, up) =>
          setTextLayers(prev =>
            prev.map(t => (t.id === id ? { ...t, ...up } : t)),
          )
        }
        onAddTextAt={(x, y) => handleAddText({ x, y, focus: true })}
        onTextDoubleTap={requestTextFocus}
        onLayerSelect={setActiveLayer}
      />

      <FloatingTools
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={eraserPaths.length > 0}
        canRedo={redoPaths.length > 0}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {preview}

      <EditorSheet
        mode={mode}
        setMode={handleSetMode}
        activeLayer={activeLayer}
        setActiveLayer={setActiveLayer}
        filters={activeLayer === 'subject' ? subjectFilters : bgFilters}
        setFilters={activeLayer === 'subject' ? setSubjectFilters : setBgFilters}
        shadow={shadow}
        setShadow={setShadow}
        showCheckerboard={showCheckerboard}
        setShowCheckerboard={setShowCheckerboard}
        blurStrength={blurStrength}
        setBlurStrength={setBlurStrength}
        dimBackground={dimBackground}
        setDimBackground={setDimBackground}
        gradientAngle={gradientAngle}
        setGradientAngle={setGradientAngle}
        gradientIntensity={gradientIntensity}
        setGradientIntensity={setGradientIntensity}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        gradientStartColor={gradientStartColor}
        setGradientStartColor={setGradientStartColor}
        gradientEndColor={gradientEndColor}
        setGradientEndColor={setGradientEndColor}
        bgImageUri={bgImageUri}
        setBgImageUri={setBgImageUri}
        bgOpacity={bgOpacity}
        setBgOpacity={setBgOpacity}
        bgTool={bgTool}
        setBgTool={setBgTool}
        bgTransform={bgTransform}
        setBgTransform={setBgTransform}
        subjectTool={subjectTool}
        setSubjectTool={setSubjectTool}
        subjectVariant={subjectVariant}
        setSubjectVariant={setSubjectVariant}
        subjectTransform={subjectTransform}
        setSubjectTransform={setSubjectTransform}
        brushSettings={brushSettings}
        setBrushSettings={setBrushSettings}
        textLayers={textLayers}
        selectedTextId={selectedTextId}
        textFocusToken={textFocusToken}
        onAddText={handleAddText}
        onUpdateText={(id, up) =>
          setTextLayers(prev =>
            prev.map(t => (t.id === id ? { ...t, ...up } : t)),
          )
        }
        onDeleteText={id => {
          setTextLayers(prev => prev.filter(t => t.id !== id));
          setSelectedTextId(null);
        }}
        onPickImage={handlePickImage}
      />
    </SafeAreaView>
  );
}
