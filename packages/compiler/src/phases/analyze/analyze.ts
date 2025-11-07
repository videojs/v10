/**
 * Usage Analysis
 *
 * Phase 1: Identification
 * Analyzes module to extract usage facts
 * Returns AST node references for later categorization
 * Config-driven - visitors loaded from config
 */

import type { AnalysisConfig, AnalysisPhaseConfig, ConfigToAnalyzedContext, SourceContext } from '../types';
import { parseForAnalysis } from './parser';

/**
 * Analyze module usage patterns
 * Config-driven - uses visitors from compiler config
 * Completely generic - no hardcoded concern names
 *
 * Phase 1 only: extracts usage facts from AST
 * No dependency on projectionState (that's for Phase 3)
 *
 * The return type is automatically inferred from the config's phases:
 * each phase key becomes a field with the visitor's value type
 *
 * @param context - Source context with code
 * @param config - Analysis configuration with phases
 * @returns Input context extended with analyzed fields from config
 */
export function analyze<
  TInput extends SourceContext,
  TConfig extends AnalysisConfig<any>,
>(
  context: TInput,
  config: TConfig,
): TInput & ConfigToAnalyzedContext<TConfig> {
  // Validate required input
  if (!context.input?.source || context.input.source.trim() === '') {
    throw new Error('Analysis requires non-empty source code in context.input.source');
  }

  // CONFIG-DRIVEN: Build visitor entries with context keys
  // Config is source of truth for which concerns exist and in what order
  const visitorEntries = Object.entries(config.phases)
    .map(([contextKey, phase]) => ({
      contextKey,
      visitor: (phase as AnalysisPhaseConfig<any>).visitor,
    }));

  // Single-pass AST traversal with all identification visitors
  // Context is threaded through and enriched with analyzed fields
  // Type inference: parseForAnalysis returns TInput & VisitorEntriesToContext
  // which matches our promise of TInput & ConfigToAnalyzedContext<TConfig>
  return parseForAnalysis(context, visitorEntries) as TInput & ConfigToAnalyzedContext<TConfig>;
}
