import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: {
    index: './src/index.ts',
    context: './src/context.ts',
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
