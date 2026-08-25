export type CssVarKind = 'public' | 'runtime' | 'internal';

export interface CssVar {
  /** Consumer customization, cross-runtime contract, or Skin implementation detail. */
  kind: CssVarKind;
  description: string;
}

/** Classification for every `--media-*` custom property used by a Skin. */
export const vars = {
  '--media-accent-color': {
    kind: 'public',
    description: 'Accent color used by highlighted controls, menu items, slider fills, and primary actions.',
  },
  '--media-accent-text-color': {
    kind: 'public',
    description: 'Optional foreground color rendered on the configured accent color.',
  },
  '--media-border-radius': {
    kind: 'public',
    description: 'Outer player border radius.',
  },
  '--media-object-fit': {
    kind: 'public',
    description: 'Media and poster object-fit value.',
  },
  '--media-object-position': {
    kind: 'public',
    description: 'Media and poster object-position value.',
  },
  '--media-scale-unit': {
    kind: 'public',
    description: 'Base length used to scale fullscreen controls independently of the document root font size.',
  },
  '--media-chapter-inset-end': {
    kind: 'internal',
    description: 'End inset for a time-slider chapter segment.',
  },
  '--media-chapter-inset-start': {
    kind: 'internal',
    description: 'Start inset for a time-slider chapter segment.',
  },
  '--media-control-radius': {
    kind: 'internal',
    description: 'Theme control radius.',
  },
  '--media-controls-transition-duration': {
    kind: 'internal',
    description: 'Controls visibility transition duration.',
  },
  '--media-icon-size': {
    kind: 'internal',
    description: 'Shared control icon size.',
  },
  '--media-menu-item-highlight-anchor': {
    kind: 'internal',
    description: 'Anchor name used by the menu highlight.',
  },
  '--media-menu-parent-translate': {
    kind: 'internal',
    description: 'Direction-aware offset used while a settings menu shows a submenu.',
  },
  '--media-menu-transition-duration': {
    kind: 'internal',
    description: 'Duration shared by settings menu panel and size transitions.',
  },
  '--media-popup-translate-distance': {
    kind: 'internal',
    description: 'Entry translation distance shared by popup transitions.',
  },
  '--media-preview-end-inset': {
    kind: 'internal',
    description: 'Slider preview correction when the slider is narrower than its container.',
  },
  '--media-preview-left': {
    kind: 'internal',
    description: 'Clamped horizontal position for slider preview content.',
  },
  '--media-scale': {
    kind: 'internal',
    description: 'Theme control scale multiplier.',
  },
  '--media-scrollbar-thumb-color': {
    kind: 'internal',
    description: 'Theme scrollbar thumb color.',
  },
  '--media-slider-height': {
    kind: 'internal',
    description: 'Responsive hit-area height for horizontal sliders.',
  },
  '--media-slider-preview-max-height': {
    kind: 'internal',
    description: 'Maximum slider preview height.',
  },
  '--media-slider-preview-max-width': {
    kind: 'internal',
    description: 'Maximum slider preview width.',
  },
  '--media-spacing': {
    kind: 'internal',
    description: 'Scoped Tailwind spacing unit scaled for fullscreen UI.',
  },
  '--media-submenu-translate': {
    kind: 'internal',
    description: 'Direction-aware entry offset for nested menu panels.',
  },
  '--media-surface-radius': {
    kind: 'internal',
    description: 'Theme surface radius.',
  },
  '--media-caption-track-delay': {
    kind: 'runtime',
    description: 'Transition delay supplied by the Skin and consumed by native caption rendering.',
  },
  '--media-caption-track-duration': {
    kind: 'runtime',
    description: 'Transition duration supplied by the Skin and consumed by native caption rendering.',
  },
  '--media-caption-track-y': {
    kind: 'runtime',
    description: 'Vertical offset supplied by the Skin and consumed by native caption rendering.',
  },
  '--media-icon-airplay-fill-animation': {
    kind: 'runtime',
    description: 'Animation override supplied by the Skin and consumed by the AirPlay icon.',
  },
  '--media-icon-airplay-triangle-animation': {
    kind: 'runtime',
    description: 'Animation override supplied by the Skin and consumed by the AirPlay icon.',
  },
  '--media-menu-available-height': {
    kind: 'runtime',
    description: 'Available height published by Menu positioning and consumed by the Skin.',
  },
  '--media-menu-available-width': {
    kind: 'runtime',
    description: 'Available width published by Menu positioning and consumed by the Skin.',
  },
  '--media-menu-height': {
    kind: 'runtime',
    description: 'Measured menu height published for submenu transitions.',
  },
  '--media-menu-width': {
    kind: 'runtime',
    description: 'Measured menu width published for submenu transitions.',
  },
  '--media-popover-boundary-offset': {
    kind: 'runtime',
    description: 'Boundary offset supplied by the Skin and consumed by Popover positioning.',
  },
  '--media-popover-side-offset': {
    kind: 'runtime',
    description: 'Side offset supplied by the Skin and consumed by Popover positioning.',
  },
  '--media-slider-buffer': {
    kind: 'runtime',
    description: 'Buffered percentage published by Slider and consumed by the Skin.',
  },
  '--media-slider-chapter-end': {
    kind: 'runtime',
    description: 'Chapter end percentage published by Time Slider and consumed by the Skin.',
  },
  '--media-slider-chapter-start': {
    kind: 'runtime',
    description: 'Chapter start percentage published by Time Slider and consumed by the Skin.',
  },
  '--media-slider-fill': {
    kind: 'runtime',
    description: 'Fill percentage published by Slider and consumed by the Skin.',
  },
  '--media-slider-pointer': {
    kind: 'runtime',
    description: 'Pointer percentage published by Slider while dragging and consumed by the Skin.',
  },
  '--media-spinner-animation': {
    kind: 'runtime',
    description: 'Animation override supplied by the Skin and consumed by the spinner icon.',
  },
  '--media-tooltip-boundary-offset': {
    kind: 'runtime',
    description: 'Boundary offset supplied by the Skin and consumed by Tooltip positioning.',
  },
  '--media-tooltip-side-offset': {
    kind: 'runtime',
    description: 'Side offset supplied by the Skin and consumed by Tooltip positioning.',
  },
  '--media-video-border-radius': {
    kind: 'runtime',
    description: 'Resolved radius supplied by the Skin and consumed by light- and shadow-DOM media.',
  },
  '--media-volume-fill': {
    kind: 'runtime',
    description: 'Fill percentage published by Volume Indicator and consumed by the Skin.',
  },
} as const satisfies Readonly<Record<`--media-${string}`, CssVar>>;
