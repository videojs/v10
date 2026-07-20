import { describe, expect, it } from 'vitest';

import { resolveTranslation } from '../resolve-translation';
import { createTranslator } from '../translator';

const t = createTranslator(
  {
    Play: 'Play',
    '{duration} remaining': '{duration} remaining',
  },
  'en'
);

describe('resolveTranslation', () => {
  it('interpolates a known phrase with params', () => {
    expect(resolveTranslation(t, '{duration} remaining', { duration: '1 minute' })).toBe('1 minute remaining');
  });

  it('supports custom fallback strings', () => {
    expect(resolveTranslation(t, 'Custom {value}', { value: 10 })).toBe('Custom 10');
  });

  it('type checks known phrase params', () => {
    resolveTranslation(t, '{duration} remaining', { duration: '1 minute' });
    resolveTranslation(t, 'Play');
    resolveTranslation(t, 'Custom label');
    resolveTranslation(t, 'Custom {value}', { value: 10 });

    // @ts-expect-error Known param phrases require params.
    resolveTranslation(t, '{duration} remaining');

    // @ts-expect-error Known no-param phrases reject params.
    resolveTranslation(t, 'Play', { duration: '1 minute' });

    // @ts-expect-error Known param phrases require the matching param shape.
    resolveTranslation(t, '{duration} remaining', { value: '1 minute' });
  });
});
