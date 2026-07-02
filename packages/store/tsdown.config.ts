import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  entry: {
    index: './src/core/index.ts',
    html: './src/html/index.ts',
    react: './src/react/index.ts',
  },
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
