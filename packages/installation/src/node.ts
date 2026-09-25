import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';

import { renderDiscoveryMarkdown, renderInstallationMarkdown, renderSelectionErrors } from './markdown';
import {
  INSTALLATION_PARAMETERS,
  installationInputKeyFromFlag,
  installationParameterForKey,
  type InstallationInput,
  type PackageManager,
} from './parameters';
import { createInstallationDiscovery, createInstallationPlan } from './plan';
import {
  isPackageManager,
  resolveInstallationSelection,
  selectionToInput,
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
  help: boolean;
  selected: boolean;
  input: InstallationInput;
}

type ParseResult = { ok: true; value: ParsedArguments } | { ok: false; json: boolean; errors: SelectionError[] };

function parseArguments(args: readonly string[]): ParseResult {
  const json = args.includes('--json');

  if (args[0] !== 'agents' || args[1] !== 'init') {
    return {
      ok: false,
      json,
      errors: [
        {
          field: 'arguments',
          message: 'Expected `agents init`. Run `agents init` without selection flags to list every option.',
        },
      ],
    };
  }

  const input: InstallationInput = {};
  let selected = false;
  let help = false;

  for (let index = 2; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === '--json') continue;

    if (argument === '--help' || argument === '-h') {
      help = true;
      continue;
    }

    const equals = argument.indexOf('=');
    const flag = equals === -1 ? argument : argument.slice(0, equals);

    const key = installationInputKeyFromFlag(flag);

    if (!key) {
      const message = argument.startsWith('-') ? `Unknown flag: ${argument}` : `Unexpected argument: ${argument}`;

      return {
        ok: false,
        json,
        errors: [{ field: 'arguments', value: argument, message }],
      };
    }

    const value = equals === -1 ? args[++index] : argument.slice(equals + 1);

    if (value === undefined || value.startsWith('--') || (value.length === 0 && key !== 'sourceUrl')) {
      return {
        ok: false,
        json,
        errors: [{ field: key, message: `${flag} requires a value.` }],
      };
    }

    if (input[key] !== undefined) {
      return {
        ok: false,
        json,
        errors: [{ field: key, value, message: `${flag} may only be provided once.` }],
      };
    }

    input[key] = value;
    selected = true;
  }

  return { ok: true, value: { json, help, selected, input } };
}

