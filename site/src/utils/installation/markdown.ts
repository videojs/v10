import {
  createInstallationPlan,
  resolveInstallationSelection,
  type InstallationInput,
  type InstallationMethod,
  type InstallationPlan,
  type PlayerOwner,
  type SelectionError,
} from '@videojs/installation';

const INSTALLATION_PATH = '/docs/guides/installation/';
const PLAN_PATTERN = /<!-- installation-plan:start -->[\s\S]*?<!-- installation-plan:end -->/;

export const INSTALLATION_MARKDOWN_PARAMS = new Set([
  'preset',
  'skin',
  'media',
  'source-url',
  'install-method',
  'package-manager',
  'template',
  'styling',
  'framework',
]);

interface InstallationRouteDefaults {
  owner: PlayerOwner;
  method: InstallationMethod;
  framework: string;
}

function installationRouteDefaults(path: string, params: URLSearchParams): InstallationRouteDefaults | null {
  const normalized = `/${path.replace(/^\//, '').replace(/\.md$/, '').replace(/\/$/, '')}`;
  if (!normalized.startsWith(INSTALLATION_PATH)) return null;

  const route = normalized.slice(INSTALLATION_PATH.length);
  if (route === 'react') return { owner: 'react', method: 'packaged', framework: 'react' };

  if (route === 'html') return { owner: 'html', method: 'packaged', framework: 'html' };

  if (route === 'vue') return { owner: 'html', method: 'packaged', framework: 'vue' };

  if (route === 'svelte') return { owner: 'html', method: 'packaged', framework: 'svelte' };

  if (route === 'cdn') return { owner: 'html', method: 'cdn', framework: 'html' };

  if (route !== 'shadcn') return null;

  const framework = params.get('framework') ?? 'react';
  const owner = framework === 'html' || framework === 'vue' || framework === 'svelte' ? 'html' : 'react';

  return { owner, method: 'shadcn', framework };
}

function inputFromQuery(defaults: InstallationRouteDefaults, params: URLSearchParams): InstallationInput {
  const value = (key: string) => params.get(key) ?? undefined;
  const packageManager = value('package-manager');
  const legacyInstallMethod = value('install-method');

  return {
    method: defaults.method,
    framework: defaults.framework,
    preset: value('preset'),
    skin: value('skin'),
    media: value('media'),
    sourceUrl: value('source-url'),
    // `install-method=cdn` selected the old CDN mode before each method had its own route. The page UI canonicalizes
    // that stale value to npm on package-based routes, while the CDN route does not have a package manager at all.
    packageManager:
      packageManager ??
      (legacyInstallMethod === 'cdn' ? (defaults.method === 'cdn' ? undefined : 'npm') : legacyInstallMethod),
    template: value('template'),
    styling: value('styling'),
  };
}

export type InstallationMarkdownPlanResult =
  | { ok: true; plan: InstallationPlan }
  | { ok: false; errors: readonly SelectionError[] }
  | null;

/** Resolve one canonical installation route and its query parameters through the shared installation schema. */
export function resolveInstallationMarkdownPlan(
  path: string,
  params: URLSearchParams,
  packageVersion: string
): InstallationMarkdownPlanResult {
  const defaults = installationRouteDefaults(path, params);
  if (!defaults) return null;

  const resolved = resolveInstallationSelection(defaults.owner, inputFromQuery(defaults, params), packageVersion);
  if (!resolved.ok) return resolved;

  return { ok: true, plan: createInstallationPlan(resolved.selection, packageVersion) };
}

export function replaceInstallationMarkdownPlan(markdown: string, replacement: string): string | null {
  if (!PLAN_PATTERN.test(markdown)) return null;

  return markdown.replace(PLAN_PATTERN, () => {
    return `<!-- installation-plan:start -->\n\n${replacement.trim()}\n\n<!-- installation-plan:end -->`;
  });
}
