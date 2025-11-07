/**
 * CSS State Projection
 *
 * Phase 3: Projection (New Architecture)
 * Projects CSS template reference from conventions
 * Returns string: "${styles}"
 */

import type { StateProjector } from '../../../phases/types';

/**
 * Project CSS template reference
 * State-based projector - reads styleVariableName from prevState
 * Generates template reference matching HTML package pattern
 *
 * @param _context - Full categorized context (unused)
 * @param prevState - Previous projection state containing styleVariableName
 * @returns CSS template reference string
 *
 * @example
 * const css = projectCSS(context, { styleVariableName: 'styles' });
 * // Returns: "${styles}"
 */
export const projectCSS: StateProjector<string> = (_context, prevState, _config) => {
  // Read styleVariableName from accumulated projected state
  const styleVariableName = prevState.styleVariableName ?? 'styles';

  // Generate CSS template reference
  // This creates: <style>${styles}</style> in the final output
  return `\${${styleVariableName}}`;
};
