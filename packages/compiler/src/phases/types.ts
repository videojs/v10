import type { NodePath, Visitor } from '@babel/traverse';

// ============================================================================
// Source Context Types
// ============================================================================
// Input context type used throughout the compilation pipeline

/**
 * Compiler input context
 * Minimal user-provided input to compile()
 * Just the source code - all conventions and settings come from config
 */
export interface SourceContext {
  /** Input source metadata */
  input: {
    /** Required: the source code to compile */
    source: string;
    /** Optional: path to source file (for future module resolution) */
    path?: string;
  };
}

// ============================================================================
// Analyzed Entry Base Type
// ============================================================================
// Generic base type for all Phase 1 analysis/usage entries

/**
 * Base type for all Phase 1 analysis entries
 *
 * @template TNode - The NodePath type (defaults to never for entries without nodes)
 * @template TSelf - The recursive type for children (defaults to never for non-recursive types)
 *               NOTE: When TSelf is not never, it should be a union that includes this type.
 *               This constraint is not yet enforced by TypeScript but should be maintained
 *               by convention. Future enhancement could add stricter validation.
 *
 * Enforces three rules:
 * 1. category is reserved (cannot be set in Phase 1)
 * 2. If node parameter is specified, node property is present
 * 3. If TSelf is specified, children must be TSelf[]
 */
export interface AnalyzedEntry<
  TNode extends NodePath<any> | never = never,
  TSelf extends AnalyzedEntry<any, any> | never = never,
> {
  /** Reserved for Phase 2 categorization */
  category?: never;

  /** Optional AST node reference - present only if TNode is specified */
  node?: TNode extends never ? never : TNode;

  /** Optional recursive children - present only if TSelf is specified */
  children?: TSelf extends never ? never : TSelf[];
}

// ============================================================================
// Analyzed Context Value Patterns
// ============================================================================
// Helper types for the three exhaustive patterns of analyzed context values

/**
 * Pattern 1: Single non-recursive entry
 * Used for context values that are single entries without children
 *
 * @example
 * defaultExport?: SingleAnalyzedEntry<NodePath<ExportDefaultDeclaration>>
 */
export type SingleAnalyzedEntry<TNode extends NodePath<any> | never>
  = AnalyzedEntry<TNode, never>;

/**
 * Pattern 2: Single recursive/tree entry
 * Used for context values that are single entries with children (tree structures)
 *
 * @template TNode - The NodePath type for the root entry
 * @template TSelf - The union type that includes this entry and its possible children
 *
 * @example
 * jsx?: TreeAnalyzedEntry<NodePath<JSXElement>, JSXUsage>
 * where JSXUsage = JSXElementNode | JSXTextNode | JSXExpressionNode
 */
export type TreeAnalyzedEntry<
  TNode extends NodePath<any> | never,
  TSelf extends AnalyzedEntry<any, any>,
> = AnalyzedEntry<TNode, TSelf>;

/**
 * Pattern 3: Array of entries (supports both recursive and non-recursive items)
 * Used for context values that are arrays of entries
 *
 * @template TNode - The NodePath type for array items
 * @template TSelf - Optional: the recursive type if array items can have children (defaults to never)
 *
 * @example
 * // Non-recursive array items:
 * imports?: AnalyzedEntryArray<NodePath<ImportDeclaration>>
 * classNames?: AnalyzedEntryArray<NodePath<JSXAttribute>>
 *
 * // Could support recursive array items in future:
 * trees?: AnalyzedEntryArray<NodePath<SomeNode>, TreeUnion>
 */
export type AnalyzedEntryArray<
  TNode extends NodePath<any> | never = never,
  TSelf extends AnalyzedEntry<any, any> | never = never,
> = Array<AnalyzedEntry<TNode, TSelf>>;

// ============================================================================
// Analyzed Context Type
// ============================================================================
// Generic context type for Phase 1 output

/**
 * Valid value types for analyzed context fields
 * All analyzed fields must be one of these three patterns
 */
export type AnalyzedContextValue
  = | SingleAnalyzedEntry<any>
    | TreeAnalyzedEntry<any, any>
    | AnalyzedEntryArray<any, any>;

