import { isShadcnInstallationUrl, type InstallationPickerFramework } from '@/utils/installation/framework-navigation';
import type { InstallationMethod } from '@/utils/installation/method-options';
import { getInstallationRoutePath } from '@/utils/installation/routes';
import type { InstallationSelection } from '@/utils/installation/url-state';
import { serializeInstallationSearch } from '@/utils/installation/url-state';

export type { InstallationMethod } from '@/utils/installation/method-options';

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
  } else if (method === 'shadcn') {
    const requested = target.searchParams.get('framework');
    const framework =
      requested === 'react' || requested === 'html' || requested === 'vue' || requested === 'svelte'
        ? requested
        : current.pathname.endsWith('/react')
          ? 'react'
          : 'html';

    target.searchParams.set('framework', framework);
  } else {
    target.searchParams.delete('framework');
    target.searchParams.delete('install-method');
  }

  return target;
}

/** Build the native card href from the latest picker state, including navigation opened in another tab. */
export function resolveInstallationMethodHref(
  current: URL,
  href: string,
  method: InstallationMethod,
  selection: InstallationSelection,
  framework?: InstallationPickerFramework
): string {
  const source = new URL(current);

  source.search = serializeInstallationSearch(selection, source.search);

  if (isShadcnInstallationUrl(source) && framework) source.searchParams.set('framework', framework);

  const target = resolveInstallationMethodUrl(source, href, method);

  return `${target.pathname}${target.search}${target.hash}`;
}
