import { createStore as createZustandStore } from 'zustand';
import type {
  FeatureConfig,
  FeatureCreator,
  FeatureStore,
  InferTargetsFromCreators,
  MergeFeatureActions,
  MergeFeatureStates,
  SubscribeFn,
  Targets,
} from './types';

export function createFeature<T extends Targets>() {
  return <S extends object, A extends object>(creator: FeatureCreator<T, S, A>) => creator;
}

// Array of feature creators (Zustand-style slices) — infers T from creators, merged state/actions
export function createStore<const Creators extends readonly FeatureCreator<any, any, any>[]>(
  featureCreators: Creators
): FeatureStore<InferTargetsFromCreators<Creators>, MergeFeatureStates<Creators>, MergeFeatureActions<Creators>> {
  type T = InferTargetsFromCreators<Creators>;
  type S = MergeFeatureStates<Creators>;
  type A = MergeFeatureActions<Creators>;

  const config = mergeConfigs(...featureCreators.map((c) => c()));
  const targetKeys = Object.keys(config.subscribe ?? {}) as (keyof T)[];

  const targets: Partial<T> = {};
  const abortControllers = new Map<keyof T, AbortController>();

  const hasAllTargets = (): boolean => {
    return targetKeys.every((k) => targets[k] != null);
  };

  const getTargets = (): T | null => (hasAllTargets() ? (targets as T) : null);

  const update = () => {
    const t = getTargets();
    if (t) {
      const snapshot = config.getSnapshot?.(t);
      if (snapshot) {
        store.setState({ ...store.getState(), ...snapshot });
      }
    }
  };

  const subscribeToTarget = (key: keyof T) => {
    const t = getTargets();
    if (!t) return;

    const subscribeFn = config.subscribe?.[key];
    if (!subscribeFn) return;

    abortControllers.get(key)?.abort();

    const controller = new AbortController();
    abortControllers.set(key, controller);

    subscribeFn(t, update, controller.signal);
  };

  const buildInitialActions = (): A => {
    if (targetKeys.length === 0) {
      return config.actions({} as T) as A;
    }

    const actionKeys = Object.keys(config.actions({} as T));
    const noops = {} as A;
    for (const key of actionKeys) {
      (noops as Record<string, () => void>)[key] = () => {
        throw new Error(`Cannot call action "${key}" - targets not set`);
      };
    }
    return noops;
  };

  const store = createZustandStore<S & A>()(() => ({
    ...config.initialState,
    ...buildInitialActions(),
  }));

  const attach = (newTargets: Partial<{ [K in keyof T]: T[K] | null }>) => {
    for (const key of Object.keys(newTargets) as (keyof T)[]) {
      const target = newTargets[key];

      abortControllers.get(key)?.abort();
      abortControllers.delete(key);

      if (target == null) {
        delete targets[key];
      } else {
        targets[key] = target;
      }
    }

    if (hasAllTargets()) {
      for (const key of targetKeys) {
        subscribeToTarget(key);
      }
      store.setState({
        ...store.getState(),
        ...config.getSnapshot?.(targets as T),
        ...config.actions(targets as T, (partial) => store.setState(partial as Partial<S & A>)),
      });
    } else {
      store.setState(buildInitialActions());
    }
  };

  return Object.assign(store, { attach });
}

const mergeConfigs = <T extends Targets, S extends object, A extends object>(
  ...configs: FeatureConfig<T, S, A>[]
): FeatureConfig<T, S, A> => ({
  initialState: Object.assign({}, ...configs.map((c) => c.initialState)) as S,
  getSnapshot: (targets: T) => Object.assign({}, ...configs.map((c) => c.getSnapshot?.(targets))) as S,
  subscribe: configs.reduce<{ [K in keyof T]?: SubscribeFn<T> }>((acc, c) => {
    for (const key in c.subscribe) {
      const fn = c.subscribe[key];
      if (typeof fn !== 'function') continue;
      const prev = acc[key] as SubscribeFn<T>;
      acc[key] = prev
        ? (targets: T, update: () => void, signal: AbortSignal) => {
            prev(targets, update, signal);
            fn?.(targets, update, signal);
          }
        : fn;
    }
    return acc;
  }, {}),
  actions: (targets, getState) => Object.assign({}, ...configs.map((c) => c.actions(targets, getState))),
});
