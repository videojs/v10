import type { AnySlice, StoreConfig } from '@videojs/store';

import { media } from '@videojs/core/dom';
import { extendConfig as extendBaseConfig } from '@videojs/store';
import { createStore } from '@videojs/store/lit';

const baseConfig = {
  slices: [...media.all],
};

/**
 * Extends frosted skin config.
 *
 * @example
 * ```ts
 * import { createStore } from '@videojs/store/lit';
 * import { extendConfig, FrostedSkinElement } from '@videojs/html/skins/frosted';
 * import { chaptersSlice } from './slices/chapters';
 *
 * const { StoreMixin } = createStore(
 *   extendConfig({ slices: [chaptersSlice] })
 * );
 *
 * FrostedSkinElement.define('my-player', El => StoreMixin(El));
 * ```
 */
export function extendConfig<Slices extends AnySlice<HTMLMediaElement>[] = []>(
  extension?: Partial<StoreConfig<HTMLMediaElement, Slices>>,
) {
  return extendBaseConfig(baseConfig, extension);
}

export const {
  StoreMixin,
  StoreProviderMixin,
  StoreAttachMixin,
  SelectorController,
  RequestController,
  TasksController,
  create,
} = createStore(baseConfig);
