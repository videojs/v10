import { type AttachContext, defineSlice, type SliceConfig, type StateContext } from '@videojs/store';
import { isUndefined } from '@videojs/utils/predicate';

import type { PlayerFeature, PlayerTarget } from './media/types';

export interface ConfigurablePlayerFeature<Config, State> extends PlayerFeature<State> {
  (config?: Config): PlayerFeature<State>;
}

export interface ConfigurablePlayerFeatureConfig<Config, State>
  extends Omit<SliceConfig<PlayerTarget, State>, 'attach' | 'state'> {
  state: (ctx: StateContext<PlayerTarget>, config: Config) => State;
  attach?: (ctx: AttachContext<PlayerTarget, State>, config: Config) => void;
}

const definePlayerSlice = defineSlice<PlayerTarget>();

export function definePlayerFeature<State>(config: SliceConfig<PlayerTarget, State>): PlayerFeature<State>;
export function definePlayerFeature<Config, State>(
  config: ConfigurablePlayerFeatureConfig<Config, State>,
  defaultConfig: Config
): ConfigurablePlayerFeature<Config, State>;
export function definePlayerFeature<Config, State>(
  config: SliceConfig<PlayerTarget, State> | ConfigurablePlayerFeatureConfig<Config, State>,
  defaultConfig?: Config
): PlayerFeature<State> | ConfigurablePlayerFeature<Config, State> {
  if (arguments.length === 1) {
    return definePlayerSlice(config as SliceConfig<PlayerTarget, State>);
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
