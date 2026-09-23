import {
  isInstallationFramework,
  registryStylings,
  registryTemplates,
  type InstallationFramework,
  type RegistryFramework,
  type RegistryStyling,
  type RegistryTemplate,
} from '@videojs/installation';

import { getInstallationRouteSegment } from '@/utils/installation/routes';

export const SHADCN_INSTALLATION_PATH = '/docs/guides/installation/shadcn';

export interface InstallationFrameworkNavigation {
  history: 'push' | 'replace';
  target: string;
}

export interface ShadcnUrlSelection {
  projectFramework: InstallationFramework;
  sourceFramework: RegistryFramework;
  styling: RegistryStyling | null;
  template: RegistryTemplate | null;
}

export function isShadcnInstallationUrl(url: Pick<URL, 'pathname'>): boolean {
  return url.pathname.replace(/\.md$/, '').replace(/\/$/, '') === SHADCN_INSTALLATION_PATH;
}

/** Resolve the source framework for the query-controlled Shadcn guide. */
export function resolveShadcnProjectFramework(url: URL, fallback: InstallationFramework): InstallationFramework | null {
  if (!isShadcnInstallationUrl(url)) return null;

  const requested = url.searchParams.get('framework');

  return isInstallationFramework(requested) ? requested : fallback;
}

/** Resolve the URL-backed Shadcn choices, dropping options the selected source framework cannot use. */
export function resolveShadcnUrlSelection(url: URL, fallback: InstallationFramework): ShadcnUrlSelection | null {
  const projectFramework = resolveShadcnProjectFramework(url, fallback);
  if (!projectFramework) return null;

  const sourceFramework = projectFramework === 'react' ? 'react' : 'html';
  const requestedTemplate = url.searchParams.get('template');
  const requestedStyling = url.searchParams.get('styling');
  const template = registryTemplates(sourceFramework).find((candidate) => candidate === requestedTemplate) ?? null;
  const styling = registryStylings(sourceFramework).find((candidate) => candidate === requestedStyling) ?? null;

  return { projectFramework, sourceFramework, styling, template };
}

/** Build a JS-framework switch between packaged installation guides. Shadcn switches its query-backed store in place. */
export function resolveInstallationFrameworkNavigation(
  current: URL,
  next: InstallationFramework
): InstallationFrameworkNavigation {
  const target = new URL(current);
  const route = getInstallationRouteSegment(current.pathname);

  target.pathname = `/docs/guides/installation/${next}`;
  target.searchParams.delete('framework');

  return {
    target: `${target.pathname}${target.search}${target.hash}`,
    history: (route === 'react' || route === 'html') && (next === 'react' || next === 'html') ? 'replace' : 'push',
  };
}
