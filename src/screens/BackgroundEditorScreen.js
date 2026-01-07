import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import {
  Canvas,
  Image,
  useImage,
  Path,
  Skia,
  Group,
  Blur,
  LinearGradient,
  vec,
  Rect, // ✅ CORRECT IMPORT (Uppercase)
} from '@shopify/react-native-skia';

// --- Constants & Types ---

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_ASPECT = 4 / 5;
const CANVAS_WIDTH = SCREEN_WIDTH - 32; // padding
const CANVAS_HEIGHT = CANVAS_WIDTH / CANVAS_ASPECT;

const PALETTE = [
  '#FFFFFF', '#000000', '#3b82f6', '#fca5a5', '#fde68a', '#d9f99d',
  '#bbf7d0', '#99f6e4', '#e9d5ff', '#fbcfe8', '#e5e7eb'
];

const MODES = [
  { key: 'original', label: 'None', icon: '🚫' },
  { key: 'transparent', label: 'Clear', icon: '🏁' },
  { key: 'blur', label: 'Blur', icon: '💧' },
  { key: 'color', label: 'Color', icon: '🎨' },
  { key: 'gradient', label: 'Grad', icon: '🌈' },
  { key: 'image', label: 'Image', icon: '🖼️' },
];

const PLACEHOLDER_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUbsmgeD4KThd1Wy62p2ajoFx3W96ViRwoL5_LhbACgKIvxSsJfRHAdfudvgL0YWpORkWt8DrIdIFDUqfcT-vTuwbuJ5bk4OZtzHAwDSx4AcLRcYvfFBpbo9S0K6n05TUNFk0FsOwDbF9rqWfWj2AyuoIyITxExdgT1kxj4n7Rzbvauym0s5-JKavmJ_ZKhYsDN3_cb38Bs0j_K0ybPm6vWCobX9HCn2YoxPZaYWvJ_UHnfNe7CK3BfClWbkmmNoinBOtt8_FsXL4d';

// --- Components ---

const Icon = ({ name, color = '#6B7280', size = 24 }) => <Text style={{ fontSize: size, color }}>{name}</Text>;

const CustomSlider = ({ value, onValueChange, min = 0, max = 100 }) => (
  <View style={{ height: 40, justifyContent: 'center' }}>
    <View style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
      <View style={{ width: `${((value - min) / (max - min)) * 100}%`, height: 4, backgroundColor: '#3b82f6' }} />
    </View>
    <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop: 4, alignItems:'center' }}>
         <TouchableOpacity onPress={() => onValueChange(Math.max(min, value - (max-min)/10))} style={{padding:5}}><Text style={{fontSize:18, color:'#999'}}>-</Text></TouchableOpacity>
         <Text style={{ fontSize: 10, color: '#666', fontWeight:'bold' }}>{value.toFixed(0)}</Text>
         <TouchableOpacity onPress={() => onValueChange(Math.min(max, value + (max-min)/10))} style={{padding:5}}><Text style={{fontSize:18, color:'#999'}}>+</Text></TouchableOpacity>
    </View>
  </View>
);

// --- Main Screen ---

