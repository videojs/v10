import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { dirname, join, parse, relative, resolve } from 'node:path';

import { isPlainObject, isString } from '@videojs/utils/predicate';

import { renderDiscoveryMarkdown, renderInstallationMarkdown, renderSelectionErrors } from './markdown';
import {
  INSTALLATION_PARAMETERS,
  installationInputKeyFromFlag,
  installationParameterForKey,
  type InstallationInput,
  type PackageManager,
} from './parameters';
import {
  createInstallationDiscovery,
  createInstallationPlan,
  INSTALLATION_CLI_PACKAGE,
  installationCommand,
  installationReproduceInput,
  PLAYER_PACKAGES,
  type InstallationPlan,
  type PlayerPackage,
} from './plan';
import type { InstallationFramework } from './projects';
import {
  isPackageManager,
  resolveInstallationSelection,
  selectionToInput,
  type InstallationSelectionDefaults,
  type PlayerOwner,
  type SelectionError,
} from './selection';

export interface AgentsInitResult {
  exitCode: 0 | 1 | 2;
  stdout: string;
  stderr: string;
}

interface ParsedArguments {
  json: boolean;
  selected: boolean;
  input: InstallationInput;
}

type ParseResult = { ok: true; value: ParsedArguments } | { ok: false; json: boolean; errors: SelectionError[] };

const USAGE_HINT = 'Run `agents init` without selection flags to list every option.';

function parseArguments(args: readonly string[]): ParseResult {
  const json = args.includes('--json');
  const failure = (error: SelectionError): ParseResult => ({ ok: false, json, errors: [error] });

  if (args[0] !== 'agents' || args[1] !== 'init') {
    return failure({
      field: 'arguments',
      value: args.slice(0, 2).join(' '),
      message: 'Expected `agents init`.',
      hint: USAGE_HINT,
    });
  }

  const input: InstallationInput = {};
  let selected = false;

  for (let index = 2; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === '--json') continue;

    const equals = argument.indexOf('=');
    const flag = equals === -1 ? argument : argument.slice(0, equals);
    const key = installationInputKeyFromFlag(flag);

    if (!key) {
      return failure({
        field: 'arguments',
        value: argument,
        message: argument.startsWith('-') ? 'Unknown flag.' : 'Unexpected argument.',
        hint: USAGE_HINT,
      });
    }

    const value = equals === -1 ? args[++index] : argument.slice(equals + 1);

    if (value === undefined || value.startsWith('--') || (value.length === 0 && key !== 'sourceUrl')) {
      return failure({ field: key, message: 'Requires a value.' });
    }

    if (input[key] !== undefined) return failure({ field: key, value, message: 'May only be provided once.' });

    input[key] = value;
    selected = true;
  }

  return { ok: true, value: { json, selected, input } };
}

function jsonDocument<Value>(value: Value): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export interface InstallationVersionNotice {
  package: PlayerPackage;
  installedVersion: string;
  /** Prints the same selection from the CLI release that matches the installed player. */
  command: string;
  message: string;
}

function installationVersionNotice(
  plan: InstallationPlan,
  installedVersions: AgentsInitDefaults['installedVersions']
): InstallationVersionNotice | null {
  const installedVersion = installedVersions?.[plan.selection.owner];
  if (!installedVersion || installedVersion === plan.packageVersion) return null;

  const command = installationCommand(installationReproduceInput(plan.selection), installedVersion);

  return {
    package: plan.playerPackage,
    installedVersion,
    command,
    message: `These instructions target Video.js ${plan.packageVersion}, but this project has \`${plan.playerPackage}@${installedVersion}\`. For instructions that match the installed version, run \`${command}\`. If \`${INSTALLATION_CLI_PACKAGE}@${installedVersion}\` predates \`agents init\`, upgrade the project's Video.js packages to ${plan.packageVersion} and follow these instructions instead.`,
  };
}

interface InstallationPlanJson extends Omit<InstallationPlan, 'selection'> {
  versionNotice?: InstallationVersionNotice;
  selectedOptions: Record<string, string>;
  defaultedOptions: string[];
  /** Where each detected default came from, keyed by option name. */
  defaultedOptionSources: Record<string, string>;
}

