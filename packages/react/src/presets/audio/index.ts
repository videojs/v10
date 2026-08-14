/** Audio-only player preset with playback and volume controls. */
'use client';

export { audioFeatures } from '@videojs/core/dom';
export { Audio, type AudioProps } from '@/media/audio';
export * from './minimal-skin';
export * from './minimal-skin.tailwind';
export { AudioPlayer, usePlayer } from './player';
export * from './skin';
export * from './skin.tailwind';