/**
 * Generic analyzed context
 * Extends SourceContext with analyzed fields derived from config phases
 *
 * @template TAnalyzed - Analyzed fields object (must be explicitly provided)
 *
 * All analyzed fields must match one of three patterns:
 * - SingleAnalyzedEntry (non-recursive single entry)
 * - TreeAnalyzedEntry (recursive single entry with children)
 * - AnalyzedEntryArray (array of entries)
 *
 * Note: Uses mapped type constraint to validate each property value
 * without requiring index signatures
 *
 * @example
 * // Generic usage:
 * type MyAnalyzedContext = AnalyzedContext<{
 *   imports?: AnalyzedEntryArray<NodePath<ImportDeclaration>>;
 *   jsx?: TreeAnalyzedEntry<NodePath<JSXElement>, JSXUsage>;
 * }>;
 *
 * // Result extends SourceContext with specified fields
 */
export type AnalyzedContext<
  TAnalyzed extends {
    [K in keyof TAnalyzed]: AnalyzedContextValue | undefined;
  },
> = SourceContext & TAnalyzed;

// ============================================================================
// Analysis Visitor Infrastructure
// ============================================================================
// Generic visitor types for Phase 1 analysis
// These define HOW visitors work (not WHAT fields they populate)

/**
 * Extract the path parameter type from a Babel visitor function
 */
type ExtractPathType<T>
  = T extends (...args: infer Args) => any
    ? Args[0]
    : T extends { enter?: infer E }
      ? E extends (...args: infer Args) => any
        ? Args[0]
        : never
      : never;

/**
 * Get the properly typed path for a given Babel visitor key
 */
type PathForVisitorKey<K extends keyof Visitor>
  = NonNullable<Visitor[K]> extends infer V
    ? ExtractPathType<V>
    : never;

/**
 * Type-safe reducer-like visitor handler for analysis
 * Receives previous value and path, returns updated value
 *
 * @param K - Babel visitor key (e.g., 'ImportDeclaration', 'JSXAttribute')
 * @param V - Value type being accumulated (e.g., ImportUsage[], ClassNameUsage[])
 */
export type AnalysisVisitorHandler<
  K extends keyof Visitor,
  V,
> = (
  previousValue: V,
  path: PathForVisitorKey<K>,
) => V;

/**
 * Non-generic visitor handler type for runtime iteration
 * This is the erased version of AnalysisVisitorHandler<K, V>
 * Used when we lose generic context (e.g., Object.entries iteration)
 */
export type AnyAnalysisVisitorHandler = (
  previousValue: any,
  path: any,
) => any;

/**
 * Utility type to ensure at least one property is defined
 * Prevents empty objects from being valid
 */
type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * Type-safe visitor definitions for analysis
 * Maps Babel visitor keys to reducer-like handlers
 * Must have at least one visitor handler defined (cannot be empty object)
 *
 * @param V - The value type being accumulated (e.g., ImportUsage[], JSXUsage)
 *            Defaults to any for flexibility, but should be specified for type safety
 */
export type AnalysisVisitors<V = any> = AtLeastOne<{
  [K in keyof Visitor]: AnalysisVisitorHandler<K, V>;
}>;

/**
 * Visitor entry pairing a context key with its typed visitor
 * Used to build visitor entries array with preserved type information
 *
 * @param K - The context key (e.g., 'imports', 'jsx', 'classNames')
 * @param V - The value type being accumulated by this visitor
 */
export interface VisitorEntry<K extends string = string, V = any> {
  /** The key where this visitor's result will be stored in the context */
  contextKey: K;
  /** The visitor that produces values of type V */
  visitor: AnalysisVisitors<V>;
}

/**
 * Extract the analyzed context shape from a tuple of visitor entries
 * Maps each entry's contextKey to its visitor's value type
 *
 * @example
 * type Entries = [
 *   VisitorEntry<'imports', ImportUsage[]>,
 *   VisitorEntry<'jsx', JSXUsage>
 * ];
 * type Result = VisitorEntriesToContext<Entries>;
 * // Result is: { imports?: ImportUsage[]; jsx?: JSXUsage }
 */
export type VisitorEntriesToContext<
  TEntries extends ReadonlyArray<VisitorEntry<any, any>>,
> = {
  [Entry in TEntries[number] as Entry['contextKey']]?: Entry extends VisitorEntry<any, infer V>
    ? V
    : never;
};

// ============================================================================
// Generic Config Types for Analysis Phase
// ============================================================================

/**
 * Generic analysis phase configuration
 * Defines the minimal shape needed for a phase: it must have a visitor
 * Other properties (categories, etc.) can be added by extending this interface
 *
 * @param V - The value type produced by this phase's visitor
 */
export interface AnalysisPhaseConfig<V = any> {
  /** The analysis visitor that produces values of type V */
  visitor: AnalysisVisitors<V>;
}