function installationPlanJson(
  plan: InstallationPlan,
  versionNotice: InstallationVersionNotice | null
): InstallationPlanJson {
  const { selection, ...document } = plan;
  const input = selectionToInput(selection);
  const selectedOptions: Record<string, string> = {};

  for (const parameter of INSTALLATION_PARAMETERS) {
    if (parameter.key === 'skin' && selection.useCase === 'background-video') continue;

    if (parameter.key === 'packageManager' && selection.method === 'cdn' && selection.template === 'none') continue;

    if (parameter.key === 'styling' && selection.styling === null) continue;

    selectedOptions[parameter.query] = input[parameter.key];
  }

  const defaultedOptions = selection.defaulted.filter(
    (key) => key !== 'skin' || selection.useCase !== 'background-video'
  );
  const defaultedOptionSources: Record<string, string> = {};

  for (const key of defaultedOptions) {
    const source = selection.defaultSources[key];

    if (source) defaultedOptionSources[installationParameterForKey(key).query] = source;
  }

  const json: InstallationPlanJson = {
    ...document,
    selectedOptions,
    defaultedOptions: defaultedOptions.map((key) => installationParameterForKey(key).query),
    defaultedOptionSources,
  };

  if (versionNotice) json.versionNotice = versionNotice;

  return json;
}

function errorResult(json: boolean, errors: readonly SelectionError[]): AgentsInitResult {
  if (json) {
    return {
      exitCode: 2,
      stdout: jsonDocument({
        schemaVersion: 1,
        kind: 'error',
        error: 'invalid_arguments',
        errors: errors.map((error) => ({
          ...error,
          field: error.field === 'arguments' ? 'arguments' : installationParameterForKey(error.field).flag,
        })),
      }),
      stderr: '',
    };
  }

  return { exitCode: 2, stdout: '', stderr: `${renderSelectionErrors(errors)}\n` };
}

/** Player package versions found in a project, keyed by the player package that owns them. */
export type InstalledPlayerVersions = Partial<Record<PlayerOwner, string>>;

export interface AgentsInitDefaults extends InstallationSelectionDefaults {
  /** Used to flag instructions generated for another release than the project's player. */
  installedVersions?: InstalledPlayerVersions;
}

/**
 * Resolve one `agents init` invocation without touching the process or file system. Project detection results arrive
 * through `defaults`, so the same arguments always produce the same output.
 */
