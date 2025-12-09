/**
 * Categorization
 *
 * Phase 2: Categorization
 * Main categorization function that analyzes usage context
 * Pure function - no AST traversal, uses predicates and configuration
 */

import type {
  AnalyzedContext,
  CategorizationConfig,
  ConfigToCategorizedContext,
  Predicate,
} from '../types';

/**
 * Generic categorization function for any concern - array overload
 * Handles arrays of entities
 * Finds first category where all predicates pass
 * Falls back to category with empty predicates (catch-all category)
 */
function categorizeConcern<
  TEntity,
  TCategory extends string,
  TContext,
>(
  entities: TEntity[],
  categories: Record<string, Predicate<TEntity, TContext>[]>,
  context: TContext,
): (TEntity & { category: TCategory })[];

/**
 * Generic categorization function for any concern - single entity overload
 * Handles single entity
 */
function categorizeConcern<
  TEntity,
  TCategory extends string,
  TContext,
>(
  entities: TEntity,
  categories: Record<string, Predicate<TEntity, TContext>[]>,
  context: TContext,
): TEntity & { category: TCategory };

/**
 * Generic categorization function implementation
 * Config-driven categorization using predicate matching
 * Handles flat arrays, single entities, and recursive tree structures
 */
function categorizeConcern<
  TEntity,
  TCategory extends string,
  TContext,
>(
  entities: TEntity | TEntity[],
  categories: Record<string, Predicate<TEntity, TContext>[]>,
  context: TContext,
): (TEntity & { category: TCategory }) | (TEntity & { category: TCategory })[] {
  // Find fallback category (category with empty predicates array)
  const fallbackEntry = Object.entries(categories).find(([_, predicates]) => predicates.length === 0);

  // Helper to categorize single entity
  const categorizeSingle = (entity: TEntity): TEntity & { category: TCategory } => {
    // Find first category where all predicates pass
    const entry = Object.entries(categories).find(([_categoryName, predicates]) =>
      predicates.length > 0 && predicates.every(pred => pred(entity, context)),
    );

    // Use matched category, or fallback category, or throw error
    const category = entry?.[0] ?? fallbackEntry?.[0];

    if (!category) {
      throw new Error('No matching category found and no fallback category defined (category with empty predicates)');
    }

    // Check if entity has children array (tree structure)
    const hasChildren = entity
      && typeof entity === 'object'
      && 'children' in entity
      && Array.isArray((entity as any).children);

    if (hasChildren) {
      // Recursively categorize children
      // Only categorize children that themselves need categorization (have 'node' property)
      // Pass through other children unchanged (e.g., text, expressions)
      const entityWithChildren = entity as any;
      const categorizedChildren = entityWithChildren.children.map((child: any) => {
        if (child && typeof child === 'object' && 'node' in child) {
          return categorizeSingle(child);
        }
        return child;
      });

      return {
        ...entity,
        category: category as TCategory,
        children: categorizedChildren,
      };
    }

    return {
      ...entity,
      category: category as TCategory,
    };
  };

  // Handle arrays vs single entities
  return Array.isArray(entities)
    ? entities.map(categorizeSingle)
    : categorizeSingle(entities);
}

/**
 * Categorize all imports, className values, JSX elements, and default export from analyzed context
 *
 * Generic function that preserves all fields from the input context (like projection)
 * while transforming the usage analysis fields to categorized results
 *
 * The return type is automatically inferred from the config's phases:
 * each phase with categories transforms analyzed fields by adding 'category' property
 *
 * @param context - Context from Phase 1 (analyzed usage, may include additional fields like projection)
 * @param config - Categorization configuration with phases
 * @returns Categorized context with all input fields preserved and analyzed fields categorized
 */
export function categorize<
  TInput extends AnalyzedContext<any>,
  TConfig extends CategorizationConfig<any>,
>(
  context: TInput,
  config: TConfig,
): TInput & ConfigToCategorizedContext<TConfig, TInput> {
  return {
    ...context as any,
    ...Object.fromEntries(
      (Object.keys(config.phases) as Array<string & keyof TConfig['phases']>)
        // Filter out undefined values and concerns without categories
        .filter((k) => {
          const value = (context as any)[k];
          const hasCategories = !!config.phases[k].categories;
          return value !== undefined && hasCategories;
        })
        .map((k) => {
          const value = (context as any)[k];
          const categories = config.phases[k].categories;

          // Generic categorization handles arrays, single entities, and recursive trees
          return [k, categorizeConcern(value, categories, context)];
        }),
    ),
  } as TInput & ConfigToCategorizedContext<TConfig, TInput>;
}