/**
 * Generic analysis configuration
 * Minimal interface for configs that support the analyze() function
 * Other config properties can be added by extending this interface
 *
 * @template TPhases - The phases object mapping concern names to phase configs
 */
export interface AnalysisConfig<TPhases extends Record<string, AnalysisPhaseConfig<any>> = Record<string, AnalysisPhaseConfig<any>>> {
  /** Phase configurations keyed by concern name */
  phases: TPhases;
}

/**
 * Extract analyzed context type from config phases
 * Maps each phase key to its visitor's value type
 *
 * @example
 * type Config = AnalysisConfig<{
 *   imports: AnalysisPhaseConfig<ImportUsage[]>;
 *   jsx: AnalysisPhaseConfig<JSXUsage>;
 * }>;
 * type Result = ConfigToAnalyzedContext<Config>;
 * // Result is: { imports?: ImportUsage[]; jsx?: JSXUsage }
 */
export type ConfigToAnalyzedContext<TConfig extends AnalysisConfig<any>> = {
  [K in keyof TConfig['phases']]?: TConfig['phases'][K]['visitor'] extends AnalysisVisitors<infer V>
    ? V
    : never;
};

// ============================================================================
// Generic Config Types for Categorization Phase
// ============================================================================

/**
 * Extract entity type from visitor return type
 * If visitor returns an array, unwraps to get the entry type
 * Otherwise returns the type as-is
 *
 * @example
 * ExtractEntityType<ImportUsage[]> = ImportUsage
 * ExtractEntityType<DefaultExportUsage> = DefaultExportUsage
 */
type ExtractEntityType<V> = V extends Array<infer Item> ? Item : V;

/**
 * Extract entity type from a phase config's visitor
 * Used to infer the correct predicate type for categorization
 *
 * @example
 * ExtractPhaseEntityType<AnalysisPhaseConfig<ImportUsage[]>> = ImportUsage
 */
type ExtractPhaseEntityType<TPhase extends AnalysisPhaseConfig<any>>
  = TPhase extends AnalysisPhaseConfig<infer V> ? ExtractEntityType<V> : never;

/**
 * Generic predicate function type
 * Tests if an entity matches a category based on entity properties and context
 *
 * @template T - The entity type being tested (e.g., ImportUsage, JSXUsage)
 * @template TContext - The context type (defaults to any for flexibility)
 *
 * @returns true if entity matches the category criteria
 */
export type Predicate<T, TContext = any> = (
  entity: T,
  context: TContext,
) => boolean;

/**
 * Generic categorization phase configuration
 * Defines categories with predicates for a single phase/concern
 *
 * Categorization logic:
 * - All predicates in array must pass (AND logic)
 * - First matching category wins (insertion order matters)
 * - Empty predicate array [] means catch-all fallback category
 *
 * @template TEntity - The entity type being categorized (inferred from visitor)
 * @template C - Union of category string literals for this phase
 *
 * @example
 * interface ImportCategorizationConfig
 *   extends CategorizationPhaseConfig<ImportUsage, 'vjs-component' | 'external'> {
 *   categories: {
 *     'vjs-component': [isFromVJS, isUsedAsComponent];
 *     'external': []; // catch-all
 *   };
 * }
 */
export interface CategorizationPhaseConfig<
  TEntity = any,
  C extends string = string,
> {
  /**
   * Category definitions mapping category names to predicate arrays
   * Predicates are typed for the specific entity type
   * Runtime guarantees:
   * - Categories checked in insertion order
   * - All predicates must pass (AND)
   * - First match wins
   */
  categories: Record<C, Predicate<TEntity, any>[]>;
}

/**
 * Generic categorization configuration
 * Builds upon an AnalysisConfig by adding category definitions to each phase
 * Each phase must have categories defined for the entity type produced by its visitor
 *
 * @template TAnalysisConfig - The analysis config this categorization builds upon
 *
 * Note: This interface is structurally compatible with AnalysisConfig (all phases have visitor)
 * but adds required categories field to each phase
 *
 * @example
 * type MyAnalysisConfig = AnalysisConfig<{
 *   imports: AnalysisPhaseConfig<ImportUsage[]>;
 *   defaultExport: AnalysisPhaseConfig<DefaultExportUsage>;
 * }>;
 *
 * type MyCategorizationConfig = CategorizationConfig<MyAnalysisConfig>;
 * // phases.imports requires: AnalysisPhaseConfig<ImportUsage[]> & CategorizationPhaseConfig<ImportUsage, ...>
 * // phases.defaultExport requires: AnalysisPhaseConfig<DefaultExportUsage> & CategorizationPhaseConfig<DefaultExportUsage, ...>
 */
