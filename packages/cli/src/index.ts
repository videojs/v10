import { runAgentsCli } from '@videojs/installation/node';

import packageJson from '../package.json' with { type: 'json' };

runAgentsCli(packageJson.version);
