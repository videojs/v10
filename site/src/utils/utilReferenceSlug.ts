import { kebabCase } from 'es-toolkit/string';

const UTIL_SLUG_OVERRIDES: Record<string, string> = {
  registerI18n: 'register-i18n',
  getI18nTranslations: 'get-i18n-translations',
  hasRegisteredI18n: 'has-registered-i18n',
  onI18nRegistryChange: 'on-i18n-registry-change',
  createI18n: 'create-i18n',
  createTranslator: 'create-translator',
  I18nProvider: 'i18n-provider',
};

export function utilReferenceSlug(name: string): string {
  return UTIL_SLUG_OVERRIDES[name] ?? kebabCase(name);
}
