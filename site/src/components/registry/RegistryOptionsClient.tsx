import {
  DEFAULT_REGISTRY_PRESET,
  defaultInstallationTemplate,
  type InstallationFramework,
  type InstallationMethod,
  type InstallationTemplate,
  INSTALLATION_TEMPLATE_LABELS,
  type RegistryFramework,
  type RegistryPreset,
  type RegistryStyling,
  REGISTRY_PRESETS,
  type RegistryTheme,
  REGISTRY_THEMES,
  registrySkinSelection,
  registryStylings,
  installationTemplatesForMethod,
  resolveInstallationTemplateForMethod,
  resolveRegistryStyling,
} from '@videojs/installation';
import type { ReactNode } from 'react';

import CodeIcon from '@/assets/icons/code.svg?react';
import FilmIcon from '@/assets/icons/film.svg?react';
import LiveStreamingIcon from '@/assets/icons/live-streaming.svg?react';
import MusicNoteIcon from '@/assets/icons/music-note.svg?react';
import RadioIcon from '@/assets/icons/radio.svg?react';
import AstroLogo from '@/assets/logos/brands/astro.svg?react';
import CssLogo from '@/assets/logos/brands/css3.svg?react';
import LaravelLogo from '@/assets/logos/brands/laravel.svg?react';
import NextLogoUrl from '@/assets/logos/brands/nextjs.svg?url';
import NuxtLogo from '@/assets/logos/brands/nuxt.svg?react';
import ReactRouterLogo from '@/assets/logos/brands/react-router.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import TailwindLogo from '@/assets/logos/brands/tailwindcss.svg?react';
import TanStackLogo from '@/assets/logos/brands/tanstack.svg?react';
import ViteLogoUrl from '@/assets/logos/brands/vite.svg?url';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import SkinPreview from '@/components/installation/SkinPreview';
import { useRegistrySkin, useRegistryStyling, useRegistryTheme } from '@/components/installation/useRegistryFramework';
import { useSelection } from '@/components/installation/useSelection';
import { Select } from '@/components/Select';
import {
  skin as installationSkin,
  selectInstallationTemplate,
  useCase as installationUseCase,
} from '@/stores/installation';
import { registrySkin, registryTheme, selectRegistryStyling } from '@/stores/registry';
import { REGISTRY_STYLING_LABELS, REGISTRY_THEME_LABELS } from '@/utils/installation/registry-labels';

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

const STYLING_ICONS = {
  tailwind: <TailwindLogo className="w-4" />,
  css: <CssLogo className="h-4" />,
} satisfies Record<RegistryStyling, ReactNode>;

const STYLING_CARD_ICONS = {
  tailwind: <TailwindLogo className="size-7" />,
  css: <CssLogo className="h-7 w-auto" />,
} satisfies Record<RegistryStyling, ReactNode>;

/** Plain CSS leads because it works in every app; Tailwind stays the React default for new Shadcn apps. */
const STYLING_CARD_ORDER = ['css', 'tailwind'] as const satisfies readonly RegistryStyling[];

const STYLING_DESCRIPTIONS = {
  tailwind: 'Utility classes, included in new Shadcn apps',
  css: 'Plain stylesheets for apps without Tailwind',
} as const satisfies Record<RegistryStyling, string>;

const SKIN_ICONS = {
  video: <FilmIcon className="size-4" />,
  audio: <MusicNoteIcon className="size-4" />,
  'live-video': <LiveStreamingIcon className="size-4" />,
  'live-audio': <RadioIcon className="size-4" />,
} satisfies Record<RegistryPreset, ReactNode>;

const THEME_ICONS = {
  default: <SkinPreview skin="video" className="size-4" />,
  minimal: <SkinPreview skin="minimal-video" className="size-4" />,
} satisfies Record<RegistryTheme, ReactNode>;

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
  defaultSkin?: RegistryPreset;
  defaultTheme?: RegistryTheme;
  fixedFramework?: boolean;
  framework: InstallationFramework;
  installation: boolean;
  kind: 'template' | 'catalog' | 'styling';
  method?: InstallationMethod;
}

function templateCardOptions(
  framework: InstallationFramework,
  method?: InstallationMethod
): CardRadioOption<InstallationTemplate>[] {
  const templates = installationTemplatesForMethod(framework, method ?? 'packaged');

  return templates.map((value) => ({
    value,
    label: INSTALLATION_TEMPLATE_LABELS[value],
    // Packaged modules need a bundler, so a static page or CMS without one belongs on the CDN path.
    description:
      value === 'none' && method !== 'cdn' ? PACKAGED_EXISTING_SITE_DESCRIPTION : TEMPLATE_DESCRIPTIONS[value],
    media: TEMPLATE_ICONS[value],
  }));
}

