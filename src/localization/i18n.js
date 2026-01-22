import * as Localization from 'react-native-localize';
import { I18n } from 'i18n-js';

import en from './en.json';
import ru from './ru.json'; // add if you have it

const i18n = new I18n({
  en,
  ru,
});

// Pick best available locale
const locales = Localization.getLocales();
if (Array.isArray(locales) && locales.length > 0) {
  // languageTag gives 'ru-RU', 'en-US' etc (best for matching)
  i18n.locale = locales[0].languageTag;
} else {
  i18n.locale = 'en';
}

i18n.enableFallback = true; // v4+
i18n.defaultLocale = 'en';

export default i18n;