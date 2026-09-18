import type { InstallationPickerFramework } from '@/utils/installation/framework-navigation';

export type InstallationMethod = 'packaged' | 'shadcn' | 'cdn';

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
