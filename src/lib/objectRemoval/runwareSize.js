const MIN = 128;
const MAX = 2048;
const STEP = 64;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function roundToStep(n) {
  return Math.round(n / STEP) * STEP;
}

function snap(n) {
  const clamped = clamp(Math.round(Number(n) || 0), MIN, MAX);
  return clamp(roundToStep(clamped), MIN, MAX);
}

// Runware constraint:
// - width/height must be integers
// - between 128 and 2048
// - multiples of 64
// We keep aspect ratio and snap to the closest valid size.
export function getRunwareSafeSize({ width, height }) {
  const w0 = Math.round(Number(width) || 0);
  const h0 = Math.round(Number(height) || 0);
  if (!w0 || !h0) throw new Error('Invalid source size.');

  const aspect = w0 / h0;

  // First scale down to fit MAX (no upscaling unless below MIN after snapping).
  const scaleDown = Math.min(1, MAX / Math.max(w0, h0));
  const w1 = w0 * scaleDown;
  const h1 = h0 * scaleDown;

  let w;
  let h;
  if (w1 >= h1) {
    w = snap(w1);
    h = snap(w / aspect);
  } else {
    h = snap(h1);
    w = snap(h * aspect);
  }

  // Final safety if rounding pushes over MAX.
  if (w > MAX) {
    w = MAX;
    h = snap(w / aspect);
  }
  if (h > MAX) {
    h = MAX;
    w = snap(h * aspect);
  }

  return {
    width: w,
    height: h,
    scaleX: w / w0,
    scaleY: h / h0,
  };
}

