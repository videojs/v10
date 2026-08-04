import type {
  AnySlice,
  AttachContext,
  InferSliceSourceState,
  InferSliceTarget,
  Slice,
  StateContext,
  UnionSliceConfig,
  UnionSliceDerivedState,
  UnionSliceSourceState,
} from './slice';

/**
 * Combines multiple slices into a single slice.
 *
 * @param slices - The slices to combine.
 * @returns A new slice that represents the combination of the input slices.
 */
export function combine<const Slices extends readonly AnySlice[]>(
  ...slices: Slices
): Slice<
  InferSliceTarget<Slices[number]>,
  UnionSliceSourceState<Slices>,
  UnionSliceConfig<Slices>,
  UnionSliceDerivedState<Slices>
> {
  type SourceState = UnionSliceSourceState<Slices>;
  type Config = UnionSliceConfig<Slices>;
  type Target = InferSliceTarget<Slices[number]>;

  const configs = slices.map((slice) => slice.config ?? {});
  const derivedDefinitions = slices.map((slice) => slice.derived ?? {});

  if (__DEV__) {
    warnDuplicates('config', configs);
    warnDuplicates('derived', derivedDefinitions);
  }

  return {
    config: Object.assign({}, ...configs) as Config,

    state: (ctx: StateContext<Target, Config>) => {
      const states = slices.map((slice) => slice.state(ctx));

      if (__DEV__) {
        warnDuplicates('state', states);
        warnOverlaps(states, derivedDefinitions);
      }

      return Object.assign({}, ...states) as SourceState;
    },

    derived: Object.assign({}, ...derivedDefinitions) as any,

    attach: (ctx: AttachContext<Target, SourceState>) => {
      for (const slice of slices) {
        try {
          slice.attach?.(ctx as AttachContext<Target, InferSliceSourceState<typeof slice>>);
        } catch (err) {
          ctx.reportError(err);
        }
      }
    },
  };
}

function warnDuplicates(namespace: string, objects: readonly object[]): void {
  const seen = new Set<PropertyKey>();

  for (const object of objects) {
    for (const key of Reflect.ownKeys(object)) {
      if (seen.has(key)) {
        console.warn(
          `[vjs-store] combine(): duplicate ${namespace} key "${String(key)}" — later slice overwrites earlier one`
        );
      }
      seen.add(key);
    }
  }
}

function warnOverlaps(states: readonly object[], derivedDefinitions: readonly object[]): void {
  const stateKeys = new Set(states.flatMap((state) => Reflect.ownKeys(state)));

  for (const key of new Set(derivedDefinitions.flatMap((derived) => Reflect.ownKeys(derived)))) {
    if (stateKeys.has(key)) {
      console.warn(
        `[vjs-store] combine(): state and derived key "${String(key)}" overlap — derived state overwrites source state`
      );
    }
  }
}
