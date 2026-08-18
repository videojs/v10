import { defineStyles } from '../define';

const fillBase = [
  'absolute inset-y-0 left-0 rounded-[inherit]',
  'data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:top-auto data-[orientation=vertical]:bottom-0 data-[orientation=vertical]:w-auto',
];

export default defineStyles({
  role: 'sliders',
  styles: {
    slider: [
      'group/slider relative flex min-h-media-control min-w-20 flex-1 cursor-pointer items-center justify-center outline-none',
      'data-[orientation=vertical]:h-20 data-[orientation=vertical]:w-media-control data-[orientation=vertical]:min-w-0',
    ],
    sliderTrack: [
      'relative h-media-slider-track w-full overflow-hidden rounded-media-pill bg-media-slider-track',
      'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-media-slider-track',
    ],
    sliderFill: [...fillBase, 'w-(--media-slider-fill) bg-current data-[orientation=vertical]:h-(--media-slider-fill)'],
    sliderBuffer: [
      ...fillBase,
      'w-(--media-slider-buffer) bg-media-slider-buffer',
      'data-[orientation=vertical]:h-(--media-slider-buffer)',
    ],
    sliderThumb: [
      'absolute top-1/2 left-(--media-slider-fill) size-media-slider-thumb -translate-x-1/2 -translate-y-1/2 rounded-media-pill bg-current',
      'data-[orientation=vertical]:top-[calc(100%-var(--media-slider-fill))] data-[orientation=vertical]:left-1/2',
    ],
    sliderPreview: 'relative',
    sliderValue: 'tabular-nums',
    spinnerIcon: 'size-media-icon drop-shadow-media-icon',
    thumbnail: 'absolute bottom-[calc(100%+0.75rem)] overflow-hidden rounded-media-surface',
    thumbnailImage: 'block max-h-28 max-w-48',
  },
});
