import { useStore } from '@nanostores/react';
import { navigate } from 'astro:transitions/client';
import clsx from 'clsx';
import type { ComponentType, MouseEvent, SVGProps } from 'react';

import Check from '@/assets/icons/check.svg?react';
import JsdelivrLogo from '@/assets/logos/brands/jsdelivr.svg?react';
import NpmLogo from '@/assets/logos/brands/npm.svg?react';
import ShadcnLogo from '@/assets/logos/brands/shadcn.svg?react';
import { installMethod, renderer, skin, sourceUrl, useCase } from '@/stores/installation';
import { registryFramework } from '@/stores/registry';
import { DOCS_FRAMEWORK_NAVIGATION_INFO, savePageScrollForNavigation } from '@/utils/docs/navigation';
import { isRegistryFramework, type InstallationPickerFramework } from '@/utils/installation/framework-navigation';
import { resolveInstallationMethodHref } from '@/utils/installation/method-navigation';
import {
  getInstallationMethodsForFramework,
  INSTALLATION_METHOD_OPTIONS,
  type InstallationMethod,
} from '@/utils/installation/method-options';
import type { InstallationRouteSegment } from '@/utils/installation/routes';
import { getInstallationRoutePath } from '@/utils/installation/routes';
import useIsHydrated from '@/utils/useIsHydrated';

const ICONS = {
  packaged: NpmLogo,
  shadcn: ShadcnLogo,
  cdn: JsdelivrLogo,
} satisfies Record<InstallationMethod, ComponentType<SVGProps<SVGSVGElement>>>;

interface Props {
  currentFramework: InstallationPickerFramework;
  route: InstallationRouteSegment;
}

function getActiveMethod(route: InstallationRouteSegment): InstallationMethod {
  if (route === 'shadcn' || route === 'cdn') return route;

  return 'packaged';
}

function getMethodBaseHref(method: InstallationMethod, framework: InstallationPickerFramework): string {
  if (method === 'packaged') return getInstallationRoutePath(framework);

  if (method === 'shadcn') {
    if (!isRegistryFramework(framework)) throw new Error(`Shadcn does not support ${framework}.`);

    return `${getInstallationRoutePath('shadcn')}?framework=${framework}`;
  }

  return getInstallationRoutePath('cdn');
}

export default function InstallationMethodNavClient({ currentFramework, route }: Props) {
  const selectedInstallMethod = useStore(installMethod);
  const selectedRenderer = useStore(renderer);
  const selectedSkin = useStore(skin);
  const selectedSourceUrl = useStore(sourceUrl);
  const selectedUseCase = useStore(useCase);
  const registrySelection = useStore(registryFramework);
  const isHydrated = useIsHydrated();
  const framework = route === 'shadcn' && isHydrated ? registrySelection : currentFramework;
  const active = getActiveMethod(route);
  const availableMethods = getInstallationMethodsForFramework(framework);
  const items = INSTALLATION_METHOD_OPTIONS.filter(({ id }) => route === 'shadcn' || availableMethods.includes(id));

  const getMethodHref = (method: InstallationMethod) => {
    const baseHref = getMethodBaseHref(method, framework);

    if (!isHydrated) return baseHref;

    return resolveInstallationMethodHref(
      new URL(window.location.href),
      baseHref,
      method,
      {
        installMethod: selectedInstallMethod,
        renderer: selectedRenderer,
        skin: selectedSkin,
        sourceUrl: selectedSourceUrl,
        useCase: selectedUseCase,
      },
      route === 'shadcn' ? framework : undefined
    );
  };

  const handleNavigation = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const current = new URL(window.location.href);
    const target = new URL(href, current);

    event.preventDefault();

    if (target.href === current.href) return;

    const targetPath = `${target.pathname}${target.search}${target.hash}`;

    savePageScrollForNavigation(targetPath);
    queueMicrotask(() => {
      void navigate(targetPath, {
        history: 'push',
        info: DOCS_FRAMEWORK_NAVIGATION_INFO,
      });
    });
  };

  return (
    <nav
      aria-label="Installation method"
      data-installation-method-nav
      className="mx-auto mt-5 mb-12 grid w-full max-w-3xl auto-rows-fr gap-3 sm:grid-cols-3"
    >
      {items.map(({ id, label, description }) => {
        const Icon = ICONS[id];
        const href = getMethodHref(id);

        return (
          <a
            key={id}
            href={href}
            onClick={(event) => handleNavigation(event, href)}
            data-installation-method={id}
            data-shadcn-html-method={route === 'shadcn' && id === 'cdn' ? '' : undefined}
            aria-current={active === id ? 'page' : undefined}
            className={clsx(
              'group relative flex min-w-0 items-center gap-3 rounded-xl corner-squircle border bg-surface p-3 no-underline transition duration-150 ease-out select-none',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              'intent:-translate-y-0.5 intent:shadow-md motion-reduce:intent:translate-y-0',
              active === id
                ? 'border-accent bg-surface-raised shadow-sm ring-1 ring-accent'
                : 'border-line intent:border-line-strong'
            )}
          >
            <span
              aria-hidden="true"
              className="corner-squircle border-line bg-surface-raised text-faded-black dark:bg-faded-black dark:text-manila-light flex size-11 shrink-0 items-center justify-center rounded-lg border"
            >
              <Icon className="size-7" />
            </span>
            <span className="min-w-0 flex-1 pr-8">
              <span className="block font-semibold">{label}</span>
              <span className="text-p4 dark:text-muted mt-0.5 block">{description}</span>
            </span>
            <span
              aria-hidden="true"
              className={clsx(
                'absolute top-3 right-3 flex size-5 items-center justify-center rounded-full border transition',
                active === id
                  ? 'scale-100 border-accent bg-accent text-manila-light opacity-100'
                  : 'scale-75 border-line-strong bg-transparent text-transparent opacity-0 group-intent:opacity-100'
              )}
            >
              <Check className="size-4" />
            </span>
          </a>
        );
      })}
    </nav>
  );
}
