import type { SupportedFramework } from '@/types/docs';

export type InstallationPickerFramework = SupportedFramework | 'vue' | 'svelte';

export interface InstallationFrameworkNavigation {
  history: 'push' | 'replace';
  target: string;
}

function isPrimaryFramework(framework: InstallationPickerFramework): framework is SupportedFramework {
  return framework === 'react' || framework === 'html';
}

/** Build a JS-framework switch while keeping installation choices and consistent history semantics. */
export function resolveInstallationFrameworkNavigation(
  current: InstallationPickerFramework,
  next: InstallationPickerFramework,
  search: string
): InstallationFrameworkNavigation {
  return {
    target: `/docs/guides/installation/${next}${search}`,
    history: isPrimaryFramework(current) && isPrimaryFramework(next) ? 'replace' : 'push',
  };
}
