import * as React from 'react';
import { View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

export default function TransparencyGrid({
  size = 20,
  light = '#F3F4F6',
  dark = '#E5E7EB',
  style,
}) {
  return (
    <View pointerEvents="none" style={style}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="transparencyGrid"
            patternUnits="userSpaceOnUse"
            width={size * 2}
            height={size * 2}
          >
            <Rect x="0" y="0" width={size} height={size} fill={light} />
            <Rect x={size} y="0" width={size} height={size} fill={dark} />
            <Rect x="0" y={size} width={size} height={size} fill={dark} />
            <Rect x={size} y={size} width={size} height={size} fill={light} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#transparencyGrid)" />
      </Svg>
    </View>
  );
}