export interface CategorizationConfig<
  TAnalysisConfig extends AnalysisConfig<any>,
> {
  /** Phase configurations - must match analysis config keys with added categories */
  phases: {
    [K in keyof TAnalysisConfig['phases']]: TAnalysisConfig['phases'][K] & CategorizationPhaseConfig<
      ExtractPhaseEntityType<TAnalysisConfig['phases'][K]>,
      string
    >;
  };
}

// ============================================================================
// Categorized Entry Patterns
// ============================================================================
// Matching patterns for categorized versions of analyzed entries

/**
 * Base categorized entry type
 * Adds category field to an analyzed entry
 *
 * @template TEntry - The analyzed entry type
 * @template TCategory - Union of possible category strings
 */
export type CategorizedEntry<
  TEntry extends AnalyzedEntry<any, any>,
  TCategory extends string,
> = Omit<TEntry, 'category'> & {
  category: TCategory;
};

/**
 * Pattern 1: Single categorized entry (non-recursive)
 * Used for context values that are single entries without children
 * Adds category field to a SingleAnalyzedEntry
 *
 * @template TEntry - The analyzed entry type (must be SingleAnalyzedEntry)
 * @template TCategory - Union of possible category strings
 *
 * @example
 * type CategorizedDefaultExport = SingleCategorizedEntry<
 *   DefaultExportUsage,
 *   'react-functional-component'
 * >;
 */
export type SingleCategorizedEntry<
  TEntry extends SingleAnalyzedEntry<any>,
  TCategory extends string,
> = CategorizedEntry<TEntry, TCategory>;

/**
 * Pattern 2: Tree categorized entry (recursive)
 * Used for context values that are tree structures with children
 * Adds category to root and recursively categorizes children
 *
 * @template TEntry - The analyzed entry type (must be TreeAnalyzedEntry)
 * @template TCategorizedSelf - The categorized child type (union of categorized entries)
 * @template TCategory - Union of possible category strings for this entry
 *
 * Note: children are recursively categorized using the TCategorizedSelf union
 *
 * @example
 * type CategorizedJSXElement = TreeCategorizedEntry<
 *   JSXElementNode,
 *   CategorizedJSXChild,
 *   JSXElementCategory
 * >;
 * where CategorizedJSXChild = CategorizedJSXElement | JSXTextNode | JSXExpressionNode
 */
export type TreeCategorizedEntry<
  TEntry extends TreeAnalyzedEntry<any, any>,
  TCategorizedSelf,
  TCategory extends string,
> = Omit<TEntry, 'category' | 'children'> & {
  category: TCategory;
  children: TCategorizedSelf[];
};

/**
 * Pattern 3: Array of categorized entries
 * Used for context values that are arrays of entries
 * Adds category to each array item
 *
 * @template TEntry - The analyzed entry type for array items
 * @template TCategory - Union of possible category strings
 *
 * @example
 * type CategorizedImports = CategorizedEntryArray<
 *   ImportUsage,
 *   'vjs-component' | 'external'
 * >;
 * // Result: Array<ImportUsage & { category: 'vjs-component' | 'external' }>
 */
export type CategorizedEntryArray<
  TEntry extends AnalyzedEntry<any, any>,
  TCategory extends string,
> = Array<CategorizedEntry<TEntry, TCategory>>;

/**
 * Extract categorized context type from config and analyzed context
 * Maps each analyzed field to its categorized version (adds 'category' property)
 *
 * Note: This is a best-effort type mapping. Runtime behavior handles:
 * - Array fields: each item gets category
 * - Single/Tree fields: root gets category, children recursively categorized
 * - Undefined fields: remain undefined
 *
 * @template TConfig - The categorization config
 * @template TAnalyzed - The analyzed context (input to categorization)
 *
 * @example
 * type Config = CategorizationConfig<{
 *   imports: CategorizationPhaseConfig<'vjs' | 'external'>;
 *   jsx: CategorizationPhaseConfig<'native' | 'component'>;
 * }>;
 *
 * type Analyzed = {
 *   imports?: ImportUsage[];
 *   jsx?: JSXUsage;
 * };
 *
 * type Result = ConfigToCategorizedContext<Config, Analyzed>;
 * // Result: {
 * //   imports?: Array<ImportUsage & { category: 'vjs' | 'external' }>;
 * //   jsx?: JSXUsage & { category: 'native' | 'component' };
 * // }
 */
