/**
 * Live video player preset — `video` minus playback rate, quality selection, and audio-track selection, plus the live
 * feature, with a skin that swaps the time slider and time displays for a Live button.
 */
'use client';

export { liveVideoFeatures } from '@videojs/core/dom';
export { Video, type VideoProps } from '@/media/video';
export * from './minimal-skin';
export * from './minimal-skin.tailwind';
export { LiveVideoPlayer, type LiveVideoPlayerProps, usePlayer } from './player';
export * from './skin';
export * from './skin.tailwind';