export function runAgentsInit(
  packageVersion: string,
  args: readonly string[],
  defaults: AgentsInitDefaults = {}
): AgentsInitResult {
  try {
    const json = args.includes('--json');

    // `--version` and `--help` win over every other argument, including ones that would otherwise be rejected.
    if (args.includes('--version')) {
      return {
        exitCode: 0,
        stdout: json
          ? jsonDocument({ schemaVersion: 1, kind: 'version', package: INSTALLATION_CLI_PACKAGE, packageVersion })
          : `${packageVersion}\n`,
        stderr: '',
      };
    }

    const bare = args.every((argument) => argument === '--json');
    const help = bare || args.includes('--help') || args.includes('-h');
    const parsed = help ? null : parseArguments(args);
    if (parsed && !parsed.ok) return errorResult(parsed.json, parsed.errors);

    if (!parsed || !parsed.value.selected) {
      const discovery = createInstallationDiscovery(packageVersion, defaults);

      return {
        exitCode: 0,
        stdout: json ? jsonDocument(discovery) : renderDiscoveryMarkdown(discovery),
        stderr: '',
      };
    }

    const resolved = resolveInstallationSelection(parsed.value.input, packageVersion, defaults);
    if (!resolved.ok) return errorResult(json, resolved.errors);

    const plan = createInstallationPlan(resolved.selection, packageVersion);
    const versionNotice = installationVersionNotice(plan, defaults.installedVersions);

    return {
      exitCode: 0,
      stdout: json
        ? jsonDocument(installationPlanJson(plan, versionNotice))
        : renderInstallationMarkdown(plan, versionNotice ? { versionNotice: versionNotice.message } : {}),
      stderr: '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const json = args.includes('--json');

    return {
      exitCode: 1,
      stdout: json ? jsonDocument({ schemaVersion: 1, kind: 'error', error: 'internal_error', message }) : '',
      stderr: json ? '' : `Unable to create installation instructions: ${message}\n`,
    };
  }
}

/** Run the instruction-only `agents init` CLI from the current directory and publish its process result. */
export function runAgentsCli(packageVersion: string, args = process.argv.slice(2)): void {
  const cwd = process.cwd();
  const defaults: AgentsInitDefaults = {
    packageManager: detectPackageManager(cwd, process.env),
    installedVersions: detectInstalledPlayerVersions(cwd),
  };
  const framework = detectFramework(cwd);

  if (framework) defaults.framework = framework;

  const result = runAgentsInit(packageVersion, args, defaults);

  if (result.stdout) process.stdout.write(result.stdout);

  if (result.stderr) process.stderr.write(result.stderr);

  process.exitCode = result.exitCode;
}

interface PackageManagerEnvironment {
  PATH?: string;
  Path?: string;
  npm_config_user_agent?: string;
}

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies'] as const;

type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

interface PackageManifest {
  packageManager: string | null;
  hasWorkspaces: boolean;
  version: string | null;
  /** Declared dependency ranges by field; entries with non-string values are dropped. */
  dependencies: Readonly<Record<DependencyField, ReadonlyMap<string, string>>>;
}

function stringEntries(value: unknown): ReadonlyMap<string, string> {
  if (!isPlainObject(value)) return new Map();

  return new Map(Object.entries(value).filter((entry): entry is [string, string] => isString(entry[1])));
}

function readPackageManifest(path: string): PackageManifest | null {
  let value: unknown;

  try {
    value = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }

  if (!isPlainObject(value)) return null;

  return {
    packageManager: isString(value.packageManager) ? value.packageManager : null,
    hasWorkspaces: value.workspaces !== undefined,
    version: isString(value.version) ? value.version : null,
    dependencies: {
      dependencies: stringEntries(value.dependencies),
      devDependencies: stringEntries(value.devDependencies),
    },
  };
}

interface ProjectManifests {
  /** The start directory followed by each ancestor up to the file system root. */
  directories: readonly string[];
  manifests: readonly (PackageManifest | null)[];
  /** Index of the outermost directory that still belongs to the project. */
  boundary: number;
}

/** Walk from `cwd` to the nearest repository or workspace root, or else to the nearest package. */
function readProjectManifests(cwd: string): ProjectManifests {
  const start = resolve(cwd);
  const root = parse(start).root;
  const directories: string[] = [];
  let directory = start;

  while (true) {
    directories.push(directory);

    if (directory === root) break;

    directory = dirname(directory);
  }

  const manifests = directories.map((candidate) => readPackageManifest(join(candidate, 'package.json')));
  const workspaceBoundary = directories.findIndex(
    (candidate, index) =>
      existsSync(join(candidate, '.git')) ||
      existsSync(join(candidate, 'pnpm-workspace.yaml')) ||
      manifests[index]?.hasWorkspaces
  );
  const nearestPackage = manifests.findIndex((manifest) => manifest !== null);
  const boundary = workspaceBoundary >= 0 ? workspaceBoundary : nearestPackage >= 0 ? nearestPackage : 0;

  return { directories, manifests, boundary };
}

function nearestProjectManifest({ manifests, boundary }: ProjectManifests): PackageManifest | null {
  return manifests.slice(0, boundary + 1).find((manifest) => manifest !== null) ?? null;
}

const FRAMEWORK_DEPENDENCIES = [
  ['react', ['react', 'react-dom', 'next', '@tanstack/react-start', 'react-router', '@videojs/react']],
  ['vue', ['vue', 'nuxt']],
  ['svelte', ['svelte', '@sveltejs/kit']],
] as const satisfies ReadonlyArray<readonly [InstallationFramework, readonly string[]]>;

/** Infer the framework from the nearest project manifest. Returns `null` when no framework dependency is present. */
export function detectFramework(cwd: string): NonNullable<InstallationSelectionDefaults['framework']> | null {
  const manifest = nearestProjectManifest(readProjectManifests(cwd));

  for (const [framework, dependencies] of FRAMEWORK_DEPENDENCIES) {
    for (const field of DEPENDENCY_FIELDS) {
      const declared = manifest?.dependencies[field];

      if (dependencies.some((dependency) => declared?.has(dependency))) {
        return { value: framework, source: `package.json ${field}` };
      }
    }
  }

  return null;
}

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?$/i;

/**
 * Find the `@videojs/react` and `@videojs/html` versions a project uses: the installed package when Node would resolve
 * one from `cwd`, otherwise an exact version declared in the nearest project manifest. Ranges are ignored because they
 * do not identify one release.
 */
export function detectInstalledPlayerVersions(cwd: string): InstalledPlayerVersions {
  const project = readProjectManifests(cwd);
  const manifest = nearestProjectManifest(project);
  const versions: InstalledPlayerVersions = {};

  for (const owner of ['react', 'html'] as const) {
    const packageName = PLAYER_PACKAGES[owner];
    const installed = project.directories
      .map((directory) => readPackageManifest(join(directory, 'node_modules', packageName, 'package.json'))?.version)
      .find(isString);
    const declared = DEPENDENCY_FIELDS.map((field) => manifest?.dependencies[field].get(packageName)).find(
      (version) => isString(version) && EXACT_VERSION.test(version)
    );
    const version = installed ?? declared;

    if (version) versions[owner] = version;
  }

  return versions;
}

function packageManagerFromManifest(manifest: PackageManifest | null): PackageManager | null {
  const name = manifest?.packageManager?.split('@')[0] ?? '';

  return isPackageManager(name) ? name : null;
}

function executableExists(name: string, environment: PackageManagerEnvironment): boolean {
  const path = environment.PATH ?? environment.Path ?? '';
  const extensions = process.platform === 'win32' ? ['', '.cmd', '.exe'] : [''];

  return path.split(process.platform === 'win32' ? ';' : ':').some((directory) =>
    extensions.some((extension) => {
      try {
        accessSync(join(directory, `${name}${extension}`), constants.X_OK);
        return true;
      } catch {
        return false;
      }
    })
  );
}

const LOCKFILES = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
] as const satisfies ReadonlyArray<readonly [string, PackageManager]>;

