import { createTranslator, englishTranslations } from '@videojs/core/i18n';
import { describe, expect, it } from 'vitest';

import { translateControlLabel } from '../translate-control-label';

describe('translateControlLabel', () => {
  it('translates registry keys', () => {
    const t = createTranslator(englishTranslations, 'en');
    expect(translateControlLabel(t, 'play')).toBe('Play');
  });

  it('returns literal strings unchanged when not in the registry', () => {
    const t = createTranslator(englishTranslations, 'en');
    expect(translateControlLabel(t, 'Custom label')).toBe('Custom label');
  });
});
