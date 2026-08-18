/** General-purpose video player preset with full playback controls. */
'use client';

export { videoFeatures } from '@videojs/core/dom';
export { Video, type VideoProps } from '@/media/video';
export * from './minimal-skin';
export * from './minimal-skin.tailwind';
export { usePlayer, VideoPlayer } from './player';
export * from './skin';
export * from './skin.tailwind';
