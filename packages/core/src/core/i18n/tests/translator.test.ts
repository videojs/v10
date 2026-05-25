import { describe, expect, it } from 'vitest';

import { createTranslator } from '../translator';

describe('createTranslator', () => {
  it('resolves a simple key', () => {
    const t = createTranslator({ play: 'Start' }, 'en');
    expect(t('play')).toBe('Start');
  });

  it('interpolates {param} placeholders', () => {
    const t = createTranslator({ seekForward: 'Jump {seconds} s' }, 'en');
    expect(t('seekForward', { seconds: 10 })).toBe('Jump 10 s');
  });

  it('falls back to the key when no translation is defined', () => {
    const t = createTranslator({}, 'en');
    expect(t('play')).toBe('play');
  });

  it('keeps tokens that are not supplied as params', () => {
    const t = createTranslator({ play: 'Hi {name}' }, 'en');
    expect(t('play')).toBe('Hi {name}');
  });

  it('coerces numeric params to strings', () => {
    const t = createTranslator({ playbackRateAria: 'Speed {rate}' }, 'en');
    expect(t('playbackRateAria', { rate: 1.25 })).toBe('Speed 1.25');
  });
});
