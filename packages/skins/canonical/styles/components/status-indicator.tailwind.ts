import { defineStyles, variants } from '../define';
import { defaultSurface } from './popup.tailwind';

export default defineStyles({
  role: 'indicator',
  styles: {
    statusIndicator: variants({
      base: [
        'group/input-status pointer-events-none flex items-center gap-2 font-medium',
        'transition-[opacity,scale,translate] duration-100 ease-out motion-reduce:duration-50',
        'data-starting-style:opacity-0 data-ending-style:opacity-0',
      ],
      variants: {
        default: [
          ...defaultSurface,
          'absolute top-3 rounded-media-control bg-black/25 px-2.5 py-1',
          'data-starting-style:scale-90',
          'data-ending-style:-translate-y-1/4 data-ending-style:scale-90',
        ],
        minimal: [
          'absolute inset-x-0 top-0 w-full justify-center px-2.5 pt-3 pb-32',
          'status-indicator-gradient',
          'data-starting-style:scale-100 data-ending-style:scale-100 motion-safe:data-ending-style:-translate-y-full',
        ],
      },
    }),
    statusIndicatorIcon: 'hidden shrink-0',
    statusIndicatorValue: 'ml-auto',
    statusCaptionsOnIcon: 'group-data-[status=captions-on]/input-status:block',
    statusCaptionsOffIcon: 'group-data-[status=captions-off]/input-status:block',
    statusFullscreenEnterIcon: 'group-data-[status=fullscreen]/input-status:block',
    statusFullscreenExitIcon: 'group-data-[status=exit-fullscreen]/input-status:block',
    statusPipEnterIcon: 'group-data-[status=pip]/input-status:block',
    statusPipExitIcon: 'group-data-[status=exit-pip]/input-status:block',
    playbackStatusIndicator: variants({
      base: [
        'group/playback-status col-start-2 row-start-1 grid place-content-center p-4 text-center',
        'transition-[opacity,scale] duration-200 ease-out motion-reduce:duration-50 data-starting-style:scale-85 data-starting-style:opacity-0',
        'data-ending-style:scale-85 data-ending-style:opacity-0 data-ending-style:duration-100 motion-reduce:data-ending-style:duration-50',
      ],
      variants: { default: 'rounded-media-control bg-black/35 backdrop-blur-sm', minimal: '' },
    }),
    playbackStatusIcon: 'hidden size-media-icon-lg',
    statusPlayIcon:
      'group-data-[status=play]/playback-status:block group-data-[status=play]/playback-status:translate-x-px',
    statusPauseIcon: 'group-data-[status=pause]/playback-status:block',
  },
});
