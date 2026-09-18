import { useStore } from '@nanostores/react';
import clsx from 'clsx';
import type { ComponentType, SVGProps } from 'react';

import Check from '@/assets/icons/check.svg?react';
import JsdelivrLogo from '@/assets/logos/brands/jsdelivr.svg?react';
import NpmLogo from '@/assets/logos/brands/npm.svg?react';
import ShadcnLogo from '@/assets/logos/brands/shadcn.svg?react';
import { registryFramework } from '@/stores/registry';
import type { InstallationPickerFramework } from '@/utils/installation/framework-navigation';
import { getInstallationMethodsForFramework, type InstallationMethod } from '@/utils/installation/method-options';
import type { InstallationRouteSegment } from '@/utils/installation/routes';
import useIsHydrated from '@/utils/useIsHydrated';

interface MethodItem {
  id: InstallationMethod;
  label: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ITEMS: MethodItem[] = [
  {
    id: 'packaged',
    label: 'Packaged',
    description: 'Install packages and use a ready-made skin.',
    Icon: NpmLogo,
  },
  {
    id: 'shadcn',
    label: 'Shadcn',
    description: 'Add editable skin source to your project.',
    Icon: ShadcnLogo,
  },
  {
    id: 'cdn',
    label: 'CDN',
    description: 'Load the HTML player from jsDelivr.',
    Icon: JsdelivrLogo,
  },
];

interface Props {
  currentFramework: InstallationPickerFramework;
  route: InstallationRouteSegment;
}

function getActiveMethod(route: InstallationRouteSegment): InstallationMethod {
  if (route === 'shadcn' || route === 'cdn') return route;

  return 'packaged';
}

function getMethodHref(method: InstallationMethod, framework: InstallationPickerFramework): string {
  if (method === 'packaged') return `/docs/guides/installation/${framework}`;

  if (method === 'shadcn') return `/docs/guides/installation/shadcn?framework=${framework}`;

  return '/docs/guides/installation/cdn';
}

export default function InstallationMethodNavClient({ currentFramework, route }: Props) {
  const registrySelection = useStore(registryFramework);
  const isHydrated = useIsHydrated();
  const framework = route === 'shadcn' && isHydrated ? registrySelection : currentFramework;
  const active = getActiveMethod(route);
  const availableMethods = getInstallationMethodsForFramework(framework);
  const items = ITEMS.filter(({ id }) => availableMethods.includes(id));

  return (
    <nav
      aria-label="Installation method"
      data-installation-method-nav
      className={clsx(
        'mx-auto mt-5 mb-12 grid gap-3',
        items.length === 1 && 'max-w-sm',
        items.length === 2 && 'max-w-2xl sm:grid-cols-2',
        items.length === 3 && 'max-w-3xl sm:grid-cols-3'
      )}
    >
      {items.map(({ id, label, description, Icon }) => (
        <a
          key={id}
          href={getMethodHref(id, framework)}
          data-installation-method={id}
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
      ))}
    </nav>
  );
}