export default function BackgroundEditorScreen({ navigation, route }) {
  const originalUri = route?.params?.subjectUri || PLACEHOLDER_IMAGE;
  const cutoutUri = route?.params?.cutoutUri || PLACEHOLDER_IMAGE;
  const [subjectVariant, setSubjectVariant] = useState('cutout');

  // Background
  const [mode, setMode] = useState('color');
  const [showCheckerboard, setShowCheckerboard] = useState(true);
  const [blurStrength, setBlurStrength] = useState(10);
  const [dimBackground, setDimBackground] = useState(10);
  const [gradientAngle, setGradientAngle] = useState(30);
  const [gradientIntensity, setGradientIntensity] = useState(70);
  const [selectedColor, setSelectedColor] = useState(PALETTE[2]);
  const [bgImageUri, setBgImageUri] = useState(null);

  // Layers & History
  const [activeLayer, setActiveLayer] = useState('subject');
  
  // Subject State
  const [subjectTool, setSubjectTool] = useState('move');
  const [subjectTransform, setSubjectTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [brushSize, setBrushSize] = useState(30);
  const [eraserPaths, setEraserPaths] = useState([]); 
  const [redoPaths, setRedoPaths] = useState([]);

  // Background Image Transform
  const [bgTool, setBgTool] = useState('move');
  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1.2 });
  const [bgOpacity, setBgOpacity] = useState(100);

  // Text Layers
  const [textLayers, setTextLayers] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);

  const activeSubjectUri = useMemo(() => 
    subjectVariant === 'cutout' ? cutoutUri : originalUri, 
  [subjectVariant, cutoutUri, originalUri]);

  const handleSave = useCallback(() => {
    const payload = {
      subject: { variant: subjectVariant, activeUri: activeSubjectUri, transform: subjectTransform, erasures: eraserPaths.length },
      background: { mode, blurStrength, selectedColor, bgImageUri, bgTransform },
      text: textLayers
    };
    Alert.alert("Project Saved", JSON.stringify(payload, null, 2));
  }, [subjectVariant, activeSubjectUri, subjectTransform, eraserPaths, mode, textLayers]);

  // Text Logic
  const handleAddText = () => {
    const newText = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'Double tap to edit',
      color: '#FFFFFF',
      fontSize: 24,
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
    };
    setTextLayers(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
    setActiveLayer('text');
  };

  const handleUpdateText = (id, updates) => {
    setTextLayers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteText = (id) => {
    setTextLayers(prev => prev.filter(t => t.id !== id));
    setSelectedTextId(null);
  };

  // Undo/Redo
  const handleUndo = () => {
    if (eraserPaths.length === 0) return;
    const last = eraserPaths[eraserPaths.length - 1];
    setRedoPaths(prev => [...prev, last]);
    setEraserPaths(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoPaths.length === 0) return;
    const next = redoPaths[redoPaths.length - 1];
    setEraserPaths(prev => [...prev, next]);
    setRedoPaths(prev => prev.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}><Text style={styles.headerBtnText}>Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Skia Editor</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtnPrimary}><Text style={styles.headerBtnTextPrimary}>Save</Text></TouchableOpacity>
      </View>

      <View style={styles.previewContainer}>
        
        <SkiaBackgroundPreview
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
          
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
          
          subjectTransform={subjectTransform}
          onSubjectTransformChange={setSubjectTransform}
          subjectTool={subjectTool}
          brushSize={brushSize}
          
          bgTransform={bgTransform}
          onBgTransformChange={setBgTransform}
          bgTool={bgTool}
          
          eraserPaths={eraserPaths}
          setEraserPaths={setEraserPaths}
          setRedoPaths={setRedoPaths}
        />

        <TextOverlay 
            layers={textLayers} 
            selectedId={selectedTextId}
            onSelect={setSelectedTextId}
            onUpdate={handleUpdateText}
            activeLayer={activeLayer}
        />

        <View style={styles.floatingTools}>
           <TouchableOpacity onPress={handleUndo} disabled={eraserPaths.length === 0} style={[styles.circleBtn, {opacity: eraserPaths.length?1:0.5}]}>
             <Icon name="↩️" size={16} />
           </TouchableOpacity>
           <TouchableOpacity onPress={handleRedo} disabled={redoPaths.length === 0} style={[styles.circleBtn, {opacity: redoPaths.length?1:0.5}]}>
             <Icon name="↪️" size={16} />
           </TouchableOpacity>
        </View>

        <View style={styles.layerBadge}>
             <Text style={styles.layerBadgeText}>Editing: {activeLayer.toUpperCase()}</Text>
        </View>
      </View>

      <EditorSheet 
        mode={mode} setMode={setMode}
        activeLayer={activeLayer} setActiveLayer={setActiveLayer}
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
        brushSize={brushSize} setBrushSize={setBrushSize}
        textLayers={textLayers}
        selectedTextId={selectedTextId}
        onAddText={handleAddText}
        onUpdateText={handleUpdateText}
        onDeleteText={handleDeleteText}
      />
    </SafeAreaView>
  );
}

// --- Skia Component (Fixed) ---

