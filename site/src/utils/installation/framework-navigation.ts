import {
  defaultInstallationTemplate,
  isInstallationFramework,
  isInstallationTemplate,
  type InstallationFramework,
  type RegistryFramework,
  resolveInstallationTemplate,
  sourceFrameworkFor,
} from '@videojs/installation';

import {
  getInstallationRoutePath,
  getInstallationRouteSegment,
  isShadcnInstallationUrl,
} from '@/utils/installation/routes';

export interface InstallationFrameworkNavigation {
  history: 'push' | 'replace';
  target: string;
}

/** Resolve the framework for the query-controlled Shadcn guide. Vue and Svelte fall back to HTML. */
export function resolveShadcnFramework(url: URL, fallback: InstallationFramework): RegistryFramework | null {
  if (!isShadcnInstallationUrl(url)) return null;

  const requested = url.searchParams.get('framework');

  return sourceFrameworkFor(isInstallationFramework(requested) ? requested : fallback);
}

/** Build a JS-framework switch between packaged installation guides. Shadcn switches its query-backed store in place. */
export function resolveInstallationFrameworkNavigation(
  current: URL,
  next: InstallationFramework
): InstallationFrameworkNavigation {
  const target = new URL(current);
  const route = getInstallationRouteSegment(current.pathname);

  target.pathname = getInstallationRoutePath(next);
  target.searchParams.delete('framework');
  const requestedTemplate = target.searchParams.get('template');
  const template = resolveInstallationTemplate(
    next,
    isInstallationTemplate(requestedTemplate) ? requestedTemplate : null
  );

  if (template === defaultInstallationTemplate(next)) target.searchParams.delete('template');
  else target.searchParams.set('template', template);

  return {
    target: `${target.pathname}${target.search}${target.hash}`,
    history: (route === 'react' || route === 'html') && (next === 'react' || next === 'html') ? 'replace' : 'push',
  };
}
