import {
  createInstallationPlan,
  renderInstallationPlanSections,
  resolveInstallationSelection,
  type InstallationInput,
  type InstallationMethod,
  type InstallationPlan,
  type PlayerOwner,
  type SelectionError,
} from '@videojs/installation';

import { outsideCodeFences } from '../markdown-text.ts';

const INSTALLATION_PATH = '/docs/guides/installation/';
const PLAN_PATTERN = /<!-- installation-plan:start -->[\s\S]*?<!-- installation-plan:end -->/;
const FRAMEWORK_BRANCH_OPEN = /^[ \t]*<!-- installation:framework (\S+) -->[ \t]*(?:\r?\n)?$/;
const FRAMEWORK_BRANCH_CLOSE = /^[ \t]*<!-- \/installation:framework (\S+) -->[ \t]*(?:\r?\n)?$/;
const CODE_FENCE_OPEN = /^[ \t]*(`{3,}|~{3,})/;
const CODE_FENCE_CLOSE = /^[ \t]*(`{3,}|~{3,})[ \t]*(?:\r?\n)?$/;

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

function queryField(error: SelectionError, params: URLSearchParams): string {
  if (error.field === 'packageManager') {
    return params.has('package-manager') ? 'package-manager' : 'install-method';
  }

  if (error.field === 'sourceUrl') return 'source-url';

  return error.field;
}

function renderInstallationQueryErrors(errors: readonly SelectionError[], params: URLSearchParams): string {
  const items = errors.map((error) => {
    const field = queryField(error, params);
    const cliFlag =
      error.field === 'arguments'
        ? null
        : error.field === 'packageManager'
          ? '--package-manager'
          : error.field === 'sourceUrl'
            ? '--source-url'
            : `--${error.field}`;
    const message = cliFlag ? error.message.replaceAll(cliFlag, `\`${field}\``) : error.message;

    return `- ${field}: ${message}`;
  });

  return `Invalid installation options:\n${items.join('\n')}`;
}

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

/** Keep the React or HTML source branches for one rendered installation selection. */
export function selectInstallationFramework(markdown: string, framework: string): string {
  let branch: string | null = null;
  let fence: string | null = null;
  let selected = '';

  for (const line of markdown.match(/[^\r\n]*(?:\r\n|\n|$)/g)?.filter(Boolean) ?? []) {
    if (fence) {
      if (branch === null || branch === framework) selected += line;

      const closing = line.match(CODE_FENCE_CLOSE)?.[1];

      if (closing?.[0] === fence[0] && closing.length >= fence.length) fence = null;

      continue;
    }

    const openingBranch = line.match(FRAMEWORK_BRANCH_OPEN)?.[1];

    if (openingBranch) {
      if (branch) throw new Error(`Nested installation framework branch: ${openingBranch}`);

      branch = openingBranch;
      continue;
    }

    const closingBranch = line.match(FRAMEWORK_BRANCH_CLOSE)?.[1];

    if (closingBranch) {
      if (branch !== closingBranch) throw new Error(`Unmatched installation framework branch: ${closingBranch}`);

      branch = null;
      continue;
    }

    const openingFence = line.match(CODE_FENCE_OPEN)?.[1];

    if (openingFence) fence = openingFence;

    if (branch === null || branch === framework) selected += line;
  }

  if (branch) throw new Error(`Unclosed installation framework branch: ${branch}`);

  return outsideCodeFences(selected, (text) => {
    if (text.includes('installation:framework')) {
      throw new Error('Installation framework markers remained after selection.');
    }

    return text.replace(/\n{3,}/g, '\n\n');
  });
}

export interface RenderedInstallationMarkdown {
  body: string;
  privateResponse: boolean;
  status: 200 | 400 | 500;
}

export interface RenderInstallationMarkdownOptions {
  /** Keep both marked source-framework branches in the build artifact used as the edge renderer's template. */
  preserveFrameworkBranches?: boolean;
}

/** Resolve, validate, and render one installation Markdown page for its route and query parameters. */
export function renderInstallationMarkdownSelection(
  markdown: string,
  path: string,
  params: URLSearchParams,
  packageVersion: string,
  options: RenderInstallationMarkdownOptions = {}
): RenderedInstallationMarkdown | null {
  const result = resolveInstallationMarkdownPlan(path, params, packageVersion);
  if (!result) return null;

  if (!result.ok) {
    return {
      body: `${renderInstallationQueryErrors(result.errors, params)}\n`,
      privateResponse: true,
      status: 400,
    };
  }

  const replaced = replaceInstallationMarkdownPlan(markdown, renderInstallationPlanSections(result.plan));

  if (!replaced) {
    return {
      body: 'The installation guide is missing its generated installation section.\n',
      privateResponse: true,
      status: 500,
    };
  }

  return {
    body: options.preserveFrameworkBranches
      ? replaced
      : selectInstallationFramework(replaced, result.plan.selection.sourceFramework),
    privateResponse: params.has('source-url'),
    status: 200,
  };
}
