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
    volumeIndicatorMinimal: [
      'inset-x-0 top-0 w-full justify-center rounded-none bg-transparent px-2.5 pt-3 pb-32 shadow-none [backdrop-filter:none] after:hidden',
      '[background-image:linear-gradient(to_bottom,oklch(0_0_0/0.35),oklch(0_0_0/0.2)_3rem,transparent)]',
      'data-starting-style:scale-100 data-ending-style:scale-100 motion-safe:data-ending-style:-translate-y-full',
    ],
    volumeIndicatorFill: [
      'flex w-full items-center justify-between gap-2 rounded-[inherit] px-2.5 py-1',
      'bg-left bg-no-repeat [background-image:linear-gradient(currentColor,currentColor)]',
      '[background-size:var(--media-volume-fill,0%)_100%] transition-[background-size] duration-200 ease-linear',
    ],
    volumeIndicatorFillMinimal: 'w-[min(80%,14rem)] bg-black/25 shadow-media-surface',
    volumeIndicatorIcon: 'hidden shrink-0',
    volumeIndicatorValue: 'ml-auto',
    volumeHighIndicatorIcon: 'group-data-[level=high]/volume-status:block',
    volumeLowIndicatorIcon: 'group-data-[level=low]/volume-status:block',
    volumeOffIndicatorIcon: 'group-data-[level=off]/volume-status:block',
  },
});
