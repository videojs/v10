/**
 * VideoJS React Skin Compiler Types
 *
 * Config-specific type definitions for compiling React skins to HTML skins
 * Organized by phase: Analysis → Categorization → Projection → Configuration
 */

import type { NodePath } from '@babel/traverse';
import type * as BabelTypes from '@babel/types';
import type {
  AnalysisVisitors,
  AnalyzedContext as GenericAnalyzedContext,
  CompilerConfig as GenericCompilerConfig,
  Predicate,
  ProjectionPhaseConfig,
  SingleAnalyzedEntry,
  TreeAnalyzedEntry,
} from '../phases/types';
import type {
  ProjectedHTML,
  ProjectedImportEntry,
} from '../types';

// ============================================================================
// Phase 1: Analysis Types
// ============================================================================
// Extract facts about module usage - what exists, what's used where
// All references are AST NodePaths for later categorization and transformation

// ----------------------------------------------------------------------------
// Analysis Output Types
// ----------------------------------------------------------------------------

/**
 * Import usage - captured from import statements
 * Extends AnalyzedEntry base type with required node
 */
export interface ImportUsage extends SingleAnalyzedEntry<NodePath<BabelTypes.ImportDeclaration>> {
  /** AST reference to import statement (override to make required) */
  node: NodePath<BabelTypes.ImportDeclaration>;
  /** Import source path */
  source: string;
  /** What's being imported */
  specifiers: {
    /** Variable name for default import */
    default?: string;
    /** Variable names for named imports */
    named: string[];
    /** Variable name for namespace import (import * as foo) */
    namespace?: string;
  };
}

/**
 * Symbol indicating className attribute is tracked separately in ClassNameUsage
 * Used as a marker in JSXUsage.attributes to indicate presence without storing value
 */
export const CLASSNAME_TRACKED_SEPARATELY: unique symbol = Symbol('className-tracked-separately');

/**
 * JSX attribute value types
 * Simple primitive values extracted during analysis
 * className is special-cased with a symbol (tracked in ClassNameUsage)
 */
export type JSXAttributeValue = string | number | boolean | typeof CLASSNAME_TRACKED_SEPARATELY;

/**
 * JSX text node - represents text content within JSX
 * Extracted from JSXText nodes during analysis
 * Does not extend AnalyzedEntry with node (text nodes have no AST reference)
 */
export interface JSXTextNode extends SingleAnalyzedEntry<never> {
  type: 'text';
  /** Text content (trimmed) */
  value: string;
}

/**
 * JSX expression node - represents expression containers within JSX
 * Extracted from JSXExpressionContainer nodes during analysis
 * Used for patterns like {children}, {someVar}, etc.
 * Does not extend AnalyzedEntry with node (expression containers have no categorizable AST reference)
 */
export interface JSXExpressionNode extends SingleAnalyzedEntry<never> {
  type: 'expression';
  /** Type of expression */
  expressionType: 'identifier' | 'member' | 'other';
  /** Identifier name (for expressionType === 'identifier') */
  identifierName?: string;
}

/**
 * JSX element node - tree-based structure with recursive children
 * Extends AnalyzedEntry base type with required node and recursive children
 *
 * Forms a recursive tree where each element has children
 * Root element is stored directly in context.jsx (not in an array)
 */
export interface JSXElementNode extends TreeAnalyzedEntry<NodePath<BabelTypes.JSXElement>, JSXUsage> {
  type: 'element';
  /** Identifier used as JSX element name (e.g., 'PlayButton', 'TimeSlider') */
  identifier: string;
  /** Member property for compound components (e.g., 'Root', 'Track') */
  member?: string;
  /** Extracted attributes (basic types during analysis) */
  attributes: Record<string, JSXAttributeValue>;
}

/**
 * JSX usage - discriminated union of all JSX node types
 * Includes JSX elements, text nodes, and expression containers
 */
export type JSXUsage = JSXElementNode | JSXTextNode | JSXExpressionNode;

