import { Text, TextInput } from 'react-native';
import { fonts } from './typography';

function normalizeStyle(style) {
  if (!style) return [];
  return Array.isArray(style) ? style : [style];
}

let didSetup = false;

export function setupTypography() {
  if (didSetup) return;
  didSetup = true;

  const baseTextStyle = { fontFamily: fonts.regular };

  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = [baseTextStyle, ...normalizeStyle(Text.defaultProps.style)];

  TextInput.defaultProps = TextInput.defaultProps || {};
  TextInput.defaultProps.style = [
    baseTextStyle,
    ...normalizeStyle(TextInput.defaultProps.style),
  ];
}

