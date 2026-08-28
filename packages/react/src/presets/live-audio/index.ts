/**
 * Live audio player preset — `audio` minus playback rate, plus the live feature, with a skin that swaps the time slider
 * and time displays for a Live button.
 */
'use client';

export { liveAudioFeatures } from '@videojs/core/dom';
export { Audio, type AudioProps } from '@/media/audio';
export * from './minimal-skin';
export * from './minimal-skin.tailwind';
export { LiveAudioPlayer, type LiveAudioPlayerProps, usePlayer } from './player';
export * from './skin';
export * from './skin.tailwind';
