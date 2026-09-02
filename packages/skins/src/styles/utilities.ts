export type TailwindRuleKind = 'utility' | 'variant' | 'theme';

export interface TailwindRule {
  readonly kind: TailwindRuleKind;
  readonly description: string;
}

/**
 * Descriptions for the shared Tailwind source. Theme keys that alias a `--media-*` token take their description from
 * `vars`, so only computed theme keys appear here.
 */
export const utilities = {
  'font-media': { kind: 'utility', description: 'Player font stack, overridable through `--media-font-family`.' },
  'highlight-media': {
    kind: 'utility',
    description: 'Accent background and text for a highlighted control or menu item.',
  },
  'surface-media': { kind: 'utility', description: 'Translucent surface chrome: hairline, shadow, and backdrop blur.' },
  'surface-media-inset': { kind: 'utility', description: 'Inner highlight for a surface, applied through `after:`.' },
  'surface-media-none': {
    kind: 'utility',
    description: 'Removes surface chrome from a popup that sits flat on the controls.',
  },
  'focus-ring-media': {
    kind: 'utility',
    description: 'Inset focus ring revealed with `focus-visible:outline-media-ring focus-visible:outline-offset-2`.',
  },
  'mask-media-volume': {
    kind: 'utility',
    description:
      'Fades trailing controls while the horizontal volume popover is open; pair with `mask-media-volume-open`.',
  },
  'mask-media-volume-open': { kind: 'utility', description: 'Open state of `mask-media-volume`.' },
  'nudge-media': {
    kind: 'utility',
    description: 'Springy nudge for feedback at a limit, such as volume at zero or full.',
  },
  'layer-media': {
    kind: 'utility',
    description: 'Absolutely positioned layer filling its parent and inheriting its radius.',
  },
  'object-media': {
    kind: 'utility',
    description: 'Media and poster fit, overridable through `--media-object-fit` and `--media-object-position`.',
  },
  'transition-media-popup': { kind: 'utility', description: 'Enter and exit transition for popups and menus.' },
  'motion-media-*': {
    kind: 'utility',
    description: 'Transitions and hints the listed properties, for example `motion-media-[scale,opacity]`.',
  },
  'anchor-media-highlight': {
    kind: 'utility',
    description: 'Anchor-positioned highlight that follows the highlighted menu item, applied through `before:`.',
  },
  'clip-media-x-*': {
    kind: 'utility',
    description:
      'Horizontal slider layer clipped to a progress variable, for example `clip-media-x-[--media-slider-fill]`.',
  },
  'clip-media-y-*': { kind: 'utility', description: 'Vertical slider layer clipped to a progress variable.' },
  'clip-media-chapter-x': { kind: 'utility', description: 'Horizontal chapter segment clipped to its start and end.' },
  'clip-media-chapter-y': { kind: 'utility', description: 'Vertical chapter segment clipped to its start and end.' },
  'clip-media-chapter-track-x': {
    kind: 'utility',
    description: 'Horizontal chapter track with the inter-chapter gap and rounded ends.',
  },
  'clip-media-chapter-track-y': {
    kind: 'utility',
    description: 'Vertical chapter track with the inter-chapter gap and rounded ends.',
  },
  'media-opaque': { kind: 'variant', description: 'Reduced transparency or high contrast.' },
  'media-compact': { kind: 'variant', description: 'Player at or above the compact breakpoint.' },
  'media-max-compact': { kind: 'variant', description: 'Player below the compact breakpoint.' },
  'media-wide': { kind: 'variant', description: 'Player at or above the wide breakpoint.' },
  'media-max-wide': { kind: 'variant', description: 'Player below the wide breakpoint.' },
  'media-highlighted': { kind: 'variant', description: 'Hovered, focused, or expanded control that is not disabled.' },
  '--container-media-compact': {
    kind: 'theme',
    description: 'Compact layout breakpoint for `media-compact` variants.',
  },
  '--container-media-wide': { kind: 'theme', description: 'Wide layout breakpoint for `media-wide` variants.' },
  '--text-media-xs': { kind: 'theme', description: 'Smallest label size, relative to the parent text.' },
  '--text-media-sm': { kind: 'theme', description: 'Small text size in player spacing units.' },
  '--text-media': { kind: 'theme', description: 'Base text size in player spacing units.' },
  '--text-media-lg': { kind: 'theme', description: 'Large text size in player spacing units.' },
  '--spacing-media-icon-sm': { kind: 'theme', description: 'Chevron size derived from the icon size.' },
  '--spacing-media-icon': { kind: 'theme', description: 'Control icon size.' },
  '--spacing-media-icon-lg': { kind: 'theme', description: 'Large indicator icon size.' },
  '--spacing-media-icon-xl': { kind: 'theme', description: 'Extra large indicator icon size.' },
  '--radius-media-pill': { kind: 'theme', description: 'Always-round radius for tracks and pills.' },
  '--drop-shadow-media-icon': { kind: 'theme', description: 'Contrast-aware drop shadow for icons over media.' },
  '--text-shadow-media': { kind: 'theme', description: 'Contrast-aware text shadow for text over media.' },
} as const satisfies Readonly<Record<string, TailwindRule>>;
