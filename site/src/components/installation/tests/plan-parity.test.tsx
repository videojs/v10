import { cleanup, render } from '@testing-library/react';
import {
  installationTemplatesForMethod,
  isInstallationFramework,
  resolveRegistryStyling,
  sourceFrameworkFor,
  type InstallationFramework,
  type InstallationPlan,
  type RegistryFramework,
  type RegistryStyling,
} from '@videojs/installation';
import { omit } from 'es-toolkit';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import InstallationRegistryCommandClient from '@/components/registry/InstallationRegistryCommandClient';
import RegistryInitCommandClient from '@/components/registry/RegistryInitCommandClient';
import SourceHTMLPlayer from '@/components/registry/SourceHTMLPlayer';
import SourceMediaInstall from '@/components/registry/SourceMediaInstall';
import SourceReactPlayer from '@/components/registry/SourceReactPlayer';
import {
  extensions,
  framework,
  installMethod,
  project,
  renderer,
  skin,
  sourceUrl,
  template,
  useCase,
} from '@/stores/installation';
import { registryStyling } from '@/stores/registry';
import { resolveInstallationMarkdownPlan } from '@/utils/installation/markdown';
import {
  INSTALLATION_ROUTES,
  INSTALLATION_ROUTE_SEGMENTS,
  type InstallationRouteSegment,
} from '@/utils/installation/routes';
import {
  parseInstallationSearchForRoute,
  serializeInstallationSearchForRoute,
  type InstallationUiSelection,
} from '@/utils/installation/url-state';

import HTMLCdnCodeBlock from '../HTMLCdnCodeBlock';
import HTMLInstallTabs from '../HTMLInstallTabsClient';
import HTMLUsageCodeBlock from '../HTMLUsageCodeBlock';
import ProjectCommands from '../ProjectCommands';
import ReactCreateCodeBlock from '../ReactCreateCodeBlock';
import ReactInstallTabs from '../ReactInstallTabs';
import SvelteCreateCodeBlock from '../SvelteCreateCodeBlock';
import SvelteUsageCodeBlock from '../SvelteUsageCodeBlock';
import VueConfigCodeBlock from '../VueConfigCodeBlock';
import VueCreateCodeBlock from '../VueCreateCodeBlock';
import VueUsageCodeBlock from '../VueUsageCodeBlock';

vi.mock('@/components/Code/ClientCode', () => ({
  default: ({ code }: { code: string }) => <pre data-code>{code}</pre>,
}));

