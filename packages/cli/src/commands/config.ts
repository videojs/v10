import { getConfigValue, listConfig, setConfigValue } from '../utils/config.js';

const CONFIG_HELP = `Usage: @videojs/cli config <set|get|list>

Keys:
  framework <html|react>   JS framework for docs`;

export function handleConfig(args: string[], flags?: { help?: boolean }): void {
  const [subcommand, key, value] = args;

  if (flags?.help) {
    console.log(CONFIG_HELP);
    process.exit(0);
  }

  switch (subcommand) {
    case 'set': {
      if (!key || !value) {
        console.error('Usage: @videojs/cli config set <key> <value>');
        process.exit(1);
      }
      try {
        setConfigValue(key, value);
      } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
      }
      console.log(`Set ${key} = ${value}`);
      break;
    }
    case 'get': {
      if (!key) {
        console.error('Usage: @videojs/cli config get <key>');
        process.exit(1);
      }
      try {
        const val = getConfigValue(key);
        if (val !== undefined) {
          console.log(val);
        } else {
          console.error(`No value set for "${key}"`);
          process.exit(1);
        }
      } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
      }
      break;
    }
    case 'list': {
      const config = listConfig();
      const entries = Object.entries(config);
      if (entries.length === 0) {
        console.log('No configuration set.');
      } else {
        for (const [k, v] of entries) {
          console.log(`${k} = ${v}`);
        }
      }
      break;
    }
    default:
      console.error(CONFIG_HELP);
      process.exit(1);
  }
}
