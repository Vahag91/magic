module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // keep your other plugins here (if any)

    // ✅ MUST BE LAST (Reanimated 4 needs Worklets plugin)
    'react-native-worklets/plugin',
  ],
};