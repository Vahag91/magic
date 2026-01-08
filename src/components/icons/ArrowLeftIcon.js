import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ArrowLeftIcon({ size = 24, color = '#FFFFFF' }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      preserveAspectRatio="xMidYMid meet"
    >
      <Path
        fill={color}
        d="M600-160v-360H272l64 64-56 56-160-160 160-160 56 56-64 64h328q33 0 56.5 23.5T680-520v360h-80Z"
      />
    </Svg>
  );
}