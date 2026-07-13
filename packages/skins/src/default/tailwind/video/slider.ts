import { cn } from '@videojs/utils/style';
import { track as baseTrack } from '../components/slider';
import { surface } from '../components/surface';
import { thumbnail as baseThumbnail } from '../components/thumbnail';

export * from '../components/slider';

export const track = cn(baseTrack, 'bg-white/20 ring-1 ring-black/5');

export const thumbnail = cn(
  baseThumbnail.root,
  surface,
  '[--media-slider-thumbnail-max-width:11rem] [--media-slider-thumbnail-padding:-1.125rem] [--media-slider-thumbnail-inset:calc((100cqi-100%)/2)]',
  'absolute [left:clamp(calc(var(--media-slider-thumbnail-max-width)/2+var(--media-slider-thumbnail-padding)-var(--media-slider-thumbnail-inset)),var(--media-slider-pointer),calc(100%-var(--media-slider-thumbnail-max-width)/2-var(--media-slider-thumbnail-padding)+var(--media-slider-thumbnail-inset)))] bottom-[calc(100%+1.2rem)] -translate-x-1/2',
  'opacity-0 scale-80 blur-sm origin-bottom',
  'transition-[scale,opacity,filter] duration-150',
  'has-[[role=img]:not([data-hidden])]:group-data-pointing/slider:opacity-100',
  'has-[[role=img]:not([data-hidden])]:group-data-pointing/slider:scale-100',
  'has-[[role=img]:not([data-hidden])]:group-data-pointing/slider:blur-none',
  'has-[[role=img][data-loading]]:max-h-24'
);
export const thumbnailImage = cn(baseThumbnail.image, 'max-w-(--media-slider-thumbnail-max-width)');
export const thumbnailTime = baseThumbnail.time;
export const spinner = baseThumbnail.spinner;
