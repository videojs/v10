import { liveAudioFeatures as coreLiveAudioFeatures, createVolumeFeature, volumeFeature } from '@videojs/core/dom';
import { localStorageAdapter } from '@/storage';

const volumeWithStorage = createVolumeFeature(localStorageAdapter);

export const liveAudioFeatures = coreLiveAudioFeatures.map((f) =>
  f === volumeFeature ? volumeWithStorage : f
) as typeof coreLiveAudioFeatures;
