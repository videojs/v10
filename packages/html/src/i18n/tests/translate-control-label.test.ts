import { createTranslator, englishTranslations } from '@videojs/core/i18n';
import { describe, expect, it } from 'vitest';

import { translateControlLabel, translateTriggerLabel } from '../translate-control-label';

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

describe('translateTriggerLabel', () => {
  it('translates label keys from a trigger', () => {
    const t = createTranslator(englishTranslations, 'en');
    const trigger = {
      getLabel: () => 'play' as const,
      getLabelTranslationParams: () => undefined,
    };
    expect(translateTriggerLabel(t, trigger)).toBe('Play');
  });
});
