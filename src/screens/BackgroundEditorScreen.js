import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  PanResponder,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import RNFS from 'react-native-fs';

// --- Icons (Placeholders for your existing icon imports) ---
// Ensure you have these components or replace them with your own
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon';
import ArrowRightOverlayIcon from '../components/icons/ArrowRightOverlayIcon';
import BlurIcon from '../components/icons/BlurIcon';
import GradientIcon from '../components/icons/GradientIcon';
import ImageIcon from '../components/icons/ImageIcon';
import PaletteIcon from '../components/icons/PaletteIcon';

import {
  Canvas,
  Image,
  useImage,
  useFont,
  Path,
  Skia,
  Group,
  Blur,
  LinearGradient,
  vec,
  Rect,
  ColorMatrix,
  useCanvasRef,
  Text as SkiaText, // Renamed to avoid conflict with RN Text
  DashPathEffect,
  Paint,
} from '@shopify/react-native-skia';

import { PALETTE, MODES, Icon, PLACEHOLDER_IMAGE } from '../constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CANVAS_ASPECT = 4 / 5;
const CANVAS_WIDTH = SCREEN_WIDTH - 32;
const CANVAS_HEIGHT = CANVAS_WIDTH / CANVAS_ASPECT;

const TEXT_BASE_FONT_SIZE = 32;

const SHEET_MIN_HEIGHT = 320;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.65;

// --------------------
// Helpers
// --------------------
const clampNum = (n) => (Number.isFinite(n) ? n : 0);

const getColorMatrix = (filters) => {
  const brightness = clampNum(filters?.brightness ?? 100) / 100;
  const contrast = clampNum(filters?.contrast ?? 100) / 100;
  const saturation = clampNum(filters?.saturation ?? 100) / 100;

  const t = (1 - contrast) * 0.5;

  const lumR = 0.3086;
  const lumG = 0.6094;
  const lumB = 0.0820;

  const sr = (1 - saturation) * lumR;
  const sg = (1 - saturation) * lumG;
  const sb = (1 - saturation) * lumB;

  const m = contrast * brightness;
  const o = t * 255;

  return [
    (sr + saturation) * m, sr * m,               sr * m,               0, o,
    sg * m,               (sg + saturation) * m, sg * m,               0, o,
    sb * m,               sb * m,               (sb + saturation) * m, 0, o,
    0,                    0,                    0,                    1, 0,
  ];
};

async function saveSkiaSnapshotToCache({ skImage, width, height }) {
  const fileName = `skia-export-${Date.now()}.png`;
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  const base64 = skImage.encodeToBase64();
  await RNFS.writeFile(path, base64, 'base64');
  return { uri: `file://${path}`, width, height };
}

// --------------------
// Custom Slider
// --------------------
const CustomSlider = ({ value, onValueChange, min = 0, max = 100 }) => {
  const widthRef = useRef(0);
  const onValueChangeRef = useRef(onValueChange);
  const minRef = useRef(min);
  const maxRef = useRef(max);

  useEffect(() => { onValueChangeRef.current = onValueChange; }, [onValueChange]);
  useEffect(() => { minRef.current = min; }, [min]);
  useEffect(() => { maxRef.current = max; }, [max]);

  const handleTouch = (touchX) => {
    const width = widthRef.current;
    if (width <= 0) return;
    const _min = minRef.current;
    const _max = maxRef.current;
    let percentage = touchX / width;
    if (percentage < 0) percentage = 0;
    if (percentage > 1) percentage = 1;
    const newValue = _min + percentage * (_max - _min);
    onValueChangeRef.current(newValue);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX),
    })
  ).current;

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <View
      style={{ height: 40, justifyContent: 'center' }}
      onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View pointerEvents="none" style={{ height: 30, justifyContent: 'center' }}>
        <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#3b82f6' }} />
        </View>
        <View style={{
          position: 'absolute', left: `${percentage}%`, marginLeft: -10,
          width: 20, height: 20, borderRadius: 10, backgroundColor: 'white',
          borderWidth: 2, borderColor: '#3b82f6', shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 3
        }} />
      </View>
      <View style={{ position: 'absolute', right: 0, top: -10 }} pointerEvents="none">
        <Text style={{ fontSize: 10, color: '#999', fontWeight: 'bold' }}>{value.toFixed(0)}</Text>
      </View>
    </View>
  );
};