function jsonDocument<Value>(value: Value): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function installationPlanJson(plan: ReturnType<typeof createInstallationPlan>) {
  const { selection, ...document } = plan;
  const input = selectionToInput(selection);
  const selectedOptions: Record<string, string> = {};

  for (const parameter of INSTALLATION_PARAMETERS) {
    if (parameter.key === 'skin' && selection.useCase === 'background-video') continue;

    if (parameter.key === 'packageManager' && selection.method === 'cdn' && selection.template === 'none') continue;

    if (parameter.key === 'styling' && selection.styling === null) continue;

    selectedOptions[parameter.query] = input[parameter.key];
  }

  return {
    ...document,
    selectedOptions,
    defaultedOptions: selection.defaulted
      .filter((key) => key !== 'skin' || selection.useCase !== 'background-video')
      .map((key) => installationParameterForKey(key).query),
  };
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

export function runAgentsInit(
  owner: PlayerOwner,
  packageVersion: string,
  args: readonly string[],
  defaults: { packageManager?: PackageManager } = {}
): AgentsInitResult {
  try {
    const json = args.includes('--json');
    const nonJsonArgs = args.filter((argument) => argument !== '--json');
    const versionRequested =
      (nonJsonArgs.length === 1 && nonJsonArgs[0] === '--version') ||
      (nonJsonArgs.length === 3 && nonJsonArgs.join(' ') === 'agents init --version');

    if (versionRequested) {
      return {
        exitCode: 0,
        stdout: json
          ? jsonDocument({ schemaVersion: 1, kind: 'version', package: `@videojs/${owner}`, packageVersion })
          : `${packageVersion}\n`,
        stderr: '',
      };
    }

    const topLevelDiscovery =
      nonJsonArgs.length === 0 ||
      (nonJsonArgs.length === 1 && (nonJsonArgs[0] === '--help' || nonJsonArgs[0] === '-h'));
    const normalizedArgs = topLevelDiscovery ? ['agents', 'init', '--help', ...(json ? ['--json'] : [])] : args;
    const parsed = parseArguments(normalizedArgs);
    if (!parsed.ok) return errorResult(parsed.json, parsed.errors);

    if (!parsed.value.selected || parsed.value.help) {
      const discovery = createInstallationDiscovery(owner, packageVersion, defaults);

      return {
        exitCode: 0,
        stdout: parsed.value.json ? jsonDocument(discovery) : renderDiscoveryMarkdown(discovery),
        stderr: '',
      };
    }

    const resolved = resolveInstallationSelection(owner, parsed.value.input, packageVersion, defaults);
    if (!resolved.ok) return errorResult(parsed.value.json, resolved.errors);

    const plan = createInstallationPlan(resolved.selection, packageVersion);

    return {
      exitCode: 0,
      stdout: parsed.value.json ? jsonDocument(installationPlanJson(plan)) : renderInstallationMarkdown(plan),
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

/** Run the package's instruction-only agent CLI and publish its process result. */
export function runAgentsCli(owner: PlayerOwner, packageVersion: string, args = process.argv.slice(2)): void {
  const result = runAgentsInit(owner, packageVersion, args, {
    packageManager: detectPackageManager(process.cwd(), process.env),
  });

  if (result.stdout) process.stdout.write(result.stdout);

  if (result.stderr) process.stderr.write(result.stderr);

  process.exitCode = result.exitCode;
}

interface PackageManagerEnvironment {
  PATH?: string;
  Path?: string;
  npm_config_user_agent?: string;
}

interface PackageManifest {
  packageManager?: string;
  workspaces?: unknown;
}

function readPackageManifest(path: string): PackageManifest | null {
  try {
    // SAFETY: consumers validate the only optional fields they read before using them.
    return JSON.parse(readFileSync(path, 'utf8')) as PackageManifest;
  } catch {
    return null;
  }
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

/** Match an existing workspace first, then prefer pnpm for a new project when it is available. */
export function detectPackageManager(
  cwd: string,
  environment: PackageManagerEnvironment = process.env
): PackageManager {
  const start = resolve(cwd);
  const root = parse(start).root;
  const directories: string[] = [];
  let directory = start;

  while (true) {
    directories.push(directory);

    if (directory === root) break;

    directory = dirname(directory);
  }

  const lockfiles = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
  ] as const;
  const manifests = directories.map((candidate) => readPackageManifest(join(candidate, 'package.json')));
  const workspaceBoundary = directories.findIndex(
    (candidate, index) =>
      existsSync(join(candidate, '.git')) ||
      existsSync(join(candidate, 'pnpm-workspace.yaml')) ||
      manifests[index]?.workspaces !== undefined
  );
  const nearestPackage = manifests.findIndex((manifest) => manifest !== null);
  const boundary = workspaceBoundary >= 0 ? workspaceBoundary : nearestPackage >= 0 ? nearestPackage : 0;

  for (let index = 0; index <= boundary; index++) {
    const candidate = directories[index]!;
    const fromManifest = packageManagerFromManifest(manifests[index] ?? null);
    if (fromManifest) return fromManifest;

    const fromLockfile = lockfiles.find(([filename]) => existsSync(join(candidate, filename)))?.[1];
    if (fromLockfile) return fromLockfile;
  }

  const fromUserAgent = environment.npm_config_user_agent?.split('/')[0] ?? '';
  if (fromUserAgent !== 'npm' && isPackageManager(fromUserAgent)) return fromUserAgent;

  return executableExists('pnpm', environment) ? 'pnpm' : 'npm';
}
