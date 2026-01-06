import * as React from 'react';
import Svg, { G, Path } from 'react-native-svg';

export default function ProcessingMagicIcon({ size = 24, color = '#F3F3F3' }) {
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
          d="m176-120-56-56 301-302-181-45 198-123-17-234 179 151 216-88-87 217 151 178-234-16-124 198-45-181-301 301Zm24-520-80-80 80-80 80 80-80 80Zm355 197 48-79 93 7-60-71 35-86-86 35-71-59 7 92-79 49 90 22 23 90Zm165 323-80-80 80-80 80 80-80 80ZM569-570Z"
        />
      </G>
    </Svg>
  );
}

