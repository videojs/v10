import { beforeEach, describe, expect, it, vi } from 'vitest';

import en from '../locales/en';
import {
  getI18nTranslations,
  hasRegisteredI18n,
  localeLookupChain,
  onI18nRegistryChange,
  registerI18n,
  resetI18nRegistryForTesting,
} from '../registry';

describe('i18n registry', () => {
  beforeEach(() => {
    resetI18nRegistryForTesting();
  });

  it('merges multiple registerI18n calls for one locale', () => {
    registerI18n('es', { play: 'Ir' });
    registerI18n('es', { pause: 'Pausa' });
    const es = getI18nTranslations('es');
    expect(es.play).toBe('Ir');
    expect(es.pause).toBe('Pausa');
  });

  it('inherits from English for keys missing in the locale', () => {
    registerI18n('es', { play: 'Ir' });
    const es = getI18nTranslations('es');
    expect(es.mute).toBe(en.mute);
  });

  it('resolves es-419-u-nu-latn to the es layer before English', () => {
    registerI18n('es', { play: 'ES-generic' });
    const merged = getI18nTranslations('es-419-u-nu-latn');
    expect(merged.play).toBe('ES-generic');
  });

  it('registers unicode-extension locales under the same key as localeLookupChain', () => {
    registerI18n('es-u-nu-latn', { play: 'Latin-numerals ES' });
    expect(hasRegisteredI18n('es-u-nu-latn')).toBe(true);
    expect(getI18nTranslations('es-u-nu-latn').play).toBe('Latin-numerals ES');
  });

  it('does not strip -u- subtags inside a private-use extension', () => {
    registerI18n('en-x-u-k0', { play: 'Private U' });
    registerI18n('en-x-u-k1', { play: 'Private U2' });
    expect(getI18nTranslations('en-x-u-k0').play).toBe('Private U');
    expect(getI18nTranslations('en-x-u-k1').play).toBe('Private U2');
  });

  it('walks zh-Hant-HK → zh-Hant → zh → en', () => {
    expect(localeLookupChain('zh-Hant-HK')).toEqual(['zh-hant-hk', 'zh-hant', 'zh', 'en']);
    registerI18n('zh', { play: 'ZH' });
    registerI18n('zh-Hant', { pause: 'Hant' });
    registerI18n('zh-Hant-HK', { replay: 'HK' });
    const merged = getI18nTranslations('zh-Hant-HK');
    expect(merged.replay).toBe('HK');
    expect(merged.pause).toBe('Hant');
    expect(merged.play).toBe('ZH');
    expect(merged.mute).toBe(en.mute);
  });

  it('truncates en-GB-scotland toward en-GB then en', () => {
    expect(localeLookupChain('en-GB-scotland')).toEqual(['en-gb-scotland', 'en-gb', 'en']);
    registerI18n('en-GB', { play: 'GB' });
    const merged = getI18nTranslations('en-GB-scotland');
    expect(merged.play).toBe('GB');
  });

  it('does not use a sibling locale tag when only the parent matches (es-AR vs es-MX)', () => {
    registerI18n('es-MX', { play: 'MX' });
    registerI18n('es', { play: 'ES' });
    const merged = getI18nTranslations('es-AR');
    expect(merged.play).toBe('ES');
  });

  it('reports hasRegisteredI18n with normalized tags', () => {
    expect(hasRegisteredI18n('en')).toBe(true);
    expect(hasRegisteredI18n('fr')).toBe(false);
    registerI18n('fr', { play: 'Lire' });
    expect(hasRegisteredI18n('FR')).toBe(true);
  });

  it('onI18nRegistryChange unsubscribe stops notifications', () => {
    const spy = vi.fn();
    const off = onI18nRegistryChange(spy);
    registerI18n('de', { play: 'Los' });
    expect(spy).toHaveBeenCalledOnce();
    off();
    registerI18n('de', { pause: 'Pause' });
    expect(spy).toHaveBeenCalledOnce();
  });
});
