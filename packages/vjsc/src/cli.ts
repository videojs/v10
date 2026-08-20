import { parseArgs } from 'node:util';
import { generateSchema } from './components/generate/schema';
import type { CompilerConfig } from './config';
import { loadBuildConfig } from './load-config';
import { generateEntries } from './registry/generate/entries';

const HELP = `vjsc

Commands:
  generate [options]  Generate configured compiler artifacts

Options:
  -c, --config <path>  vjsc config file
      --check          Verify generated output is current
  -h, --help           Show help`;

const [command, ...args] = process.argv.slice(2);

try {
  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(`${HELP}\n`);
  } else if (command === 'generate') {
    await generateCommand(args);
  } else {
    throw new Error(`Unknown command: ${JSON.stringify(command)}. Run with --help for usage.`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

async function generateCommand(args: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      config: { type: 'string', short: 'c' },
      check: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
  });

  if (values.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  const cwd = process.cwd();
  const loaded = await loadBuildConfig(cwd, values.config);
  if (!loaded) throw new Error(`vjsc config not found in ${cwd}.`);

  let generated = 0;
  const configs = Array.isArray(loaded.config) ? loaded.config : [loaded.config];

  for (const config of configs) {
    generated += runGenerationConfig(config, loaded.configDir, values.check);
  }

  if (generated === 0) throw new Error(`vjsc config ${loaded.configPath} does not declare any generated artifacts.`);
}

function runGenerationConfig(config: CompilerConfig, cwd: string, check: boolean): number {
  const generation = config.generate;
  if (!generation) return 0;
  let generated = 0;

  for (const schemaConfig of asArray(generation.schema)) {
    report(generateSchema(schemaConfig, { cwd, check }), check);
    generated++;
  }

  for (const entriesConfig of asArray(generation.entries)) {
    report(generateEntries(entriesConfig, { cwd, check }), check);
    generated++;
  }

  return generated;
}

function asArray<Value>(value: Value | readonly Value[] | undefined): readonly Value[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value as Value];
}

function report(result: { outputPath: string; changed: boolean }, check: boolean): void {
  const action = check ? 'Verified' : result.changed ? 'Wrote' : 'Unchanged';

  process.stdout.write(`${action} ${result.outputPath}\n`);
}
