import {
  createInstallationPlan,
  INSTALLATION_FRAMEWORKS,
  INSTALLATION_QUERY_PARAMETERS,
  installationParameterForKey,
  isInstallationFramework,
  PRIVATE_INSTALLATION_QUERY_PARAMETERS,
  renderInstallationPlanSections,
  resolveInstallationSelection,
  type InstallationInput,
  type InstallationMethod,
  type InstallationPlan,
  type SelectionError,
} from '@videojs/installation';

import cliPackage from '../../../../packages/cli/package.json' with { type: 'json' };
import { closesCodeFence, codeFenceOpening, outsideCodeFences } from '../markdown-text.ts';
import { getInstallationRouteSegment } from './routes.ts';

/** The `@videojs/cli` release the published plans describe; the player packages they install share its version. */
export const INSTALLATION_PACKAGE_VERSION = cliPackage.version;

const PLAN_PATTERN = /<!-- installation-plan:start -->[\s\S]*?<!-- installation-plan:end -->/;
const FRAMEWORK_BRANCH_OPEN = /^[ \t]*<!-- installation:framework (\S+) -->[ \t]*(?:\r?\n)?$/;
const FRAMEWORK_BRANCH_CLOSE = /^[ \t]*<!-- \/installation:framework (\S+) -->[ \t]*(?:\r?\n)?$/;

export const INSTALLATION_MARKDOWN_PARAMS = new Set(
  INSTALLATION_QUERY_PARAMETERS.filter((parameter) => parameter !== 'method')
);

interface InstallationRouteDefaults {
  method: InstallationMethod;
  framework: string;
}

function installationRouteDefaults(path: string, params: URLSearchParams): InstallationRouteDefaults | null {
  const normalized = `/${path.replace(/^\//, '').replace(/\.md$/, '').replace(/\/$/, '')}`;
  const route = getInstallationRouteSegment(normalized);
  if (!route) return null;

  if (route === 'react') return { method: 'packaged', framework: 'react' };

  if (route === 'html') return { method: 'packaged', framework: 'html' };

  if (route === 'vue') return { method: 'packaged', framework: 'vue' };

  if (route === 'svelte') return { method: 'packaged', framework: 'svelte' };

  if (route === 'cdn') return { method: 'cdn', framework: 'html' };

  if (route !== 'shadcn') return null;

  return { method: 'shadcn', framework: params.get('framework') || 'react' };
}

function inputFromQuery(defaults: InstallationRouteDefaults, params: URLSearchParams): InstallationInput {
  const value = (key: keyof InstallationInput) => {
    const query = installationParameterForKey(key).query;

    return params.get(query) ?? undefined;
  };

  return {
    method: defaults.method,
    framework: defaults.framework,
    project: value('project'),
    preset: value('preset'),
    skin: value('skin'),
    media: value('media'),
    extensions: value('extensions'),
    sourceUrl: value('sourceUrl'),
    packageManager: value('packageManager'),
    template: value('template'),
    styling: value('styling'),
  };
}

export type InstallationMarkdownPlanResult =
  | { ok: true; plan: InstallationPlan }
  | { ok: false; errors: readonly SelectionError[] }
  | null;

function queryField(error: SelectionError): string {
  return error.field === 'arguments' ? 'arguments' : installationParameterForKey(error.field).query;
}

function renderInstallationQueryErrors(errors: readonly SelectionError[]): string {
  const items = errors.map((error) => {
    const field = queryField(error);

    return `- ${field}: ${error.message}`;
  });

  return `Invalid installation options:\n${items.join('\n')}`;
}

/** Resolve one canonical installation route and its query parameters through the shared installation schema. */
export function resolveInstallationMarkdownPlan(
  path: string,
  params: URLSearchParams,
  packageVersion = INSTALLATION_PACKAGE_VERSION
): InstallationMarkdownPlanResult {
  const route = getInstallationRouteSegment(path);
  const requestedFramework = params.get('framework');

  if (requestedFramework && !isInstallationFramework(requestedFramework)) {
    return {
      ok: false,
      errors: [
        {
          field: 'framework',
          value: requestedFramework,
          message: `Expected one of: ${INSTALLATION_FRAMEWORKS.join(', ')}`,
        },
      ],
    };
  }

  const defaults = installationRouteDefaults(path, params);
  if (!defaults) return null;

  if (route !== 'shadcn' && requestedFramework && requestedFramework !== defaults.framework) {
    return {
      ok: false,
      errors: [
        {
          field: 'framework',
          value: requestedFramework,
          message: `This route uses the ${defaults.framework} framework. Choose its canonical installation route instead.`,
        },
      ],
    };
  }

  const resolved = resolveInstallationSelection(inputFromQuery(defaults, params), packageVersion);
  if (!resolved.ok) return resolved;

  // The site deploys from main, so a pinned release could reject options added since then.
  return { ok: true, plan: createInstallationPlan(resolved.selection, packageVersion, null) };
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

      if (closesCodeFence(line, fence)) fence = null;

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

    const openingFence = codeFenceOpening(line);

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
  packageVersion = INSTALLATION_PACKAGE_VERSION,
  options: RenderInstallationMarkdownOptions = {}
): RenderedInstallationMarkdown | null {
  const result = resolveInstallationMarkdownPlan(path, params, packageVersion);
  if (!result) return null;

  if (!result.ok) {
    return {
      body: `${renderInstallationQueryErrors(result.errors)}\n`,
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
    privateResponse: PRIVATE_INSTALLATION_QUERY_PARAMETERS.some((parameter) => params.has(parameter)),
    status: 200,
  };
}
