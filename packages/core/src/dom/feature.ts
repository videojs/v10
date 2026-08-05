import {
  type AttachContext,
  type DerivedContext,
  defineSlice,
  type SliceConfig,
  type StateContext,
} from '@videojs/store';
import { isUndefined } from '@videojs/utils/predicate';
import type {
  AnyPlayerFeature,
  PlayerFeature,
  PlayerProviderBinding,
  PlayerProviderDefinition,
  PlayerTarget,
} from './player';

export interface ConfigurablePlayerFeature<Config, State> extends PlayerFeature<State> {
  (config?: Config): PlayerFeature<State>;
}

export interface ConfigurablePlayerFeatureConfig<Config, State>
  extends Omit<SliceConfig<PlayerTarget, State>, 'attach' | 'derived' | 'preserveOnDetach' | 'state'> {
  state: (ctx: StateContext<PlayerTarget>, config: Config) => State;
  attach?: (ctx: AttachContext<PlayerTarget, State>, config: Config) => void;
}

const definePlayerSlice = defineSlice<PlayerTarget>();

type DerivedFunctions<State> = Record<string, (ctx: DerivedContext<State>) => unknown>;

type DerivedValues<Definitions extends Record<string, (...args: any[]) => unknown>> = {
  [Key in keyof Definitions]: ReturnType<Definitions[Key]>;
};

type StaticPlayerFeatureConfig<State, Derived, Provider extends PlayerProviderDefinition> = Omit<
  SliceConfig<PlayerTarget, State, Derived>,
  'preserveOnDetach'
> & {
  provider?: Provider;
};

/** Define a static player feature with derived state and optional provider inputs. */
export function definePlayerFeature<
  State,
  const Definitions extends DerivedFunctions<State>,
  const Provider extends PlayerProviderDefinition = Record<never, never>,
>(
  config: Omit<StaticPlayerFeatureConfig<State, DerivedValues<Definitions>, Provider>, 'derived'> & {
    derived: Definitions;
  }
): PlayerFeature<State, DerivedValues<Definitions>, Provider>;
/** Define a static player feature with optional provider inputs. */
export function definePlayerFeature<State, const Provider extends PlayerProviderDefinition = Record<never, never>>(
  config: Omit<StaticPlayerFeatureConfig<State, object, Provider>, 'derived'> & { derived?: never }
): PlayerFeature<State, object, Provider>;
/**
 * Define the legacy factory-configured form used by static feature variants.
 * Currently used for orientation lock and scheduled for removal in #1942.
 */
export function definePlayerFeature<Config, State>(
  config: ConfigurablePlayerFeatureConfig<Config, State>,
  defaultConfig: Config
): ConfigurablePlayerFeature<Config, State>;
export function definePlayerFeature<Config, State>(
  config:
    | StaticPlayerFeatureConfig<State, object, PlayerProviderDefinition>
    | ConfigurablePlayerFeatureConfig<Config, State>,
  defaultConfig?: Config
): PlayerFeature<State> | ConfigurablePlayerFeature<Config, State> {
  if (arguments.length === 1) {
    const feature = config as StaticPlayerFeatureConfig<State, object, PlayerProviderDefinition>;
    const preserved = Object.values(feature.provider ?? {}).map((binding) => binding.state);

    return {
      ...feature,
      ...(preserved.length > 0 ? { preserveOnDetach: preserved } : {}),
    } as PlayerFeature<State>;
  }

  const { name, state, attach } = config as ConfigurablePlayerFeatureConfig<Config, State>;

  const forConfig = (featureConfig: Config): PlayerFeature<State> =>
    definePlayerSlice({
      ...(isUndefined(name) ? {} : { name }),
      state: (ctx) => state(ctx, featureConfig),
      ...(attach ? { attach: (ctx) => attach(ctx, featureConfig) } : {}),
    });

  const defaultFeature = forConfig(defaultConfig as Config);
  const feature = ((featureConfig?: Config) =>
    isUndefined(featureConfig) ? defaultFeature : forConfig(featureConfig)) as ConfigurablePlayerFeature<Config, State>;

  feature.state = defaultFeature.state;
  if (defaultFeature.attach) feature.attach = defaultFeature.attach;
  if (!isUndefined(name)) Object.defineProperty(feature, 'name', { value: name });

  return feature;
}

/** Merge the provider declarations from the selected player features. */
export function combinePlayerProviderDefinitions(features: readonly AnyPlayerFeature[]): PlayerProviderDefinition {
  const definitions = features.map((feature) => feature.provider ?? {});

  if (__DEV__) {
    const seen = new Set<string>();
    for (const definition of definitions) {
      for (const key of Object.keys(definition)) {
        if (seen.has(key)) {
          console.warn(`[vjs-core] duplicate provider key "${key}" — later feature overwrites earlier one`);
        }
        seen.add(key);
      }
    }
  }

  return Object.assign({}, ...definitions);
}

/** Forward one provider input through its feature-owned private action. */
export function setPlayerProviderValue(store: object, binding: PlayerProviderBinding, value: unknown): void {
  const action = (store as Record<PropertyKey, unknown>)[binding.action];
  if (typeof action !== 'function') {
    throw new TypeError(`Missing provider action "${String(binding.action)}"`);
  }
  action(value);
}
