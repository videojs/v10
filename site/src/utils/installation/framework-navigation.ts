import type { SupportedFramework } from '@/types/docs';
import type { RegistryFramework } from '@/utils/installation/shadcn';

export type InstallationPickerFramework = SupportedFramework | 'vue' | 'svelte';

export const SHADCN_INSTALLATION_PATH = '/docs/guides/installation/shadcn';

export interface InstallationFrameworkNavigation {
  history: 'push' | 'replace';
  target: string;
}

export function isRegistryFramework(framework: string | null): framework is RegistryFramework {
  return framework === 'react' || framework === 'html';
}

export function isInstallationPickerFramework(framework: string | null): framework is InstallationPickerFramework {
  return framework === 'react' || framework === 'html' || framework === 'vue' || framework === 'svelte';
}

export function isShadcnInstallationUrl(url: Pick<URL, 'pathname'>): boolean {
  return url.pathname.replace(/\/$/, '') === SHADCN_INSTALLATION_PATH;
}

/** Resolve the source framework for the query-controlled Shadcn guide. */
export function resolveShadcnProjectFramework(
  url: URL,
  fallback: InstallationPickerFramework
): InstallationPickerFramework | null {
  if (!isShadcnInstallationUrl(url)) return null;

  const requested = url.searchParams.get('framework');

  return isInstallationPickerFramework(requested) ? requested : fallback;
}

/** Resolve React or HTML registry source for a Shadcn project framework. */
export function resolveShadcnFramework(url: URL, fallback: RegistryFramework): RegistryFramework | null {
  const project = resolveShadcnProjectFramework(url, fallback);

  return project === null ? null : project === 'react' ? 'react' : 'html';
}

/** Build a JS-framework switch, falling back to Packaged when the current method does not support the selection. */
export function resolveInstallationFrameworkNavigation(
  current: URL,
  next: InstallationPickerFramework
): InstallationFrameworkNavigation {
  const target = new URL(current);
  const route = current.pathname.match(/\/docs\/guides\/installation\/([^/]+)/)?.[1];

  if (isShadcnInstallationUrl(current)) {
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
