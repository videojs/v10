import { uniqBy } from '@videojs/utils/array';
import { composeCallbacks } from '@videojs/utils/function';
import type { AnyFeature } from './feature';
import type { StoreConfig } from './store';

/**
 * Extends a base store config with additional configuration.
 *
 * Both configs must have features targeting the same type (e.g., HTMLMediaElement).
 *
 * - **features**: Deduplicated by id, keeping last occurrence (extension wins)
 * - **onSetup/onAttach/onError**: Both called (base first, then extension)
 * - **queue/state**: Extension overrides base if provided
 *
 * @example
 * ```ts
 * const baseConfig = { features: [media.playback] };
 *
 * // Extend with custom feature (must target same type)
 * const extendedConfig = extendConfig(baseConfig, {
 *   features: [chaptersFeature],
 *   onSetup: (ctx) => console.log('Extended setup'),
 * });
 * ```
 */
export function extendConfig<
  Target,
  BaseFeatures extends AnyFeature<Target>[],
  ExtFeatures extends AnyFeature<Target>[] = [],
>(
  base: StoreConfig<Target, BaseFeatures>,
  extension?: Partial<StoreConfig<Target, ExtFeatures>>
): StoreConfig<Target, [...BaseFeatures, ...ExtFeatures]> {
  type MergedFeatures = [...BaseFeatures, ...ExtFeatures];
  type Result = StoreConfig<Target, MergedFeatures>;

  if (!extension) {
    return base as unknown as Result;
  }

  return {
    features: uniqBy([...base.features, ...(extension.features ?? [])] as MergedFeatures, (feature) => feature.id),

    // Extension overrides if provided
    queue: extension.queue ?? base.queue,

    // Compose lifecycle hooks (both called, base first)
    onSetup: composeCallbacks(base.onSetup, extension.onSetup as typeof base.onSetup),
    onAttach: composeCallbacks(base.onAttach, extension.onAttach as typeof base.onAttach),
    onError: composeCallbacks(base.onError, extension.onError as typeof base.onError),
  } as unknown as Result;
}