function RegistryTemplateCards({
  fixedFramework,
  framework,
  method,
}: Pick<Props, 'fixedFramework' | 'framework' | 'method'>) {
  const selectedFramework = useSelection('framework', framework);
  const activeFramework = fixedFramework ? framework : selectedFramework;
  const defaultTemplate = defaultInstallationTemplate(activeFramework);
  const $template = useSelection('template', defaultTemplate);
  const template = resolveInstallationTemplateForMethod(activeFramework, $template, method ?? 'packaged');

  return (
    <CardRadioGroup
      value={template}
      onChange={selectInstallationTemplate}
      options={templateCardOptions(activeFramework, method)}
      aria-label="Select app"
    />
  );
}

function RegistryStylingSelect({ framework }: { framework: RegistryFramework }) {
  const $styling = useRegistryStyling();
  const styling = resolveRegistryStyling(framework, $styling);

  return (
    <div className="grid shrink-0 gap-1.5">
      <p className="text-p4 font-medium">Styling</p>
      <Select
        value={styling}
        onChange={(value) => value && selectRegistryStyling(value)}
        options={registryStylings(framework).map((value) => ({
          value,
          label: REGISTRY_STYLING_LABELS[value],
          icon: STYLING_ICONS[value],
        }))}
        aria-label="Select styling"
        className="justify-self-start"
      />
    </div>
  );
}

function RegistryStylingCards({ framework }: { framework: RegistryFramework }) {
  const $styling = useRegistryStyling();
  const styling = resolveRegistryStyling(framework, $styling);

  return (
    <CardRadioGroup
      value={styling}
      onChange={selectRegistryStyling}
      options={STYLING_CARD_ORDER.filter((value) => registryStylings(framework).includes(value)).map((value) => ({
        value,
        label: REGISTRY_STYLING_LABELS[value],
        description: STYLING_DESCRIPTIONS[value],
        media: STYLING_CARD_ICONS[value],
      }))}
      aria-label="Select styling"
    />
  );
}

function RegistryCatalogSelects({ defaultSkin, defaultTheme, framework, installation }: Omit<Props, 'kind'>) {
  const $registrySkin = useRegistrySkin();
  const $theme = useRegistryTheme();
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const installationSelection = registrySkinSelection({ useCase: $useCase, skin: $skin });
  const selectedSkin =
    $registrySkin ?? (installation ? installationSelection?.item : defaultSkin) ?? DEFAULT_REGISTRY_PRESET;
  const installationTheme = installationSelection?.theme ?? 'default';
  const theme = $theme ?? (installation ? installationTheme : defaultTheme) ?? 'default';
  const sourceFramework: RegistryFramework = framework === 'react' ? 'react' : 'html';

  const updateInstallationSelection = (preset: RegistryPreset, nextTheme: RegistryTheme) => {
    if (!installation) return;

    const useCase = preset === 'video' ? 'default-video' : preset === 'audio' ? 'default-audio' : preset;
    const skin =
      nextTheme === 'minimal'
        ? preset === 'audio' || preset === 'live-audio'
          ? 'minimal-audio'
          : 'minimal-video'
        : preset === 'audio' || preset === 'live-audio'
          ? 'audio'
          : 'video';

    installationUseCase.set(useCase);
    installationSkin.set(skin);
  };

  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
      <div className="grid shrink-0 gap-1.5">
        <p className="text-p4 font-medium">Skin</p>
        <Select
          value={selectedSkin}
          onChange={(value) => {
            if (!value) return;

            registrySkin.set(value);
            updateInstallationSelection(value, theme);
          }}
          options={REGISTRY_PRESETS.map(({ label, preset: value }) => ({
            value,
            label,
            icon: SKIN_ICONS[value],
          }))}
          aria-label="Select skin"
          className="justify-self-start"
        />
      </div>

      <RegistryStylingSelect framework={sourceFramework} />

      <div className="grid shrink-0 gap-1.5">
        <p className="text-p4 font-medium">Theme</p>
        <Select
          value={theme}
          onChange={(value) => {
            if (!value) return;

            registryTheme.set(value);
            updateInstallationSelection(selectedSkin, value);
          }}
          options={REGISTRY_THEMES.map((value) => ({
            value,
            label: REGISTRY_THEME_LABELS[value],
            icon: THEME_ICONS[value],
          }))}
          aria-label="Select theme"
          className="justify-self-start"
        />
      </div>
    </div>
  );
}

/** Chooses the Shadcn project template or the skin, styling, and theme used to add skin source. */
export default function RegistryOptionsClient({
  defaultSkin,
  defaultTheme,
  fixedFramework = false,
  framework,
  installation,
  kind,
  method,
}: Props) {
  if (kind === 'template') {
    return <RegistryTemplateCards fixedFramework={fixedFramework} framework={framework} method={method} />;
  }

  return kind === 'catalog' ? (
    <RegistryCatalogSelects
      defaultSkin={defaultSkin}
      defaultTheme={defaultTheme}
      framework={framework}
      installation={installation}
    />
  ) : (
    <RegistryStylingCards framework={framework === 'react' ? 'react' : 'html'} />
  );
}
