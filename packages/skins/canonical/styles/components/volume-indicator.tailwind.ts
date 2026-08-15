import { defineStyles } from '../define';

export default defineStyles({
  role: 'overlays',
  styles: {
    volumeIndicator: [
      'group/volume-status pointer-events-none absolute top-3 w-[min(80%,12rem)] rounded-media-pill bg-black/25 font-medium',
      'transition-[opacity,scale,translate] duration-100 ease-out',
      'data-starting-style:scale-90 data-starting-style:opacity-0',
      'data-ending-style:-translate-y-1/4 data-ending-style:scale-90 data-ending-style:opacity-0',
    ],
    volumeIndicatorFill: [
      'flex w-full items-center justify-between gap-2 rounded-[inherit] px-2.5 py-1',
      'bg-left bg-no-repeat [background-image:linear-gradient(currentColor,currentColor)]',
      '[background-size:var(--media-volume-fill,0%)_100%] transition-[background-size] duration-200 ease-linear',
    ],
    volumeIndicatorIcon: 'hidden shrink-0',
    volumeIndicatorValue: 'ml-auto',
    volumeHighIndicatorIcon: 'group-data-[level=high]/volume-status:block',
    volumeLowIndicatorIcon: 'group-data-[level=low]/volume-status:block',
    volumeOffIndicatorIcon: 'group-data-[level=off]/volume-status:block',
  },
});
