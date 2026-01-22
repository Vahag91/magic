import * as Localization from 'react-native-localize';
import { I18n } from 'i18n-js';

import en from './en.json';
import ru from './ru.json'; // add if you have it
import ar from './ar.json';
import ca from './ca.json';
import cs from './cs.json'; // Czech
import da from './da.json';
import de from './de.json'; // German
import el from './el.json'; // Greek
import esMX from './es-MX.json'; // Spanish
import es from './es.json'; // Spanish
import fi from './fi.json'; // Finnish
import fr from './fr.json';
import frCA from './fr-CA.json'; // French Canadian
import he from './he.json'; // Hebrew
import hi from './hi.json'; // Hindi
import hr from './hr.json'; // Croatian
import hu from './hu.json'; // Hungarian
import id from './id.json'; // Indonesian
import it from './it.json'; // Italian
import ja from './ja.json'; // Japanese
import ko from './ko.json';
import ms from './ms.json'; // Malay
import nb from './nb.json'; // Norwegian Bokmål
import nl from './nl.json'; // Dutch
import pl from './pl.json'; // Polish
import ptBR from './pt-BR.json'; // Portuguese Brazil
import pt from './pt.json';
import ro from './ro.json'; // Romanian
import sv from './sv.json'; // Swedish  
import th from './th.json'; // Thai
import tr from './tr.json'; // Turkish
import vi from './vi.json'; // Vietnamese
import zhCN from './zh-Hans.json'; // Chinese Simplified
import zhTW from './zh-Hant.json'; // Chinese Traditional
import sk from './sk.json'; // Slovak
const i18n = new I18n({
  en,
  ru,
  ar,
  ca,
  cs,
  da,
  de,
  el,
  'es-MX': esMX,
  es,
  fi,
  fr,
  'fr-CA': frCA,
  he,
  hi,
  hr,
  hu,
  id,
  it,
  ja,
  ko,
  ms,
  nb,
  nl,
  pl,
  'pt-BR': ptBR,
  pt,
  ro,
  sv,
  th,
  tr,
  vi,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  sk
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
