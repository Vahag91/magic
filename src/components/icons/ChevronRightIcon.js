import * as React from 'react';
import Svg, { G, Path } from 'react-native-svg';

export default function ChevronRightIcon({ size = 24, color = '#5985E1' }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 960 960"
      preserveAspectRatio="xMidYMid meet"
    >
      <G transform="translate(0 960)">
        <Path
          fill={color}
          d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"
        />
      </G>
    </Svg>
  );
}

