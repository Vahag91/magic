import RNFS from 'react-native-fs';

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

export async function saveSkiaSnapshotToCache({ skImage, width, height }) {
  const fileName = `skia-export-${Date.now()}.png`;
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  const base64 = skImage.encodeToBase64();
  await RNFS.writeFile(path, base64, 'base64');
  return { uri: `file://${path}`, width, height };
}
