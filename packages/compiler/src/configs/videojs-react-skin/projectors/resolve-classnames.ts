/**
 * className Resolution
 *
 * Resolves className attribute for JSX elements
 * Filters and reduces classNames through category-specific projectors
 */

import type { CategorizedClassName, CategorizedContext, CategorizedJSXElement, ClassNameCategory, ClassNameProjector } from '../../types';

/**
 * Resolve className attribute for a JSX element
 * Filters classNames for this element and reduces through category-specific projectors
 * Uses reducer pattern to accumulate class strings via projectors
 *
 * @param element - Categorized JSX element
 * @param classNames - All classNames from context
 * @param projectorConfig - Category → projector mapping
 * @param context - Full categorized context (for projectors)
 * @returns Space-separated class string or empty string
 *
 * @example
 * // <PlayButton className={styles.Button} />
 * // className categorized as 'generic-style'
 * // projectGenericStyle invoked → "button"
 * resolveClassName(element, classNames, projectors, context) // → "button"
 *
 * @example
 * // <PlayButton className={styles.PlayButton} />
 * // className categorized as 'component-match'
 * // projectComponentMatch invoked → omitted
 * resolveClassName(element, classNames, projectors, context) // → ""
 */
export function resolveClassName(
  element: CategorizedJSXElement,
  classNames: CategorizedClassName[],
  projectorConfig: Record<ClassNameCategory, ClassNameProjector>,
  context: CategorizedContext,
): string {
  // Filter classNames for this element (by node reference identity)
  // Match component.node (JSXOpeningElement) with element.node (JSXElement)
  const elementClassNames = classNames.filter(cn =>
    cn.component.node.node === element.node?.node.openingElement,
  );

  // Reduce classNames through category-specific projectors
  const classes = elementClassNames.reduce<string[]>((acc, cn) => {
    const projector = projectorConfig[cn.category];
    if (!projector) {
      console.warn(`No projector for className category: ${cn.category}`);
      return acc;
    }
    return projector(acc, cn, context);
  }, []);

  return classes.join(' ');
}
