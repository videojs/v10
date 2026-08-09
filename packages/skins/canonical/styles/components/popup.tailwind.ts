import { defineStyles } from '../define';

export default defineStyles({
  role: 'popups',
  styles: {
    surface: 'bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface',
    tooltip: [
      'm-0 whitespace-nowrap rounded-media-pill border-0 px-2.5 py-[0.35rem]',
      'data-open:flex data-open:items-center data-open:gap-1',
    ],
    tooltipShortcut: 'text-[0.75em] font-semibold',
    volumePopover: 'm-0 rounded-media-pill border-0 py-3',
  },
});
