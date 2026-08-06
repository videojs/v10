import {
  type AttachContext,
  type DerivedContext,
  defineSlice,
  type SliceConfig,
  type StateContext,
} from '@videojs/store';
import { isUndefined } from '@videojs/utils/predicate';
import type { AnyPlayerFeature, PlayerFeature, PlayerFeatureConfig, PlayerTarget } from './player';

export interface ConfigurablePlayerFeature<Config, State> extends PlayerFeature<State> {
  (config?: Config): PlayerFeature<State>;
}

export interface ConfigurablePlayerFeatureConfig<Config, State>
  extends Omit<SliceConfig<PlayerTarget, State>, 'attach' | 'derived' | 'preserve' | 'state'> {
  state: (ctx: StateContext<PlayerTarget>, config: Config) => State;
  attach?: (ctx: AttachContext<PlayerTarget, State>, config: Config) => void;
}

const definePlayerSlice = defineSlice<PlayerTarget>();

type DerivedFunctions<State> = Record<string, (ctx: DerivedContext<State>) => unknown>;

type DerivedValues<Definitions extends Record<string, (...args: any[]) => unknown>> = {
  [Key in keyof Definitions]: ReturnType<Definitions[Key]>;
};

type StaticPlayerFeatureConfig<State, Derived, Config extends PlayerFeatureConfig> = Omit<
  SliceConfig<PlayerTarget, State, Derived>,
  'preserve'
> & {
  config?: Config;
};

/** Define a static player feature with derived state and optional configuration inputs. */
export function definePlayerFeature<
  State,
  const Definitions extends DerivedFunctions<State>,
  const Config extends PlayerFeatureConfig = Record<never, never>,
>(
  definition: Omit<StaticPlayerFeatureConfig<State, DerivedValues<Definitions>, Config>, 'derived'> & {
    derived: Definitions;
  }
): PlayerFeature<State, DerivedValues<Definitions>, Config>;
/** Define a static player feature with optional configuration inputs. */
export function definePlayerFeature<State, const Config extends PlayerFeatureConfig = Record<never, never>>(
  definition: Omit<StaticPlayerFeatureConfig<State, object, Config>, 'derived'> & { derived?: never }
): PlayerFeature<State, object, Config>;
/**
 * Define the legacy factory-configured form used by static feature variants.
 * Currently used for orientation lock and scheduled for removal in #1942.
 */
export function definePlayerFeature<Config, State>(
  definition: ConfigurablePlayerFeatureConfig<Config, State>,
  defaultConfig: Config
): ConfigurablePlayerFeature<Config, State>;
export function definePlayerFeature<Config, State>(
  definition:
    | StaticPlayerFeatureConfig<State, object, PlayerFeatureConfig>
    | ConfigurablePlayerFeatureConfig<Config, State>,
  defaultConfig?: Config
): PlayerFeature<State> | ConfigurablePlayerFeature<Config, State> {
  if (arguments.length === 1) {
    const feature = definition as StaticPlayerFeatureConfig<State, object, PlayerFeatureConfig>;
    const preserved = Object.values(feature.config ?? {}).map((entry) => entry.state);

    return {
      ...feature,
      ...(preserved.length > 0 ? { preserve: preserved } : {}),
    } as PlayerFeature<State>;
  }

  const { name, state, attach } = definition as ConfigurablePlayerFeatureConfig<Config, State>;

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
export function setPlayerConfigValue(store: object, entry: PlayerFeatureConfig[string], value: unknown): void {
  const action = (store as Record<PropertyKey, unknown>)[entry.action];
  if (typeof action !== 'function') {
    throw new TypeError(`Missing config action "${String(entry.action)}"`);
  }
  action(value);
}
