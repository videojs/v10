import type { UserConfig } from 'vite-plus/pack';
import { defineConfig } from 'vite-plus/pack';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: {
    index: './src/index.ts',
    context: './src/context.ts',
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
