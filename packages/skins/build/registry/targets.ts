import corePackage from '../../../core/package.json' with { type: 'json' };
import htmlPackage from '../../../html/package.json' with { type: 'json' };
import reactPackage from '../../../react/package.json' with { type: 'json' };
import type { SkinTheme } from '../../src/meta.ts';
import type { SkinStyling } from '../variants.ts';

/** One published registry catalog. HTML skins ship compiled CSS only. */
export type RegistryTarget =
  | {
      readonly framework: 'react';
      readonly styling: SkinStyling;
      readonly theme: SkinTheme;
      readonly output: string;
    }
  | {
      readonly framework: 'html';
      readonly styling: 'css';
      readonly theme: SkinTheme;
      readonly output: string;
    };

export const registryPaths = {
  install: '@components/videojs',
  import: '@/components/videojs',
} as const;

export const registryTargets = [
  { framework: 'react', styling: 'tailwind', theme: 'default', output: 'r/react' },
  { framework: 'react', styling: 'tailwind', theme: 'minimal', output: 'r/react/minimal' },
  { framework: 'react', styling: 'css', theme: 'default', output: 'r/react/css' },
  { framework: 'react', styling: 'css', theme: 'minimal', output: 'r/react/css/minimal' },
  { framework: 'html', styling: 'css', theme: 'default', output: 'r/html' },
  { framework: 'html', styling: 'css', theme: 'minimal', output: 'r/html/minimal' },
] as const satisfies readonly RegistryTarget[];

export const packageRequirements = {
  core: `${corePackage.name}@${corePackage.version}`,
  html: `${htmlPackage.name}@${htmlPackage.version}`,
  react: `${reactPackage.name}@${reactPackage.version}`,
} as const;

export const registryPackages = {
  [corePackage.name]: packageRequirements.core,
  [htmlPackage.name]: packageRequirements.html,
  [reactPackage.name]: packageRequirements.react,
};
