import React, { useState, useMemo, useRef, useCallback } from 'react';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  View,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Text,
} from 'react-native';

import { PALETTE, PLACEHOLDER_IMAGE } from './constants';
import { saveSkiaSnapshotToCache } from './helpers';
import { styles, CANVAS_WIDTH, CANVAS_HEIGHT } from './styles';

import Header from './Header';
import SkiaBackgroundPreview from './SkiaBackgroundPreview';
import FloatingTools from './FloatingTools';
import EditorSheet from './EditorSheet';
import TextEditModal from './TextEditModal';

export default function BackgroundEditorScreen({ navigation, route }) {
  const paramResult = route?.params?.subjectUri;
  const paramOriginal = route?.params?.originalUri;

  const cutoutUri = paramResult || PLACEHOLDER_IMAGE;
  const originalUri = paramOriginal || paramResult || PLACEHOLDER_IMAGE;

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
  const [bgImageUri, setBgImageUri] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
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
  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1.2 });
  const [bgOpacity, setBgOpacity] = useState(100);

  const [textLayers, setTextLayers] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTextId, setEditingTextId] = useState(null);

  const activeSubjectUri = useMemo(
    () => (subjectVariant === 'cutout' ? cutoutUri : originalUri),
    [subjectVariant, cutoutUri, originalUri],
  );

  const handlePickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo' });
    if (result.assets && result.assets.length > 0) {
      setBgImageUri(result.assets[0].uri);
    }
  };

  const handleMagicGenerate = prompt => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setBgImageUri(`https://picsum.photos/800/1000?random=${Date.now()}`);
      setMode('image');
      setActiveLayer('background');
      Alert.alert('Magic AI', 'Background generated!');
    }, 2000);
  };

  const handleSetMode = newMode => {
    if (newMode === 'clear') {
      setMode('transparent');
      setBlurStrength(10);
      setDimBackground(10);
      setSelectedColor(PALETTE[2]);
      setBgImageUri(null);
      setBgFilters({ brightness: 100, contrast: 100, saturation: 100, sepia: 0 });
      setSubjectFilters({ brightness: 100, contrast: 100, saturation: 100, sepia: 0 });
      setBgTransform({ x: 0, y: 0, scale: 1.2 });
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
        Alert.alert('Error', 'Could not capture image.');
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
        });
      } finally {
        image.dispose();
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Failed to export image.');
    }
  }, [navigation]);

  const handleAddText = () => {
    const newText = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'Double tap',
      color: '#FFFFFF',
      fontSize: 40,
      x: CANVAS_WIDTH / 2 - 80,
      y: CANVAS_HEIGHT / 2,
    };
    setTextLayers(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
    setActiveLayer('text');
  };

  const openTextModal = id => {
    setEditingTextId(id);
    setEditModalVisible(true);
  };

  const saveTextChange = newText => {
    setTextLayers(prev =>
      prev.map(t => (t.id === editingTextId ? { ...t, text: newText } : t)),
    );
    setEditModalVisible(false);
    setEditingTextId(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={() => navigation?.goBack()} onSave={handleSave} />

      <View style={styles.previewContainer}>
        <SkiaBackgroundPreview
          ref={previewRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          subjectUri={activeSubjectUri}
          originalUri={originalUri}
          bgImageUri={bgImageUri}
          mode={mode}
          showCheckerboard={showCheckerboard}
          blurStrength={blurStrength}
          dimBackground={dimBackground}
          gradientAngle={gradientAngle}
          gradientIntensity={gradientIntensity}
          selectedColor={selectedColor}
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
          onEditTextRequest={openTextModal}
          onLayerSelect={setActiveLayer}
        />

        <FloatingTools
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={eraserPaths.length > 0}
          canRedo={redoPaths.length > 0}
        />

        {isGenerating && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loaderText}>Generating Magic...</Text>
          </View>
        )}
      </View>

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
        onMagicGenerate={handleMagicGenerate}
        onPickImage={handlePickImage}
      />

      <TextEditModal
        visible={editModalVisible}
        initialText={textLayers.find(t => t.id === editingTextId)?.text || ''}
        onClose={() => setEditModalVisible(false)}
        onSave={saveTextChange}
      />
    </SafeAreaView>
  );
}
