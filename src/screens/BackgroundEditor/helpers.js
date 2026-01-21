import RNFS from 'react-native-fs';
import { ImageFormat, Skia } from '@shopify/react-native-skia';

export const clampNum = (n) => (Number.isFinite(n) ? n : 0);

export const getColorMatrix = (filters) => {
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

export async function saveSkiaSnapshotToCache({ skImage, width, height, targetWidth, targetHeight }) {
  const fileName = `skia-export-${Date.now()}.png`;
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;

  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  const outW = Math.round(Number(targetWidth) || 0);
  const outH = Math.round(Number(targetHeight) || 0);

  let exportImage = skImage;
  let exportWidth = w;
  let exportHeight = h;
  let shouldDispose = false;

  if (w && h && outW && outH && (outW !== w || outH !== h)) {
    const surface = Skia.Surface.Make(outW, outH);
    if (!surface) throw new Error('Export surface creation failed.');
    let snapshot = null;
    try {
      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color('#00000000'));

      const scale = Math.min(outW / w, outH / h);
      const drawW = w * scale;
      const drawH = h * scale;
      const dx = (outW - drawW) / 2;
      const dy = (outH - drawH) / 2;
      canvas.save();
      canvas.translate(dx, dy);
      canvas.scale(scale, scale);
      canvas.drawImage(skImage, 0, 0);
      canvas.restore();
      surface.flush();
      snapshot = surface.makeImageSnapshot();
    } finally {
      surface.dispose?.();
    }
    if (snapshot) {
      exportImage = snapshot;
      exportWidth = outW;
      exportHeight = outH;
      shouldDispose = true;
    }
  }

  const base64 = exportImage.encodeToBase64(ImageFormat.PNG, 100);
  await RNFS.writeFile(path, base64, 'base64');
  if (shouldDispose) exportImage.dispose?.();

  const uri = `file://${path}`;
  return { uri, width: exportWidth, height: exportHeight };
}
