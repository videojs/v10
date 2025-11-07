/**
 * End-to-End Compilation
 *
 * Main entry point for compiling React skins to HTML skins
 * Runs complete 3-phase pipeline: Analysis → Categorization → Projection
 */

import type { CompilerConfig, SourceContext } from './phases/types';
import type { DeepPartial } from './utils/deep-merge';
import { defaultCompilerConfig } from './configs/videojs-react-skin';
import { analyze } from './phases/analyze';
import { categorize } from './phases/categorize';
import { project } from './phases/project';
import { deepMerge } from './utils/deep-merge';

/**
 * Compile React skin source to HTML skin module
 * End-to-end pipeline through all three phases
 * Context flows through: initial → analyzed → categorized → projected
 *
 * @param sourceContext - Source context with code and initial state values
 * @param config - Optional compiler configuration (uses defaults if not provided)
 * @returns Complete HTML skin module source code
 *
 * @example
 * const htmlSkin = compile({ input: { source: reactSkinSource } });
 * // Returns complete module with imports, class, template, registration
 */
export function compile(
  sourceContext: SourceContext,
  config: DeepPartial<CompilerConfig> = {},
): string {
  // Merge user config with defaults
  const fullConfig = deepMerge(defaultCompilerConfig, config);

  // Phase 1: Analysis - identify what exists (config-driven visitors)
  // SourceContext flows through all phases unchanged
  const analyzedContext = analyze(sourceContext, fullConfig);

  // Phase 2: Categorization - determine what things are
  const categorizedContext = categorize(analyzedContext, fullConfig);

  // Phase 3: Projection - transform to output and compose final module
  return project(categorizedContext, fullConfig);
}
