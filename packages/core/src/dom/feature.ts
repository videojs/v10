import type { DerivedContext, SliceConfig } from '@videojs/store';
import { isFunction } from '@videojs/utils/predicate';

import type { AnyPlayerFeature, PlayerFeature, PlayerFeatureConfig, PlayerTarget } from './player';

type DerivedFunctions<State> = Record<string, (ctx: DerivedContext<State>) => void>;
interface PlayerConfigStore {
  readonly constructor: Function;
}

type DerivedValues<Definitions extends Record<string, (...args: never[]) => void>> = {
  [Key in keyof Definitions]: ReturnType<Definitions[Key]>;
};

type PlayerFeatureDefinition<State, Derived, Config extends PlayerFeatureConfig> = Omit<
  SliceConfig<PlayerTarget, State, Derived>,
  'preserve'
> & {
  config?: Config;
};

/** Define a player feature with derived state and optional configuration inputs. */
export function definePlayerFeature<
  State,
  const Definitions extends DerivedFunctions<State>,
  const Config extends PlayerFeatureConfig = Record<never, never>,
>(
  definition: Omit<PlayerFeatureDefinition<State, DerivedValues<Definitions>, Config>, 'derived'> & {
    derived: Definitions;
  }
): PlayerFeature<State, DerivedValues<Definitions>, Config>;
/** Define a player feature with optional configuration inputs. */
export function definePlayerFeature<State, const Config extends PlayerFeatureConfig = Record<never, never>>(
  definition: Omit<PlayerFeatureDefinition<State, object, Config>, 'derived'> & { derived?: never }
): PlayerFeature<State, object, Config>;
export function definePlayerFeature<State>(
  definition: PlayerFeatureDefinition<State, object, PlayerFeatureConfig>
): PlayerFeature<State> {
  const preserved = Object.values(definition.config ?? {}).map((entry) => entry.state);

  const feature = /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ {
    ...definition,
  } as PlayerFeature<State>;
  if (preserved.length > 0) Object.assign(feature, { preserve: preserved });
  return feature;
}

/** Merge the configuration declarations from the selected player features. */
export function combinePlayerFeatureConfigs(features: readonly AnyPlayerFeature[]): PlayerFeatureConfig {
  const definitions = features.map((feature) => feature.config ?? {});

  if (__DEV__) {
    const seen = new Set<string>();
    for (const definition of definitions) {
      for (const key of Object.keys(definition)) {
        if (seen.has(key)) {
          console.warn(`[vjs-core] duplicate config key "${key}" — later feature overwrites earlier one`);
        }
        seen.add(key);
      }
    }
  }

  return Object.assign({}, ...definitions);
}

/** Forward one configuration input through its feature-owned private action. */
export function setPlayerConfigValue<Value>(
  store: PlayerConfigStore,
  entry: PlayerFeatureConfig[string],
  value: Value
): void {
  if (!(entry.action in store)) {
    throw new TypeError(`Missing config action "${String(entry.action)}"`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(store, entry.action);
  const action = descriptor?.get ? descriptor.get.call(store) : descriptor?.value;
  if (!isFunction(action)) {
    throw new TypeError(`Missing config action "${String(entry.action)}"`);
  }
  action(value);
}
