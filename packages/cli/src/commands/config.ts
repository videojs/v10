import { getConfigValue, listConfig, setConfigValue } from '../utils/config.js';

export function handleConfig(args: string[]): void {
  const [subcommand, key, value] = args;

  switch (subcommand) {
    case 'set': {
      if (!key || !value) {
        console.error('Usage: @videojs/cli config set <key> <value>');
        process.exit(1);
      }
      setConfigValue(key, value);
      console.log(`Set ${key} = ${value}`);
      break;
    }
    case 'get': {
      if (!key) {
        console.error('Usage: @videojs/cli config get <key>');
        process.exit(1);
      }
      const val = getConfigValue(key);
      if (val !== undefined) {
        console.log(val);
      } else {
        console.error(`No value set for "${key}"`);
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
      console.error('Usage: @videojs/cli config <set|get|list>');
      process.exit(1);
  }
}
