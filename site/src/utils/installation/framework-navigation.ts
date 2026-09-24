import {
  defaultInstallationTemplate,
  installationTemplatesForMethod,
  isInstallationFramework,
  isInstallationTemplate,
  registryStylings,
  type InstallationFramework,
  type InstallationTemplate,
  type RegistryFramework,
  type RegistryStyling,
  resolveInstallationTemplate,
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
  template: InstallationTemplate | null;
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
  const template =
    installationTemplatesForMethod(projectFramework, 'shadcn').find((candidate) => candidate === requestedTemplate) ??
    null;
  const styling = registryStylings(sourceFramework).find((candidate) => candidate === requestedStyling) ?? null;

  return { projectFramework, sourceFramework, styling, template };
}

/** Return one canonical Shadcn URL with incompatible project options removed. */
export function canonicalShadcnInstallationUrl(url: URL, fallback: InstallationFramework): URL | null {
  const selection = resolveShadcnUrlSelection(url, fallback);
  if (!selection) return null;

  const target = new URL(url);
  const params = new URLSearchParams([['framework', selection.projectFramework]]);

  for (const [key, value] of target.searchParams) {
    if (key === 'framework') continue;

    if (key === 'template' && !selection.template) continue;

    if (key === 'styling' && !selection.styling) continue;

    params.append(key, value);
  }

  target.search = params.toString();

  return target;
}

/** Apply a Shadcn project choice while preserving explicit options the next framework also supports. */
export function updateShadcnInstallationUrl(
  url: URL,
  update: {
    framework?: InstallationFramework;
    styling?: RegistryStyling | null;
    template?: InstallationTemplate | null;
  }
): URL {
  const target = new URL(url);
  if (!isShadcnInstallationUrl(target)) return target;

  if (update.framework) {
    target.searchParams.set('framework', update.framework);

    const template = update.template ?? target.searchParams.get('template');
    const templates = installationTemplatesForMethod(update.framework, 'shadcn');

    if (template && templates.some((candidate) => candidate === template))
      target.searchParams.set('template', template);
    else target.searchParams.delete('template');

    const styling = update.styling ?? target.searchParams.get('styling');
    const sourceFramework = update.framework === 'react' ? 'react' : 'html';

    if (styling && registryStylings(sourceFramework).some((candidate) => candidate === styling))
      target.searchParams.set('styling', styling);
    else target.searchParams.delete('styling');
  }

  if (update.styling !== undefined) {
    if (update.styling) target.searchParams.set('styling', update.styling);
    else target.searchParams.delete('styling');
  }

  return target;
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
