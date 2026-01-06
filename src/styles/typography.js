import { Platform } from 'react-native';

// With custom fonts, the runtime font family name can differ between iOS and Android.
// For Inter variable font, the family is commonly "Inter". If it doesn't apply on your device,
// adjust these names to match the installed font family names.
export const fonts = {
  regular: Platform.select({ ios: 'Inter', android: 'Inter', default: 'Inter' }),
  italic: Platform.select({
    ios: 'Inter-Italic',
    android: 'Inter-Italic',
    default: 'Inter-Italic',
  }),
};

export const typography = {
  title: { fontFamily: fonts.regular },
  body: { fontFamily: fonts.regular },
  italic: { fontFamily: fonts.italic, fontStyle: 'italic' },
};

