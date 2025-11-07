/**
 * Module Projection
 *
 * Phase 3: Projection/Transformation
 * Generic projection function that applies all configured projectors
 * Config-driven - iterates through config.projectionState entries
 */

import type { ProjectionPhaseConfig, StateProjector } from '../types';

/**
 * Helper to apply a projection state config value
 * Handles both projector functions and static values
 * Generic over context, projected state, and config types
 */
function applyProjectionValue<
  T,
  TContext,
  TProjected,
  TConfig,
>(
  value: StateProjector<T, TContext, TProjected, TConfig> | T,
  context: TContext,
  prevState: Partial<TProjected>,
  config: TConfig,
): T {
  // Check if it's a function (projector)
  if (typeof value === 'function') {
    return (value as StateProjector<T, TContext, TProjected, TConfig>)(context, prevState, config);
  }
  // Otherwise it's a static value
  return value as T;
}

/**
 * Project categorized context through all projection concerns
 * Generic implementation - iterates through config.projectionState entries
 * Uses reducer pattern: each projector receives accumulated state via prevState
 *
 * @template TInput - Input context type (any object, projectionState will be added)
 * @template TConfig - Config type (must have projectionState field)
 * @template TProjected - Projected output shape type
 *
 * @param context - Categorized context from Phase 2 (projectionState optional, defaults to empty)
 * @param config - Projection configuration with projectionState field
 * @returns Context with completed projection state
 */
export function projectModule<
  TInput extends Record<string, any>,
  TConfig extends { projectionState?: ProjectionPhaseConfig<TProjected> },
  TProjected = any,
>(
  context: TInput,
  config: TConfig,
): TInput & { projectionState: TProjected } {
  if (!config.projectionState) {
    throw new Error('Projection requires config.projectionState to be defined');
  }

  // Initialize projection state if not present (context may not have projectionState at all)
  const initialState = (context.projectionState as Partial<TProjected> | undefined) ?? ({} as Partial<TProjected>);

  const projectionState = (Object.keys(config.projectionState) as Array<string & keyof TProjected>)
    .reduce((projectionState, k) => {
      const value = config.projectionState![k];
      return {
        ...projectionState,
        [k]: applyProjectionValue<any, TInput, TProjected, TConfig>(value as any, context, projectionState, config),
      };
    }, initialState) as TProjected;

  // Return context with completed projection state
  return {
    ...context,
    projectionState,
  };
}

/**
 * Main projection phase function
 * Orchestrates Phase 3: applies projectors and composes final output
 *
 * This is the high-level phase entry point that:
 * 1. Calls projectModule to populate projection state
 * 2. Calls config.composeModule to generate final output
 *
 * @template TInput - Input context type (typically categorized context from Phase 2)
 * @template TProjected - Projected output shape type
 * @template TConfig - Config type (must have projectionState and composeModule)
 *
 * @param context - Categorized context from Phase 2
 * @param config - Projection configuration with projectionState and composeModule
 * @returns Final composed output string
 */
export function project<
  TInput extends Record<string, any>,
  TProjected = any,
  TConfig extends {
    projectionState?: ProjectionPhaseConfig<TProjected>;
    composeModule?: (projectionState: TProjected) => string;
  } = {
    projectionState?: ProjectionPhaseConfig<TProjected>;
    composeModule?: (projectionState: TProjected) => string;
  },
>(
  context: TInput,
  config: TConfig,
): string {
  // Phase 3a: Projection - transform to output structure
  // projectModule initializes projectionState if not present
  const projectedContext = projectModule<TInput, TConfig, TProjected>(context, config);

  // Phase 3b: Composition - compose final module from projection state
  // projectModule guarantees all accumulator fields are populated
  if (!config.composeModule) {
    throw new Error('composeModule is required in compiler configuration');
  }
  return config.composeModule(projectedContext.projectionState);
}
