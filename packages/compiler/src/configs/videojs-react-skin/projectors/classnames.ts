/**
 * className Projectors
 *
 * Phase 3: Projection
 * Element-level projectors for className values based on category
 * Each projector receives accumulated class strings and returns updated array
 * Invoked during JSX attribute projection via resolveClassName()
 */

import type { CategorizedClassName, CategorizedContext, ClassNameProjector, MemberExpressionClassName, StringLiteralClassName } from '../../types';
import { toKebabCase } from '../../../utils/string-transforms';

/**
 * Project component-match className
 * These classes match the component identifier and should be omitted
 * (e.g., <PlayButton className={styles.PlayButton} /> - omit "PlayButton" class)
 *
 * The class is redundant because the custom element name already identifies the component
 *
 * @returns Unchanged classes array (omits this className)
 */
export const projectComponentMatch: ClassNameProjector = (
  classes: string[],
  _className: CategorizedClassName,
  _context: CategorizedContext,
): string[] => {
  // Return classes unchanged - omit component-match from output
  return classes;
};

/**
 * Project generic-style className
 * These are CSS module classes that don't match the component name
 * Transforms PascalCase/camelCase keys to kebab-case for CSS consistency
 * (e.g., <PlayButton className={styles.Button} /> - output class="button")
 *
 * @returns Classes array with kebab-case transformed key appended
 */
export const projectGenericStyle: ClassNameProjector = (
  classes: string[],
  className: CategorizedClassName,
  _context: CategorizedContext,
): string[] => {
  // Type narrow to member-expression (generic-style is always member-expression)
  if (className.type === 'member-expression') {
    // Transform key to kebab-case: Button → button, PlayButton → play-button
    return [...classes, toKebabCase((className as MemberExpressionClassName).key)];
  }
  return classes;
};

/**
 * Project literal-classes className
 * String literal classes passed through as-is
 * (e.g., <div className="button primary" /> - output class="button primary")
 *
 * @returns Classes array with literal classes appended
 */
export const projectLiteralClasses: ClassNameProjector = (
  classes: string[],
  className: CategorizedClassName,
  _context: CategorizedContext,
): string[] => {
  // Type narrow to string-literal (literal-classes is always string-literal)
  if (className.type === 'string-literal') {
    // Spread literal classes into array
    return [...classes, ...(className as StringLiteralClassName).classes];
  }
  return classes;
};
