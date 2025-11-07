/**
 * Generic Projection Types
 *
 * Truly generic types used across different compiler configurations
 * These types define structured data formats (pseudo-AST) for projections
 * Independent of any specific config or framework
 */

// ============================================================================
// Structured Import Types
// ============================================================================

/**
 * Structured import - preserves import specifier information
 * Supports all import types: named, default, namespace, side-effect
 */
export interface ProjectedImport {
  type: 'import';
  source: string;
  /** Optional - if undefined or empty array, it's a side-effect import */
  specifiers?: {
    type: 'named' | 'namespace' | 'default';
    name: string;
    alias?: string;
  }[];
}

/**
 * Structured comment - preserves comment style information
 */
export interface ProjectedComment {
  type: 'comment';
  style: 'line' | 'block';
  /** string for single line, string[] for multi-line (each entry is a line) */
  value: string | string[];
}

/**
 * Import entry - can be structured import, comment, or raw string
 * String support maintained for backwards compatibility and simple cases
 */
export type ProjectedImportEntry = ProjectedImport | ProjectedComment | string;

// ============================================================================
// Structured HTML Types
// ============================================================================

/**
 * Possible supported HTML attribute value types.
 * NOTE: string[] accounts for token list-like attributes (e.g. class names)
 */
export type HTMLAttributeValue = string | number | boolean | string[];

/**
 * Structured HTML element - preserves element structure information
 * Generic pseudo-AST representation of HTML suitable for any output format
 */
export interface ProjectedHTML {
  type: 'html';
  name: string;
  attributes: Record<string, HTMLAttributeValue>;
  /**
   * Child HTML elements (recursive tree structure).
   * NOTE: ProjectedHTML[] accounts for NodeList-like projections
   * from a single JSXElement root (e.g. tooltips, popovers)
   */
  children: (ProjectedHTML | (ProjectedHTML[]))[];
}

// ============================================================================
// Generic Configuration
// ============================================================================

/**
 * Projection configuration
 * Generic placeholder for projection-phase configuration options
 * Individual configs can extend this interface with specific options
 */
export interface ProjectionConfig {
  // Future: transformer overrides, options, etc.
}
