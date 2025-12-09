/**
 * Test Utilities
 *
 * Helper functions for testing the compiler
 */

import type { SourceContext } from '../src/phases/types';

/**
 * Create a SourceContext for testing
 * Used throughout tests - analyze() will add projectionState
 *
 * @param source - Source code to compile
 * @param overrides - Optional overrides for context fields
 * @returns SourceContext ready for compilation
 *
 * @example
 * const context = createInitialContext(`import { PlayButton } from '@videojs/react';`);
 * const result = analyze(context);
 */
export function createInitialContext(
  source: string,
  overrides?: Partial<SourceContext>,
): SourceContext {
  return {
    input: {
      source,
      path: undefined,
      ...overrides?.input,
    },
  };
}

/**
 * Alias for createInitialContext
 * Used for end-to-end compilation tests
 *
 * @param source - Source code to compile
 * @param overrides - Optional overrides
 * @returns SourceContext
 */
export function createSourceContext(
  source: string,
  overrides?: Partial<SourceContext>,
): SourceContext {
  return createInitialContext(source, overrides);
}
