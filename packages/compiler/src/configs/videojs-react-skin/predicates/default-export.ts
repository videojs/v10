/**
 * Default Export Predicates
 *
 * Phase 2: Categorization
 * Predicates for categorizing default export component types
 */

import type { AnalyzedContext, DefaultExportUsage } from '../../types';

/**
 * Check if default export is a React functional component
 * Identifies arrow functions, function declarations, and identifiers
 *
 * We support functional components as the standard modern React pattern.
 * The analysis successfully extracts component name for all supported patterns.
 *
 * @param _entity - Default export usage (unused - we accept all default exports)
 * @param _context - Full usage context (unused)
 * @returns Always true (all default exports are treated as functional components)
 */
export function isReactFunctionalComponent(
  _entity: DefaultExportUsage,
  _context: AnalyzedContext,
): boolean {
  // All default exports are categorized as functional components
  // This predicate exists for consistency with the config-driven architecture
  return true;
}
