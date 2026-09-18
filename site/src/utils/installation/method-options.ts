import type { InstallationPickerFramework } from '@/utils/installation/framework-navigation';

export type InstallationMethod = 'packaged' | 'shadcn' | 'cdn';

export interface InstallationMethodOption {
  id: InstallationMethod;
  label: string;
  description: string;
  details: string;
}

export const INSTALLATION_METHOD_OPTIONS = [
  {
    id: 'packaged',
    label: 'Packaged',
    description: 'Install packages and use a ready-made skin.',
    details: 'Install packages and use a ready-made skin.',
  },
  {
    id: 'shadcn',
    label: 'Shadcn',
    description: 'Add editable skin source to your project.',
    details: 'Add editable React or HTML skin source to your project.',
  },
  {
    id: 'cdn',
    label: 'CDN',
    description: 'Load the HTML player from jsDelivr.',
    details: 'Load the HTML player from jsDelivr without a package manager or build step.',
  },
] as const satisfies readonly InstallationMethodOption[];

const INSTALLATION_METHODS_BY_FRAMEWORK = {
  react: ['packaged', 'shadcn'],
  html: ['packaged', 'shadcn', 'cdn'],
  vue: ['packaged'],
  svelte: ['packaged'],
} as const satisfies Record<InstallationPickerFramework, readonly InstallationMethod[]>;

/** Installation paths that can generate a player for the selected framework. */
export function getInstallationMethodsForFramework(
  framework: InstallationPickerFramework
): readonly InstallationMethod[] {
  return INSTALLATION_METHODS_BY_FRAMEWORK[framework];
}

/** Frameworks that can use an installation path. */
export function getFrameworksForInstallationMethod(method: InstallationMethod): readonly InstallationPickerFramework[] {
  // SAFETY: the map has every InstallationPickerFramework key and only readonly InstallationMethod values.
  return (
    Object.entries(INSTALLATION_METHODS_BY_FRAMEWORK) as [InstallationPickerFramework, readonly InstallationMethod[]][]
  )
    .filter(([, methods]) => methods.includes(method))
    .map(([framework]) => framework);
}
