/**
 * JSX Element Categorization Predicates
 *
 * Phase 2: Categorization
 * Predicates for determining JSX element categories
 * All predicates follow normalized signature: (entity, context) => boolean
 */

import type { AnalyzedContext, JSXElementNode, JSXUsage } from '../../types';

/**
 * Type guard to check if JSXUsage is a JSXElementNode
 */
function isJSXElement(node: JSXUsage): node is JSXElementNode {
  return node.type === 'element';
}

/**
 * Check if identifier with member exists anywhere in JSX tree
 * Recursive search through children
 */
function hasIdentifierWithMember(tree: JSXUsage, identifier: string): boolean {
  // Only check element nodes (text and expression nodes don't have identifiers)
  if (!isJSXElement(tree)) {
    return false;
  }

  // Check current element
  if (tree.identifier === identifier && tree.member !== undefined) {
    return true;
  }

  // Recursively check children
  if (tree.children) {
    return tree.children.some(child =>
      hasIdentifierWithMember(child, identifier),
    );
  }

  return false;
}

/**
 * Check if JSX element is a native HTML element
 * Native elements are not imported - they're built-in HTML elements (div, button, span)
 * Optionally checks for hyphenated names (custom elements) for extra safety
 */
export function isJSXElementNative(
  jsx: JSXUsage,
  context: AnalyzedContext,
): boolean {
  // Must be an element node
  if (!isJSXElement(jsx)) {
    return false;
  }

  // Must not have member (not TimeSlider.Root)
  if (jsx.member !== undefined) {
    return false;
  }

  // Check if this identifier is imported
  const isImported = context.imports?.some(imp =>
    imp.specifiers.default === jsx.identifier
    || imp.specifiers.named.includes(jsx.identifier)
    || imp.specifiers.namespace === jsx.identifier,
  ) ?? false;

  // If it's imported, it's not a native element
  if (isImported) {
    return false;
  }

  // Extra safety: exclude custom elements (hyphenated names like my-element)
  // We don't anticipate supporting custom elements in skins yet
  if (jsx.identifier.includes('-')) {
    return false;
  }

  // Not imported and not hyphenated = native HTML element
  return true;
}

/**
 * Check if JSX element is a MediaContainer
 * MediaContainer is special - wraps media element with slot="media"
 */
export function isJSXElementMediaContainer(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'MediaContainer' && jsx.member === undefined;
}

/**
 * Check if JSX element is a compound component root
 * Compound root: Has matching children with member syntax (TimeSlider + TimeSlider.Root)
 */
export function isJSXElementCompoundRoot(
  jsx: JSXUsage,
  context: AnalyzedContext,
): boolean {
  // Must be an element node
  if (!isJSXElement(jsx)) {
    return false;
  }

  // Must not have member itself
  if (jsx.member !== undefined) {
    return false;
  }

  // Must be a component (uppercase)
  const firstChar = jsx.identifier[0];
  if (jsx.identifier.length === 0 || firstChar === undefined || firstChar !== firstChar.toUpperCase()) {
    return false;
  }

  // Check if there are any JSX usages with this identifier + member in the tree
  return context.jsx ? hasIdentifierWithMember(context.jsx, jsx.identifier) : false;
}

/**
 * Check if JSX element is Tooltip.Root
 */
export function isJSXElementTooltipRoot(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Tooltip' && jsx.member === 'Root';
}

/**
 * Check if JSX element is Tooltip.Trigger
 */
export function isJSXElementTooltipTrigger(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Tooltip' && jsx.member === 'Trigger';
}

/**
 * Check if JSX element is Tooltip.Positioner
 */
export function isJSXElementTooltipPositioner(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Tooltip' && jsx.member === 'Positioner';
}

/**
 * Check if JSX element is Tooltip.Popup
 */
export function isJSXElementTooltipPopup(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Tooltip' && jsx.member === 'Popup';
}

/**
 * Check if JSX element is Tooltip.Portal
 */
export function isJSXElementTooltipPortal(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Tooltip' && jsx.member === 'Portal';
}

/**
 * Check if JSX element is Popover.Root
 */
export function isJSXElementPopoverRoot(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Popover' && jsx.member === 'Root';
}

/**
 * Check if JSX element is Popover.Trigger
 */
export function isJSXElementPopoverTrigger(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Popover' && jsx.member === 'Trigger';
}

/**
 * Check if JSX element is Popover.Positioner
 */
export function isJSXElementPopoverPositioner(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Popover' && jsx.member === 'Positioner';
}

/**
 * Check if JSX element is Popover.Popup
 */
export function isJSXElementPopoverPopup(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Popover' && jsx.member === 'Popup';
}

/**
 * Check if JSX element is Popover.Portal
 */
export function isJSXElementPopoverPortal(
  jsx: JSXUsage,
  _context: AnalyzedContext,
): boolean {
  return isJSXElement(jsx) && jsx.identifier === 'Popover' && jsx.member === 'Portal';
}
