import { renderDiscoveryMarkdown, renderInstallationMarkdown, renderSelectionErrors } from './markdown';
import { createInstallationDiscovery, createInstallationPlan } from './plan';
import {
  resolveInstallationSelection,
  type InstallationInput,
  type InstallationInputKey,
  type PlayerOwner,
  type SelectionError,
} from './selection';

export interface AgentsInitResult {
  exitCode: 0 | 1 | 2;
  stdout: string;
  stderr: string;
}

const FLAGS = {
  '--method': 'method',
  '--framework': 'framework',
  '--preset': 'preset',
  '--skin': 'skin',
  '--media': 'media',
  '--source-url': 'sourceUrl',
  '--package-manager': 'packageManager',
  '--template': 'template',
  '--styling': 'styling',
} as const satisfies Record<string, InstallationInputKey>;

interface ParsedArguments {
  json: boolean;
  help: boolean;
  selected: boolean;
  input: InstallationInput;
}

type ParseResult = { ok: true; value: ParsedArguments } | { ok: false; json: boolean; errors: SelectionError[] };

function isInstallationFlag(value: string): value is keyof typeof FLAGS {
  return value in FLAGS;
}

function parseArguments(args: readonly string[]): ParseResult {
  const json = args.includes('--json');

  if (args[0] !== 'agents' || args[1] !== 'init') {
    return {
      ok: false,
      json,
      errors: [
        {
          field: 'method',
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

    if (!isInstallationFlag(flag)) {
      return {
        ok: false,
        json,
        errors: [{ field: 'method', value: argument, message: `Unknown flag: ${argument}` }],
      };
    }

    const key = FLAGS[flag];

    const value = equals === -1 ? args[++index] : argument.slice(equals + 1);

    if (!value || value.startsWith('--')) {
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

function errorResult(json: boolean, errors: readonly SelectionError[]): AgentsInitResult {
  if (json) {
    return {
      exitCode: 2,
      stdout: jsonDocument({ schemaVersion: 1, kind: 'error', error: 'invalid_arguments', errors }),
      stderr: '',
    };
  }

  return { exitCode: 2, stdout: '', stderr: `${renderSelectionErrors(errors)}\n` };
}

export function runAgentsInit(owner: PlayerOwner, packageVersion: string, args: readonly string[]): AgentsInitResult {
  try {
    const parsed = parseArguments(args);
    if (!parsed.ok) return errorResult(parsed.json, parsed.errors);

    if (!parsed.value.selected || parsed.value.help) {
      const discovery = createInstallationDiscovery(owner, packageVersion);

      return {
        exitCode: 0,
        stdout: parsed.value.json ? jsonDocument(discovery) : renderDiscoveryMarkdown(discovery),
        stderr: '',
      };
    }

    const resolved = resolveInstallationSelection(owner, parsed.value.input, packageVersion);
    if (!resolved.ok) return errorResult(parsed.value.json, resolved.errors);

    const plan = createInstallationPlan(resolved.selection, packageVersion);

    return {
      exitCode: 0,
      stdout: parsed.value.json ? jsonDocument(plan) : renderInstallationMarkdown(plan),
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
