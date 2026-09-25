import type { RegistryStyling, RegistryTheme } from '@videojs/installation';

export const REGISTRY_STYLING_LABELS = {
  tailwind: 'Tailwind CSS',
  css: 'Vanilla CSS',
} as const satisfies Record<RegistryStyling, string>;

export const REGISTRY_THEME_LABELS = {
  default: 'Default',
  minimal: 'Minimal',
} as const satisfies Record<RegistryTheme, string>;
