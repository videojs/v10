/**
 * Categorization Predicates
 *
 * Phase 2: Categorization
 * Default predicate functions for analyzing imports and style keys
 * All predicates are configurable via CategorizationConfig
 */

import type { AnalyzedContext, ImportUsage, JSXElementNode, JSXUsage } from '../../types';

/**
 * Type guard to check if JSXUsage is a JSXElementNode
 */
function isJSXElement(node: JSXUsage): node is JSXElementNode {
  return node.type === 'element';
}

/**
 * Check if identifier exists anywhere in JSX tree
 * Recursive search through children
 */
function hasIdentifierInTree(tree: JSXUsage, identifier: string): boolean {
  // Only check element nodes (text and expression nodes don't have identifiers)
  if (!isJSXElement(tree)) {
    return false;
  }

  // Check current element
  if (tree.identifier === identifier) {
    return true;
  }

  // Recursively check children
  if (tree.children) {
    return tree.children.some(child => hasIdentifierInTree(child, identifier));
  }

  return false;
}

/**
 * Check if import source is a VJS package
 * Matches: @videojs/*, @/* (path aliases)
 *
 * Note: Takes importUsage and context for normalized signature
 * (context unused but keeps interface consistent)
 */
export function isImportFromVJSPackage(
  importUsage: ImportUsage,
  _context: AnalyzedContext,
): boolean {
  const { source } = importUsage;
  return (
    source.startsWith('@videojs/')
    || source.startsWith('@/') // Path alias (e.g., @/icons, @/components)
  );
}

/**
 * Check if import source is a framework package
 * Matches: react, react-dom, react/*
 */
export function isImportFromFrameworkPackage(
  importUsage: ImportUsage,
  _context: AnalyzedContext,
): boolean {
  const { source } = importUsage;
  return source === 'react' || source === 'react-dom' || source.startsWith('react/');
}

/**
 * Check if import source is VJS core (platform-agnostic)
 * Matches: @videojs/core, @videojs/utils
 */
export function isImportFromVJSCore(
  importUsage: ImportUsage,
  _context: AnalyzedContext,
): boolean {
  const { source } = importUsage;
  return (
    source === '@videojs/core'
    || source === '@videojs/utils'
  );
}

/**
 * Check if import is used as a component (appears in JSX)
 */
export function isImportUsedAsComponent(
  importUsage: ImportUsage,
  context: AnalyzedContext,
): boolean {
  // Collect all specifier names from this import
  const allSpecifiers = [
    importUsage.specifiers.default,
    ...importUsage.specifiers.named,
    importUsage.specifiers.namespace,
  ].filter((s): s is string => s !== undefined);

  // Check if any specifier is used as JSX element identifier in the tree
  return allSpecifiers.some(spec => context.jsx && hasIdentifierInTree(context.jsx, spec));
}

/**
 * Check if import is used as an icon (appears in JSX from icon package)
 * Icons are a subcategory of components - this is more specific than isImportUsedAsComponent
 */
export function isImportUsedAsIcon(
  importUsage: ImportUsage,
  context: AnalyzedContext,
): boolean {
  // Must be used as a component first
  if (!isImportUsedAsComponent(importUsage, context)) {
    return false;
  }

  const { source } = importUsage;

  // Check if from icon package (package name ends with -icons or contains /icons)
  if (source.endsWith('-icons') || source.includes('/icons')) {
    return true;
  }

  // Check if all specifiers follow icon naming convention (end with 'Icon')
  const allSpecifiers = [
    importUsage.specifiers.default,
    ...importUsage.specifiers.named,
    importUsage.specifiers.namespace,
  ].filter((s): s is string => s !== undefined);

  // All specifiers must end with 'Icon'
  return allSpecifiers.length > 0 && allSpecifiers.every(spec => spec.endsWith('Icon'));
}

/**
 * Check if import is used for styles (used in className)
 */
export function isImportUsedAsStyle(
  importUsage: ImportUsage,
  context: AnalyzedContext,
): boolean {
  // Collect all specifier names from this import
  const allSpecifiers = [
    importUsage.specifiers.default,
    ...importUsage.specifiers.named,
    importUsage.specifiers.namespace,
  ].filter((s): s is string => s !== undefined);

  // Check if any specifier is used as className identifier (member expressions only)
  return allSpecifiers.some(spec =>
    context.classNames?.some(cn =>
      cn.type === 'member-expression' && cn.identifier === spec,
    ),
  );
}
