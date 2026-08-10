import type { UserConfig } from 'vite-plus/pack';
import { defineConfig } from 'vite-plus/pack';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  entry: {
    index: './src/core/index.ts',
    html: './src/html/index.ts',
    react: './src/react/index.ts',
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
