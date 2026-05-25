import { describe, expect, it } from 'vitest';

import { loadLocale } from '../load-locale';
import { registerI18n, resetI18nRegistryForTesting } from '../registry';

describe('loadLocale', () => {
  it('returns undefined for unknown tags', async () => {
    await expect(loadLocale('xx-unknown')).resolves.toBeUndefined();
  });

  it('skips tags already registered via registerI18n', async () => {
    registerI18n('es', { play: 'Custom' });
    await expect(loadLocale('es')).resolves.toBeUndefined();
    resetI18nRegistryForTesting();
  });

  it('loads shipped locale packs by tag', async () => {
    const es = await loadLocale('es');
    expect(es?.play).toBe('Reproducir');
  });

  it('loads alias tags', async () => {
    const pt = await loadLocale('pt');
    expect(pt?.play).toBeTruthy();
  });
});
