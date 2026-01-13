export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// Image displayed with `contain` inside a container.
export function getImageRect(containerW, containerH, imageW, imageH) {
  const cw = Number(containerW) || 0;
  const ch = Number(containerH) || 0;
  const iw = Number(imageW) || 0;
  const ih = Number(imageH) || 0;

  if (!cw || !ch || !iw || !ih) {
    return { x: 0, y: 0, width: 0, height: 0, scale: 1 };
  }

  const scale = Math.min(cw / iw, ch / ih);
  const width = iw * scale;
  const height = ih * scale;
  const x = (cw - width) / 2;
  const y = (ch - height) / 2;

  return { x, y, width, height, scale };
}

// Converts a screen point (relative to the same container used by getImageRect)
// into image pixel coordinates. Returns null if the point is outside the image rect.
export function screenPointToImagePoint(x, y, rect) {
  if (!rect || !rect.scale) return null;

  const imageW = rect.width / rect.scale;
  const imageH = rect.height / rect.scale;

  const ix = (x - rect.x) / rect.scale;
  const iy = (y - rect.y) / rect.scale;

  const inside = ix >= 0 && iy >= 0 && ix <= imageW && iy <= imageH;
  if (!inside) return null;

  return {
    x: clamp(ix, 0, imageW),
    y: clamp(iy, 0, imageH),
  };
}

