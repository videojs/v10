import type { AnyFeature, StoreConfig } from '@videojs/store';

import { media } from '@videojs/core/dom';
import { extendConfig as extendBaseConfig } from '@videojs/store';
import { createStore } from '@videojs/store/lit';

const baseConfig = {
  features: [...media.all],
};

/**
 * Extends frosted skin config.
 *
 * @example
 * ```ts
 * import { createStore } from '@videojs/store/lit';
 * import { extendConfig, FrostedSkinElement } from '@videojs/html/skins/frosted';
 * import { chaptersFeature } from './features/chapters';
 *
 * const { StoreMixin } = createStore(
 *   extendConfig({ features: [chaptersFeature] })
 * );
 *
 * FrostedSkinElement.define('my-player', El => StoreMixin(El));
 * ```
 */
export function extendConfig<Features extends AnyFeature<HTMLMediaElement>[] = []>(
  extension?: Partial<StoreConfig<HTMLMediaElement, Features>>,
) {
  return extendBaseConfig(baseConfig, extension);
}

export const {
  StoreMixin,
  StoreProviderMixin,
  StoreAttachMixin,
  StateController,
  RequestController,
  TasksController,
  create,
} = createStore(baseConfig);
