import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/controls.css',
  prefix: 'video-controls',
  rules: {
    backdrop: {
      utilities:
        'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7),rgba(0,0,0,0.2),rgba(0,0,0,0.5))] not-data-visible:hidden forced-colors:bg-none',
    },
    content: {
      utilities: [
        'group/controls pointer-events-none absolute inset-0 z-30',
        'transition-opacity duration-media-base ease-out not-data-visible:opacity-0 motion-reduce:transition-none',
      ],
    },
    center: {
      utilities: [
        'group-not-data-visible/controls:pointer-events-none pointer-events-auto absolute left-1/2 top-1/2 hidden transform-[translate(-50%,-50%)] items-center rtl:flex-row-reverse gap-3 media-360:flex',
        'media-opaque:rounded-lg media-opaque:bg-media-background forced-colors:bg-transparent!',
      ],
    },
    top: {
      utilities: [
        'group-not-data-visible/controls:pointer-events-none pointer-events-auto absolute end-3 top-2.5 flex items-center gap-1',
        'media-opaque:rounded-lg media-opaque:bg-media-background forced-colors:rounded-lg forced-colors:bg-[Canvas]',
        'forced-colors:inset-x-0 forced-colors:top-0 forced-colors:justify-end forced-colors:rounded-none! forced-colors:px-3 forced-colors:py-2.5',
        'forced-colors:end-0',
      ],
    },
    centerButton: {
      utilities: [
        'bg-[rgba(0,0,0,0.4)]! media-opaque:bg-media-background! forced-colors:bg-[ButtonFace]!',
        'hover:bg-[rgba(0,0,0,0.85)]! focus-visible:bg-[rgba(0,0,0,0.85)]! aria-expanded:bg-[rgba(0,0,0,0.85)]!',
        'media-opaque:hover:bg-media-foreground! media-opaque:focus-visible:bg-media-foreground! media-opaque:aria-expanded:bg-media-foreground!',
        'forced-colors:hover:bg-[Highlight]! forced-colors:focus-visible:bg-[Highlight]! forced-colors:aria-expanded:bg-[Highlight]!',
      ],
    },
    centerPlay: {
      utilities: 'size-[58px]!',
    },
    centerPlayIcon: {
      utilities: 'size-7!',
    },
    centerSeek: {
      utilities: 'hidden size-9! pointer-fine:grid',
    },
    centerSeekIcon: {
      utilities: 'size-[18px]',
    },
    bottom: {
      utilities: [
        'group-not-data-visible/controls:pointer-events-none pointer-events-auto absolute inset-x-2 bottom-2 flex flex-col gap-0',
        'media-opaque:rounded-lg media-opaque:bg-media-background forced-colors:rounded-lg forced-colors:bg-[Canvas]',
      ],
    },
    videoBottom: {
      utilities:
        'forced-colors:inset-x-0 forced-colors:bottom-0 forced-colors:rounded-none! forced-colors:px-2 forced-colors:py-2',
    },
    sliderRow: {
      utilities: 'w-full',
    },
    row: {
      utilities: 'flex items-center rtl:flex-row-reverse justify-between gap-2',
    },
    group: {
      utilities: 'flex items-center rtl:flex-row-reverse gap-1',
    },
    start: {
      utilities: 'min-w-0',
    },
  },
});
