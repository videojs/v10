/** Live audio player preset — same features as `audio` with a skin that omits duration / current-time displays. */
'use client';

export { liveAudioFeatures } from '@videojs/core/dom';
export { Audio, type AudioProps } from '@/media/audio';
export * from './minimal-skin';
export * from './minimal-skin.tailwind';
export { LiveAudioPlayer, usePlayer } from './player';
export * from './skin';
export * from './skin.tailwind';
