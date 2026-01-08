import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from 'react';
import { View, ActivityIndicator, PanResponder, ImageBackground, Platform, StyleSheet } from 'react-native';
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
  Text as SkiaText,
  DashPathEffect,
} from '@shopify/react-native-skia';
import { styles, TEXT_BASE_FONT_SIZE } from './styles';
import { getColorMatrix } from './helpers';
import { createLogger } from '../../logger';

const log = createLogger('BackgroundEditor/SkiaPreview');

const SkiaBackgroundPreview = forwardRef(({
  width, height,
  subjectUri, bgImageUri, originalUri,
  autoAlignSubjectBottom = false,
  mode, showCheckerboard, blurStrength, dimBackground,
  selectedColor, bgOpacity, bgFilters, shadow,
  subjectTransform, onSubjectTransformChange, subjectTool, brushSettings,
  bgTransform, onBgTransformChange, bgTool,
  eraserPaths, setEraserPaths, setRedoPaths,
  // Text Props
  textLayers, activeLayer, selectedTextId, onSelectText, onUpdateText, onEditTextRequest
}, ref) => {
  const skiaSubject = useImage(subjectUri);
  const skiaBg = useImage(bgImageUri);
  const skiaOriginal = useImage(originalUri);
  const canvasRef = useCanvasRef();
  const currentPathRef = useRef(null);
  const imageLoadStartRef = useRef({
    subjectUri: null,
    subjectT0: 0,
    bgUri: null,
    bgT0: 0,
    originalUri: null,
    originalT0: 0,
  });

  const baseFont = useFont(
    require('../../../assets/fonts/Inter-Variable.ttf'),
    TEXT_BASE_FONT_SIZE
  );

  useImperativeHandle(ref, () => ({
    makeImageSnapshot: () => {
      const image = canvasRef.current?.makeImageSnapshot();
      if (!image) return null;
      log.log('snapshot_created', { w: image.width?.(), h: image.height?.() });
      return { image, width: image.width(), height: image.height() };
    }
  }));

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

  useEffect(() => {
    if (!subjectUri) return;
    if (imageLoadStartRef.current.subjectUri !== subjectUri) {
      imageLoadStartRef.current.subjectUri = subjectUri;
      imageLoadStartRef.current.subjectT0 = Date.now();
      log.log('subject_load_start', { uri: subjectUri });
    }
  }, [subjectUri]);

  useEffect(() => {
    if (!bgImageUri) return;
    if (imageLoadStartRef.current.bgUri !== bgImageUri) {
      imageLoadStartRef.current.bgUri = bgImageUri;
      imageLoadStartRef.current.bgT0 = Date.now();
      log.log('bg_load_start', { uri: bgImageUri });
    }
  }, [bgImageUri]);

  useEffect(() => {
    if (!originalUri) return;
    if (imageLoadStartRef.current.originalUri !== originalUri) {
      imageLoadStartRef.current.originalUri = originalUri;
      imageLoadStartRef.current.originalT0 = Date.now();
      log.log('original_load_start', { uri: originalUri });
    }
  }, [originalUri]);

  useEffect(() => {
    if (!skiaSubject || !subjectUri) return;
    const { subjectUri: lastUri, subjectT0 } = imageLoadStartRef.current;
    if (lastUri !== subjectUri || !subjectT0) return;
    log.log('subject_load_end', {
      uri: subjectUri,
      ms: Date.now() - subjectT0,
      w: skiaSubject.width?.(),
      h: skiaSubject.height?.(),
    });
  }, [skiaSubject, subjectUri]);

  useEffect(() => {
    if (!skiaBg || !bgImageUri) return;
    const { bgUri, bgT0 } = imageLoadStartRef.current;
    if (bgUri !== bgImageUri || !bgT0) return;
    log.log('bg_load_end', {
      uri: bgImageUri,
      ms: Date.now() - bgT0,
      w: skiaBg.width?.(),
      h: skiaBg.height?.(),
    });
  }, [bgImageUri, skiaBg]);

  useEffect(() => {
    if (!skiaOriginal || !originalUri) return;
    const { originalUri: lastUri, originalT0 } = imageLoadStartRef.current;
    if (lastUri !== originalUri || !originalT0) return;
    log.log('original_load_end', {
      uri: originalUri,
      ms: Date.now() - originalT0,
      w: skiaOriginal.width?.(),
      h: skiaOriginal.height?.(),
    });
  }, [originalUri, skiaOriginal]);

  const autoAlignedUriRef = useRef(null);
  useEffect(() => {
    if (!autoAlignSubjectBottom) {
      autoAlignedUriRef.current = null;
    }
  }, [autoAlignSubjectBottom]);

  useEffect(() => {
    if (!autoAlignSubjectBottom) return;
    if (!skiaSubject || !subjectUri) return;
    if (autoAlignedUriRef.current === subjectUri) return;

    const imgW = skiaSubject.width?.() ?? 0;
    const imgH = skiaSubject.height?.() ?? 0;
    if (!imgW || !imgH) return;

    const fitScale = Math.min(width / imgW, height / imgH);
    const scaledH = imgH * fitScale;
    const deltaY = (height - scaledH) / 2;
    if (deltaY <= 1) {
      autoAlignedUriRef.current = subjectUri;
      return;
    }

    onSubjectTransformChange(current => {
      if (!current) return current;
      if (current.x !== 0 || current.y !== 0 || current.scale !== 1) return current;
      return { ...current, y: deltaY };
    });
    autoAlignedUriRef.current = subjectUri;
  }, [autoAlignSubjectBottom, height, onSubjectTransformChange, skiaSubject, subjectUri, width]);

  const gestureStartRef = useRef({ 
    x: 0, y: 0, 
    sx: 0, sy: 0, 
    bx: 0, by: 0,
    tx: 0, ty: 0,
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

        if (s.activeLayer === 'text') {
          let hitId = null;
          for (let i = s.textLayers.length - 1; i >= 0; i--) {
            const layer = s.textLayers[i];
            const scale = (layer.fontSize || TEXT_BASE_FONT_SIZE) / TEXT_BASE_FONT_SIZE;
            const w = baseFont
              ? baseFont.getTextWidth(layer.text || '') * scale
              : (String(layer.text || '').length * (layer.fontSize || 16) * 0.55);
            const h = layer.fontSize;

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
            onSelectText(null);
          }
        }

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

        if (s.activeLayer === 'text' && start.draggingTextId) {
          onUpdateText(start.draggingTextId, {
            x: start.tx + gestureState.dx,
            y: start.ty + gestureState.dy
          });
        }
        
        else if (s.activeLayer === 'subject') {
          if (s.subjectTool === 'erase' && currentPathRef.current) {
            currentPathRef.current.lineTo(x, y);
            setEraserPaths(prev => [...prev]); 
          } else if (s.subjectTool === 'move') {
            onSubjectTransformChange({
              ...s.subjectTransform,
              x: start.sx + gestureState.dx,
              y: start.sy + gestureState.dy
            });
          }
        }
        
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
  const bgOrigin = vec(width / 2, height / 2);
  const bgColorMatrix = getColorMatrix(bgFilters);

  return (
    <View style={[styles.skiaView, { width, height }]} {...panResponder.panHandlers}>
      {mode === 'transparent' && showCheckerboard && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#F3F4F6' }}>
          {Platform.OS === 'ios' ? (
            <ImageBackground
              source={require('reanimated-color-picker/lib/src/assets/transparent-texture.png')}
              resizeMode="repeat"
              style={{ flex: 1 }}
              imageStyle={{ width: '100%', height: '100%', opacity: 0.9 }}
            />
          ) : null}
        </View>
      )}
      <Canvas ref={canvasRef} style={styles.canvas}>
        {mode === 'color' && (
          <Rect x={0} y={0} width={width} height={height} color={selectedColor} />
        )}
        {mode === 'gradient' && (
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={[selectedColor, 'transparent']} />
          </Rect>
        )}
        {mode === 'image' && skiaBg && (
          <Image
            image={skiaBg}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="contain"
            opacity={bgOpacity / 100}
            transform={[
              { translateX: bgTransform.x },
              { translateY: bgTransform.y },
              { scale: bgTransform.scale },
            ]}
            origin={bgOrigin}
          >
            <ColorMatrix matrix={bgColorMatrix} />
          </Image>
        )}
        {mode === 'blur' && (
          <>
            {skiaBg ? (
              <Image
                image={skiaBg}
                x={0}
                y={0}
                width={width}
                height={height}
                fit="contain"
                opacity={bgOpacity / 100}
                transform={[
                  { translateX: bgTransform.x },
                  { translateY: bgTransform.y },
                  { scale: bgTransform.scale },
                ]}
                origin={bgOrigin}
              >
                <ColorMatrix matrix={bgColorMatrix} />
                <Blur blur={blurStrength} />
              </Image>
            ) : (
              <Image image={skiaOriginal || skiaSubject} x={0} y={0} width={width} height={height} fit="contain">
                <Blur blur={blurStrength} />
              </Image>
            )}
            <Rect x={0} y={0} width={width} height={height} color={`rgba(0,0,0,${dimBackground / 100})`} />
          </>
        )}

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
              <ColorMatrix matrix={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]} />
              <Blur blur={shadow.blur} />
            </Image>
          </Group>
        )}

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
              blendMode="dstOut"
            />
          ))}
        </Group>

        {textLayers.map((layer) => {
          const scale = (layer.fontSize || TEXT_BASE_FONT_SIZE) / TEXT_BASE_FONT_SIZE;
          const txtWidth = baseFont
            ? baseFont.getTextWidth(layer.text || '') * scale
            : (String(layer.text || '').length * (layer.fontSize || 16) * 0.55);
          const txtHeight = layer.fontSize;
          const isSelected = selectedTextId === layer.id;

          return (
            <Group key={layer.id}>
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

export default SkiaBackgroundPreview;