/**
 * className attribute usage - base fields
 *
 * Note on order preservation:
 * When a className has mixed member expressions and string literals
 * (e.g., `${styles.Button} active ${styles.Play}`), the relative order
 * between member expressions and literals is not preserved.
 * Order is maintained within each type (member expressions array order,
 * string literal classes array order), but not between types.
 *
 * This is acceptable because:
 * - CSS specificity is determined by stylesheet order, not class attribute order
 * - Member expressions (CSS modules) are scoped and don't conflict with literals
 * - String literals are typically utility classes that don't conflict with modules
 *
 * If order preservation becomes necessary, the data structure could be revisited
 * to more closely reflect the original code structure.
 */
interface BaseClassNameUsage extends SingleAnalyzedEntry<NodePath<BabelTypes.JSXAttribute>> {
  /** Which component has this className */
  component: {
    /** Component identifier (e.g., 'PlayButton', 'TimeSlider', 'div') */
    identifier: string;
    /** Member property for compound components (e.g., 'Root', 'Track') */
    member?: string;
    /** AST reference to the JSX element node (used for identity matching) */
    node: NodePath<BabelTypes.JSXOpeningElement>;
  };
}

/**
 * Member expression className - styles.Button
 * Extends AnalyzedEntry base type with required node
 */
export interface MemberExpressionClassName extends BaseClassNameUsage {
  /** Type discriminator */
  type: 'member-expression';
  /** Style object variable name (e.g., 'styles') */
  identifier: string;
  /** Style key accessed (e.g., 'Button', 'PlayButton') */
  key: string;
}

/**
 * String literal className - "button primary"
 * Extends AnalyzedEntry base type with required node
 */
export interface StringLiteralClassName extends BaseClassNameUsage {
  /** Type discriminator */
  type: 'string-literal';
  /** Extracted class names (split by whitespace) */
  classes: string[];
  /** Original literal value */
  literalValue: string;
}

/**
 * className attribute usage - discriminated union
 */
export type ClassNameUsage = MemberExpressionClassName | StringLiteralClassName;

/**
 * Default export - the main component being compiled
 * Extends AnalyzedEntry base type with required node
 */
export interface DefaultExportUsage extends SingleAnalyzedEntry<NodePath<BabelTypes.ExportDefaultDeclaration>> {
  /** AST reference to export default statement (override to make required) */
  node: NodePath<BabelTypes.ExportDefaultDeclaration>;
  /** Component function name */
  componentName: string;
  /**
   * AST reference to root JSX element
   * Used internally in Phase 1 to mark the root element with isRoot flag
   * After Phase 1, access root via jsxUsage.find(el => el.isRoot) instead
   */
  jsxElement: NodePath<BabelTypes.JSXElement>;
}

/**
 * Analyzed fields for videojs-react-skin config
 * Defines the specific fields produced by this config's analysis phase
 */
export interface VideoJSAnalyzedFields {
  /** All imports */
  imports?: ImportUsage[];
  /** JSX tree (single root element with recursive children) */
  jsx?: JSXUsage;
  /** className values */
  classNames?: ClassNameUsage[];
  /** Default export component */
  defaultExport?: DefaultExportUsage;
}

/**
 * Analyzed context - full execution context after analysis
 * Concrete type for videojs-react-skin config
 * Extends SourceContext with analyzed fields
 * Fields may be undefined if visitor returns nothing
 */
export type AnalyzedContext = GenericAnalyzedContext<VideoJSAnalyzedFields>;

// ============================================================================
// Phase 2: Categorization Types
// ============================================================================
// Category enums and configuration for analyzing usage patterns

/**
 * Import categories based on usage and package context
 */
export type ImportCategory
  = | 'vjs-component' // VJS component (from @videojs/* or relative)
    | 'vjs-icon' // VJS icon (from @videojs/*-icons or icon naming pattern)
    | 'vjs-core' // VJS platform-agnostic (core, utils)
    | 'framework' // Framework-specific (react, react-dom)
    | 'style' // Style import (used in className)
    | 'external'; // External package (non-VJS)

/**
 * className categories based on transformation strategy
 */
export type ClassNameCategory
  = | 'component-match' // Key matches component identifier (omit from class)
    | 'generic-style' // CSS module key that doesn't match (add to class)
    | 'literal-classes'; // String literal classes (handle specially)

/**
 * JSX element categories based on component type and usage patterns
 */