export type ConfigToCategorizedContext<
  TConfig extends CategorizationConfig<any>,
  TAnalyzed,
> = {
  [K in keyof TAnalyzed]: K extends keyof TConfig['phases']
    ? TAnalyzed[K] extends Array<infer Item>
      ? Array<Item & { category: string }>
      : TAnalyzed[K] extends AnalyzedEntry<any, any>
        ? TAnalyzed[K] & { category: string }
        : TAnalyzed[K]
    : TAnalyzed[K];
};

// ============================================================================
// Generic Config Types for Projection Phase
// ============================================================================

/**
 * State-based projector function type
 * Receives categorized context and accumulated state, returns typed output
 *
 * @template TOutput - The output type for this projector
 * @template TCategorizedContext - The categorized context type (defaults to any for flexibility)
 * @template TProjected - The projection state type (defaults to any for flexibility)
 * @template TConfig - The config type (defaults to any for flexibility)
 *
 * @example
 * type ProjectImports = StateProjector<
 *   ProjectedImportEntry[],
 *   CategorizedContext,
 *   ProjectionState,
 *   CompilerConfig
 * >;
 */
export type StateProjector<
  TOutput,
  TCategorizedContext = any,
  TProjected = any,
  TConfig = any,
> = (
  context: TCategorizedContext,
  prevState: Partial<TProjected>,
  config: TConfig,
) => TOutput;

/**
 * Generic projection phase configuration
 * Maps output keys to projector functions or static values
 * Type-safe: ensures projector return types match projected state field types
 *
 * @template TProjected - The projected output shape (e.g., ProjectionState)
 *
 * @example
 * type MyProjectionConfig = ProjectionPhaseConfig<{
 *   imports: ProjectedImportEntry[];
 *   elementName: string;
 *   styleVariableName: string;
 * }>;
 * // Each key can be:
 * // - StateProjector<T> function that returns the field type
 * // - Static value of the field type
 */
export type ProjectionPhaseConfig<TProjected> = {
  [K in keyof TProjected]?:
    | StateProjector<NonNullable<TProjected[K]>>
    | NonNullable<TProjected[K]>;
};

/**
 * Generic projection configuration
 * Builds upon a CategorizationConfig by adding projection phase
 * Each config layer extends the previous: Analysis → Categorization → Projection
 *
 * @template TCategorizationConfig - The categorization config this builds upon
 * @template TProjected - The projected output shape
 *
 * Note: This interface is structurally compatible with CategorizationConfig
 * but adds optional projectionState field
 *
 * @example
 * type MyAnalysisConfig = AnalysisConfig<{
 *   imports: AnalysisPhaseConfig<ImportUsage[]>;
 * }>;
 *
 * type MyCategorizationConfig = CategorizationConfig<MyAnalysisConfig>;
 *
 * type MyProjectionConfig = ProjectionConfig<
 *   MyCategorizationConfig,
 *   { imports: ProjectedImportEntry[]; html: ProjectedHTML[] }
 * >;
 * // Result includes phases from categorization + projectionState field
 */
export interface ProjectionConfig<
  TCategorizationConfig extends CategorizationConfig<any>,
  TProjected,
> {
  /** Phase configurations from categorization */
  phases: TCategorizationConfig['phases'];

  /** Projection phase configuration - maps output keys to projectors/values */
  projectionState?: ProjectionPhaseConfig<TProjected>;
}

/**
 * Generic compiler configuration
 * Complete configuration for the entire compilation pipeline
 * Extends ProjectionConfig by adding module composition function
 *
 * @template TCategorizationConfig - The categorization config this builds upon
 * @template TProjected - The projected output shape
 *
 * This is the top-level config interface that compile() expects.
 * Individual configs can extend this and add additional fields
 * (e.g., classNameProjectors, custom projection helpers, etc.)
 */
export interface CompilerConfig<
  TCategorizationConfig extends CategorizationConfig<any> = CategorizationConfig<any>,
  TProjected = any,
> extends ProjectionConfig<TCategorizationConfig, TProjected> {
  /**
   * Module composition function
   * Takes complete projection state and composes it into final output
   * This is the final step that converts projected data into the target format
   *
   * @param projectionState - Complete projection state with all fields populated
   * @returns Final module source code as a string
   */
  composeModule?: (projectionState: TProjected) => string;
}
