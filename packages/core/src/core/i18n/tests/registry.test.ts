import { beforeEach, describe, expect, it, vi } from 'vitest';

import en from '../locales/en';
import {
  findLocaleKeys,
  getI18nTranslations,
  hasRegisteredLocale,
  onI18nRegistryChange,
  registerI18n,
  resetI18nRegistry,
} from '../registry';

describe('i18n registry', () => {
  beforeEach(() => {
    resetI18nRegistry();
  });

  it('merges multiple registerI18n calls for one locale', () => {
    registerI18n('es', { Play: 'Ir' });
    registerI18n('es', { Pause: 'Pausa' });
    const es = getI18nTranslations('es');
    expect(es.Play).toBe('Ir');
    expect(es.Pause).toBe('Pausa');
  });

  it('inherits from English for keys missing in the locale', () => {
    registerI18n('es', { Play: 'Ir' });
    const es = getI18nTranslations('es');
    expect(es.Mute).toBe(en.Mute);
  });

  it('resolves es-419-u-nu-latn to the es layer before English', () => {
    registerI18n('es', { Play: 'ES-generic' });
    const merged = getI18nTranslations('es-419-u-nu-latn');
    expect(merged.Play).toBe('ES-generic');
  });

  it('registers unicode-extension locales under the same key as findLocaleKeys', () => {
    registerI18n('es-u-nu-latn', { Play: 'Latin-numerals ES' });
    expect(hasRegisteredLocale('es-u-nu-latn')).toBe(true);
    expect(getI18nTranslations('es-u-nu-latn').Play).toBe('Latin-numerals ES');
  });

  it('does not strip -u- subtags inside a private-use extension', () => {
    registerI18n('en-x-u-k0', { Play: 'Private U' });
    registerI18n('en-x-u-k1', { Play: 'Private U2' });
    expect(getI18nTranslations('en-x-u-k0').Play).toBe('Private U');
    expect(getI18nTranslations('en-x-u-k1').Play).toBe('Private U2');
  });

  it('walks zh-Hant-HK through zh-TW before zh', () => {
    expect(findLocaleKeys('zh-Hant-HK')).toEqual(['zh-hant-hk', 'zh-hant', 'zh-tw', 'zh', 'en']);
    registerI18n('zh', { Play: 'ZH' });
    registerI18n('zh-TW', { Play: 'TW' });
    registerI18n('zh-Hant', { Pause: 'Hant' });
    registerI18n('zh-Hant-HK', { Replay: 'HK' });
    const merged = getI18nTranslations('zh-Hant-HK');
    expect(merged.Replay).toBe('HK');
    expect(merged.Pause).toBe('Hant');
    expect(merged.Play).toBe('TW');
    expect(merged.Mute).toBe(en.Mute);
  });

  it('walks zh-Hans-HK through zh-CN before zh', () => {
    expect(findLocaleKeys('zh-Hans-HK')).toEqual(['zh-hans-hk', 'zh-hans', 'zh-cn', 'zh', 'en']);
  });

  it('truncates en-GB-scotland toward en-GB then en', () => {
    expect(findLocaleKeys('en-GB-scotland')).toEqual(['en-gb-scotland', 'en-gb', 'en']);
    registerI18n('en-GB', { Play: 'GB' });
    const merged = getI18nTranslations('en-GB-scotland');
    expect(merged.Play).toBe('GB');
  });

  it('does not use a sibling locale tag when only the parent matches (es-AR vs es-MX)', () => {
    registerI18n('es-MX', { Play: 'MX' });
    registerI18n('es', { Play: 'ES' });
    const merged = getI18nTranslations('es-AR');
    expect(merged.Play).toBe('ES');
  });

  it('reports hasRegisteredLocale with normalized tags', () => {
    expect(hasRegisteredLocale('en')).toBe(true);
    expect(hasRegisteredLocale('fr')).toBe(false);
    registerI18n('fr', { Play: 'Lire' });
    expect(hasRegisteredLocale('FR')).toBe(true);
  });

  it('onI18nRegistryChange unsubscribe stops notifications', () => {
    const spy = vi.fn();
    const off = onI18nRegistryChange(spy);
    registerI18n('de', { Play: 'Los' });
    expect(spy).toHaveBeenCalledOnce();
    off();
    registerI18n('de', { Pause: 'Pause' });
    expect(spy).toHaveBeenCalledOnce();
  });
});
