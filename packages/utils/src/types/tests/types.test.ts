import { describe, expectTypeOf, it } from 'vitest';
import type { StringWithSuggestions } from '../types';

describe('StringWithSuggestions', () => {
  it('accepts arbitrary strings without widening literal unions', () => {
    type Action = StringWithSuggestions<'play' | 'pause'>;

    expectTypeOf<Action>().toMatchTypeOf<string>();
    expectTypeOf<string>().toMatchTypeOf<Action>();
    expectTypeOf<Extract<Action, 'play'>>().toEqualTypeOf<'play'>();
  });
});
