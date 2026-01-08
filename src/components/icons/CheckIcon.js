import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function CheckIcon({ size = 24, color = '#FFFFFF' }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      preserveAspectRatio="xMidYMid meet"
    >
      <Path
        fill={color}
        d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"
      />
    </Svg>
  );
}

