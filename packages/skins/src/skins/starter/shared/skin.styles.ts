import { styles } from 'vjsc/styles';

export default styles({
  file: 'starter/skin.css',
  prefix: 'media',
  rules: {
    root: {
      className: 'media-container',
      scopeRoot: true,
      utilities: [
        'relative block w-full overflow-hidden rounded-media-player [--spacing:var(--media-spacing)] font-media text-[13px] text-media-foreground @container/media-root',
        'after:pointer-events-none after:absolute after:inset-0 after:z-50 after:rounded-[inherit] after:border after:border-(--media-frame-border)',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-media-ring',
        '[--starter-button-highlight:rgba(255,255,255,0.15)]',
      ],
    },
    videoRoot: {
      scopeRoot: true,
      utilities: 'aspect-video bg-black',
    },
    audioRoot: {
      scopeRoot: true,
      utilities: [
        'aspect-auto overflow-visible! bg-media-background shadow-media-hairline',
        '[--starter-button-highlight:rgba(0,0,0,0.1)]!',
        'supports-[color:light-dark(red,red)]:[--starter-button-highlight:light-dark(rgba(0,0,0,0.1),rgba(255,255,255,0.1))]!',
      ],
    },
    poster: {
      utilities: 'absolute inset-0 size-full not-data-visible:hidden',
    },
    posterImage: {
      utilities: 'size-full object-media',
    },
    buffering: {
      utilities:
        'pointer-events-none absolute inset-0 grid place-items-center not-data-visible:hidden not-data-visible:[--media-spinner-animation:none]',
    },
    spinner: {
      utilities: 'size-7',
    },
    button: {
      utilities: [
        'relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-[999px] border-0 bg-transparent p-0 text-inherit transition-[background-color,filter] duration-150 ease-out',
        'hover:bg-(--starter-button-highlight) focus-visible:bg-(--starter-button-highlight) aria-expanded:bg-(--starter-button-highlight)',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-media-ring',
        'outline-none motion-reduce:transition-none aria-disabled:cursor-not-allowed aria-disabled:opacity-40 disabled:cursor-not-allowed disabled:opacity-40',
        'media-opaque:hover:bg-media-foreground media-opaque:hover:text-media-background media-opaque:focus-visible:bg-media-foreground media-opaque:focus-visible:text-media-background',
        'media-opaque:aria-expanded:bg-media-foreground media-opaque:aria-expanded:text-media-background',
        'forced-colors:border forced-colors:border-solid forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]',
        'forced-colors:forced-color-adjust-none',
        'forced-colors:hover:bg-[Highlight] forced-colors:hover:text-[HighlightText] forced-colors:focus-visible:bg-[Highlight] forced-colors:focus-visible:text-[HighlightText]',
        'forced-colors:aria-expanded:bg-[Highlight] forced-colors:aria-expanded:text-[HighlightText] forced-colors:aria-disabled:text-[GrayText] forced-colors:aria-disabled:opacity-100',
        'data-hidden:hidden',
      ],
    },
    icon: {
      utilities: 'col-start-1 row-start-1 size-[18px]',
    },
    rateTrigger: {
      utilities: 'tabular-nums',
    },
    playGroup: {
      utilities: 'group/play',
    },
    playIcon: {
      utilities: 'col-start-1 row-start-1 hidden size-[18px]',
    },
    restartIcon: {
      utilities: 'group-data-ended/play:block',
    },
    startIcon: {
      utilities: ['group-data-paused/play:block', 'group-not-data-started/play:block', 'group-data-ended/play:hidden'],
    },
    pauseIcon: {
      utilities: 'group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:block',
    },
    muteGroup: {
      utilities: 'group/mute',
    },
    mutedIcon: {
      utilities: 'hidden group-data-muted/mute:block',
    },
    volumeIcon: {
      utilities: 'hidden group-not-data-muted/mute:block',
    },
    seekContent: {
      utilities: 'relative grid',
    },
    audioSeek: {
      utilities: 'hidden media-sm:grid',
    },
    seekBackwardIcon: {
      utilities: 'transform-[scaleX(-1)]',
    },
    seekLabel: {
      // The seconds sit inside the arc the icon draws, so they are placed against it, not flowed after it.
      utilities: 'absolute bottom-[-3px] text-[9px] font-medium tracking-tighter tabular-nums',
    },
    seekBackwardLabel: {
      utilities: '-left-px',
    },
    seekForwardLabel: {
      utilities: '-right-px',
    },
    captionsGroup: {
      utilities: 'group/captions',
    },
    captionsOffIcon: {
      utilities: 'group-data-active/captions:hidden',
    },
    captionsOnIcon: {
      utilities: 'hidden group-data-active/captions:block',
    },
    castGroup: {
      utilities: 'group/cast',
    },
    castEnterIcon: {
      utilities: 'group-data-[cast-state=connected]/cast:hidden',
    },
    castExitIcon: {
      utilities: 'hidden group-data-[cast-state=connected]/cast:block',
    },
    airplayGroup: {
      utilities: 'group/airplay',
    },
    airplayEnterIcon: {
      utilities: 'group-data-[airplay-state=connected]/airplay:hidden',
    },
    airplayExitIcon: {
      utilities: 'hidden group-data-[airplay-state=connected]/airplay:block',
    },
    pipGroup: {
      utilities: 'group/pip',
    },
    pipEnterIcon: {
      utilities: 'group-data-pip/pip:hidden',
    },
    pipExitIcon: {
      utilities: 'hidden group-data-pip/pip:block',
    },
    fullscreenGroup: {
      utilities: 'group/fullscreen',
    },
    enterFullscreenIcon: {
      utilities: 'hidden group-not-data-fullscreen/fullscreen:block',
    },
    exitFullscreenIcon: {
      utilities: 'hidden group-data-fullscreen/fullscreen:block',
    },
    controlsBackdrop: {
      utilities:
        'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7),rgba(0,0,0,0.2),rgba(0,0,0,0.5))] not-data-visible:hidden forced-colors:bg-none',
    },
    controls: {
      utilities: [
        'group/controls pointer-events-none absolute inset-0 z-30',
        'transition-opacity duration-150 ease-out not-data-visible:opacity-0 motion-reduce:transition-none',
      ],
    },
    audioControls: {
      utilities: 'relative! inset-auto!',
    },
    centerControls: {
      utilities: [
        'group-not-data-visible/controls:pointer-events-none pointer-events-auto absolute left-1/2 top-1/2 hidden transform-[translate(-50%,-50%)] items-center rtl:flex-row-reverse gap-3 media-360:flex',
        'media-opaque:rounded-lg media-opaque:bg-media-background forced-colors:bg-transparent!',
      ],
    },
    controlsTop: {
      utilities: [
        'group-not-data-visible/controls:pointer-events-none pointer-events-auto absolute end-3 top-2.5 flex items-center gap-1',
        'media-opaque:rounded-lg media-opaque:bg-media-background forced-colors:rounded-lg forced-colors:bg-[Canvas]',
        'forced-colors:inset-x-0 forced-colors:top-0 forced-colors:justify-end forced-colors:rounded-none! forced-colors:px-3 forced-colors:py-2.5',
        'forced-colors:end-0',
      ],
    },
    centerButton: {
      utilities: [
        'bg-[rgba(0,0,0,0.4)] media-opaque:bg-media-background forced-colors:bg-[ButtonFace]',
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
    controlsBottom: {
      utilities: [
        'group-not-data-visible/controls:pointer-events-none pointer-events-auto absolute inset-x-2 bottom-2 flex flex-col gap-0',
        'media-opaque:rounded-lg media-opaque:bg-media-background forced-colors:rounded-lg forced-colors:bg-[Canvas]',
      ],
    },
    audioControlsBottom: {
      utilities: 'static! px-2.5 py-2',
    },
    videoControlsBottom: {
      utilities:
        'forced-colors:inset-x-0 forced-colors:bottom-0 forced-colors:rounded-none! forced-colors:px-2 forced-colors:py-2',
    },
    sliderRow: {
      utilities: 'w-full',
    },
    controlsRow: {
      utilities: 'flex items-center rtl:flex-row-reverse justify-between gap-2',
    },
    controlsGroup: {
      utilities: 'flex items-center rtl:flex-row-reverse gap-1',
    },
    controlsStart: {
      utilities: 'min-w-0',
    },
    timeGroup: {
      utilities: 'flex shrink-0 items-center rtl:flex-row-reverse gap-1 px-1.5 tabular-nums',
    },
    currentTime: {
      utilities: 'hidden media-xs:inline data-unavailable:opacity-50',
    },
    compactTime: {
      utilities: [
        'cursor-pointer rounded-sm media-xs:hidden outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-media-ring',
        'data-disabled:cursor-not-allowed data-disabled:opacity-40 forced-colors:data-disabled:text-[GrayText] forced-colors:data-disabled:opacity-100',
      ],
    },
    duration: {
      utilities: 'hidden opacity-70 media-xs:inline data-unavailable:opacity-50',
    },
    slider: {
      utilities: [
        'group/slider relative flex h-5 min-w-12 flex-1 cursor-pointer items-center',
        'data-disabled:cursor-not-allowed data-disabled:opacity-40 forced-colors:data-disabled:text-[GrayText] forced-colors:data-disabled:opacity-100',
      ],
    },
    sliderChapters: {
      utilities: 'relative flex size-full items-center',
    },
    sliderChapter: {
      utilities: [
        'absolute inset-0 flex items-center clip-media-chapter-x',
        '[--media-chapter-inset-start:0.5] [--media-chapter-inset-end:0.5]',
        'first-of-type:[--media-chapter-inset-start:0] last-of-type:[--media-chapter-inset-end:0]',
      ],
    },
    sliderTrack: {
      utilities: [
        'absolute inset-x-0 isolate h-1 rounded-[999px] forced-colors:h-1.5',
        'before:absolute before:inset-y-0 before:rounded-[999px] before:bg-current before:opacity-20 before:clip-media-chapter-track-x',
        'media-opaque:before:opacity-50! forced-colors:before:bg-[Canvas] forced-colors:before:opacity-100! forced-colors:before:forced-color-adjust-none',
        'forced-colors:before:border forced-colors:before:border-solid forced-colors:before:border-[CanvasText]',
      ],
    },
    audioSliderTrack: {
      utilities: 'before:opacity-10! forced-colors:before:opacity-100!',
    },
    sliderBuffer: {
      utilities: [
        'absolute inset-y-0 rounded-[999px] bg-current opacity-30 clip-media-x-[--media-slider-buffer]',
        'forced-colors:opacity-100! forced-colors:forced-color-adjust-none',
        'forced-colors:bg-[repeating-linear-gradient(135deg,CanvasText_0px,CanvasText_1px,Canvas_1px,Canvas_3px)]',
      ],
    },
    audioSliderBuffer: {
      utilities: 'opacity-10! forced-colors:opacity-100!',
    },
    sliderFill: {
      utilities: [
        'absolute inset-y-0 rounded-[999px] bg-media-primary clip-media-x-[--media-slider-fill] forced-colors:forced-color-adjust-none',
        'forced-colors:bg-[Canvas] forced-colors:bg-[linear-gradient(Highlight,Highlight)]',
      ],
    },
    sliderThumb: {
      utilities: [
        'absolute left-(--media-slider-fill) size-3 transform-[translateX(-50%)] rounded-[999px] bg-current',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
        'forced-colors:bg-[Highlight] forced-colors:forced-color-adjust-none',
        'forced-colors:border forced-colors:border-solid forced-colors:border-[CanvasText]',
      ],
    },
    preview: {
      utilities: [
        'pointer-events-none bottom-full grid max-w-39 origin-bottom justify-items-center gap-1',
        'opacity-0 blur-media-hidden-popup transform-[scale(var(--media-hidden-popup-scale))] transition-media-popup motion-reduce:transition-none group-data-disabled/slider:hidden',
        'group-data-pointing/slider:opacity-100 group-data-pointing/slider:filter-none group-data-pointing/slider:transform-none',
      ],
    },
    thumbnail: {
      // `<media-slider-thumbnail>` hosts a shadow root, so the image is slotted through it.
      shadowHost: true,
      utilities: 'block max-w-39 overflow-hidden rounded-md bg-[rgba(0,0,0,0.5)] shadow-lg',
    },
    thumbnailImage: {
      shadowHost: true,
      utilities: 'block',
    },
    previewMeta: {
      utilities: 'flex w-full min-w-0 justify-center px-2',
    },
    audioPreviewMeta: {
      utilities: [
        'w-auto! rounded-md bg-media-popover px-1.5! py-0.5 text-media-popover-foreground',
        '[box-shadow:0_0_0_1px_var(--media-surface-border,var(--media-border)),var(--media-shadow-surface)]',
        'media-opaque:outline forced-colors:outline',
      ],
    },
    previewLabel: {
      utilities: 'flex max-w-full min-w-0 items-center gap-2',
    },
    previewChapter: {
      utilities: 'min-w-0 truncate opacity-70 empty:hidden',
    },
    previewTime: {
      utilities: 'shrink-0 tabular-nums',
    },
    volumePopup: {
      utilities: [
        'z-20 h-24 w-7 rounded-[999px] bg-media-popover px-3.5 py-2.5 text-media-popover-foreground',
        '[box-shadow:0_0_0_1px_var(--media-surface-border,var(--media-border)),var(--media-shadow-surface)] [--media-popup-side-offset:var(--media-popover-side-offset)] [--media-popover-side-offset:24px]',
        'media-opaque:outline forced-colors:outline',
      ],
    },
    volumeSlider: {
      utilities:
        'relative flex size-full cursor-pointer justify-center data-disabled:cursor-not-allowed data-disabled:opacity-40',
    },
    volumeTrack: {
      utilities: [
        'absolute bottom-0 left-1/2 h-full w-1 transform-[translateX(-50%)] overflow-hidden rounded-[999px] bg-media-muted forced-colors:forced-color-adjust-none',
        'forced-colors:w-1.5 forced-colors:bg-[Canvas] forced-colors:border forced-colors:border-solid forced-colors:border-[CanvasText]',
      ],
    },
    volumeFill: {
      utilities:
        'absolute bottom-0 left-0 h-(--media-slider-fill) w-full rounded-[999px] bg-media-primary forced-colors:forced-color-adjust-none',
    },
    volumeThumb: {
      utilities: [
        'absolute bottom-(--media-slider-fill) left-1/2 size-3 transform-[translate(-50%,50%)] rounded-[999px] bg-current',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
        'forced-colors:bg-[Highlight] forced-colors:forced-color-adjust-none',
        'forced-colors:border forced-colors:border-solid forced-colors:border-[CanvasText]',
      ],
    },
    liveButton: {
      utilities: [
        // The shared button shell is a centred grid, so the dot and label flow into columns rather than
        // fighting it with a display override.
        'group/live grid-flow-col w-auto! items-center gap-1.5 px-2.5! text-[11px] font-semibold uppercase tracking-wider',
      ],
    },
    liveDot: {
      utilities: [
        'inline-block size-2 shrink-0 rounded-[999px] bg-current opacity-40 transition-[background-color,opacity] duration-150 ease-out motion-reduce:transition-none',
        'group-data-live-edge/live:bg-[#f43f5e] group-data-live-edge/live:opacity-100',
      ],
    },
    popup: {
      utilities: [
        'm-0 overflow-visible border-0 text-inherit',
        '[--starter-popup-scale:1] transform-[scale(var(--starter-popup-scale))] media-transitioning:opacity-0 media-transitioning:blur-media-hidden-popup media-transitioning:[--starter-popup-scale:var(--media-hidden-popup-scale)]',
        'data-starting-style:transform-[translate(var(--media-popup-translate-x-distance,0),var(--media-popup-translate-y-distance,0))_scale(var(--starter-popup-scale))]',
        'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
        'data-[side=top]:[--media-popup-translate-y-distance:var(--media-popup-translate-distance)]',
        'data-[side=bottom]:[--media-popup-translate-y-distance:calc(var(--media-popup-translate-distance)*-1)]',
        'data-[side=left]:[--media-popup-translate-x-distance:var(--media-popup-translate-distance)]',
        'data-[side=right]:[--media-popup-translate-x-distance:calc(var(--media-popup-translate-distance)*-1)]',
      ],
    },
    popupSafeArea: {
      utilities: [
        'before:pointer-events-auto before:absolute',
        'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
        'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
        'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
        'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
        'data-[side=top]:before:h-(--media-popup-side-offset) data-[side=bottom]:before:h-(--media-popup-side-offset)',
        'data-[side=left]:before:w-(--media-popup-side-offset) data-[side=right]:before:w-(--media-popup-side-offset)',
      ],
    },
    popupTransition: {
      utilities: ['transition-media-popup data-ending-style:duration-media-instant'],
    },
    menuPopup: {
      utilities: [
        'z-20 m-0 min-w-44 max-w-(--media-menu-available-width) overflow-visible rounded-lg border-0 bg-media-popover p-1 text-media-popover-foreground',
        '[box-shadow:0_0_0_1px_var(--media-surface-border,var(--media-border)),var(--media-shadow-surface)] [--media-popup-side-offset:var(--media-popover-side-offset)] [--media-popover-side-offset:24px]',
        'max-h-[min(var(--media-menu-available-height,--spacing(56)),--spacing(56))] overscroll-none',
        'h-(--media-menu-height) w-(--media-menu-width)',
        'transition-media-popup media-transitioning:transition-media-popup',
        'media-opaque:outline forced-colors:outline',
      ],
    },
    rateMenuPopup: {
      utilities: 'min-w-0!',
    },
    menuResizablePopup: {
      utilities: 'transition-media-menu-resize',
    },
    menuContent: {
      utilities: [
        'absolute max-h-full overflow-auto overscroll-none outline-hidden',
        'not-data-submenu:flex not-data-submenu:flex-col not-data-submenu:gap-0.5',
        // HTML moves pages directly into the popup, so each page clips its own sliding edge.
        '[clip-path:inset(0)] transition-[transform,filter,clip-path] duration-media-menu ease-out',
        'not-data-submenu:inset-x-1 not-data-submenu:top-1 not-data-submenu:max-h-[calc(100%-8px)]',
        'not-data-submenu:data-child-open:transform-[translateX(-100%)]',
        'not-data-submenu:data-child-open:rtl:transform-[translateX(100%)]',
        'not-data-submenu:data-child-open:[clip-path:inset(0_0_0_100%)] not-data-submenu:data-child-open:rtl:[clip-path:inset(0_100%_0_0)]',
        'not-data-submenu:data-child-open:blur-media-hidden',
        'not-data-submenu:data-child-open:before:hidden',
        'data-submenu:inset-x-0 data-submenu:top-0 data-submenu:z-10 data-submenu:p-1',
        'data-submenu:media-transitioning:pointer-events-none data-submenu:media-transitioning:overflow-hidden',
        'data-submenu:media-transitioning:transform-[translateX(100%)] data-submenu:media-transitioning:rtl:transform-[translateX(-100%)]',
        'data-submenu:media-transitioning:[clip-path:inset(0_100%_0_0)] data-submenu:media-transitioning:rtl:[clip-path:inset(0_0_0_100%)]',
        'data-submenu:media-transitioning:blur-media-hidden',
      ],
    },
    tooltipPopup: {
      utilities: [
        'pointer-events-none z-20 whitespace-nowrap rounded-md bg-media-popover px-1.5 py-0.5 text-media-popover-foreground',
        '[box-shadow:0_0_0_1px_var(--media-surface-border,var(--media-border)),var(--media-shadow-surface)] [--media-popup-side-offset:var(--media-tooltip-side-offset)] [--media-tooltip-side-offset:24px]',
        'data-open:flex data-open:items-center data-open:gap-1',
        'media-opaque:outline forced-colors:outline',
      ],
    },
    screenTooltipPopup: {
      utilities: '[--media-tooltip-side-offset:8px]!',
    },
    tooltipShortcut: {
      utilities: [
        'min-w-[1.5em] rounded-sm bg-media-muted p-[0.1em] -me-0.5 text-center text-[11px] font-semibold leading-tight font-[inherit]',
        'forced-colors:bg-black forced-colors:text-white forced-colors:forced-color-adjust-none',
      ],
    },
    title: {
      utilities: [
        'pointer-events-none absolute start-6 end-34 top-4 z-20 min-w-0 truncate text-base font-medium text-white',
        'media-opaque:bg-media-background forced-colors:bg-transparent! forced-colors:text-[CanvasText] forced-colors:z-40',
        'transition-[opacity,transform] duration-150 ease-out not-data-visible:opacity-0 motion-safe:not-data-visible:transform-[translateY(calc(var(--media-spacing)*-1))] motion-reduce:transition-none',
      ],
    },
    menuItem: {
      utilities: [
        'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-start',
        'data-[availability=unavailable]:hidden data-[availability=unsupported]:hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current',
        'data-highlighted:bg-(--starter-button-highlight) media-opaque:data-highlighted:highlight-media forced-colors:data-highlighted:highlight-media',
      ],
    },
    menuBackItem: {
      utilities: [
        'mb-0.5 flex w-full cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-1.5 text-start',
        'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current',
        'data-highlighted:bg-(--starter-button-highlight) media-opaque:data-highlighted:highlight-media forced-colors:data-highlighted:highlight-media',
      ],
    },
    menuSeparator: {
      utilities: 'my-1 block border-b border-media-muted',
    },
    menuHint: {
      utilities: 'ms-auto inline-flex min-w-0 items-center gap-1 ps-2 opacity-70',
    },
    menuHintLabel: {
      utilities: 'max-w-24 truncate',
    },
    menuTier: {
      utilities: 'ps-0.5 pt-px text-[11px] font-semibold leading-none opacity-70',
    },
    menuBadge: {
      utilities: 'rounded-sm bg-media-muted px-1.5 text-[11px] font-semibold',
    },
    menuRadioGroup: {
      utilities: 'flex flex-col gap-0.5',
    },
    menuRadioItem: {
      utilities: [
        'group/menu-radio flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5',
        'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current',
        'data-highlighted:bg-(--starter-button-highlight) media-opaque:data-highlighted:highlight-media forced-colors:data-highlighted:highlight-media',
      ],
    },
    menuIndicator: {
      utilities: 'ms-auto -me-1 shrink-0 opacity-0 group-aria-checked/menu-radio:opacity-100',
    },
    menuTriggerIcon: {
      utilities: 'size-[18px] shrink-0 opacity-70',
    },
    menuRadioIcon: {
      utilities: 'size-[18px] shrink-0 opacity-70',
    },
    menuForwardChevron: {
      utilities: 'size-4 shrink-0 opacity-70 rtl:transform-[scaleX(-1)]',
    },
    menuBackChevron: {
      utilities: 'size-4 shrink-0 transform-[rotate(180deg)] rtl:transform-none opacity-70',
    },
    settingsTrigger: {
      utilities: 'group/settings',
    },
    settingsTriggerIcon: {
      utilities:
        'transition-[transform] duration-150 ease-in-out motion-reduce:transition-none motion-safe:group-aria-expanded/settings:transform-[rotate(90deg)]',
    },
    settingsTriggerLabel: {
      utilities: 'sr-only',
    },
    indicators: {
      utilities:
        'pointer-events-none absolute inset-0 z-20 grid grid-cols-3 items-center justify-items-center forced-colors:z-40',
    },
    indicator: {
      utilities: [
        'pointer-events-none flex items-center gap-2 rounded-md bg-[rgba(0,0,0,0.5)] px-2.5 py-1',
        'media-opaque:bg-media-background media-opaque:outline media-opaque:outline-1 media-opaque:outline-current',
        'forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] forced-colors:outline forced-colors:outline-1 forced-colors:outline-[CanvasText]',
        'transition-[opacity,transform] duration-150 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0',
        'motion-safe:data-starting-style:transform-[scale(0.95)] motion-safe:data-ending-style:transform-[scale(0.95)]',
        'motion-reduce:transition-none',
      ],
    },
    seekIndicator: {
      utilities: [
        'group/seek-status col-start-2 row-start-1 mx-3 flex-col justify-center gap-1!',
        'data-[direction=backward]:col-start-1 data-[direction=backward]:justify-self-start rtl:data-[direction=backward]:col-start-3 rtl:data-[direction=backward]:justify-self-end',
        'data-[direction=forward]:col-start-3 data-[direction=forward]:justify-self-end rtl:data-[direction=forward]:col-start-1 rtl:data-[direction=forward]:justify-self-start',
      ],
    },
    seekIndicatorIcon: {
      utilities: 'size-[18px] group-data-[direction=backward]/seek-status:transform-[scaleX(-1)]',
    },
    seekIndicatorValue: {
      utilities: 'tabular-nums',
    },
    statusIndicator: {
      utilities: 'group/input-status col-start-2 row-start-1 self-start mt-3',
    },
    statusIcon: {
      utilities: 'hidden size-[18px] shrink-0',
    },
    captionsOnStatusIcon: {
      utilities: 'group-data-[status=captions-on]/input-status:block',
    },
    captionsOffStatusIcon: {
      utilities: 'group-data-[status=captions-off]/input-status:block',
    },
    fullscreenEnterStatusIcon: {
      utilities: 'group-data-[status=fullscreen]/input-status:block',
    },
    fullscreenExitStatusIcon: {
      utilities: 'group-data-[status=exit-fullscreen]/input-status:block',
    },
    pipEnterStatusIcon: {
      utilities: 'group-data-[status=pip]/input-status:block',
    },
    pipExitStatusIcon: {
      utilities: 'group-data-[status=exit-pip]/input-status:block',
    },
    volumeIndicator: {
      utilities: [
        'group/volume-status col-start-2 row-start-1 mt-2.5 h-9 w-[min(70%,11rem)] self-start overflow-hidden',
        'rounded-[999px]! bg-[rgba(255,255,255,0.2)]! p-0! text-white',
        'media-opaque:bg-black! media-opaque:outline media-opaque:outline-1 media-opaque:outline-white',
        'forced-colors:bg-[Canvas]! forced-colors:text-[CanvasText] forced-colors:forced-color-adjust-none',
      ],
    },
    volumeIndicatorFill: {
      // The fill paints from the left in white, so the icon inside it reads
      // dark on the filled part and light on the rest.
      utilities: [
        'flex size-full items-center rtl:flex-row-reverse gap-2 rounded-[inherit] px-2.5 py-1 bg-left bg-no-repeat bg-[linear-gradient(white,white)]',
        'bg-size-[var(--media-volume-fill,0%)_100%] transition-[background-size] duration-150 ease-linear motion-reduce:transition-none',
        'forced-colors:bg-[linear-gradient(CanvasText,CanvasText)]',
      ],
    },
    volumeStatusIcon: {
      utilities: [
        'hidden size-[18px] shrink-0 opacity-50 mix-blend-difference media-opaque:opacity-100',
        'forced-colors:rounded-[999px] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] forced-colors:opacity-100 forced-colors:mix-blend-normal',
      ],
    },
    volumeHighStatusIcon: {
      utilities: 'group-data-[level=high]/volume-status:block',
    },
    volumeLowStatusIcon: {
      utilities: 'group-data-[level=low]/volume-status:block',
    },
    volumeOffStatusIcon: {
      utilities: 'group-data-[level=off]/volume-status:block',
    },
    volumeStatusValue: {
      utilities: 'hidden',
    },
    srOnly: {
      utilities: 'absolute size-px overflow-hidden whitespace-nowrap [clip:rect(0,0,0,0)]',
    },
    dialogBackdrop: {
      utilities: 'absolute inset-0 z-40 bg-[rgba(0,0,0,0.75)] not-data-open:hidden',
    },
    dialogPopup: {
      utilities: [
        'absolute left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-80 max-h-[calc(100%-2rem)] transform-[translate(-50%,-50%)] gap-3 overflow-auto rounded-lg bg-media-popover p-5 text-media-popover-foreground not-data-open:hidden',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-media-ring',
        'media-opaque:border media-opaque:border-solid media-opaque:border-current forced-colors:border forced-colors:border-solid forced-colors:border-[CanvasText]',
      ],
    },
    dialogTitle: {
      utilities: 'text-lg font-bold',
    },
    dialogDescription: {
      utilities: 'text-sm',
    },
    dialogClose: {
      utilities: 'h-8 w-auto justify-self-end border! border-solid border-current px-3',
    },
    announcer: {
      utilities: 'absolute size-px overflow-hidden whitespace-nowrap [clip:rect(0,0,0,0)]',
    },
  },
});