// The guide shows one package manager at a time; the plan uses the same selected one.
vi.mock('../PackageManagerTabs', () => ({
  default: ({ commands }: { commands: Record<string, string> }) => {
    const runner = installMethod.get() === 'cdn' ? 'pnpm' : installMethod.get();

    return <pre data-code>{commands[runner]}</pre>;
  },
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mirrors the `[data-shadcn-configuration-section]` rule in `InstallationFrameworkInit.astro`.
const SHADCN_SELF_CONFIGURED_TEMPLATES = new Set(['next', 'start', 'react-router']);

/**
 * The code components of one guide's installation section, with the sections the page's CSS hides for this selection
 * left out. Mirrors the `data-installation-plan` block of each installation MDX page.
 */
function guideSection(
  route: InstallationRouteSegment,
  selection: InstallationUiSelection,
  styling: RegistryStyling
): ReactNode {
  const { framework, template, project } = selection;
  const namedApp = template !== 'none';

  if (route === 'cdn') {
    return (
      <>
        <HTMLCdnCodeBlock />
        <HTMLUsageCodeBlock installMethod="cdn" />
      </>
    );
  }

  if (route === 'shadcn') {
    const registryFramework: RegistryFramework = framework === 'react' ? 'react' : 'html';
    const shadcnCreatesConfig =
      registryFramework === 'react' &&
      styling === 'tailwind' &&
      (project === 'new' || SHADCN_SELF_CONFIGURED_TEMPLATES.has(template));

    return (
      <>
        <ProjectCommands method="shadcn" part="create" serverFramework="react" serverTemplate="next" />
        {!shadcnCreatesConfig && <RegistryInitCommandClient framework={registryFramework} installation />}
        <InstallationRegistryCommandClient framework={registryFramework} />
        <SourceMediaInstall />
        {registryFramework === 'react' ? (
          <SourceReactPlayer />
        ) : (
          <>
            <SourceHTMLPlayer part="media" />
            <SourceHTMLPlayer part="imports" />
            <SourceHTMLPlayer part="player" />
          </>
        )}
        <ProjectCommands method="shadcn" part="run" serverFramework="react" serverTemplate="next" />
      </>
    );
  }

  const player =
    route === 'react' ? (
      <>
        <ReactInstallTabs />
        <ReactCreateCodeBlock />
      </>
    ) : route === 'vue' ? (
      <>
        <HTMLInstallTabs />
        <VueConfigCodeBlock />
        <VueCreateCodeBlock />
        <VueUsageCodeBlock />
      </>
    ) : route === 'svelte' ? (
      <>
        <HTMLInstallTabs />
        <SvelteCreateCodeBlock />
        <SvelteUsageCodeBlock />
      </>
    ) : (
      <>
        <HTMLInstallTabs />
        <HTMLUsageCodeBlock />
      </>
    );

  return (
    <>
      {namedApp && <ProjectCommands part="create" serverFramework={framework} serverTemplate={template} />}
      {player}
      {namedApp && <ProjectCommands part="run" serverFramework={framework} serverTemplate={template} />}
    </>
  );
}

function normalize(code: string): string {
  return code.trim().replace(/\s+/g, ' ');
}

interface GuideSelection {
  selection: InstallationUiSelection;
  styling: RegistryStyling | null;
  /** The query the guide writes back for its normalized selection, which the Markdown twin resolves. */
  query: URLSearchParams;
}

/** Normalize a query the way the guide's pickers do, then write the result back as the guide's own URL would. */
function guideSelection(route: InstallationRouteSegment, params: URLSearchParams): GuideSelection {
  const requestedFramework = params.get('framework');
  const shadcnFramework = isInstallationFramework(requestedFramework) ? requestedFramework : 'react';
  const selection = parseInstallationSearchForRoute(route, params.toString(), shadcnFramework);
  const requestedStyling = params.get('styling');
  const styling = requestedStyling === 'css' || requestedStyling === 'tailwind' ? requestedStyling : null;
  const query = new URLSearchParams(serializeInstallationSearchForRoute(route, selection));

  if (styling) query.set('styling', styling);

  return { selection, styling, query };
}

function guideCode(route: InstallationRouteSegment, { selection, styling }: GuideSelection): string[] {
  framework.set(selection.framework);
  template.set(selection.template);
  project.set(selection.project);
  useCase.set(selection.useCase);
  skin.set(selection.skin);
  renderer.set(selection.renderer);
  extensions.set(selection.extensions);
  sourceUrl.set(selection.sourceUrl);
  installMethod.set(selection.installMethod);
  registryStyling.set(styling);

  const resolvedStyling = resolveRegistryStyling(sourceFrameworkFor(selection.framework), styling);
  const { container } = render(<>{guideSection(route, selection, resolvedStyling)}</>);

  return [...container.querySelectorAll('pre[data-code]')]
    .filter((element) => {
      const content = element.closest('[data-installation-project-content]');

      return !content || content.getAttribute('data-installation-project-content') === selection.project;
    })
    .map((element) => normalize(element.textContent ?? ''));
}

function markdownPlan(route: InstallationRouteSegment, params: URLSearchParams): InstallationPlan {
  const result = resolveInstallationMarkdownPlan(`/docs/guides/installation/${route}.md`, params);
  if (!result?.ok) throw new Error(`Invalid test selection: ${JSON.stringify(result)}`);

  return result.plan;
}

function planCode(plan: InstallationPlan): string[] {
  return plan.steps.flatMap((step) => step.blocks.map((block) => normalize(block.code)));
}

/** The resolved choices, without the record of which ones the query left to their defaults. */
function planChoices(plan: InstallationPlan) {
  return omit(plan.selection, ['defaulted', 'defaultSources']);
}

interface Case {
  route: InstallationRouteSegment;
  query: Record<string, string>;
}

function cases(): Case[] {
  const all: Case[] = [];

  for (const route of INSTALLATION_ROUTE_SEGMENTS) {
    const { method, pickerFramework } = INSTALLATION_ROUTES[route];
    const frameworks: InstallationFramework[] = route === 'shadcn' ? ['react', 'html'] : [pickerFramework];

    for (const framework of frameworks) {
      const base: Record<string, string> = route === 'shadcn' ? { framework } : {};

      all.push({ route, query: base });

      for (const template of installationTemplatesForMethod(framework, method)) {
        for (const project of route === 'cdn' || template === 'none' ? ['existing'] : ['new', 'existing']) {
          all.push({ route, query: { ...base, template, project } });
        }
      }

      all.push(
        { route, query: { ...base, preset: 'audio', media: 'mux-audio', skin: 'minimal' } },
        { route, query: { ...base, preset: 'live-video', media: 'hls', extensions: 'google-cast' } },
        { route, query: { ...base, media: 'youtube', 'source-url': 'https://www.youtube.com/watch?v=abc' } },
        { route, query: { ...base, 'package-manager': 'yarn', project: 'new' } }
      );

      if (route === 'shadcn' && framework === 'react') all.push({ route, query: { ...base, styling: 'css' } });
    }
  }

  return all;
}

describe('installation guide code', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const named = cases().map(
    (testCase) => [`${testCase.route}?${new URLSearchParams(testCase.query)}`, testCase] as const
  );

  it.each(named)('shows the code of the Markdown plan for %s', (_name, { route, query }) => {
    const guide = guideSelection(route, new URLSearchParams(query));

    // Steps may group the same blocks differently, so compare the code itself rather than its position.
    expect(guideCode(route, guide).sort()).toEqual(planCode(markdownPlan(route, guide.query)).sort());
  });

  // The CDN guide only covers adding scripts to an existing page, so it drops the scaffold choices its twin accepts.
  it.each(
    named.filter(([, { route, query }]) => route !== 'cdn' || !('project' in query || 'package-manager' in query))
  )('keeps the Markdown plan selection for %s', (_name, { route, query }) => {
    const params = new URLSearchParams(query);
    const requested = planChoices(markdownPlan(route, params));
    const shown = planChoices(markdownPlan(route, guideSelection(route, params).query));

    expect(shown).toEqual(requested);
  });
});
