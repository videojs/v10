import { audioFeatures as coreAudioFeatures, createVolumeFeature, volumeFeature } from '@videojs/core/dom';
import { localStorageAdapter } from '@/storage';

const volumeWithStorage = createVolumeFeature(localStorageAdapter);

export const audioFeatures = coreAudioFeatures.map((f) =>
  f === volumeFeature ? volumeWithStorage : f
) as typeof coreAudioFeatures;
