import {
  ImageFormat,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
} from '@shopify/react-native-skia';

function makePathFromPoints(points) {
  const pts = Array.isArray(points) ? points : [];
  if (pts.length < 2) return null;

  const path = Skia.Path.Make();
  path.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    path.lineTo(pts[i].x, pts[i].y);
  }
  return path;
}

function scalePoint(pt, sx, sy) {
  return { x: pt.x * sx, y: pt.y * sy };
}

export function exportMaskToDataUri({
  strokes,
  width,
  height,
  sourceWidth,
  sourceHeight,
}) {
  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  if (!w || !h) throw new Error('Invalid mask size.');

  const sw = Math.round(Number(sourceWidth) || 0);
  const sh = Math.round(Number(sourceHeight) || 0);
  const sx = sw ? w / sw : 1;
  const sy = sh ? h / sh : 1;
  const sizeScale = (sx + sy) / 2;

  const surface = Skia.Surface.Make(w, h);
  if (!surface) throw new Error('Could not create mask surface.');

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('#000000'));

  const strokePaint = Skia.Paint();
  strokePaint.setAntiAlias(true);
  strokePaint.setStyle(PaintStyle.Stroke);
  strokePaint.setStrokeCap(StrokeCap.Round);
  strokePaint.setStrokeJoin(StrokeJoin.Round);

  const fillPaint = Skia.Paint();
  fillPaint.setAntiAlias(true);
  fillPaint.setStyle(PaintStyle.Fill);

  const list = Array.isArray(strokes) ? strokes : [];
  for (let i = 0; i < list.length; i += 1) {
    const stroke = list[i];
    const points = Array.isArray(stroke?.points) ? stroke.points : [];
    if (!points.length) continue;

    const size = Math.max(1, (Number(stroke?.size) || 1) * sizeScale);
    const color = stroke?.mode === 'erase' ? '#000000' : '#ffffff';

    strokePaint.setColor(Skia.Color(color));
    strokePaint.setStrokeWidth(size);
    fillPaint.setColor(Skia.Color(color));

    if (points.length === 1) {
      const p0 = scalePoint(points[0], sx, sy);
      canvas.drawCircle(p0.x, p0.y, size / 2, fillPaint);
      continue;
    }

    const scaledPoints = points.map((p) => scalePoint(p, sx, sy));
    const path = makePathFromPoints(scaledPoints);
    if (path) canvas.drawPath(path, strokePaint);
  }

  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  if (!snapshot) throw new Error('Mask snapshot failed.');

  const base64 = snapshot.encodeToBase64(ImageFormat.PNG, 100);
  snapshot.dispose?.();

  if (!base64) throw new Error('Mask encoding failed.');
  return `data:image/png;base64,${base64}`;
}
