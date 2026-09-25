import {
  defaultInstallationTemplate,
  isInstallationFramework,
  isInstallationTemplate,
  resolveInstallationTemplateForMethod,
  type InstallationFramework,
  type InstallationMethod,
} from '@videojs/installation';

import { isShadcnInstallationUrl } from '@/utils/installation/framework-navigation';
import { getInstallationRoutePath, getInstallationRouteSegment } from '@/utils/installation/routes';
import type { InstallationUiSelection } from '@/utils/installation/url-state';
import { serializeInstallationSearch } from '@/utils/installation/url-state';

export type { InstallationMethod } from '@videojs/installation';

function frameworkFromInstallationPath(pathname: string): InstallationFramework | null {
  const route = getInstallationRouteSegment(pathname);

  return isInstallationFramework(route) ? route : null;
}

/** Carry compatible installation choices to another method's guide. */
export function resolveInstallationMethodUrl(current: URL, href: string, method: InstallationMethod): URL {
  const target = new URL(href, current);
  const hrefParams = [...target.searchParams];

  target.search = current.search;

  for (const [key, value] of hrefParams) target.searchParams.set(key, value);

  if (method === 'packaged') {
    if (isShadcnInstallationUrl(current)) {
      const requested = current.searchParams.get('framework');
      const framework = requested === 'html' || requested === 'vue' || requested === 'svelte' ? requested : 'react';

      target.pathname = getInstallationRoutePath(framework);
    }

    target.searchParams.delete('framework');
    target.searchParams.delete('styling');
  } else if (method === 'shadcn') {
    const requested = target.searchParams.get('framework');
    const framework = isInstallationFramework(requested)
      ? requested
      : (frameworkFromInstallationPath(current.pathname) ?? 'html');
    const requestedTemplate = target.searchParams.get('template');
    const template = resolveInstallationTemplateForMethod(
      framework,
      isInstallationTemplate(requestedTemplate) ? requestedTemplate : null,
      'shadcn'
    );

    target.searchParams.set('framework', framework);

    if (template === defaultInstallationTemplate(framework)) target.searchParams.delete('template');
    else target.searchParams.set('template', template);
  } else if (method === 'cdn') {
    target.searchParams.delete('framework');
    target.searchParams.delete('package-manager');
    target.searchParams.delete('styling');
    target.searchParams.delete('template');
  }

  return target;
}

/** Build the native card href from the latest picker state, including navigation opened in another tab. */
export function resolveInstallationMethodHref(
  current: URL,
  href: string,
  method: InstallationMethod,
  selection: InstallationUiSelection,
  framework?: InstallationFramework
): string {
  const source = new URL(current);

  source.search = serializeInstallationSearch(selection, source.search);

  if (framework && (isShadcnInstallationUrl(source) || method === 'shadcn')) {
    source.searchParams.set('framework', framework);
  }

  const target = resolveInstallationMethodUrl(source, href, method);

  return `${target.pathname}${target.search}${target.hash}`;
}