export type JSXElementCategory
  = | 'native-element' // Native HTML element (div, button, span)
    | 'generic-component' // Generic component (not special-cased)
    | 'compound-root' // Compound component root (TimeSlider when TimeSlider.Root exists)
    | 'media-container' // MediaContainer component (special handling)
    | 'tooltip-root' // Tooltip.Root
    | 'tooltip-trigger' // Tooltip.Trigger
    | 'tooltip-positioner' // Tooltip.Positioner
    | 'tooltip-popup' // Tooltip.Popup
    | 'tooltip-portal' // Tooltip.Portal
    | 'popover-root' // Popover.Root
    | 'popover-trigger' // Popover.Trigger
    | 'popover-positioner' // Popover.Positioner
    | 'popover-popup' // Popover.Popup
    | 'popover-portal'; // Popover.Portal

/**
 * Default export categories based on component type
 */
export type DefaultExportCategory = 'react-functional-component'; // React functional component (arrow function or function declaration)

// Note: Concrete categorization config interfaces removed in favor of generic types
// See CategorizationConfig and CategorizationPhaseConfig in ./phases/types.ts
// CompilerConfig below provides the concrete implementation for videojs-react-skin

/**
 * Categorized import - extends ImportUsage with category
 * Pattern: CategorizedEntryArray<ImportUsage, ImportCategory>
 * Flattened structure - all usage fields directly accessible
 */
export interface CategorizedImport extends Omit<ImportUsage, 'category'> {
  category: ImportCategory;
}

/**
 * Categorized className - extends ClassNameUsage with category
 * Pattern: CategorizedEntryArray<ClassNameUsage, ClassNameCategory>
 * Flattened structure - all usage fields directly accessible
 */
export interface CategorizedClassName extends Omit<ClassNameUsage, 'category'> {
  category: ClassNameCategory;
}

/**
 * Categorized JSX child types - discriminated union
 * Only JSX elements get categorized; text and expressions pass through unchanged
 */
export type CategorizedJSXChild = CategorizedJSXElement | JSXTextNode | JSXExpressionNode;

/**
 * Categorized JSX element - extends JSXElementNode with category
 * Pattern: TreeCategorizedEntry<JSXElementNode, CategorizedJSXChild, JSXElementCategory>
 * Recursive tree structure with categorized children
 */
export interface CategorizedJSXElement extends Omit<JSXElementNode, 'category' | 'children'> {
  category: JSXElementCategory;
  /** Categorized children (elements are categorized, text/expressions unchanged) */
  children: CategorizedJSXChild[];
}

/**
 * Categorized default export - extends DefaultExportUsage with category
 * Pattern: SingleCategorizedEntry<DefaultExportUsage, DefaultExportCategory>
 * Flattened structure - all usage fields directly accessible
 */
export interface CategorizedDefaultExport extends Omit<DefaultExportUsage, 'category'> {
  category: DefaultExportCategory;
}

/**
 * Categorized context - full execution context after categorization
 * Preserves all fields from the input context (AnalyzedContext)
 * while transforming the usage analysis fields to categorized results
 */
export type CategorizedContext = Omit<AnalyzedContext, 'imports' | 'classNames' | 'jsx' | 'defaultExport'> & {
  /** Categorized imports */
  imports: CategorizedImport[];
  /** Categorized className values */
  classNames: CategorizedClassName[];
  /** Categorized JSX tree (single root with recursive children) */
  jsx: CategorizedJSXElement;
  /** Categorized default export */
  defaultExport: CategorizedDefaultExport;
};

// ============================================================================
// Phase 3: Projection Types
// ============================================================================
// Types for transforming categorized usage to output strings
//
// Projection uses different patterns depending on the concern:
// - Imports: Module-level reducer with Projector<T>, accumulates into ProjectionState
// - DefaultExport: Direct transform returning specific fields
// - JSX: Recursive tree traversal, returns HTML strings
// - ClassNames: Element-level reducer, accumulates class strings per element
// - CSS: Direct implementation (no separate projector type)
//
// All concerns share a common wrapper: (context, config) → updated context

/**
 * Projection state - accumulator state during projection
 * Passed through projectors as they reduce over categorized entities
 * Each projection function takes context + input and returns updated context
 *
 * Conventions (styleVariableName) are now provided via config.projectionState
 * Accumulators (imports, elementClassName, etc.) are OPTIONAL initially
 * and populated during projection by projectors
 * After projectModule() completes, all fields are guaranteed to be populated
 */
