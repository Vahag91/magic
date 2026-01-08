import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ArrowBackIcon({ size = 24, color = '#000000' }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      preserveAspectRatio="xMidYMid meet"
    >
      <Path
        fill={color}
        d="M400-240 160-480l240-240 56 58-142 142h486v80H314l142 142-56 58Z"
      />
    </Svg>
  );
}

