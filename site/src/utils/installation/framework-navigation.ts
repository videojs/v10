import type { SupportedFramework } from '@/types/docs';

export type InstallationPickerFramework = SupportedFramework | 'vue' | 'svelte';

export interface InstallationFrameworkNavigation {
  history: 'push' | 'replace';
  target: string;
}

export function isRegistryFramework(framework: string | null): framework is SupportedFramework {
  return framework === 'react' || framework === 'html';
}

/** Build a JS-framework switch, falling back to Packaged when the current method does not support the selection. */
export function resolveInstallationFrameworkNavigation(
  current: URL,
  next: InstallationPickerFramework
): InstallationFrameworkNavigation {
  const target = new URL(current);
  const route = current.pathname.match(/\/docs\/guides\/installation\/([^/]+)/)?.[1];

  if (route === 'shadcn' && isRegistryFramework(next)) {
    target.searchParams.set('framework', next);

    return {
      target: `${target.pathname}${target.search}${target.hash}`,
      history: 'replace',
    };
  }

  target.pathname = `/docs/guides/installation/${next}`;
  target.searchParams.delete('framework');

  return {
    target: `${target.pathname}${target.search}${target.hash}`,
    history: (route === 'react' || route === 'html') && (next === 'react' || next === 'html') ? 'replace' : 'push',
  };
}
