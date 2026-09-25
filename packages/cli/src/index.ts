import { runAgentsCli } from '@videojs/installation/node';

import packageJson from '../package.json' with { type: 'json' };

// Earlier releases of this package read docs and saved preferences. Keep those commands answering so scripts that
// still call them learn where the replacement lives instead of failing on an unknown command.
const DEPRECATED_COMMANDS = new Set(['docs', 'config']);
const [command] = process.argv.slice(2);

if (command && DEPRECATED_COMMANDS.has(command)) {
  process.stderr.write(
    `\`videojs ${command}\` is deprecated and no longer does anything. Run \`npx @videojs/cli agents init\` for version-matched installation instructions, or read the docs at https://videojs.org/docs.\n`
  );
} else {
  runAgentsCli(packageJson.version);
}
