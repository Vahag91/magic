import { Text } from 'react-native';
const PALETTE = [
  '#FFFFFF',
  '#000000',
  '#3b82f6',
  '#fca5a5',
  '#fde68a',
  '#d9f99d',
  '#bbf7d0',
  '#99f6e4',
  '#e9d5ff',
  '#fbcfe8',
  '#e5e7eb',
];
const MODES = [
  { key: 'original', label: 'None', icon: '🚫' },
  { key: 'transparent', label: 'Clear', icon: '🏁' },
  { key: 'blur', label: 'Blur', icon: '💧' },
  { key: 'color', label: 'Color', icon: '🎨' },
  { key: 'gradient', label: 'Grad', icon: '🌈' },
  { key: 'image', label: 'Image', icon: '🖼️' },
];

const getColorMatrix = filters => {
  const b = filters.brightness / 100;
  const c = filters.contrast / 100;
  const s = filters.saturation / 100;
  const lumR = 0.3086;
  const lumG = 0.6094;
  const lumB = 0.082;

  const sr = (1 - s) * lumR;
  const sg = (1 - s) * lumG;
  const sb = (1 - s) * lumB;

  const satMatrix = [
    sr + s,
    sr,
    sr,
    0,
    0,
    sg,
    sg + s,
    sg,
    0,
    0,
    sb,
    sb,
    sb + s,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ];

  const t = 0.5 * (1 - c) * b;
  const m = c * b;

  return [
    satMatrix[0] * m,
    satMatrix[1] * m,
    satMatrix[2] * m,
    0,
    t,
    satMatrix[5] * m,
    satMatrix[6] * m,
    satMatrix[7] * m,
    0,
    t,
    satMatrix[10] * m,
    satMatrix[11] * m,
    satMatrix[12] * m,
    0,
    t,
    0,
    0,
    0,
    1,
    0,
  ];
};

const PLACEHOLDER_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBUbsmgeD4KThd1Wy62p2ajoFx3W96ViRwoL5_LhbACgKIvxSsJfRHAdfudvgL0YWpORkWt8DrIdIFDUqfcT-vTuwbuJ5bk4OZtzHAwDSx4AcLRcYvfFBpbo9S0K6n05TUNFk0FsOwDbF9rqWfWj2AyuoIyITxExdgT1kxj4n7Rzbvauym0s5-JKavmJ_ZKhYsDN3_cb38Bs0j_K0ybPm6vWCobX9HCn2YoxPZaYWvJ_UHnfNe7CK3BfClWbkmmNoinBOtt8_FsXL4d';
const Icon = ({ name, color = '#6B7280', size = 24 }) => (
  <Text style={{ fontSize: size, color }}>{name}</Text>
);

export { PALETTE, MODES, getColorMatrix, PLACEHOLDER_IMAGE, Icon };
