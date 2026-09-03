import { skinCatalog } from '../../../../packages/skins/build/catalog.ts';

/** The tool that scaffolds, builds, and serves a consumer. Bundler compatibility is a property of the packages. */
export type RegistryConsumerBundler = 'next' | 'vite' | 'webpack' | 'rspack';

interface RegistryConsumerProjectBase {
  readonly name: string;
  readonly directory: string;
  readonly port: number;
  readonly bundler: RegistryConsumerBundler;
}

export type RegistryConsumerProject = RegistryConsumerProjectBase &
  (
    | { readonly framework: 'react'; readonly styling: 'css' | 'tailwind' }
    | { readonly framework: 'html'; readonly styling: 'css' }
  );

/** The on-demand video skins every consumer installs, by registry item name. */
export const registryConsumerSkins = skinCatalog
  .filter((entry) => entry.preset === 'video')
  .map((entry) => entry.registryItem);

/** External projects exercised against the local, hosted registry output. */
export const registryConsumerProjects = [
  {
    name: 'next-react-tailwind',
    directory: 'next-react-tailwind',
    framework: 'react',
    styling: 'tailwind',
    bundler: 'next',
    port: 5310,
  },
  {
    name: 'next-react-css',
    directory: 'next-react-css',
    framework: 'react',
    styling: 'css',
    bundler: 'next',
    port: 5311,
  },
  {
    name: 'vite-html-css',
    directory: 'vite-html-css',
    framework: 'html',
    styling: 'css',
    bundler: 'vite',
    port: 5312,
  },
  {
    name: 'webpack-react-css',
    directory: 'webpack-react-css',
    framework: 'react',
    styling: 'css',
    bundler: 'webpack',
    port: 5313,
  },
  {
    name: 'rspack-html-css',
    directory: 'rspack-html-css',
    framework: 'html',
    styling: 'css',
    bundler: 'rspack',
    port: 5314,
  },
] as const satisfies readonly RegistryConsumerProject[];
