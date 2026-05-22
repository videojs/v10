import ar from './locales/ar';
import az from './locales/az';
import bg from './locales/bg';
import bn from './locales/bn';
import bs from './locales/bs';
import ca from './locales/ca';
import cs from './locales/cs';
import cy from './locales/cy';
import da from './locales/da';
import de from './locales/de';
import el from './locales/el';
import en from './locales/en';
import es from './locales/es';
import et from './locales/et';
import eu from './locales/eu';
import fa from './locales/fa';
import fi from './locales/fi';
import fr from './locales/fr';
import gd from './locales/gd';
import gl from './locales/gl';
import he from './locales/he';
import hi from './locales/hi';
import hr from './locales/hr';
import hu from './locales/hu';
import it from './locales/it';
import ja from './locales/ja';
import ko from './locales/ko';
import lv from './locales/lv';
import mr from './locales/mr';
import nb from './locales/nb';
import nl from './locales/nl';
import nn from './locales/nn';
import np from './locales/np';
import oc from './locales/oc';
import pl from './locales/pl';
import pt from './locales/pt';
import pt_BR from './locales/pt-BR';
import pt_PT from './locales/pt-PT';
import ro from './locales/ro';
import ru from './locales/ru';
import sk from './locales/sk';
import sl from './locales/sl';
import sr from './locales/sr';
import sv from './locales/sv';
import te from './locales/te';
import th from './locales/th';
import tr from './locales/tr';
import uk from './locales/uk';
import vi from './locales/vi';
import zh from './locales/zh';
import zh_CN from './locales/zh-CN';
import zh_TW from './locales/zh-TW';
import type { Translations } from './types';

/** Every built-in locale pack keyed by BCP 47 tag (includes `en` and v8 alias tags `pt` / `zh`). */
export const all = {
  en,
  ar,
  az,
  bs,
  bg,
  bn,
  ca,
  cs,
  cy,
  da,
  de,
  el,
  es,
  et,
  eu,
  fa,
  fi,
  fr,
  gd,
  gl,
  he,
  hi,
  hr,
  hu,
  it,
  ja,
  ko,
  lv,
  mr,
  nb,
  nl,
  nn,
  np,
  oc,
  pl,
  'pt-BR': pt_BR,
  'pt-PT': pt_PT,
  ro,
  ru,
  sk,
  sl,
  sr,
  sv,
  te,
  th,
  tr,
  uk,
  vi,
  'zh-CN': zh_CN,
  'zh-TW': zh_TW,
  pt,
  zh,
} as const satisfies Record<string, Partial<Translations>>;

export type LocaleTag = keyof typeof all;

/** BCP 47 tags for every pack in {@link all}. */
export const localeTags = Object.keys(all) as LocaleTag[];
