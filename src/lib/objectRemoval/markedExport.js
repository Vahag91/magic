import {
  BlendMode,
  ImageFormat,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
} from '@shopify/react-native-skia';

const RED = '#FF0000';

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

function makeStrokePaint({ blendMode, color }) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeCap(StrokeCap.Round);
  p.setStrokeJoin(StrokeJoin.Round);
  if (typeof blendMode === 'number') p.setBlendMode(blendMode);
  if (color) p.setColor(Skia.Color(color));
  return p;
}

function makeFillPaint({ blendMode, color }) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Fill);
  if (typeof blendMode === 'number') p.setBlendMode(blendMode);
  if (color) p.setColor(Skia.Color(color));
  return p;
}

/**
 * Creates a single "marked" image by drawing the resized seed image and
 * compositing SOLID RED strokes on top (erase strokes remove red).
 */
export async function exportMarkedImageToDataUri({
  seedResizedUri, // file://... image already resized to {width,height}
  strokes,
  width,
  height,
  sourceWidth,
  sourceHeight,
}) {
  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  if (!w || !h) throw new Error('Invalid export size.');

  const sw = Math.round(Number(sourceWidth) || 0);
  const sh = Math.round(Number(sourceHeight) || 0);
  if (!sw || !sh) throw new Error('Invalid source size.');

  let data;
  try {
    data = await Skia.Data.fromURI(seedResizedUri);
  } catch (e) {
    throw new Error(`Could not read resized image: ${e?.message || String(e)}`);
  }

  let seedImage;
  try {
    seedImage = Skia.Image.MakeImageFromEncoded(data);
  } catch (e) {
    throw new Error(`Could not decode resized image: ${e?.message || String(e)}`);
  }
  if (!seedImage) throw new Error('Could not decode resized image.');

  const baseSurface = Skia.Surface.Make(w, h);
  if (!baseSurface) throw new Error('Could not create export surface.');

  const overlaySurface = Skia.Surface.Make(w, h);
  if (!overlaySurface) throw new Error('Could not create overlay surface.');

  const baseCanvas = baseSurface.getCanvas();
  const overlayCanvas = overlaySurface.getCanvas();

  baseCanvas.clear(Skia.Color('#00000000'));
  overlayCanvas.clear(Skia.Color('#00000000'));

  const seedW = seedImage.width();
  const seedH = seedImage.height();
  if (seedW && seedH && (seedW !== w || seedH !== h)) {
    // Defensive: some resize pipelines can return an unexpected pixel size.
    baseCanvas.save();
    baseCanvas.scale(w / seedW, h / seedH);
    baseCanvas.drawImage(seedImage, 0, 0);
    baseCanvas.restore();
  } else {
    baseCanvas.drawImage(seedImage, 0, 0);
  }
  seedImage.dispose?.();

  const sx = w / sw;
  const sy = h / sh;
  const sizeScale = (sx + sy) / 2;

  const drawStrokePaint = makeStrokePaint({ blendMode: BlendMode.SrcOver, color: RED });
  const drawFillPaint = makeFillPaint({ blendMode: BlendMode.SrcOver, color: RED });
  const eraseStrokePaint = makeStrokePaint({ blendMode: BlendMode.Clear });
  const eraseFillPaint = makeFillPaint({ blendMode: BlendMode.Clear });

  const list = Array.isArray(strokes) ? strokes : [];
  for (let i = 0; i < list.length; i += 1) {
    const stroke = list[i];
    const points = Array.isArray(stroke?.points) ? stroke.points : [];
    if (!points.length) continue;

    const size = Math.max(1, (Number(stroke?.size) || 1) * sizeScale);
    const isErase = stroke?.mode === 'erase';
    const strokePaint = isErase ? eraseStrokePaint : drawStrokePaint;
    const fillPaint = isErase ? eraseFillPaint : drawFillPaint;

    strokePaint.setStrokeWidth(size);

    if (points.length === 1) {
      const p0 = scalePoint(points[0], sx, sy);
      overlayCanvas.drawCircle(p0.x, p0.y, size / 2, fillPaint);
      continue;
    }

    const scaledPoints = points.map((p) => scalePoint(p, sx, sy));
    const path = makePathFromPoints(scaledPoints);
    if (path) overlayCanvas.drawPath(path, strokePaint);
  }

  overlaySurface.flush();
  const overlayImg = overlaySurface.makeImageSnapshot();
  if (!overlayImg) throw new Error('Overlay snapshot failed.');

  baseCanvas.drawImage(overlayImg, 0, 0);
  baseSurface.flush();

  const out = baseSurface.makeImageSnapshot();
  if (!out) throw new Error('Export snapshot failed.');

  const base64 = out.encodeToBase64(ImageFormat.PNG, 100);
  out.dispose?.();
  overlayImg.dispose?.();

  if (!base64) throw new Error('Export encoding failed.');
  return `data:image/png;base64,${base64}`;
}