export interface ProjectionState {
  // Conventions (applied from config, can be overridden in context)
  /** Style variable name convention (applied from config.projectionState if not in context) */
  styleVariableName?: string;

  // Optional accumulators (populated during projection)
  /** Accumulated import entries (populated by projectImports) */
  imports?: ProjectedImportEntry[];

  /** Derived custom element class name (populated by projectDefaultExport) */
  elementClassName?: string;

  /** Derived custom element tag name (populated by projectElementName) */
  elementName?: string;

  /** Projected HTML content (populated by projectHTML) */
  html?: ProjectedHTML[];

  /** Projected CSS content (populated by projectCSS) */
  css?: string;

  // Future state:
  // importedComponents: Set<string>;
  // generatedUtilityClasses: Map<string[], string>;
}

/**
 * Module-level Projector function type: (state, entity, context) → updated state
 * Reducer pattern - takes current state, returns updated state with projections applied
 * Pure function - should not mutate input state
 * Used for import projectors (module-scoped entities)
 *
 * Note: Other projection concerns use different patterns:
 * - DefaultExport: Direct transform returning specific fields
 * - JSX: Recursive tree traversal returning HTML strings
 * - ClassNames: Element-level reducer with custom accumulator
 * - CSS: Direct implementation (no separate projector type)
 */
export type Projector<T> = (
  projectionState: ProjectionState,
  entity: T,
  context: CategorizedContext,
) => ProjectionState;

/**
 * JSX Projector function type: (categorized, projectors, context, config) → HTML string
 * Recursive tree traversal - projector processes element and recursively projects children
 * Context parameter provides access to classNames for className resolution
 * Config parameter provides access to className projectors and other configuration
 * Pure function - should not mutate inputs
 */
export type JSXProjector = (
  categorized: CategorizedJSXElement,
  projectors: Record<JSXElementCategory, JSXProjector>,
  context: CategorizedContext,
  config: CompilerConfig,
) => string;

/**
 * className Projector function type: (classes, className, context) → updated classes
 * Element-level reducer pattern - accumulates class strings for a single element
 *
 * Pattern difference: Unlike module-level Projector<T> which accumulates into ProjectionState,
 * this uses a simple string[] accumulator because:
 * 1. ClassNames are element-scoped (not module-scoped)
 * 2. Multiple classNames reduce to a single class attribute per element (many:1)
 * 3. Invoked inline during JSX tree traversal, not in a separate projection phase
 *
 * Projectors implement category-specific transformations:
 * - component-match: Return unchanged (omit from output)
 * - generic-style: Extract key, transform to kebab-case, append
 * - literal-classes: Extract classes array, spread into accumulator
 *
 * Pure function - should not mutate input array
 * Used during JSX attribute resolution via resolveClassName()
 */
export type ClassNameProjector = (
  classes: string[],
  className: CategorizedClassName,
  context: CategorizedContext,
) => string[];

// Note: Structured projection types (ProjectedImport, ProjectedHTML, etc.)
// are now defined in ../types.ts as they are generic/reusable

/**
 * Compiler context - full execution context at Phase 3 (input to projection)
 * Contains categorized data + projection state
 * This is the context threaded through projection functions
 * projectionState is required (not optional) for projection phase
 */
export type CompilerContext = Omit<CategorizedContext, 'projectionState'> & {
  projectionState: ProjectionState;
};

// ============================================================================
// Configuration Types
// ============================================================================
// Unified configuration spanning all phases
// Grouped by concern - each concern contains full pipeline configuration

/**
 * Default export projector function type
 * Projects categorized default export to element names
 * Returns both elementClassName and elementName for the custom element
 */
export type DefaultExportProjector = (
  categorized: CategorizedDefaultExport,
) => {
  elementClassName: string;
  elementName: string;
};

/**
 * Import concern configuration
 * Pipeline: visitor (Phase 1) → categories (Phase 2)
 * Projection handled by projectionState.imports
 *
 * @param V - The value type produced by the visitor (defaults to ImportUsage[])
 */
export interface ImportConfig<V = ImportUsage[]> {
  /** Analysis visitor (Phase 1) */
  visitor: AnalysisVisitors<V>;

  /** Categorization predicates (Phase 2) */
  categories: Record<ImportCategory, Predicate<ImportUsage>[]>;
}

