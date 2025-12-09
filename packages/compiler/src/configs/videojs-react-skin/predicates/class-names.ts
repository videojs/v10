/**
 * className Categorization Predicates
 *
 * Phase 2: Categorization
 * Predicates for determining className categories
 * All predicates follow normalized signature: (entity, context) => boolean
 */

import type { AnalyzedContext, ClassNameUsage } from '../../types';

/**
 * Check if className key matches component identifier
 * For member expressions only - exact match indicates redundancy with element selector
 */
export function isClassNameComponentMatch(
  classNameUsage: ClassNameUsage,
  _context: AnalyzedContext,
): boolean {
  // Member expression: check exact match
  return 'key' in classNameUsage && classNameUsage.key === classNameUsage.component.identifier;
}

/**
 * Check if className usage is a string literal
 * String literals are utility classes that need special handling
 */
export function isClassNameLiteral(
  classNameUsage: ClassNameUsage,
  _context: AnalyzedContext,
): boolean {
  return classNameUsage.type === 'string-literal';
}

/**
 * Check if className is a generic style (member expression)
 * This is the base case for CSS module references
 * Matches any member expression, including those that match the component identifier
 */
export function isClassNameGenericStyle(
  classNameUsage: ClassNameUsage,
  _context: AnalyzedContext,
): boolean {
  // Must be a member expression (has identifier)
  return classNameUsage.type === 'member-expression';
}
