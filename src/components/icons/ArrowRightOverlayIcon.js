import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ArrowRightOverlayIcon({ size = 24, color = '#000000' }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      preserveAspectRatio="xMidYMid meet"
    >
      <Path
        fill={color}
        d="M280-160v-360q0-33 23.5-56.5T360-600h328l-64-64 56-56 160 160-160 160-56-56 64-64H360v360h-80Z"
      />
    </Svg>
  );
}

