import { main } from './ejected-skins/index.ts';

main().catch((error) => {
  console.error('\x1b[35m[ejected-skins]\x1b[0m', '\x1b[31merror:\x1b[0m', error);
  process.exit(1);
});
