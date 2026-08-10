import { defineConfig } from 'vite-plus';
import cdnPackConfig from './pack.cdn.config.js';
import packConfig from './pack.config.js';
import testConfig from './test.config.js';

export default defineConfig({
  ...testConfig,
  pack: [...packConfig, ...cdnPackConfig],
});
