export type SkinTokenKind = 'public' | 'runtime' | 'bridge' | 'internal';

export interface SkinToken {
  /** Consumer customization, runtime state, integration bridge, or Skin implementation detail. */
  kind: SkinTokenKind;
  description: string;
}

/**
 * Stable classification for every `--media-*` custom property used by a
 * canonical Skin.
 */
export const tokens = {
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
  '--media-icon-size': {
    kind: 'public',
    description: 'Shared control icon size.',
  },
  '--media-object-fit': {
    kind: 'public',
    description: 'Media and poster object-fit value.',
  },
  '--media-object-position': {
    kind: 'public',
    description: 'Media and poster object-position value.',
  },
  '--media-poster-placeholder-blur': {
    kind: 'public',
    description: 'Blur radius applied to a poster placeholder.',
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
  '--media-controls-transition-duration': {
    kind: 'internal',
    description: 'Controls visibility transition duration.',
  },
  '--media-slider-preview-max-height': {
    kind: 'internal',
    description: 'Maximum slider preview height.',
  },
  '--media-slider-preview-max-width': {
    kind: 'internal',
    description: 'Maximum slider preview width.',
  },
  '--media-control-radius': {
    kind: 'internal',
    description: 'Theme control radius.',
  },
  '--media-surface-radius': {
    kind: 'internal',
    description: 'Theme surface radius.',
  },
  '--media-scale': {
    kind: 'internal',
    description: 'Theme control scale multiplier.',
  },
  '--media-spacing': {
    kind: 'internal',
    description: 'Scoped Tailwind spacing unit scaled for fullscreen UI.',
  },
  '--media-icon-airplay-fill-animation': {
    kind: 'runtime',
    description: 'AirPlay icon animation state.',
  },
  '--media-icon-airplay-triangle-animation': {
    kind: 'runtime',
    description: 'AirPlay icon animation state.',
  },
  '--media-menu-height': {
    kind: 'runtime',
    description: 'Measured menu height during submenu transitions.',
  },
  '--media-menu-item-highlight-anchor': {
    kind: 'internal',
    description: 'Anchor name used by the menu highlight.',
  },
  '--media-menu-width': {
    kind: 'runtime',
    description: 'Measured menu width during submenu transitions.',
  },
  '--media-popover-available-height': {
    kind: 'runtime',
    description: 'Available floating-ui height.',
  },
  '--media-popover-available-width': {
    kind: 'runtime',
    description: 'Available floating-ui width.',
  },
  '--media-poster-placeholder': {
    kind: 'runtime',
    description: 'Poster placeholder image populated by the HTML or React projection.',
  },
  '--media-slider-buffer': {
    kind: 'runtime',
    description: 'Slider buffered percentage.',
  },
  '--media-slider-chapter-end': {
    kind: 'runtime',
    description: 'Chapter end percentage.',
  },
  '--media-slider-chapter-start': {
    kind: 'runtime',
    description: 'Chapter start percentage.',
  },
  '--media-slider-fill': {
    kind: 'runtime',
    description: 'Slider fill percentage.',
  },
  '--media-slider-pointer': {
    kind: 'runtime',
    description: 'Slider pointer percentage while dragging.',
  },
  '--media-spinner-animation': {
    kind: 'runtime',
    description: 'Spinner animation state exposed by the icon.',
  },
  '--media-volume-fill': {
    kind: 'runtime',
    description: 'Volume indicator fill percentage.',
  },
  '--media-popover-boundary-offset': {
    kind: 'bridge',
    description: 'Popover boundary offset supplied by the Skin composition.',
  },
  '--media-popover-side-offset': {
    kind: 'bridge',
    description: 'Popover side offset supplied by the Skin composition.',
  },
  '--media-tooltip-boundary-offset': {
    kind: 'bridge',
    description: 'Tooltip boundary offset supplied by the Skin composition.',
  },
  '--media-tooltip-side-offset': {
    kind: 'bridge',
    description: 'Tooltip side offset supplied by the Skin composition.',
  },
  '--media-video-border-radius': {
    kind: 'bridge',
    description: 'Resolved Skin radius exposed to light-DOM media integrations.',
  },
} as const satisfies Readonly<Record<`--media-${string}`, SkinToken>>;
