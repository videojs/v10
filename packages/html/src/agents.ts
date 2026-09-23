import { runAgentsInit } from '@videojs/installation/node';

const result = runAgentsInit('html', __VIDEOJS_PACKAGE_VERSION__, process.argv.slice(2));

if (result.stdout) process.stdout.write(result.stdout);

if (result.stderr) process.stderr.write(result.stderr);

process.exitCode = result.exitCode;