const SkiaBackgroundPreview = ({
  width, height,
  subjectUri, bgImageUri,
  mode, showCheckerboard, blurStrength, dimBackground,
  gradientAngle, gradientIntensity, selectedColor, bgOpacity,
  activeLayer, setActiveLayer,
  subjectTransform, onSubjectTransformChange, subjectTool, brushSize,
  bgTransform, onBgTransformChange, bgTool,
  eraserPaths, setEraserPaths, setRedoPaths
}) => {
  const skiaSubject = useImage(subjectUri);
  const skiaBg = useImage(bgImageUri);

  // ✅ Fix: Use Refs to prevent Stale Closures in PanResponder
  // This ensures the PanResponder always sees the LATEST state
  const stateRef = useRef({
      activeLayer,
      subjectTool,
      bgTool,
      subjectTransform,
      bgTransform,
      brushSize
  });

  // Keep refs updated on every render
  useEffect(() => {
      stateRef.current = { activeLayer, subjectTool, bgTool, subjectTransform, bgTransform, brushSize };
  }, [activeLayer, subjectTool, bgTool, subjectTransform, bgTransform, brushSize]);

  // Track the start of gestures
  const gestureStartRef = useRef({ x: 0, y: 0, sx: 0, sy: 0, bx: 0, by: 0 });
  
  // Track current path being drawn to avoid React state lag
  const currentPathRef = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt, gestureState) => {
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const s = stateRef.current; // Read fresh state

        // Save starting positions for transforms
        gestureStartRef.current = {
            x, y,
            sx: s.subjectTransform.x, sy: s.subjectTransform.y,
            bx: s.bgTransform.x, by: s.bgTransform.y
        };

        if (s.activeLayer === 'subject' && s.subjectTool === 'erase') {
          // Start a new path
          const newPath = Skia.Path.Make();
          newPath.moveTo(x, y);
          currentPathRef.current = newPath;
          
          // Add to React state immediately so it renders
          setEraserPaths(prev => [...prev, { path: newPath, strokeWidth: s.brushSize }]);
          setRedoPaths([]);
        } else {
            // If touching subject/bg, ensure layer is selected? (Optional)
            // if(s.activeLayer !== 'subject') setActiveLayer('subject');
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const s = stateRef.current; // Read fresh state
        const start = gestureStartRef.current;

        if (s.activeLayer === 'subject' && s.subjectTool === 'erase') {
            // Draw into the mutable path object directly
            if (currentPathRef.current) {
                currentPathRef.current.lineTo(x, y);
                // Trigger re-render to show the line
                setEraserPaths(prev => [...prev]); 
            }
        } 
        else if (s.activeLayer === 'subject' && s.subjectTool === 'move') {
            onSubjectTransformChange({
                ...s.subjectTransform,
                x: start.sx + gestureState.dx,
                y: start.sy + gestureState.dy
            });
        } 
        else if (s.activeLayer === 'background' && s.bgTool === 'move') {
            onBgTransformChange({
                ...s.bgTransform,
                x: start.bx + gestureState.dx,
                y: start.by + gestureState.dy
            });
        }
      },
      
      onPanResponderRelease: () => {
          currentPathRef.current = null;
      }
    })
  ).current;

  if (!skiaSubject) return <View style={{flex:1, alignItems:'center', justifyContent:'center'}}><ActivityIndicator /></View>;

  const subjectOrigin = vec(width/2, height/2);
  
  return (
    <View style={{ width, height, borderRadius: 20, overflow: 'hidden' }} {...panResponder.panHandlers}>
        <Canvas style={{ flex: 1, backgroundColor: 'white' }}>
            
            {/* 1. BACKGROUND LAYER */}
            {mode === 'transparent' && showCheckerboard && (
                <Rect x={0} y={0} width={width} height={height} color="white" />
            )}

            {/* ✅ Fix: Use <Rect> (Uppercase) instead of <rect> */}
            {mode === 'color' && <Rect x={0} y={0} width={width} height={height} color={selectedColor} />}
            
            {mode === 'gradient' && (
                <Rect x={0} y={0} width={width} height={height}>
                    <LinearGradient 
                        start={vec(0, 0)} 
                        end={vec(width, height)} 
                        colors={[selectedColor, 'transparent']} 
                    />
                </Rect>
            )}

            {mode === 'image' && skiaBg && (
                <Image 
                    image={skiaBg}
                    x={0} y={0} width={width} height={height}
                    fit="cover"
                    opacity={bgOpacity/100}
                    transform={[
                        { translateX: bgTransform.x },
                        { translateY: bgTransform.y },
                        { scale: bgTransform.scale }
                    ]}
                />
            )}

            {mode === 'blur' && (
                <Image 
                    image={skiaSubject} 
                    x={0} y={0} width={width} height={height} 
                    fit="cover"
                >
                    <Blur blur={blurStrength} />
                </Image>
            )}

            {mode === 'blur' && <Rect x={0} y={0} width={width} height={height} color={`rgba(0,0,0,${dimBackground/100})`} />}


            {/* 2. SUBJECT LAYER (With Erasing) */}
            <Group layer={true}>
                <Image
                    image={skiaSubject}
                    x={0} y={0} width={width} height={height}
                    fit="contain"
                    transform={[
                        { translateX: subjectTransform.x },
                        { translateY: subjectTransform.y },
                        { scale: subjectTransform.scale },
                    ]}
                    origin={subjectOrigin}
                />

                {/* Eraser Strokes */}
                {eraserPaths.map((p, index) => (
                    <Path
                        key={index}
                        path={p.path}
                        color="black"
                        style="stroke"
                        strokeWidth={p.strokeWidth}
                        strokeCap="round"
                        strokeJoin="round"
                        blendMode="dstOut" 
                    />
                ))}
            </Group>

        </Canvas>
    </View>
  );
};

