import { defineStyles } from '../define';

export default defineStyles({
  role: 'overlays',
  styles: {
    statusIndicator: [
      'group/input-status pointer-events-none absolute top-3 flex items-center gap-2 rounded-media-pill bg-black/25 px-2.5 py-1 font-medium',
      'transition-[opacity,scale,translate] duration-100 ease-out',
      'data-starting-style:scale-90 data-starting-style:opacity-0',
      'data-ending-style:-translate-y-1/4 data-ending-style:scale-90 data-ending-style:opacity-0',
    ],
    statusIndicatorIcon: 'hidden shrink-0',
    statusIndicatorValue: 'ml-auto',
    statusCaptionsOnIcon: 'group-data-[status=captions-on]/input-status:block',
    statusCaptionsOffIcon: 'group-data-[status=captions-off]/input-status:block',
    statusFullscreenEnterIcon: 'group-data-[status=fullscreen]/input-status:block',
    statusFullscreenExitIcon: 'group-data-[status=exit-fullscreen]/input-status:block',
    statusPipEnterIcon: 'group-data-[status=pip]/input-status:block',
    statusPipExitIcon: 'group-data-[status=exit-pip]/input-status:block',
    playbackStatusIndicator: [
      'group/playback-status col-start-2 row-start-1 grid place-content-center rounded-media-pill bg-black/35 p-4 text-center backdrop-blur-sm',
      'transition-[opacity,scale] duration-200 ease-out data-starting-style:scale-[0.85] data-starting-style:opacity-0',
      'data-ending-style:scale-[0.85] data-ending-style:opacity-0 data-ending-style:duration-100',
      'motion-reduce:duration-50',
    ],
    playbackStatusIcon: 'hidden size-[calc(var(--media-icon-size)*1.5)]',
    statusPlayIcon:
      'group-data-[status=play]/playback-status:block group-data-[status=play]/playback-status:translate-x-px',
    statusPauseIcon: 'group-data-[status=pause]/playback-status:block',
  },
});
