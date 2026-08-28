import { styles } from 'vjsc/styles';

const defaultSurface = [
  'text-white backdrop-blur-lg backdrop-saturate-150',
  'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
  'after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1),inset_0_0_0_1px_rgb(255_255_255/0.05)]',
  '[@media(prefers-reduced-transparency:reduce)]:bg-black [@media(prefers-reduced-transparency:reduce)]:ring-1 [@media(prefers-reduced-transparency:reduce)]:ring-transparent',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  '[@media(prefers-reduced-transparency:reduce)]:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'contrast-more:bg-black contrast-more:ring-1 contrast-more:ring-transparent contrast-more:backdrop-filter-none',
  'contrast-more:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'forced-colors:bg-[Canvas] forced-colors:ring-1 forced-colors:ring-[CanvasText]',
  'forced-colors:after:shadow-[inset_0_1px_0_0_CanvasText,inset_0_0_0_1px_CanvasText]',
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/15',
  'contrast-more:shadow-sm contrast-more:shadow-black/15',
  'forced-colors:shadow-sm forced-colors:shadow-black/15',
  'bg-white/10',
] as const;

const defaultAudioFeedbackSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-none! ring-0! after:hidden!',
  'backdrop-blur-lg backdrop-saturate-150',
  '[@media(prefers-reduced-transparency:reduce)]:bg-[light-dark(white,black)]!',
  'contrast-more:bg-[light-dark(white,black)]!',
] as const;

const minimalAudioFeedbackSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-none! ring-0! after:hidden! backdrop-filter-none!',
] as const;

const defaultAudioPopup = [
  'inset-0! h-full max-h-none! w-full! max-w-none! translate-none! flex-row items-center gap-3 rounded-[99px] px-5! py-0! pe-1!',
  '[color:var(--media-audio-text-color)]! transition-[opacity,filter]! duration-250!',
  'data-starting-style:scale-100! data-starting-style:blur-xs',
  'data-ending-style:scale-100! data-ending-style:blur-xs',
] as const;

const minimalAudioPopup = [
  'inset-0! h-full max-h-none! w-full! max-w-none! translate-none! flex-row items-center gap-4 rounded-[99px] px-3! py-0! pe-1!',
  '[color:var(--media-audio-text-color)]! transition-[opacity,filter,scale]! duration-250!',
  'data-starting-style:blur-xs data-ending-style:blur-xs',
] as const;

export default styles({
  file: 'dialog.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-dialog-root',
      utilities: '',
    },
    backdrop: {
      className: 'media-dialog-backdrop',
      utilities: [
        'absolute inset-0 z-40 bg-black/20 backdrop-blur-lg opacity-100 backdrop-saturate-150',
        'not-data-open:hidden transition-opacity delay-100 ease-out motion-reduce:duration-50',
        'data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:delay-0',
        'motion-reduce:delay-0',
      ],
      variants: {
        default: 'duration-350 data-ending-style:duration-250 motion-reduce:data-ending-style:duration-50',
        minimal:
          'backdrop-saturate-120 duration-150 data-ending-style:duration-50 motion-reduce:data-ending-style:duration-50',
        'default-audio': 'hidden!',
        'minimal-audio': 'hidden!',
        'default-live-audio': 'hidden!',
        'minimal-live-audio': 'hidden!',
      },
    },
    popup: {
      className: 'media-dialog-popup',
      utilities: [
        'absolute top-1/2 left-1/2 z-50 flex max-h-[calc(100%-0.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 outline-none not-data-open:hidden',
        'transition-[opacity,scale] delay-100 ease-out motion-reduce:duration-50',
        'data-starting-style:scale-95 data-starting-style:opacity-0',
        'data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:delay-0',
        'motion-reduce:delay-0',
      ],
      variants: {
        default: [
          ...defaultSurface,
          'w-[calc(100%-1.5rem)] max-w-72 rounded-[1.75rem] p-3 text-white',
          'text-shadow-[0_1px_0_rgb(0_0_0/0.25)] duration-350 data-ending-style:duration-250 motion-reduce:data-ending-style:duration-50',
        ],
        minimal: [
          'w-full max-w-64 p-4 text-white',
          'text-shadow-[0_1px_0_rgb(0_0_0/0.5)] duration-150 data-ending-style:duration-50 motion-reduce:data-ending-style:duration-50',
        ],
        'default-audio': [...defaultAudioFeedbackSurface, ...defaultAudioPopup],
        'default-live-audio': [...defaultAudioFeedbackSurface, ...defaultAudioPopup],
        'minimal-audio': [...minimalAudioFeedbackSurface, ...minimalAudioPopup],
        'minimal-live-audio': [...minimalAudioFeedbackSurface, ...minimalAudioPopup],
      },
    },
    content: {
      className: 'media-dialog-content',
      utilities: 'flex min-h-0 flex-col gap-2 overflow-y-auto',
      variants: {
        default: 'px-2 pt-2 pb-1.5',
        minimal: 'py-1.5',
        'default-audio': 'flex-1 flex-row items-center gap-2 overflow-visible px-0! py-0!',
        'minimal-audio': 'flex-1 flex-row items-center gap-2 overflow-visible px-0! py-0!',
        'default-live-audio': 'flex-1 flex-row items-center gap-2 overflow-visible px-0! py-0!',
        'minimal-live-audio': 'flex-1 flex-row items-center gap-2 overflow-visible px-0! py-0!',
      },
    },
    title: {
      className: 'media-dialog-title',
      utilities: 'm-0 text-media-lg font-semibold leading-tight',
    },
    description: {
      className: 'media-dialog-description',
      utilities: 'm-0 opacity-70 wrap-anywhere',
    },
    actions: {
      className: 'media-dialog-actions',
      utilities: 'flex shrink-0 gap-2',
    },
    close: {
      className: 'media-dialog-close',
      utilities: 'w-full flex-1 bg-media-accent! px-4 py-2 font-medium text-media-accent-text!',
      variants: {
        default: 'h-9',
        minimal: 'h-9.5',
        'default-audio': 'w-auto flex-none px-3',
        'minimal-audio': 'w-auto flex-none px-3',
        'default-live-audio': 'w-auto flex-none px-3',
        'minimal-live-audio': 'w-auto flex-none px-3',
      },
    },
  },
});
