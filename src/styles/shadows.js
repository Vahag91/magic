import { Platform } from 'react-native';

export function shadow({
  color = '#000',
  opacity = 0.12,
  radius = 10,
  offsetX = 0,
  offsetY = 6,
  elevation = 2,
} = {}) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: offsetX, height: offsetY },
    },
    android: { elevation },
    default: {},
  });
}

