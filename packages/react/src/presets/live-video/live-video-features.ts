import { liveVideoFeatures as coreLiveVideoFeatures, createVolumeFeature, volumeFeature } from '@videojs/core/dom';
import { localStorageAdapter } from '@/storage';

const volumeWithStorage = createVolumeFeature(localStorageAdapter);

export const liveVideoFeatures = coreLiveVideoFeatures.map((f) =>
  f === volumeFeature ? volumeWithStorage : f
) as typeof coreLiveVideoFeatures;
