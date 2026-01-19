'use client';

import type { AnySlice, StoreConfig } from '@videojs/store';

import { media } from '@videojs/core/dom';
import { extendConfig as extendBaseConfig } from '@videojs/store';
import { createStore } from '@videojs/store/react';

const baseConfig = {
  slices: [...media.all],
  displayName: 'FrostedSkin',
};

/**
 * Extends frosted skin config.
 *
 * @example
 * ```ts
 * import { createStore } from '@videojs/store/react';
 * import { extendConfig } from '@videojs/react/skins/frosted';
 * import { chaptersSlice } from './slices/chapters';
 *
 * const { Provider, useSnapshot } = createStore(
 *   extendConfig({ slices: [chaptersSlice] })
 * );
 * ```
 */
export function extendConfig<S extends AnySlice<HTMLMediaElement>[] = []>(
  extension?: Partial<StoreConfig<HTMLMediaElement, S>>,
) {
  return extendBaseConfig(baseConfig, extension);
}

export const { Provider, create, useStore, useSnapshot, useRequest, useTasks } = createStore(baseConfig);