// --------------------
// Text Edit Modal
// --------------------
const TextEditModal = ({ visible, initialText, onClose, onSave }) => {
  const [text, setText] = useState(initialText);
  useEffect(() => { setText(initialText); }, [initialText, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Text</Text>
          <TextInput
            style={styles.modalInput}
            value={text}
            onChangeText={setText}
            autoFocus
            multiline
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.modalBtnCancel}>
              <Text style={styles.modalBtnTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(text)} style={styles.modalBtnSave}>
              <Text style={styles.modalBtnTextSave}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// --------------------
// Skia Preview (The Core)
// --------------------
const SkiaBackgroundPreview = forwardRef(({
  width, height,
  subjectUri, bgImageUri,
  mode, showCheckerboard, blurStrength, dimBackground,
  selectedColor, bgOpacity, filters, shadow,
  subjectTransform, onSubjectTransformChange, subjectTool, brushSettings,
  bgTransform, onBgTransformChange, bgTool,
  eraserPaths, setEraserPaths, setRedoPaths,
  // Text Props
  textLayers, activeLayer, selectedTextId, onSelectText, onUpdateText, onEditTextRequest
}, ref) => {
  const skiaSubject = useImage(subjectUri);
  const skiaBg = useImage(bgImageUri);
  const canvasRef = useCanvasRef();
  const currentPathRef = useRef(null);

  // Load a real font for Skia text rendering (avoids Typeface.MakeDefault issues)
  const baseFont = useFont(
    require('../../assets/fonts/Inter-Variable.ttf'),
    TEXT_BASE_FONT_SIZE
  );

  useImperativeHandle(ref, () => ({
    makeImageSnapshot: () => {
      // Because text is now IN the canvas, this snapshot captures everything!
      const image = canvasRef.current?.makeImageSnapshot();
      if (!image) return null;
      return { image, width, height };
    }
  }));

  // State ref to access latest values in PanResponder without re-binding
  const stateRef = useRef({
    subjectTool, bgTool, subjectTransform, bgTransform, brushSettings, 
    activeLayer, textLayers, selectedTextId
  });
  
  useEffect(() => {
    stateRef.current = { 
      subjectTool, bgTool, subjectTransform, bgTransform, brushSettings, 
      activeLayer, textLayers, selectedTextId 
    };
  }, [subjectTool, bgTool, subjectTransform, bgTransform, brushSettings, activeLayer, textLayers, selectedTextId]);

  const gestureStartRef = useRef({ 
    x: 0, y: 0, 
    sx: 0, sy: 0, 
    bx: 0, by: 0,
    tx: 0, ty: 0, // Text start pos
    draggingTextId: null
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const s = stateRef.current;

        gestureStartRef.current = {
          x, y,
          sx: s.subjectTransform.x, sy: s.subjectTransform.y,
          bx: s.bgTransform.x, by: s.bgTransform.y,
          draggingTextId: null
        };

        // --- Logic: Decide what to do based on Active Layer ---

        // 1. TEXT LAYER LOGIC
        if (s.activeLayer === 'text') {
          // HIT TEST: Check if we tapped a text item
          // We iterate backwards to select top-most item first
          let hitId = null;
          for (let i = s.textLayers.length - 1; i >= 0; i--) {
            const layer = s.textLayers[i];
            const scale = (layer.fontSize || TEXT_BASE_FONT_SIZE) / TEXT_BASE_FONT_SIZE;
            const w = baseFont
              ? baseFont.getTextWidth(layer.text || '') * scale
              : (String(layer.text || '').length * (layer.fontSize || 16) * 0.55);
            const h = layer.fontSize; // Approx height

            // Logic: Text x,y is usually baseline. 
            // We approximate the bounding box as:
            // x: layer.x
            // y: layer.y - h (since y is baseline)
            if (x >= layer.x && x <= layer.x + w && y >= layer.y - h && y <= layer.y + h * 0.3) {
              hitId = layer.id;
              break;
            }
          }

          if (hitId) {
            onSelectText(hitId);
            const hitLayer = s.textLayers.find(t => t.id === hitId);
            gestureStartRef.current.draggingTextId = hitId;
            gestureStartRef.current.tx = hitLayer.x;
            gestureStartRef.current.ty = hitLayer.y;
          } else {
            // Deselect if clicked empty space
            onSelectText(null);
          }
        }

        // 2. SUBJECT LAYER LOGIC (Erase / Move)
        else if (s.activeLayer === 'subject') {
          if (s.subjectTool === 'erase') {
            const newPath = Skia.Path.Make();
            newPath.moveTo(x, y);
            currentPathRef.current = newPath;
            setEraserPaths(prev => [...prev, { path: newPath, strokeWidth: s.brushSettings.size }]);
            setRedoPaths([]); 
          }
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const s = stateRef.current;
        const start = gestureStartRef.current;

        // 1. DRAG TEXT
        if (s.activeLayer === 'text' && start.draggingTextId) {
          onUpdateText(start.draggingTextId, {
            x: start.tx + gestureState.dx,
            y: start.ty + gestureState.dy
          });
        }
        
        // 2. SUBJECT TOOLS
        else if (s.activeLayer === 'subject') {
          if (s.subjectTool === 'erase' && currentPathRef.current) {
            currentPathRef.current.lineTo(x, y);
            // Force re-render for smooth erasing
            setEraserPaths(prev => [...prev]); 
          } else if (s.subjectTool === 'move') {
            onSubjectTransformChange({
              ...s.subjectTransform,
              x: start.sx + gestureState.dx,
              y: start.sy + gestureState.dy
            });
          }
        }
        
        // 3. BACKGROUND TOOLS
        else if (s.activeLayer === 'background' && s.bgTool === 'move') {
          onBgTransformChange({
            ...s.bgTransform,
            x: start.bx + gestureState.dx,
            y: start.by + gestureState.dy
          });
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        const s = stateRef.current;
        const start = gestureStartRef.current;

        currentPathRef.current = null;

        // Detect tap to edit text (if small movement and hit text)
        if (s.activeLayer === 'text' && start.draggingTextId) {
           if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
             onEditTextRequest(start.draggingTextId);
           }
        }
      },
      onPanResponderTerminate: () => {
        currentPathRef.current = null;
      }
    })
  ).current;

  if (!skiaSubject) return <View style={styles.loadingContainer}><ActivityIndicator /></View>;

  const subjectOrigin = vec(width / 2, height / 2);
  const colorMatrix = getColorMatrix(filters);

  return (
    <View style={[styles.skiaView, { width, height }]} {...panResponder.panHandlers}>
      <Canvas ref={canvasRef} style={styles.canvas}>
        {/* --- Background Layers --- */}
        {mode === 'transparent' && showCheckerboard && (
          <Rect x={0} y={0} width={width} height={height} color="white" />
        )}
        {mode === 'color' && (
          <Rect x={0} y={0} width={width} height={height} color={selectedColor} />
        )}
        {mode === 'gradient' && (
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={[selectedColor, 'transparent']} />
          </Rect>
        )}
        {mode === 'image' && skiaBg && (
          <Group
            transform={[{ translateX: bgTransform.x }, { translateY: bgTransform.y }, { scale: bgTransform.scale }]}
            opacity={bgOpacity / 100}
          >
            <Image image={skiaBg} x={0} y={0} width={width} height={height} fit="cover">
              <ColorMatrix matrix={colorMatrix} />
            </Image>
          </Group>
        )}
        {mode === 'blur' && (
          <>
            <Image image={skiaSubject} x={0} y={0} width={width} height={height} fit="cover">
              <Blur blur={blurStrength} />
            </Image>
            <Rect x={0} y={0} width={width} height={height} color={`rgba(0,0,0,${dimBackground / 100})`} />
          </>
        )}

        {/* --- Shadow Layer --- */}
        {shadow.enabled && (
          <Group
            origin={subjectOrigin}
            transform={[
              { translateX: subjectTransform.x + shadow.x },
              { translateY: subjectTransform.y + shadow.y },
              { scale: subjectTransform.scale }
            ]}
            opacity={shadow.opacity / 100}
          >
            <Image image={skiaSubject} x={0} y={0} width={width} height={height} fit="contain" origin={subjectOrigin}>
              {/* Set Alpha to 1, others to 0 -> Black silhouette */}
              <ColorMatrix matrix={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]} />
              <Blur blur={shadow.blur} />
            </Image>
          </Group>
        )}

        {/* --- Subject Layer (with Eraser Mask) --- */}
        <Group layer={true}>
          <Image
            image={skiaSubject}
            x={0} y={0} width={width} height={height} fit="contain"
            transform={[{ translateX: subjectTransform.x }, { translateY: subjectTransform.y }, { scale: subjectTransform.scale }]}
            origin={subjectOrigin}
          />
          {eraserPaths.map((p, index) => (
            <Path
              key={index}
              path={p.path}
              color="black"
              style="stroke"
              strokeWidth={p.strokeWidth}
              strokeCap="round"
              strokeJoin="round"
              blendMode="dstOut" // This acts as an eraser
            />
          ))}
        </Group>

        {/* --- Text Layers (Rendered INSIDE Canvas) --- */}
        {textLayers.map((layer) => {
          const scale = (layer.fontSize || TEXT_BASE_FONT_SIZE) / TEXT_BASE_FONT_SIZE;
          const txtWidth = baseFont
            ? baseFont.getTextWidth(layer.text || '') * scale
            : (String(layer.text || '').length * (layer.fontSize || 16) * 0.55);
          const txtHeight = layer.fontSize;
          const isSelected = selectedTextId === layer.id;

          return (
            <Group key={layer.id}>
              {/* Optional: Draw selection box */}
              {isSelected && (
                <Rect 
                  x={layer.x - 4} 
                  y={layer.y - txtHeight} 
                  width={txtWidth + 8} 
                  height={txtHeight + (txtHeight * 0.3)} 
                  color="rgba(59, 130, 246, 0.5)"
                  style="stroke"
                  strokeWidth={2}
                >
                  <DashPathEffect intervals={[5, 5]} />
                </Rect>
              )}
              
              {baseFont ? (
                <Group
                  transform={[
                    { translateX: layer.x },
                    { translateY: layer.y },
                    { scale },
                  ]}
                >
                  <SkiaText x={0} y={0} text={layer.text} font={baseFont} color={layer.color} />
                </Group>
              ) : null}
            </Group>
          );
        })}
      </Canvas>
    </View>
  );
});

