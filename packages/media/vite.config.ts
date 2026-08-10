import { defineConfig } from 'vite-plus';
import packConfig from './pack.config.js';
import testConfig from './test.config.js';

export default defineConfig({
  ...testConfig,
  pack: packConfig,
});
