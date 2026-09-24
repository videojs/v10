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
  REGISTRY_STYLING_LABELS,
  type RegistryTheme,
  REGISTRY_THEME_LABELS,
  REGISTRY_THEMES,
  registrySkinSelection,
  registryStylings,
  installationTemplates,
  resolveInstallationTemplate,
  resolveRegistryStyling,
} from '@videojs/installation';
import type { ReactNode } from 'react';

import FilmIcon from '@/assets/icons/film.svg?react';
import LiveStreamingIcon from '@/assets/icons/live-streaming.svg?react';
import MusicNoteIcon from '@/assets/icons/music-note.svg?react';
import RadioIcon from '@/assets/icons/radio.svg?react';
import AstroLogo from '@/assets/logos/brands/astro.svg?react';
import CssLogo from '@/assets/logos/brands/css3.svg?react';
import LaravelLogo from '@/assets/logos/brands/laravel.svg?react';
import NextLogoUrl from '@/assets/logos/brands/nextjs.svg?url';
import ReactRouterLogo from '@/assets/logos/brands/react-router.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import TailwindLogo from '@/assets/logos/brands/tailwindcss.svg?react';
import TanStackLogo from '@/assets/logos/brands/tanstack.svg?react';
import ViteLogoUrl from '@/assets/logos/brands/vite.svg?url';
import VueLogo from '@/assets/logos/brands/vue.svg?react';
import SkinPreview from '@/components/installation/SkinPreview';
import {
  useInstallationTemplate,
  useRegistryProjectFramework,
  useRegistrySkin,
  useRegistryStyling,
  useRegistryTheme,
} from '@/components/installation/useRegistryProjectFramework';
import { useSelection } from '@/components/installation/useSelection';
import { Select, type SelectOption } from '@/components/Select';
import {
  skin as installationSkin,
  selectInstallationTemplate,
  useCase as installationUseCase,
} from '@/stores/installation';
import { registrySkin, registryTheme, selectRegistryStyling } from '@/stores/registry';

const TEMPLATE_ICONS = {
  next: <img alt="" src={NextLogoUrl} className="size-4 dark:invert" />,
  vite: <img alt="" src={ViteLogoUrl} className="size-4" />,
  start: <TanStackLogo className="size-4" />,
  laravel: <LaravelLogo className="size-4" />,
  'react-router': <ReactRouterLogo className="w-4" />,
  astro: <AstroLogo className="size-4" />,
  nuxt: <VueLogo className="size-4" />,
  sveltekit: <SvelteLogo className="size-4" />,
} satisfies Record<InstallationTemplate, ReactNode>;

const STYLING_ICONS = {
  tailwind: <TailwindLogo className="w-4" />,
  css: <CssLogo className="h-4" />,
} satisfies Record<RegistryStyling, ReactNode>;

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

interface Props {
  defaultSkin?: RegistryPreset;
  defaultTheme?: RegistryTheme;
  framework: InstallationFramework;
  installation: boolean;
  kind: 'template' | 'catalog' | 'styling';
  method?: InstallationMethod;
}

function templateOptions(
  framework: Parameters<typeof installationTemplates>[0],
  method?: InstallationMethod
): SelectOption<InstallationTemplate>[] {
  const templates = method === 'cdn' ? (['vite'] as const) : installationTemplates(framework);

  return templates.map((value) => ({
    value,
    label: INSTALLATION_TEMPLATE_LABELS[value],
    icon: TEMPLATE_ICONS[value],
  }));
}

function RegistryTemplateSelect({ framework, method }: Pick<Props, 'framework' | 'method'>) {
  const projectFramework = useRegistryProjectFramework(framework);
  const defaultTemplate = defaultInstallationTemplate(projectFramework);
  const $template = useInstallationTemplate(defaultTemplate);
  const template = resolveInstallationTemplate(projectFramework, $template);

  return (
    <div className="grid gap-1.5">
      <p className="text-p4 font-medium">App setup</p>
      <Select
        value={template}
        onChange={(value) => value && selectInstallationTemplate(value)}
        options={templateOptions(projectFramework, method)}
        aria-label="Select app setup"
        className="justify-self-start"
      />
    </div>
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
  framework,
  installation,
  kind,
  method,
}: Props) {
  if (kind === 'template') return <RegistryTemplateSelect framework={framework} method={method} />;

  return kind === 'catalog' ? (
    <RegistryCatalogSelects
      defaultSkin={defaultSkin}
      defaultTheme={defaultTheme}
      framework={framework}
      installation={installation}
    />
  ) : (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
      <RegistryStylingSelect framework={framework === 'react' ? 'react' : 'html'} />
    </div>
  );
}