// --- Editor Sheet (Controls) ---

const EditorSheet = (props) => {
  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        <View style={styles.tabRow}>
            {['subject', 'background', 'text'].map(l => (
                <TouchableOpacity 
                    key={l} 
                    onPress={() => props.setActiveLayer(l)}
                    style={[styles.tabBtn, props.activeLayer === l && styles.tabBtnActive]}
                >
                    <Text style={[styles.tabText, props.activeLayer === l && styles.tabTextActive]}>{l}</Text>
                </TouchableOpacity>
            ))}
        </View>

        {props.activeLayer === 'background' && (
            <View>
                <Text style={styles.sectionTitle}>Mode</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    {MODES.map(m => (
                        <TouchableOpacity key={m.key} onPress={() => props.setMode(m.key)} style={{ alignItems:'center', marginRight: 15 }}>
                            <View style={[styles.modeIcon, props.mode === m.key && styles.modeIconActive]}><Icon name={m.icon} /></View>
                            <Text style={{fontSize:10, marginTop:4}}>{m.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {props.mode === 'color' && (
                    <View style={{flexDirection:'row', flexWrap:'wrap', gap: 10}}>
                        {PALETTE.map(c => (
                            <TouchableOpacity key={c} onPress={() => props.setSelectedColor(c)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: 1, borderColor:'#ddd' }} />
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
                        <TouchableOpacity onPress={() => Alert.alert("Pick Image")} style={styles.actionBtn}>
                            <Text>Pick BG Image</Text>
                        </TouchableOpacity>
                        <Text style={styles.label}>Opacity</Text>
                        <CustomSlider value={props.bgOpacity} onValueChange={props.setBgOpacity} />
                        
                        <Text style={styles.label}>Tools</Text>
                         <View style={{ flexDirection:'row', gap: 10, marginTop: 5 }}>
                            <TouchableOpacity onPress={() => props.setBgTool('move')} style={[styles.toolBtn, props.bgTool === 'move' && styles.toolBtnActive]}><Text>Move</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => props.setBgTool('scale')} style={[styles.toolBtn, props.bgTool === 'scale' && styles.toolBtnActive]}><Text>Scale</Text></TouchableOpacity>
                        </View>
                        {props.bgTool === 'scale' && (
                            <CustomSlider min={20} max={300} value={props.bgTransform.scale * 100} onValueChange={(v) => props.setBgTransform({...props.bgTransform, scale: v/100})} />
                        )}
                    </View>
                )}
            </View>
        )}

        {props.activeLayer === 'subject' && (
            <View>
                <View style={{ flexDirection:'row', backgroundColor:'#f3f4f6', padding: 4, borderRadius: 10, marginBottom: 15 }}>
                    {['move', 'scale', 'erase'].map(t => (
                        <TouchableOpacity 
                            key={t} 
                            onPress={() => props.setSubjectTool(t)}
                            style={[styles.toolTab, props.subjectTool === t && styles.toolTabActive]}
                        >
                            <Text style={{ fontWeight: '700', color: props.subjectTool === t ? 'black':'#999'}}>{t.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {props.subjectTool === 'scale' && (
                    <View>
                        <Text style={styles.label}>Scale Subject</Text>
                        <CustomSlider min={20} max={300} value={props.subjectTransform.scale * 100} onValueChange={(v) => props.setSubjectTransform({...props.subjectTransform, scale: v/100})} />
                    </View>
                )}

                {props.subjectTool === 'erase' && (
                    <View>
                        <Text style={styles.label}>Brush Size: {props.brushSize}</Text>
                        <CustomSlider min={5} max={80} value={props.brushSize} onValueChange={props.setBrushSize} />
                    </View>
                )}
                
                <View style={{flexDirection:'row', gap: 10, marginTop: 10}}>
                    <TouchableOpacity onPress={() => props.setSubjectTransform(prev => ({...prev, x:0, y:0}))} style={styles.actionBtn}><Text>Center</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => props.setSubjectTransform({x:0, y:0, scale:1})} style={styles.actionBtn}><Text>Reset</Text></TouchableOpacity>
                </View>
            </View>
        )}

        {props.activeLayer === 'text' && (
            <View>
                <TouchableOpacity onPress={props.onAddText} style={[styles.actionBtn, {backgroundColor: '#3b82f6'}]}>
                    <Text style={{color:'white', fontWeight:'bold'}}>+ Add Text</Text>
                </TouchableOpacity>
                
                {props.selectedTextId ? (
                    <View style={{ marginTop: 15, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 10 }}>
                        <Text style={styles.label}>Edit Selected Text</Text>
                        <View style={{ flexDirection:'row', flexWrap:'wrap', gap: 5, marginTop: 5 }}>
                            {PALETTE.map(c => (
                                <TouchableOpacity 
                                    key={c} 
                                    onPress={() => props.onUpdateText(props.selectedTextId, { color: c })} 
                                    style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c, borderWidth: 1, borderColor:'#ddd' }} 
                                />
                            ))}
                        </View>
                        <Text style={[styles.label, {marginTop:10}]}>Size</Text>
                        <CustomSlider min={10} max={80} value={props.textLayers.find(t=>t.id===props.selectedTextId)?.fontSize || 24} onValueChange={(v) => props.onUpdateText(props.selectedTextId, {fontSize: v})} />
                        
                        <TouchableOpacity onPress={() => props.onDeleteText(props.selectedTextId)} style={{marginTop: 10, padding: 10, backgroundColor: '#fee2e2', borderRadius: 8, alignItems:'center'}}>
                            <Text style={{color:'red', fontWeight:'bold'}}>Delete Text</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={{ marginTop: 20, color: '#999', textAlign:'center'}}>Select text on screen to edit</Text>
                )}
            </View>
        )}

        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
};

// --- Text Overlay ---

const TextOverlay = ({ layers, selectedId, onSelect, onUpdate, activeLayer }) => {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {layers.map(layer => (
                <TouchableOpacity
                    key={layer.id}
                    activeOpacity={0.9}
                    onPress={() => { onSelect(layer.id); }}
                    style={{
                        position: 'absolute',
                        left: layer.x, 
                        top: layer.y,
                        transform: [{ translateX: -50 }, { translateY: -15 }],
                        borderWidth: selectedId === layer.id ? 1 : 0,
                        borderColor: '#3b82f6',
                        padding: 4,
                        borderRadius: 4
                    }}
                >
                    <TextInput 
                        value={layer.text}
                        onChangeText={(txt) => onUpdate(layer.id, { text: txt })}
                        editable={selectedId === layer.id}
                        style={{
                            fontSize: layer.fontSize,
                            color: layer.color,
                            fontWeight: 'bold',
                        }}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerTitle: { fontWeight: '800', fontSize: 16 },
  headerBtnPrimary: { backgroundColor: 'black', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  headerBtnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  previewContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  
  floatingTools: { position: 'absolute', top: 30, right: 30, flexDirection: 'row', gap: 10, zIndex: 10 },
  circleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor:'#000', shadowOpacity:0.1, elevation: 5 },
  
  layerBadge: { position: 'absolute', top: 30, left: 30, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, zIndex: 10 },
  layerBadgeText: { fontSize: 10, fontWeight: '800', color: '#333' },

  sheet: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, elevation: 10 },
  grabber: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  
  tabRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05 },
  tabText: { fontSize: 10, fontWeight: '700', color: '#999', textTransform: 'uppercase' },
  tabTextActive: { color: '#000' },
  
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10 },
  modeIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  modeIconActive: { backgroundColor: '#dbeafe', borderWidth: 2, borderColor: '#3b82f6' },
  
  label: { fontSize: 10, fontWeight: '700', color: '#6b7280', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  
  toolTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  toolTabActive: { backgroundColor: 'white', shadowColor:'#000', shadowOpacity:0.05 },
  
  actionBtn: { padding: 10, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center', flex: 1 },
  toolBtn: { padding: 8, backgroundColor: '#eee', borderRadius: 6 },
  toolBtnActive: { backgroundColor: '#3b82f6' },
});