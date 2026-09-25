import {
  defaultInstallationTemplate,
  INSTALLATION_TEMPLATE_LABELS,
  installationTemplatesForMethod,
  resolveInstallationTemplateForMethod,
  type InstallationFramework,
  type InstallationMethod,
  type InstallationTemplate,
} from '@videojs/installation';
import type { ReactNode } from 'react';

import CodeIcon from '@/assets/icons/code.svg?react';
import AstroLogo from '@/assets/logos/brands/astro.svg?react';
import LaravelLogo from '@/assets/logos/brands/laravel.svg?react';
import NextLogoUrl from '@/assets/logos/brands/nextjs.svg?url';
import NuxtLogo from '@/assets/logos/brands/nuxt.svg?react';
import ReactRouterLogo from '@/assets/logos/brands/react-router.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import TanStackLogo from '@/assets/logos/brands/tanstack.svg?react';
import ViteLogoUrl from '@/assets/logos/brands/vite.svg?url';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import { selectInstallationTemplate } from '@/stores/installation';

import { useSelection } from './useSelection';

const TEMPLATE_ICONS = {
  none: <CodeIcon className="size-7" />,
  next: <img alt="" src={NextLogoUrl} className="size-7 dark:invert" />,
  vite: <img alt="" src={ViteLogoUrl} className="size-7" />,
  start: <TanStackLogo className="size-7" />,
  laravel: <LaravelLogo className="size-7" />,
  'react-router': <ReactRouterLogo className="w-7" />,
  astro: <AstroLogo className="h-9 w-auto" />,
  nuxt: <NuxtLogo className="size-7" />,
  sveltekit: <SvelteLogo className="size-7" />,
} satisfies Record<InstallationTemplate, ReactNode>;

const TEMPLATE_DESCRIPTIONS = {
  none: 'Static HTML, WordPress, or another CMS',
  next: 'Full-stack React with App Router',
  vite: 'Fast app and development server',
  start: 'Full-stack React with TanStack Router',
  laravel: 'Laravel app with Vite assets',
  'react-router': 'React Router framework mode',
  astro: 'Content-focused sites with islands',
  nuxt: 'Full-stack Vue framework',
  sveltekit: 'Full-stack Svelte framework',
} as const satisfies Record<InstallationTemplate, string>;

const PACKAGED_EXISTING_SITE_DESCRIPTION = 'Existing site whose build bundles JavaScript';

interface Props {
  framework: InstallationFramework;
  method: InstallationMethod;
  /** Keep this prerendered card group on `framework` instead of following the selected framework. */
  fixedFramework?: boolean;
}

function templateCardOptions(
  framework: InstallationFramework,
  method: InstallationMethod
): CardRadioOption<InstallationTemplate>[] {
  return installationTemplatesForMethod(framework, method).map((value) => ({
    value,
    label: INSTALLATION_TEMPLATE_LABELS[value],
    // Packaged modules need a bundler, so a static page or CMS without one belongs on the CDN path.
    description:
      value === 'none' && method !== 'cdn' ? PACKAGED_EXISTING_SITE_DESCRIPTION : TEMPLATE_DESCRIPTIONS[value],
    media: TEMPLATE_ICONS[value],
  }));
}

/** Chooses the app setup that controls the installation guide's setup commands and file locations. */
export default function AppSetupPickerClient({ fixedFramework = false, framework, method }: Props) {
  const selectedFramework = useSelection('framework', framework);
  const activeFramework = fixedFramework ? framework : selectedFramework;
  const $template = useSelection('template', defaultInstallationTemplate(activeFramework));
  const template = resolveInstallationTemplateForMethod(activeFramework, $template, method);

  return (
    <CardRadioGroup
      value={template}
      onChange={selectInstallationTemplate}
      options={templateCardOptions(activeFramework, method)}
      aria-label="Select app"
    />
  );
}
