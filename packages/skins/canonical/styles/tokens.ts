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
  '--media-accent-background-color': {
    kind: 'internal',
    description: 'Resolved translucent accent background used by interactive states.',
  },
  '--media-accent-contrast-color': {
    kind: 'internal',
    description: 'Resolved foreground color with contrast against the accent.',
  },
  '--media-border-color': {
    kind: 'internal',
    description: 'Theme border color.',
  },
  '--media-button-size': {
    kind: 'internal',
    description: 'Resolved control button size.',
  },
  '--media-chapter-gap': {
    kind: 'internal',
    description: 'Gap between time-slider chapters.',
  },
  '--media-chapter-inset-end': {
    kind: 'internal',
    description: 'End inset for a time-slider chapter segment.',
  },
  '--media-chapter-inset-start': {
    kind: 'internal',
    description: 'Start inset for a time-slider chapter segment.',
  },
  '--media-container-border-radius': {
    kind: 'internal',
    description: 'Resolved player container radius.',
  },
  '--media-controls-background': {
    kind: 'internal',
    description: 'Theme controls background.',
  },
  '--media-controls-color': {
    kind: 'internal',
    description: 'Theme controls foreground color.',
  },
  '--media-controls-gap': {
    kind: 'internal',
    description: 'Gap between controls.',
  },
  '--media-controls-padding': {
    kind: 'internal',
    description: 'Padding around controls.',
  },
  '--media-controls-transition-duration': {
    kind: 'internal',
    description: 'Controls visibility transition duration.',
  },
  '--media-default-accent-color': {
    kind: 'internal',
    description: 'Theme fallback accent color.',
  },
  '--media-error-dialog-transition-delay': {
    kind: 'internal',
    description: 'Error dialog transition delay.',
  },
  '--media-error-dialog-transition-duration': {
    kind: 'internal',
    description: 'Error dialog transition duration.',
  },
  '--media-focus-ring-color': {
    kind: 'internal',
    description: 'Theme focus-ring color.',
  },
  '--media-font-family': {
    kind: 'internal',
    description: 'Theme font family.',
  },
  '--media-font-size': {
    kind: 'internal',
    description: 'Resolved base font size.',
  },
  '--media-max-height': {
    kind: 'internal',
    description: 'Component-local maximum height.',
  },
  '--media-max-width': {
    kind: 'internal',
    description: 'Component-local maximum width.',
  },
  '--media-menu-item-highlight-anchor': {
    kind: 'internal',
    description: 'Anchor name used by the menu highlight.',
  },
  '--media-menu-transition-duration': {
    kind: 'internal',
    description: 'Menu size and submenu transition duration.',
  },
  '--media-popup-transition-duration': {
    kind: 'internal',
    description: 'Popup transition duration.',
  },
  '--media-popup-translate-distance': {
    kind: 'internal',
    description: 'Popup transition translation distance.',
  },
  '--media-radius-pill': {
    kind: 'internal',
    description: 'Theme pill radius.',
  },
  '--media-radius-surface': {
    kind: 'internal',
    description: 'Theme surface radius.',
  },
  '--media-scale': {
    kind: 'internal',
    description: 'Theme control scale multiplier.',
  },
  '--media-shadow-color': {
    kind: 'internal',
    description: 'Theme shadow color.',
  },
  '--media-size': {
    kind: 'internal',
    description: 'Resolved base control size.',
  },
  '--media-slider-buffer-background': {
    kind: 'internal',
    description: 'Theme slider buffer background.',
  },
  '--media-slider-thumb-size': {
    kind: 'internal',
    description: 'Theme slider thumb size.',
  },
  '--media-slider-track-background': {
    kind: 'internal',
    description: 'Theme slider track background.',
  },
  '--media-slider-track-size': {
    kind: 'internal',
    description: 'Theme slider track size.',
  },
  '--media-surface-backdrop-blur': {
    kind: 'internal',
    description: 'Theme surface backdrop blur.',
  },
  '--media-surface-backdrop-saturate': {
    kind: 'internal',
    description: 'Theme surface backdrop saturation.',
  },
  '--media-surface-background': {
    kind: 'internal',
    description: 'Theme surface background.',
  },
  '--media-surface-border': {
    kind: 'internal',
    description: 'Resolved theme surface border.',
  },
  '--media-surface-inner-border': {
    kind: 'internal',
    description: 'Theme inner surface border.',
  },
  '--media-surface-outer-border': {
    kind: 'internal',
    description: 'Theme outer surface border.',
  },
  '--media-thumbnail-max-width': {
    kind: 'internal',
    description: 'Maximum preview thumbnail width.',
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
  '--media-caption-track-delay': {
    kind: 'bridge',
    description: 'Native caption-track transition delay.',
  },
  '--media-caption-track-duration': {
    kind: 'bridge',
    description: 'Native caption-track transition duration.',
  },
  '--media-caption-track-y': {
    kind: 'bridge',
    description: 'Native caption-track vertical offset.',
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
