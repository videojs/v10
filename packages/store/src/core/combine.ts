import type { AttachContext, InferSliceState, Slice, StateContext, UnionSliceState } from './slice';

/**
 * Combines multiple slices into a single slice.
 *
 * @param slices - The slices to combine.
 * @returns A new slice that represents the combination of the input slices.
 */
export function combine<Target, const Slices extends Slice<Target, any>[]>(
  ...slices: Slices
): Slice<Target, UnionSliceState<Slices>> {
  return {
    state: (ctx: StateContext<Target>) => {
      const states = slices.map((slice) => slice.state(ctx));
      return Object.assign({}, ...states) as UnionSliceState<Slices>;
    },

    attach: (ctx: AttachContext<Target, UnionSliceState<Slices>>) => {
      for (const slice of slices) {
        try {
          slice.attach?.(ctx as AttachContext<Target, InferSliceState<typeof slice>>);
        } catch (err) {
          ctx.reportError(err);
        }
      }
    },
  };
}
