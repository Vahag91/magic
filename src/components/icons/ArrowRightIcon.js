import * as React from 'react';
import Svg, { G, Path } from 'react-native-svg';

export default function ArrowRightIcon({ size = 24, color = '#FFFFFF' }) {
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
          d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z"
        />
      </G>
    </Svg>
  );
}

