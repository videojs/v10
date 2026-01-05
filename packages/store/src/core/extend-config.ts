import type { AnySlice } from './slice';
import type { StoreConfig } from './store';

import { uniqBy } from '@videojs/utils/array';
import { composeCallbacks } from '@videojs/utils/function';

/**
 * Extends a base store config with additional configuration.
 *
 * Both configs must have slices targeting the same type (e.g., HTMLMediaElement).
 *
 * - **slices**: Deduplicated by id, keeping last occurrence (extension wins)
 * - **onSetup/onAttach/onError**: Both called (base first, then extension)
 * - **queue/state**: Extension overrides base if provided
 *
 * @example
 * ```ts
 * const baseConfig = { slices: [media.playback] };
 *
 * // Extend with custom slice (must target same type)
 * const extendedConfig = extendConfig(baseConfig, {
 *   slices: [chaptersSlice],
 *   onSetup: (ctx) => console.log('Extended setup'),
 * });
 * ```
 */
export function extendConfig<Target, BaseSlices extends AnySlice<Target>[], ExtSlices extends AnySlice<Target>[] = []>(
  base: StoreConfig<Target, BaseSlices>,
  extension?: Partial<StoreConfig<Target, ExtSlices>>,
): StoreConfig<Target, [...BaseSlices, ...ExtSlices]> {
  type MergedSlices = [...BaseSlices, ...ExtSlices];
  type Result = StoreConfig<Target, MergedSlices>;

  if (!extension) {
    return base as unknown as Result;
  }

  return {
    slices: uniqBy([...base.slices, ...(extension.slices ?? [])] as MergedSlices, slice => slice.id),

    // Extension overrides if provided
    queue: extension.queue ?? base.queue,
    state: extension.state ?? base.state,

    // Compose lifecycle hooks (both called, base first)
    onSetup: composeCallbacks(base.onSetup, extension.onSetup as typeof base.onSetup),
    onAttach: composeCallbacks(base.onAttach, extension.onAttach as typeof base.onAttach),
    onError: composeCallbacks(base.onError, extension.onError as typeof base.onError),
  } as unknown as Result;
}
