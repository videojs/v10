import { videoFeatures as coreVideoFeatures, createVolumeFeature, volumeFeature } from '@videojs/core/dom';
import { localStorageAdapter } from '@/storage';

const volumeWithStorage = createVolumeFeature(localStorageAdapter);

export const videoFeatures = coreVideoFeatures.map((f) =>
  f === volumeFeature ? volumeWithStorage : f
) as typeof coreVideoFeatures;
