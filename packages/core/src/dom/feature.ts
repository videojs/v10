import { combine, type DerivedContext, type SliceConfig, type StateContext } from '@videojs/store';
import type { AnyPlayerFeature, PlayerFeature, PlayerFeatureConfig, PlayerTarget } from './player';

type DerivedFunctions<State> = Record<string, (ctx: DerivedContext<State>) => unknown>;

type DerivedValues<Definitions extends Record<string, (...args: any[]) => unknown>> = {
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

  return {
    ...definition,
    ...(preserved.length > 0 ? { preserve: preserved } : {}),
  } as PlayerFeature<State>;
}

/**
 * Strictly compose player features into the slice and configuration consumed by
 * framework player factories.
 *
 * Player state is a flat public namespace, so ambiguous ownership is rejected
 * before a store can publish an overwritten value. Configuration inputs use
 * their own flat namespace and are checked independently from player state.
 * Configuration collisions throw while the features are composed. Source and
 * derived state collisions throw later, when a store initializes the returned
 * slice with its real state context; feature state factories are not probed.
 *
 * @param features - The player features to validate and combine.
 * @throws A `TypeError` when an effective key has more than one owner.
 */
export function combinePlayerFeatures<const Features extends readonly AnyPlayerFeature[]>(features: Features) {
  const selectedFeatures = [...features] as [...Features];
  const selectedDefinitions = selectedFeatures.map((feature, index) => ({
    derivedKeys: Object.keys(feature.derived ?? {}),
    owner: { index, name: feature.name },
  }));
  const config = combineStrictPlayerFeatureConfigs(selectedFeatures);
  const slice = combine(...selectedFeatures);

  // Preserve the exact object returned by combine() so any runtime metadata
  // associated with that slice remains intact.
  slice.state = ((ctx: StateContext<PlayerTarget>) => {
    const states = selectedFeatures.map((feature) => feature.state(ctx));
    const owners = new Map<PropertyKey, FeatureKeyOwner>();

    for (const [index, definition] of selectedDefinitions.entries()) {
      registerKeys(owners, enumerableOwnKeys(Object(states[index])), 'source state', definition.owner);
      registerKeys(owners, definition.derivedKeys, 'derived state', definition.owner);
    }

    return Object.assign({}, ...states);
  }) as typeof slice.state;

  return { slice, config };
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

type FeatureKeyNamespace = 'source state' | 'derived state' | 'config';

interface FeatureOwner {
  index: number;
  name?: string | undefined;
}

interface FeatureKeyOwner extends FeatureOwner {
  namespace: FeatureKeyNamespace;
}

function combineStrictPlayerFeatureConfigs(features: readonly AnyPlayerFeature[]): PlayerFeatureConfig {
  const owners = new Map<PropertyKey, FeatureKeyOwner>();

  for (const [index, feature] of features.entries()) {
    registerKeys(owners, Object.keys(feature.config ?? {}), 'config', { index, name: feature.name });
  }

  return Object.assign({}, ...features.map((feature) => feature.config ?? {}));
}

function enumerableOwnKeys(object: object): PropertyKey[] {
  return Reflect.ownKeys(object).filter((key) => Object.prototype.propertyIsEnumerable.call(object, key));
}

function registerKeys(
  owners: Map<PropertyKey, FeatureKeyOwner>,
  keys: readonly PropertyKey[],
  namespace: FeatureKeyNamespace,
  owner: FeatureOwner
): void {
  for (const key of keys) {
    const previous = owners.get(key);
    const next = { ...owner, namespace };

    if (previous) throwFeatureKeyCollision(key, previous, next);
    owners.set(key, next);
  }
}

function throwFeatureKeyCollision(key: PropertyKey, first: FeatureKeyOwner, second: FeatureKeyOwner): never {
  throw new TypeError(
    `[vjs-core] Cannot compose player features: key ${formatKey(key)} conflicts between namespace "${first.namespace}" owned by ${formatOwner(first)} and namespace "${second.namespace}" owned by ${formatOwner(second)}.`
  );
}

function formatKey(key: PropertyKey): string {
  return typeof key === 'string' ? JSON.stringify(key) : String(key);
}

function formatOwner(owner: FeatureOwner): string {
  const position = owner.index + 1;
  return owner.name ? `feature ${JSON.stringify(owner.name)} (#${position})` : `anonymous feature #${position}`;
}
