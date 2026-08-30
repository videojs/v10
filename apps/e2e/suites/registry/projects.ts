export interface RegistryConsumerProject {
  readonly name: string;
  readonly directory: string;
  readonly framework: 'html' | 'react';
  readonly styling: 'css' | 'tailwind';
  readonly skin: 'video' | 'video-minimal';
  readonly port: number;
}

/** External projects exercised against the local, hosted registry output. */
export const registryConsumerProjects = [
  {
    name: 'next-react-tailwind',
    directory: 'next-react-tailwind',
    framework: 'react',
    styling: 'tailwind',
    skin: 'video',
    port: 5310,
  },
  {
    name: 'next-react-css',
    directory: 'next-react-css',
    framework: 'react',
    styling: 'css',
    skin: 'video-minimal',
    port: 5311,
  },
  {
    name: 'vite-html-tailwind',
    directory: 'vite-html-tailwind',
    framework: 'html',
    styling: 'tailwind',
    skin: 'video',
    port: 5312,
  },
  {
    name: 'vite-html-css',
    directory: 'vite-html-css',
    framework: 'html',
    styling: 'css',
    skin: 'video-minimal',
    port: 5313,
  },
] as const satisfies readonly RegistryConsumerProject[];
