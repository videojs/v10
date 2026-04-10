import { parse } from '@bomb.sh/args';
import { handleConfig } from './commands/config.js';
import { handleDocs } from './commands/docs.js';

const parsed = parse(process.argv.slice(2), {
  alias: { f: 'framework', l: 'list', v: 'version', h: 'help' },
  string: ['framework', 'preset', 'skin', 'media', 'source-url', 'install-method'],
  boolean: ['list', 'version', 'help'],
});

const [command, ...rest] = parsed._ as string[];

if (parsed.version) {
  console.log(`@videojs/cli v${__CLI_VERSION__}`);
  process.exit(0);
}

if (!command) {
  console.log(`@videojs/cli — Video.js 10 CLI

Commands:
  docs <slug> [options]                Read a doc page
  docs --list [--framework]            List available docs
  config <set|get|list> [key] [value]  Manage preferences

Options:
  -f, --framework <html|react>  JS framework
  -v, --version                 Show version
  -h, --help                    Show help`);
  process.exit(0);
}

if (command === 'docs') {
  await handleDocs(parsed, rest);
} else if (command === 'config') {
  handleConfig(rest, { help: parsed.help });
} else {
  console.error(`Unknown command: "${command}". Run with --help for usage.`);
  process.exit(1);
}