/**
 * className concern configuration
 * Pipeline: visitor (Phase 1) → categories (Phase 2)
 * Projection handled by top-level classNameProjectors
 *
 * Note: className projectors use a different pattern than state projectors:
 * - Element-scoped (not module-scoped)
 * - Accumulate into string[] (not ProjectionState)
 * - Invoked inline during HTML projection (not in separate phase)
 *
 * @param V - The value type produced by the visitor (defaults to ClassNameUsage[])
 */
export interface ClassNameConfig<V = ClassNameUsage[]> {
  /** Analysis visitor (Phase 1) */
  visitor: AnalysisVisitors<V>;

  /** Categorization predicates (Phase 2) */
  categories: Record<ClassNameCategory, Predicate<ClassNameUsage>[]>;
}

/**
 * JSX concern configuration
 * Pipeline: visitor (Phase 1) → categories (Phase 2)
 * Projection handled by projectionState.html
 *
 * @param V - The value type produced by the visitor (defaults to JSXUsage)
 */
export interface JSXConfig<V = JSXUsage> {
  /** Analysis visitor (Phase 1) */
  visitor: AnalysisVisitors<V>;

  /** Categorization predicates (Phase 2) */
  categories: Record<JSXElementCategory, Predicate<JSXUsage>[]>;
}

/**
 * Default export concern configuration
 * Handles default export extraction, categorization, and name derivation
 * Pipeline: visitor (Phase 1) → categories (Phase 2)
 * Projection handled by projectionState.elementClassName and elementName
 *
 * @param V - The value type produced by the visitor (defaults to DefaultExportUsage)
 */
export interface DefaultExportConfig<V = DefaultExportUsage> {
  /** Analysis visitor (Phase 1) */
  visitor: AnalysisVisitors<V>;

  /** Categorization predicates (Phase 2) */
  categories: Record<DefaultExportCategory, Predicate<DefaultExportUsage>[]>;
}

/**
 * State-based projector configuration
 * Application-specific alias for ProjectionPhaseConfig<ProjectionState>
 * Maps ProjectionState keys to either:
 * - Projector functions that compute values dynamically
 * - Static values that are applied directly
 * Type-safe: ensures values match ProjectionState field types
 */
type ProjectionStateConfig = ProjectionPhaseConfig<ProjectionState>;

// ============================================================================
// VideoJS React Skin Compiler Configuration
// ============================================================================
// Concrete implementation of CompilerConfig for videojs-react-skin

/**
 * VideoJS React Skin compiler configuration
 * Concrete implementation for compiling @videojs/react skins to HTML skins
 * Extends generic CompilerConfig with videojs-specific fields
 *
 * Defines HOW to compile (static processing rules)
 * Config contains only processing rules (visitors, categorizers, projectors)
 * Runtime values (source code, initial state) live in SourceContext
 */
export interface CompilerConfig extends GenericCompilerConfig<
  {
    phases: {
      imports: ImportConfig;
      classNames: ClassNameConfig;
      jsx: JSXConfig;
      defaultExport: DefaultExportConfig;
    };
  },
  ProjectionState
> {
  /** Phase configurations grouped by concern (analysis & categorization) */
  phases: {
    /** Import configuration */
    imports: ImportConfig;

    /** className configuration */
    classNames: ClassNameConfig;

    /** JSX element configuration */
    jsx: JSXConfig;

    /** Default export configuration */
    defaultExport: DefaultExportConfig;
  };

  /**
   * className projectors (element-level reducers)
   * Invoked inline during HTML projection to resolve class attributes
   * Separate from state projectors because they accumulate per-element, not module-level
   */
  classNameProjectors: Record<ClassNameCategory, ClassNameProjector>;

  /**
   * State-based projectors
   * Type-safe: projector return types must match ProjectionState field types
   * These handle module-level projections (imports, html, css, names)
   *
   * Supports both:
   * - Functions: Computed dynamically based on context (e.g., projectImports)
   * - Static values: Applied directly (e.g., css: 'default-styles')
   */
  projectionState?: ProjectionStateConfig;

  /**
   * Module composition function
   * Takes complete projection state and composes it into final output
   * Overrides generic signature to require all projection state fields
   */
  composeModule?: (projectionState: ProjectionState) => string;
}
