import { describe, expect, it } from 'vitest';

import { resolveTranslation } from '../resolve-translation';
import { createTranslator } from '../translator';

const t = createTranslator(
  {
    'buttons.play': 'Play',
    'time.remainingSuffix': '{duration} remaining',
  },
  'en'
);

describe('resolveTranslation', () => {
  it('interpolates a known phrase with params', () => {
    expect(resolveTranslation(t, 'time.remainingSuffix', { duration: '1 minute' })).toBe('1 minute remaining');
  });

  it('supports custom fallback strings', () => {
    expect(resolveTranslation(t, 'Custom {value}', { value: 10 })).toBe('Custom 10');
  });

  it('type checks known phrase params', () => {
    resolveTranslation(t, 'time.remainingSuffix', { duration: '1 minute' });
    resolveTranslation(t, 'buttons.play');
    resolveTranslation(t, 'Custom label');
    resolveTranslation(t, 'Custom {value}', { value: 10 });

    // @ts-expect-error Known param keys require params.
    resolveTranslation(t, 'time.remainingSuffix');

    // @ts-expect-error Known no-param keys reject params.
    resolveTranslation(t, 'buttons.play', { duration: '1 minute' });

    // @ts-expect-error Known param keys require the matching param shape.
    resolveTranslation(t, 'time.remainingSuffix', { value: '1 minute' });
  });
});
