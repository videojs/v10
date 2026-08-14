/** Live video player preset — same features as `video` with a skin that omits duration / current-time displays. */
'use client';

export { liveVideoFeatures } from '@videojs/core/dom';
export { Video, type VideoProps } from '@/media/video';
export * from './minimal-skin';
export * from './minimal-skin.tailwind';
export { LiveVideoPlayer, usePlayer } from './player';
export * from './skin';
export * from './skin.tailwind';