// --------------------
// Editor Sheet (UI)
// --------------------
const EditorSheet = (props) => {
  const [activeSubTab, setActiveSubTab] = useState('main');
  const [magicPrompt, setMagicPrompt] = useState('');
  const sheetHeight = useRef(new Animated.Value(SHEET_MIN_HEIGHT)).current;
  const lastHeight = useRef(SHEET_MIN_HEIGHT);

  const renderModeIcon = (key, active) => {
    const color = active ? '#3b82f6' : '#6B7280';
    const size = 20;
    switch (key) {
      case 'color': return <PaletteIcon size={size} color={color} />;
      case 'blur': return <BlurIcon size={size} color={color} />;
      case 'gradient': return <GradientIcon size={size} color={color} />;
      case 'image': return <ImageIcon size={size} color={color} />;
      default: return <Icon name={MODES.find(x => x.key === key)?.icon} />;
    }
  };

  const sheetResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        let newHeight = lastHeight.current - gestureState.dy;
        if (newHeight < SHEET_MIN_HEIGHT) newHeight = SHEET_MIN_HEIGHT;
        if (newHeight > SHEET_MAX_HEIGHT) newHeight = SHEET_MAX_HEIGHT;
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentH = lastHeight.current - gestureState.dy;
        let target = SHEET_MIN_HEIGHT;
        if (currentH > (SHEET_MAX_HEIGHT + SHEET_MIN_HEIGHT) / 2 || gestureState.vy < -0.5) target = SHEET_MAX_HEIGHT;
        Animated.spring(sheetHeight, { toValue: target, useNativeDriver: false, bounciness: 4 })
          .start(() => { lastHeight.current = target; });
      }
    })
  ).current;

  return (
    <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
      <View {...sheetResponder.panHandlers} style={styles.grabberArea}><View style={styles.grabber} /></View>

      <View style={styles.sheetPadding}>
        <View style={styles.tabRow}>
          {['subject', 'background', 'text'].map(l => (
            <TouchableOpacity
              key={l}
              onPress={() => { props.setActiveLayer(l); setActiveSubTab('main'); }}
              style={[styles.tabBtn, props.activeLayer === l && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, props.activeLayer === l && styles.tabTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.subTabRow}>
          <TouchableOpacity onPress={() => setActiveSubTab('main')} style={[styles.pillBtn, activeSubTab === 'main' ? styles.pillBtnActive : styles.pillBtnInactive]}>
            <Text style={activeSubTab === 'main' ? styles.pillTextActive : styles.pillTextInactive}>Main</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveSubTab('adjust')} style={[styles.pillBtn, activeSubTab === 'adjust' ? styles.pillBtnActive : styles.pillBtnInactive]}>
            <Text style={activeSubTab === 'adjust' ? styles.pillTextActive : styles.pillTextInactive}>Adjust</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveSubTab('shadow')} style={[styles.pillBtn, activeSubTab === 'shadow' ? styles.pillBtnActive : styles.pillBtnInactive]}>
            <Text style={activeSubTab === 'shadow' ? styles.pillTextActive : styles.pillTextInactive}>Shadow</Text>
          </TouchableOpacity>

          {props.activeLayer === 'background' && (
            <TouchableOpacity onPress={() => setActiveSubTab('magic')} style={[styles.pillBtn, activeSubTab === 'magic' ? styles.pillBtnMagic : styles.pillBtnInactive]}>
              <Text style={activeSubTab === 'magic' ? styles.pillTextMagic : styles.pillTextInactive}>Magic AI</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeSubTab === 'adjust' && (
          <View>
            <Text style={styles.sectionTitle}>Filters</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.label}>Brightness: {props.filters.brightness}%</Text>
              <CustomSlider min={0} max={200} value={props.filters.brightness} onValueChange={(val) => props.setFilters(prev => ({ ...prev, brightness: val }))} />
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.label}>Contrast: {props.filters.contrast}%</Text>
              <CustomSlider min={0} max={200} value={props.filters.contrast} onValueChange={(val) => props.setFilters(prev => ({ ...prev, contrast: val }))} />
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.label}>Saturation: {props.filters.saturation}%</Text>
              <CustomSlider min={0} max={200} value={props.filters.saturation} onValueChange={(val) => props.setFilters(prev => ({ ...prev, saturation: val }))} />
            </View>
          </View>
        )}

        {activeSubTab === 'shadow' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Drop Shadow</Text>
              <TouchableOpacity
                onPress={() => props.setShadow(s => ({ ...s, enabled: !s.enabled }))}
                style={[styles.pillBtn, props.shadow.enabled ? styles.pillBtnActive : styles.pillBtnInactive]}
              >
                <Text style={props.shadow.enabled ? styles.pillTextActive : styles.pillTextInactive}>
                  {props.shadow.enabled ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
            {props.shadow.enabled && (
              <>
                <View style={styles.sliderContainer}>
                  <Text style={styles.label}>Blur Radius: {props.shadow.blur}</Text>
                  <CustomSlider min={0} max={50} value={props.shadow.blur} onValueChange={(v) => props.setShadow(s => ({ ...s, blur: v }))} />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.label}>Opacity: {props.shadow.opacity}%</Text>
                  <CustomSlider min={0} max={100} value={props.shadow.opacity} onValueChange={(v) => props.setShadow(s => ({ ...s, opacity: v }))} />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.label}>Distance (X/Y): {props.shadow.x}</Text>
                  <CustomSlider min={-50} max={50} value={props.shadow.x} onValueChange={(v) => props.setShadow(s => ({ ...s, x: v, y: v }))} />
                </View>
              </>
            )}
          </View>
        )}

        {activeSubTab === 'magic' && props.activeLayer === 'background' && (
          <View style={styles.magicContainer}>
            <Text style={styles.magicTitle}>Magic Background Generator</Text>
            <TextInput
              style={styles.magicInput}
              placeholder="Describe your dream background..."
              multiline
              value={magicPrompt}
              onChangeText={setMagicPrompt}
            />
            <TouchableOpacity
              onPress={() => props.onMagicGenerate(magicPrompt)}
              disabled={!magicPrompt}
              style={[styles.magicBtn, { opacity: magicPrompt ? 1 : 0.5 }]}
            >
              <Text style={styles.magicBtnText}>Generate</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSubTab === 'main' && (
          <>
            {props.activeLayer === 'background' && (
              <View>
                <Text style={styles.sectionTitle}>Mode</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
                  {MODES.map(m => (
                    <TouchableOpacity key={m.key} onPress={() => props.setMode(m.key)} style={styles.modeItem}>
                      <View style={[styles.modeIcon, props.mode === m.key && styles.modeIconActive]}>
                        {renderModeIcon(m.key, props.mode === m.key)}
                      </View>
                      <Text style={styles.modeLabel}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {(props.mode === 'color' || props.mode === 'gradient') && (
                  <View style={styles.paletteContainer}>
                    {PALETTE.map(c => (
                      <TouchableOpacity key={c} onPress={() => props.setSelectedColor(c)} style={[styles.colorDot, { backgroundColor: c }]} />
                    ))}
                  </View>
                )}

                {props.mode === 'blur' && (
                  <View>
                    <Text style={styles.label}>Blur Strength</Text>
                    <CustomSlider value={props.blurStrength} onValueChange={props.setBlurStrength} />
                  </View>
                )}

                {props.mode === 'image' && (
                  <View>
                    <TouchableOpacity onPress={() => Alert.alert("Pick Image", "Image picker logic goes here")} style={styles.actionBtn}>
                      <Text>Pick BG Image</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Opacity</Text>
                    <CustomSlider value={props.bgOpacity} onValueChange={props.setBgOpacity} />

                    <Text style={styles.label}>Tools</Text>
                    <View style={styles.bgToolsRow}>
                      <TouchableOpacity onPress={() => props.setBgTool('move')} style={[styles.toolBtn, props.bgTool === 'move' && styles.toolBtnActive]}>
                        <Text>Move</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => props.setBgTool('scale')} style={[styles.toolBtn, props.bgTool === 'scale' && styles.toolBtnActive]}>
                        <Text>Scale</Text>
                      </TouchableOpacity>
                    </View>

                    {props.bgTool === 'scale' && (
                      <CustomSlider
                        min={20}
                        max={300}
                        value={props.bgTransform.scale * 100}
                        onValueChange={(v) => props.setBgTransform({ ...props.bgTransform, scale: v / 100 })}
                      />
                    )}
                  </View>
                )}
              </View>
            )}

            {props.activeLayer === 'subject' && (
              <View>
                <View style={styles.subjectToolsRow}>
                  {['move', 'scale', 'erase'].map(t => (
                    <TouchableOpacity key={t} onPress={() => props.setSubjectTool(t)} style={[styles.toolTab, props.subjectTool === t && styles.toolTabActive]}>
                      <Text style={[styles.subjectToolText, props.subjectTool === t ? styles.subjectToolTextActive : styles.subjectToolTextInactive]}>
                        {t.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {props.subjectTool === 'scale' && (
                  <View>
                    <Text style={styles.label}>Scale Subject</Text>
                    <CustomSlider
                      min={20}
                      max={300}
                      value={props.subjectTransform.scale * 100}
                      onValueChange={(v) => props.setSubjectTransform({ ...props.subjectTransform, scale: v / 100 })}
                    />
                  </View>
                )}

                {props.subjectTool === 'erase' && (
                  <View>
                    <Text style={styles.label}>Eraser Size: {props.brushSettings.size}</Text>
                    <CustomSlider
                      min={5}
                      max={80}
                      value={props.brushSettings.size}
                      onValueChange={(v) => props.setBrushSettings({ ...props.brushSettings, size: v })}
                    />
                  </View>
                )}

                <View style={styles.centerResetRow}>
                  <TouchableOpacity onPress={() => props.setSubjectTransform(prev => ({ ...prev, x: 0, y: 0 }))} style={styles.actionBtn}>
                    <Text>Center</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => props.setSubjectTransform({ x: 0, y: 0, scale: 1 })} style={styles.actionBtn}>
                    <Text>Reset</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {props.activeLayer === 'text' && (
              <View>
                <TouchableOpacity onPress={props.onAddText} style={[styles.actionBtn, styles.addTextBtn]}>
                  <Text style={styles.addTextBtnLabel}>+ Add Text</Text>
                </TouchableOpacity>

                {props.selectedTextId ? (
                  <View style={styles.editTextContainer}>
                    <Text style={styles.label}>Edit Selected Text</Text>

                    <View style={styles.textColorRow}>
                      {PALETTE.map(c => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => props.onUpdateText(props.selectedTextId, { color: c })}
                          style={[styles.textColorDot, { backgroundColor: c }]}
                        />
                      ))}
                    </View>

                    <Text style={[styles.label, styles.marginTop10]}>Size</Text>
                    <CustomSlider
                      min={10}
                      max={120}
                      value={props.textLayers.find(t => t.id === props.selectedTextId)?.fontSize || 24}
                      onValueChange={(v) => props.onUpdateText(props.selectedTextId, { fontSize: v })}
                    />

                    <TouchableOpacity onPress={() => props.onDeleteText(props.selectedTextId)} style={styles.deleteTextBtn}>
                      <Text style={styles.deleteTextLabel}>Delete Text</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.noTextLabel}>Tap text on screen to edit or drag</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
};

// --------------------
// Main Screen
// --------------------
export default function BackgroundEditorScreen({ navigation, route }) {
  const paramResult = route?.params?.subjectUri;
  const paramOriginal = route?.params?.originalUri;

  const cutoutUri = paramResult || PLACEHOLDER_IMAGE;
  const originalUri = paramOriginal || paramResult || PLACEHOLDER_IMAGE;

  const [subjectVariant, setSubjectVariant] = useState(paramResult ? 'cutout' : 'original');
  const [mode, setMode] = useState('color');
  const [showCheckerboard, setShowCheckerboard] = useState(true);
  const [blurStrength, setBlurStrength] = useState(10);
  const [dimBackground, setDimBackground] = useState(10);
  const [gradientAngle, setGradientAngle] = useState(30);
  const [gradientIntensity, setGradientIntensity] = useState(70);
  const [selectedColor, setSelectedColor] = useState(PALETTE[2]);
  const [bgImageUri, setBgImageUri] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100, sepia: 0 });
  const [shadow, setShadow] = useState({ enabled: false, blur: 10, opacity: 50, x: 10, y: 10 });

  const [activeLayer, setActiveLayer] = useState('subject');
  const [subjectTool, setSubjectTool] = useState('move');
  const [subjectTransform, setSubjectTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [brushSettings, setBrushSettings] = useState({ size: 30 });
  const [eraserPaths, setEraserPaths] = useState([]);
  const [redoPaths, setRedoPaths] = useState([]);
  const [bgTool, setBgTool] = useState('move');
  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1.2 });
  const [bgOpacity, setBgOpacity] = useState(100);

  // Text State
  const [textLayers, setTextLayers] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTextId, setEditingTextId] = useState(null);

  const activeSubjectUri = useMemo(
    () => (subjectVariant === 'cutout' ? cutoutUri : originalUri),
    [subjectVariant, cutoutUri, originalUri]
  );

  const handleMagicGenerate = (prompt) => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      // ✅ FIX: Added timestamp to burst cache
      setBgImageUri(`https://picsum.photos/800/1000?random=${Date.now()}`);
      setMode('image');
      setActiveLayer('background');
      Alert.alert("Magic AI", "Background generated!");
    }, 2000);
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
      // ✅ Now captures Text because Text is inside Canvas!
      const snap = previewRef.current?.makeImageSnapshot();
      if (!snap?.image) {
        Alert.alert("Error", "Could not capture image.");
        return;
      }
      const { image, width, height } = snap;
      try {
        const saved = await saveSkiaSnapshotToCache({ skImage: image, width, height });
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
      Alert.alert("Error", e?.message || "Failed to export image.");
    }
  }, [navigation]);

  const handleAddText = () => {
    const newText = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'Double tap',
      color: '#FFFFFF',
      fontSize: 40,
      x: CANVAS_WIDTH / 2 - 80, // Approximate centering
      y: CANVAS_HEIGHT / 2
    };
    setTextLayers(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
    setActiveLayer('text');
  };

  const openTextModal = (id) => {
    setEditingTextId(id);
    setEditModalVisible(true);
  };

  const saveTextChange = (newText) => {
    setTextLayers(prev => prev.map(t => t.id === editingTextId ? { ...t, text: newText } : t));
    setEditModalVisible(false);
    setEditingTextId(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.headerIconBtn}>
          <ArrowLeftIcon size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Skia Editor</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtnPrimary}>
          <Text style={styles.headerBtnTextPrimary}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewContainer}>
        <SkiaBackgroundPreview
          ref={previewRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          subjectUri={activeSubjectUri}
          bgImageUri={bgImageUri}
          mode={mode}
          showCheckerboard={showCheckerboard}
          blurStrength={blurStrength}
          dimBackground={dimBackground}
          gradientAngle={gradientAngle}
          gradientIntensity={gradientIntensity}
          selectedColor={selectedColor}
          bgOpacity={bgOpacity}
          filters={filters}
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
          // Text Props
          textLayers={textLayers}
          activeLayer={activeLayer}
          selectedTextId={selectedTextId}
          onSelectText={setSelectedTextId}
          onUpdateText={(id, up) => setTextLayers(prev => prev.map(t => t.id === id ? { ...t, ...up } : t))}
          onEditTextRequest={openTextModal}
        />

        <View style={styles.floatingTools}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={eraserPaths.length === 0}
            style={[styles.circleBtn, { opacity: eraserPaths.length ? 1 : 0.5 }]}
          >
            <ArrowLeftIcon size={24} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRedo}
            disabled={redoPaths.length === 0}
            style={[styles.circleBtn, { opacity: redoPaths.length ? 1 : 0.5 }]}
          >
            <ArrowRightOverlayIcon size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {isGenerating && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loaderText}>Generating Magic...</Text>
          </View>
        )}
      </View>

      <EditorSheet
        mode={mode} setMode={setMode}
        activeLayer={activeLayer} setActiveLayer={setActiveLayer}
        filters={filters} setFilters={setFilters}
        shadow={shadow} setShadow={setShadow}
        showCheckerboard={showCheckerboard} setShowCheckerboard={setShowCheckerboard}
        blurStrength={blurStrength} setBlurStrength={setBlurStrength}
        dimBackground={dimBackground} setDimBackground={setDimBackground}
        gradientAngle={gradientAngle} setGradientAngle={setGradientAngle}
        gradientIntensity={gradientIntensity} setGradientIntensity={setGradientIntensity}
        selectedColor={selectedColor} setSelectedColor={setSelectedColor}
        bgImageUri={bgImageUri} setBgImageUri={setBgImageUri}
        bgOpacity={bgOpacity} setBgOpacity={setBgOpacity}
        bgTool={bgTool} setBgTool={setBgTool}
        bgTransform={bgTransform} setBgTransform={setBgTransform}
        subjectTool={subjectTool} setSubjectTool={setSubjectTool}
        subjectVariant={subjectVariant} setSubjectVariant={setSubjectVariant}
        subjectTransform={subjectTransform} setSubjectTransform={setSubjectTransform}
        brushSettings={brushSettings} setBrushSettings={setBrushSettings}
        textLayers={textLayers}
        selectedTextId={selectedTextId}
        onAddText={handleAddText}
        onUpdateText={(id, up) => setTextLayers(prev => prev.map(t => t.id === id ? { ...t, ...up } : t))}
        onDeleteText={(id) => { setTextLayers(prev => prev.filter(t => t.id !== id)); setSelectedTextId(null); }}
        onMagicGenerate={handleMagicGenerate}
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

