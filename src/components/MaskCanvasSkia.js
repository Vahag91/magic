import * as React from 'react';
import { View, StyleSheet, PanResponder, ActivityIndicator } from 'react-native';
import { Canvas, Circle, Group, Image, Path, Rect, Skia, useImage } from '@shopify/react-native-skia';
import { getImageRect, screenPointToImagePoint } from '../lib/objectRemoval/coords';

function dist(a, b) {
  if (!a || !b) return Infinity;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function makePath(points) {
  const pts = Array.isArray(points) ? points : [];
  if (pts.length < 2) return null;
  const p = Skia.Path.Make();
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    p.lineTo(pts[i].x, pts[i].y);
  }
  return p;
}

export default function MaskCanvasSkia({
  imageUri,
  imageWidth,
  imageHeight,
  brushSize,
  mode,
  strokes,
  setStrokes,
  disabled = false,
}) {
  const skImage = useImage(imageUri);
  const [layout, setLayout] = React.useState({ w: 0, h: 0 });
  const [currentStroke, setCurrentStroke] = React.useState(null);

  const disabledRef = React.useRef(disabled);
  React.useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const rect = React.useMemo(
    () => getImageRect(layout.w, layout.h, imageWidth, imageHeight),
    [layout.h, layout.w, imageHeight, imageWidth],
  );

  const addPointToStroke = React.useCallback((stroke, point) => {
    if (!stroke || !point) return stroke;
    const pts = stroke.points || [];
    const last = pts[pts.length - 1];
    const minDist = Math.max(0.8, (Number(stroke.size) || 10) / 10);
    if (last && dist(last, point) < minDist) return stroke;
    return { ...stroke, points: [...pts, point] };
  }, []);

  const beginStroke = React.useCallback(
    (x, y) => {
      if (disabledRef.current) return;
      if (!imageWidth || !imageHeight) return;
      if (!rect.width || !rect.height || !rect.scale) return;

      const pt = screenPointToImagePoint(x, y, rect);
      if (!pt) return;

      const sizeInImagePx = Math.max(1, (Number(brushSize) || 14) / rect.scale);

      const stroke = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        points: [pt],
        size: sizeInImagePx,
        mode: mode === 'erase' ? 'erase' : 'draw',
      };
      setCurrentStroke(stroke);
    },
    [brushSize, imageHeight, imageWidth, mode, rect],
  );

  const moveStroke = React.useCallback(
    (x, y) => {
      if (disabledRef.current) return;
      if (!currentStroke) return;
      const pt = screenPointToImagePoint(x, y, rect);
      if (!pt) return;
      setCurrentStroke((prev) => addPointToStroke(prev, pt));
    },
    [addPointToStroke, currentStroke, rect],
  );

  const endStroke = React.useCallback(() => {
    if (!currentStroke) return;
    const stroke = currentStroke;
    setCurrentStroke(null);
    if (!stroke?.points?.length) return;
    if (typeof setStrokes === 'function') {
      setStrokes((prev) => [...(Array.isArray(prev) ? prev : []), stroke]);
    }
  }, [currentStroke, setStrokes]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          beginStroke(locationX, locationY);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          moveStroke(locationX, locationY);
        },
        onPanResponderRelease: endStroke,
        onPanResponderTerminate: endStroke,
      }),
    [beginStroke, endStroke, moveStroke],
  );

  const renderStroke = React.useCallback((stroke) => {
    if (!stroke?.points?.length) return null;
    const isErase = stroke.mode === 'erase';
    const overlayColor = 'rgba(255,0,0,0.80)';
    const size = Math.max(1, Number(stroke.size) || 1);
    const blendMode = isErase ? 'clear' : 'srcOver';

    if (stroke.points.length === 1) {
      return (
        <Circle
          key={stroke.id}
          cx={stroke.points[0].x}
          cy={stroke.points[0].y}
          r={size / 2}
          color={overlayColor}
          blendMode={blendMode}
        />
      );
    }

    const path = makePath(stroke.points);
    if (!path) return null;
    return (
      <Path
        key={stroke.id}
        path={path}
        color={overlayColor}
        style="stroke"
        strokeWidth={size}
        strokeCap="round"
        strokeJoin="round"
        blendMode={blendMode}
      />
    );
  }, []);

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ w: width, h: height });
      }}
      {...panResponder.panHandlers}
    >
      {!skImage ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <Canvas style={styles.canvas}>
          <Rect x={0} y={0} width={layout.w} height={layout.h} color="#000000" />

          <Group transform={[{ translateX: rect.x }, { translateY: rect.y }, { scale: rect.scale }]}>
            <Image image={skImage} x={0} y={0} width={imageWidth} height={imageHeight} fit="fill" />

            <Group layer>
              {(Array.isArray(strokes) ? strokes : []).map(renderStroke)}
              {currentStroke ? renderStroke(currentStroke) : null}
            </Group>
          </Group>

          {rect.width && rect.height ? (
            <Rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              style="stroke"
              strokeWidth={1}
              color="rgba(255,255,255,0.25)"
            />
          ) : null}
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  canvas: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
