import { currentInstallationSelection, selectionAtoms } from '@/stores/installation';
import { currentFramework } from '@/stores/preferences';

import { resolveInstallationMethodHref } from './method-navigation';
import { getInstallationRoutePath, getInstallationRouteSegment } from './routes';

const watchedSignals = new WeakSet<AbortSignal>();

/** Point Shadcn method links on an installation guide at the Shadcn guide with the reader's compatible picks. */
export function resolveInstallationMethodLinks(): void {
  if (!getInstallationRouteSegment(location.pathname)) return;

  const selection = currentInstallationSelection();

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[data-installation-method-link="shadcn"]')) {
    anchor.href = resolveInstallationMethodHref(
      new URL(location.href),
      getInstallationRoutePath('shadcn'),
      'shadcn',
      selection,
      selection.framework
    );
  }
}

/** Resolve the links now and again after every pick or framework change until `signal` aborts. */
export function watchInstallationMethodLinks(signal: AbortSignal): void {
  resolveInstallationMethodLinks();

  if (watchedSignals.has(signal)) return;

  watchedSignals.add(signal);

  // Registered after the agnostic docs link listener, so a framework change rewrites these links last.
  const unsubscribes = [currentFramework, ...Object.values(selectionAtoms)].map((store) =>
    store.listen(resolveInstallationMethodLinks)
  );

  signal.addEventListener('abort', () => unsubscribes.forEach((unsubscribe) => unsubscribe()), { once: true });
}
