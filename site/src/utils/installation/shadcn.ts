import type { ShadcnRegistry } from 'vjsc/shadcn';

import { getInstallationPreset } from './types';
import type { Skin, UseCase } from './types';

export type ShadcnFramework = 'html' | 'react';
export type ShadcnStyling = 'css' | 'tailwind';
export type ShadcnCatalogItem = ShadcnRegistry['items'][number];

export const SHADCN_STYLING_OPTIONS = ['tailwind', 'css'] as const satisfies readonly ShadcnStyling[];
export const SHADCN_REGISTRY_ORIGIN = 'https://shadcn.videojs.org';

interface ResolveShadcnInstallationOptions {
  useCase: UseCase;
  skin: Skin;
}

export interface ShadcnInstallation {
  item: string | null;
  packageOnly: boolean;
}

/** Resolve the selected packaged preset to its optional editable Skin block. */
export function resolveShadcnInstallation({ useCase, skin }: ResolveShadcnInstallationOptions): ShadcnInstallation {
  if (useCase === 'background-video' || skin === 'none') return { item: null, packageOnly: true };

  const preset = getInstallationPreset(useCase).flag;
  const theme = skin.startsWith('minimal-') ? '-minimal' : '';

  return {
    item: `${preset}${theme}`,
    packageOnly: false,
  };
}

/** Format the namespace URL for one framework and styling catalog. */
export function shadcnRegistryUrl(
  framework: ShadcnFramework,
  styling: ShadcnStyling,
  origin = SHADCN_REGISTRY_ORIGIN
): string {
  return `${origin}/r/${framework}${styling === 'css' ? '/css' : ''}/{name}.json`;
}

/** Format a namespaced Shadcn add command. */
export function shadcnAddCommand(item: string | null): string | null {
  return item ? `pnpm dlx shadcn@latest add @videojs/${item}` : null;
}

/** Format the hosted JSON URL for one registry item. */
export function shadcnItemUrl(
  framework: ShadcnFramework,
  styling: ShadcnStyling,
  item: string,
  origin = SHADCN_REGISTRY_ORIGIN
): string {
  return shadcnRegistryUrl(framework, styling, origin).replace('{name}', item);
}
