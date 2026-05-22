export { default as translations } from './locales/en';
export {
  getI18nTranslations,
  hasRegisteredI18n,
  onI18nRegistryChange,
  registerI18n,
  resetI18nRegistryForTesting,
} from './registry';
export { createTranslator } from './translator';
export type * from './types';
