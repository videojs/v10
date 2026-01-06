import { defineConfig } from 'tsdown';

// const defineDir = new URL('./src/define', import.meta.url).pathname;
// const defineFiles = readdirSync(defineDir).filter(file => file.endsWith('.ts'));

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // 'skins/frosted': 'src/skins/frosted/index.ts',
    // 'skins/minimal': 'src/skins/minimal/index.ts',
    // ...defineFiles.reduce((entries, file) => {
    //   const name = file.replace(/\.ts$/, '');
    //   entries[`define/${name}`] = `src/define/${file}`;
    //   return entries;
    // }, {} as Record<string, string>),
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  dts: true,
});
