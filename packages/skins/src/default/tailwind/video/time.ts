import { cn } from '@videojs/utils/style';
import { time as baseTime } from '../components/time';

export const group = cn(
  baseTime.group,
  'grow-0 shrink-0 basis-full order-[-1] px-2.5',
  '@2xl/media-container:grow @2xl/media-container:shrink @2xl/media-container:basis-0 @2xl/media-container:order-[unset]'
);
export const current = baseTime.current;
export const duration = baseTime.duration;
