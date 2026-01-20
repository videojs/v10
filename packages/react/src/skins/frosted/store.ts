'use client';

import type { AnyFeature, StoreConfig } from '@videojs/store';

import { media } from '@videojs/core/dom';
import { extendConfig as extendBaseConfig } from '@videojs/store';
import { createStore } from '@videojs/store/react';

const baseConfig = {
  features: [...media.all],
  displayName: 'FrostedSkin',
};

/**
 * Extends frosted skin config.
 *
 * @example
 * ```ts
 * import { createStore } from '@videojs/store/react';
 * import { extendConfig } from '@videojs/react/skins/frosted';
 * import { chaptersFeature } from './features/chapters';
 *
 * const { Provider, useSnapshot } = createStore(
 *   extendConfig({ features: [chaptersFeature] })
 * );
 * ```
 */
export function extendConfig<S extends AnyFeature<HTMLMediaElement>[] = []>(
  extension?: Partial<StoreConfig<HTMLMediaElement, S>>,
) {
  return extendBaseConfig(baseConfig, extension);
}

export const { Provider, create, useStore, useSnapshot, useRequest, useTasks } = createStore(baseConfig);
