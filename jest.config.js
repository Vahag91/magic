module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-native-documents|@react-navigation|react-native-image-picker|react-native-linear-gradient|react-native-reanimated|react-native-screens|react-native-safe-area-context|react-native-vector-icons|react-native-svg|react-native-worklets)/)',
  ],
  watchman: false,
};