// --------------------
// Styles
// --------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerTitle: { fontWeight: '800', fontSize: 16 },
  headerBtnPrimary: { backgroundColor: 'black', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  headerBtnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  headerIconBtn: { padding: 6, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20 },
  floatingTools: { position: 'absolute', top: 30, right: 30, flexDirection: 'row', gap: 10, zIndex: 10 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, elevation: 6 },
  loaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  loaderText: { marginTop: 10, fontWeight: '800', color: '#3b82f6' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 20, zIndex: 100 },
  grabberArea: { width: '100%', height: 30, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 },
  tabRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05 },
  tabText: { fontSize: 10, fontWeight: '700', color: '#999', textTransform: 'uppercase' },
  tabTextActive: { color: '#000' },
  pillBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginRight: 5 },
  pillBtnActive: { backgroundColor: '#000' },
  pillBtnInactive: { backgroundColor: '#f3f4f6' },
  pillBtnMagic: { backgroundColor: '#4f46e5' },
  pillTextActive: { color: 'white', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  pillTextInactive: { color: '#999', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  pillTextMagic: { color: 'white', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10 },
  modeIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  modeIconActive: { backgroundColor: '#dbeafe', borderWidth: 2, borderColor: '#3b82f6' },
  label: { fontSize: 10, fontWeight: '700', color: '#6b7280', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  toolTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  toolTabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05 },
  actionBtn: { padding: 10, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center', flex: 1 },
  toolBtn: { padding: 8, backgroundColor: '#eee', borderRadius: 6 },
  toolBtnActive: { backgroundColor: '#3b82f6' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skiaView: { borderRadius: 20, overflow: 'hidden' },
  canvas: { flex: 1, backgroundColor: 'white' },
  sheetPadding: { paddingHorizontal: 20 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 50 },
  subTabRow: { flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderColor: '#f3f4f6', paddingBottom: 10, marginBottom: 15 },
  sliderContainer: { marginBottom: 15 },
  magicContainer: { backgroundColor: '#e0e7ff', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#c7d2fe' },
  magicTitle: { fontSize: 12, fontWeight: '800', color: '#4338ca', marginBottom: 10, textTransform: 'uppercase' },
  magicInput: { backgroundColor: 'white', borderRadius: 10, padding: 12, height: 80, textAlignVertical: 'top', marginBottom: 10 },
  magicBtn: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 10, alignItems: 'center' },
  magicBtnText: { color: 'white', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12 },
  modeScroll: { marginBottom: 15 },
  modeItem: { alignItems: 'center', marginRight: 15 },
  modeLabel: { fontSize: 10, marginTop: 4 },
  paletteContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#ddd' },
  bgToolsRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  subjectToolsRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 4, borderRadius: 10, marginBottom: 15 },
  subjectToolText: { fontWeight: '700' },
  subjectToolTextActive: { color: 'black' },
  subjectToolTextInactive: { color: '#999' },
  centerResetRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  addTextBtn: { backgroundColor: '#3b82f6' },
  addTextBtnLabel: { color: 'white', fontWeight: 'bold' },
  editTextContainer: { marginTop: 15, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 10 },
  textColorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  textColorDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  deleteTextBtn: { marginTop: 10, padding: 10, backgroundColor: '#fee2e2', borderRadius: 8, alignItems: 'center' },
  deleteTextLabel: { color: 'red', fontWeight: 'bold' },
  noTextLabel: { marginTop: 20, color: '#999', textAlign: 'center' },
  marginTop10: { marginTop: 10 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', backgroundColor: 'white', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  modalInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, maxHeight: 100, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtnCancel: { padding: 10 },
  modalBtnTextCancel: { color: 'red' },
  modalBtnSave: { backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalBtnTextSave: { color: 'white', fontWeight: 'bold' },
});