/**
 * Match an existing workspace first, then prefer pnpm for a new project when it is available. npm's user agent is
 * ignored because `npx` runs this CLI for every package manager, so it says nothing about the project's preference.
 */
export function detectPackageManager(
  cwd: string,
  environment: PackageManagerEnvironment = process.env
): NonNullable<InstallationSelectionDefaults['packageManager']> {
  const start = resolve(cwd);
  const { directories, manifests, boundary } = readProjectManifests(cwd);
  const displayPath = (directory: string, filename: string) => relative(start, join(directory, filename));

  for (let index = 0; index <= boundary; index++) {
    const directory = directories[index]!;
    const fromManifest = packageManagerFromManifest(manifests[index] ?? null);

    if (fromManifest) {
      return { value: fromManifest, source: `the ${displayPath(directory, 'package.json')} packageManager field` };
    }

    const lockfiles = LOCKFILES.filter(([filename]) => existsSync(join(directory, filename)));
    const [winner] = lockfiles;
    if (!winner) continue;

    const [lockfile, value] = winner;
    const conflicts = lockfiles
      .filter(([, manager]) => manager !== value)
      .map(([filename]) => displayPath(directory, filename));
    const conflict =
      conflicts.length > 0
        ? `; ${conflicts.join(' and ')} also found, and ${displayPath(directory, lockfile)} takes precedence`
        : '';

    return { value, source: `${displayPath(directory, lockfile)}${conflict}` };
  }

  const fromUserAgent = environment.npm_config_user_agent?.split('/')[0] ?? '';

  if (fromUserAgent !== 'npm' && isPackageManager(fromUserAgent)) {
    return {
      value: fromUserAgent,
      source: `the ${fromUserAgent} invocation (npm_config_user_agent); no lockfile or packageManager field found`,
    };
  }

  return executableExists('pnpm', environment)
    ? { value: 'pnpm', source: 'the pnpm executable on PATH; no lockfile or packageManager field found' }
    : { value: 'npm', source: 'the npm fallback; no lockfile, packageManager field, or pnpm on PATH found' };
}
