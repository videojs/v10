import {
  createInstallationPlan,
  INSTALLATION_FRAMEWORKS,
  INSTALLATION_PARAMETERS,
  INSTALLATION_QUERY_PARAMETERS,
  installationParameterForKey,
  isInstallationFramework,
  PRIVATE_INSTALLATION_QUERY_PARAMETERS,
  QUERY_OPTION_SYNTAX,
  renderArgumentErrors,
  renderInstallationPlanSections,
  resolveInstallationSelection,
  type InstallationInput,
  type InstallationInputKey,
  type InstallationPlan,
  type SelectionError,
} from '@videojs/installation';

import cliPackage from '../../../../packages/cli/package.json' with { type: 'json' };
import { closesCodeFence, codeFenceOpening, outsideCodeFences } from '../markdown-text.ts';
import { getInstallationRouteSegment, INSTALLATION_ROUTES, type InstallationRouteSegment } from './routes.ts';

/** The `@videojs/cli` release the published plans describe; the player packages they install share its version. */
export const INSTALLATION_PACKAGE_VERSION = cliPackage.version;

const PLAN_PATTERN = /<!-- installation-plan:start -->[\s\S]*?<!-- installation-plan:end -->/;
const FRAMEWORK_BRANCH_OPEN = /^[ \t]*<!-- installation:framework (\S+) -->[ \t]*(?:\r?\n)?$/;
const FRAMEWORK_BRANCH_CLOSE = /^[ \t]*<!-- \/installation:framework (\S+) -->[ \t]*(?:\r?\n)?$/;

/** The query parameters an installation twin reads. It ignores every other parameter, such as `utm_source`. */
export const INSTALLATION_MARKDOWN_PARAMS = INSTALLATION_QUERY_PARAMETERS;

function inputFromQuery(route: InstallationRouteSegment, params: URLSearchParams): InstallationInput {
  const { method, pickerFramework } = INSTALLATION_ROUTES[route];
  const value = (key: InstallationInputKey) => params.get(installationParameterForKey(key).query) ?? undefined;

  return {
    method,
    framework: method === 'shadcn' ? value('framework') || pickerFramework : pickerFramework,
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

/** Query values the route itself rules out. The selection resolver never sees them, so they cannot cascade. */
function routeQueryErrors(route: InstallationRouteSegment, params: URLSearchParams): SelectionError[] {
  const { method, pickerFramework } = INSTALLATION_ROUTES[route];
  const errors: SelectionError[] = INSTALLATION_PARAMETERS.filter(({ query }) => params.getAll(query).length > 1).map(
    ({ key }) => ({ field: key, message: 'Pass this parameter at most once.' })
  );

  const requestedMethod = params.get('method');

  if (requestedMethod && requestedMethod !== method) {
    errors.push({
      field: 'method',
      value: requestedMethod,
      message: `This route uses the ${method} method. Choose its canonical installation route instead.`,
    });
  }

  const requestedFramework = params.get('framework');

  if (requestedFramework && !isInstallationFramework(requestedFramework)) {
    errors.push({
      field: 'framework',
      value: requestedFramework,
      message: `Expected one of: ${INSTALLATION_FRAMEWORKS.join(', ')}`,
    });
  } else if (method !== 'shadcn' && requestedFramework && requestedFramework !== pickerFramework) {
    errors.push({
      field: 'framework',
      value: requestedFramework,
      message: `This route uses the ${pickerFramework} framework. Choose its canonical installation route instead.`,
    });
  }

  return errors;
}

export type InstallationMarkdownPlanResult =
  | { ok: true; plan: InstallationPlan }
  | { ok: false; errors: readonly SelectionError[] }
  | null;

function queryField(error: SelectionError): string {
  return error.field === 'arguments' ? 'arguments' : installationParameterForKey(error.field).query;
}

// Rejected values are left out so a crafted query cannot write its own text into the served Markdown. Hints only name
// validated choices.
function renderInstallationQueryErrors(errors: readonly SelectionError[]): string {
  return renderArgumentErrors(
    'Invalid installation options:',
    errors.map(({ value: _value, ...error }) => ({ ...error, field: queryField(error) }))
  );
}

/**
 * Resolve one canonical installation route and its query parameters through the shared installation schema.
 *
 * @param commandVersion - The `@videojs/cli` version pinned in the reproduce command. The site deploys from main, so it
 *   stays unpinned there: a pinned release could reject options added since then. Docs bundled into a release pin it.
 */
export function resolveInstallationMarkdownPlan(
  path: string,
  params: URLSearchParams,
  packageVersion = INSTALLATION_PACKAGE_VERSION,
  commandVersion: string | null = null
): InstallationMarkdownPlanResult {
  const route = getInstallationRouteSegment(`/${path.replace(/^\//, '')}`);
  if (!route) return null;

  const errors = routeQueryErrors(route, params);
  if (errors.length > 0) return { ok: false, errors };

  const resolved = resolveInstallationSelection(inputFromQuery(route, params), packageVersion, {}, QUERY_OPTION_SYNTAX);
  if (!resolved.ok) return resolved;

  return { ok: true, plan: createInstallationPlan(resolved.selection, packageVersion, commandVersion) };
}

/**
 * Replace the generated installation section. Keep its boundary only in a template that is rendered again; readers get
 * the section without the internal markers.
 */
export function replaceInstallationMarkdownPlan(
  markdown: string,
  replacement: string,
  { keepBoundary = true }: { keepBoundary?: boolean } = {}
): string | null {
  if (!PLAN_PATTERN.test(markdown)) return null;

  return markdown.replace(PLAN_PATTERN, () => {
    if (!keepBoundary) return replacement.trim();

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
  /**
   * Keep both marked source-framework branches and the plan boundary in the build artifact used as the edge renderer's
   * template.
   */
  preserveFrameworkBranches?: boolean;
  /** The `@videojs/cli` version pinned in the reproduce command; see `resolveInstallationMarkdownPlan`. */
  commandVersion?: string | null;
}

/** Resolve, validate, and render one installation Markdown page for its route and query parameters. */
export function renderInstallationMarkdownSelection(
  markdown: string,
  path: string,
  params: URLSearchParams,
  packageVersion = INSTALLATION_PACKAGE_VERSION,
  options: RenderInstallationMarkdownOptions = {}
): RenderedInstallationMarkdown | null {
  const result = resolveInstallationMarkdownPlan(path, params, packageVersion, options.commandVersion);
  if (!result) return null;

  if (!result.ok) {
    return {
      body: `${renderInstallationQueryErrors(result.errors)}\n`,
      privateResponse: true,
      status: 400,
    };
  }

  const preserve = options.preserveFrameworkBranches ?? false;
  const replaced = replaceInstallationMarkdownPlan(markdown, renderInstallationPlanSections(result.plan), {
    keepBoundary: preserve,
  });

  if (!replaced) {
    return {
      body: 'The installation guide is missing its generated installation section.\n',
      privateResponse: true,
      status: 500,
    };
  }

  return {
    body: preserve ? replaced : selectInstallationFramework(replaced, result.plan.selection.sourceFramework),
    privateResponse: PRIVATE_INSTALLATION_QUERY_PARAMETERS.some((parameter) => params.has(parameter)),
    status: 200,
  };
}
