import { describe, expect, it } from 'vitest';

import { loadLocale } from '../load-locale';
import { registerI18n, resetI18nRegistry } from '../registry';

describe('loadLocale', () => {
  it('returns undefined for unknown tags', async () => {
    await expect(loadLocale('xx-unknown')).resolves.toBeUndefined();
  });

  it('skips tags already registered via registerI18n', async () => {
    registerI18n('es', { Play: 'Custom' });
    await expect(loadLocale('es')).resolves.toBeUndefined();
    resetI18nRegistry();
  });

  it('loads shipped locale packs by tag', async () => {
    const es = await loadLocale('es');
    expect(es?.Play).toBe('Reproducir');
  });

  it('loads alias tags', async () => {
    const pt = await loadLocale('pt');
    expect(pt?.Play).toBeTruthy();
  });

  it('loads regional tags regardless of casing', async () => {
    const ptBr = await loadLocale('pt-br');
    const zhTw = await loadLocale('zh-TW');
    expect(ptBr?.Play).toBeTruthy();
    expect(zhTw?.Play).toBeTruthy();
  });

  it('loads regional tags via the locale lookup chain', async () => {
    const esMx = await loadLocale('es-MX');
    expect(esMx?.Play).toBe('Reproducir');
  });

  it('loads Traditional Chinese for zh-Hant regional tags', async () => {
    const zhHantHk = await loadLocale('zh-Hant-HK');
    expect(zhHantHk?.Pause).toBe('暫停');
  });

  it('loads packs when unicode locale extensions are present', async () => {
    const zhCn = await loadLocale('zh-CN-u-nu-hans');
    expect(zhCn?.Play).toBeTruthy();
  });
});
