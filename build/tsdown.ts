/** `dev` and `default` outputs consumed by package `exports` conditions. */
export type PackageBuildMode = 'dev' | 'default';

export const packageBuildModes: PackageBuildMode[] = ['dev', 'default'];

/** Applied to every tsdown config in the monorepo. */
export const baseConfig = {
  report: process.env.CI === 'true',
} as const;

/** Shared options for packages that emit `dist/dev` and `dist/default`. */
export function packageBuildConfig(mode: PackageBuildMode, platform: 'browser' | 'neutral' = 'neutral') {
  return {
    ...baseConfig,
    platform,
    format: 'es' as const,
    sourcemap: true,
    clean: true,
    hash: false,
    unbundle: true,
    outDir: `dist/${mode}`,
    define: {
      __DEV__: mode === 'dev' ? 'true' : 'false',
    },
    dts: mode === 'dev' ? ({ tsgo: true, tsconfig: 'tsconfig.dts.json' } as const) : (false as const),
  };
}

export function isDevBuildMode(mode: PackageBuildMode): boolean {
  return mode === 'dev';
}

/** Single-output packages (e.g. `@videojs/utils`) without dev/default splits. */
export const neutralLibraryConfig = {
  ...baseConfig,
  platform: 'neutral' as const,
  format: 'es' as const,
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  dts: { tsgo: true, tsconfig: 'tsconfig.dts.json' } as const,
};
