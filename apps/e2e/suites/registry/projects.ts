interface RegistryConsumerProjectBase {
  readonly name: string;
  readonly directory: string;
  readonly port: number;
}

export type RegistryConsumerProject = RegistryConsumerProjectBase &
  (
    | { readonly framework: 'react'; readonly styling: 'css' | 'tailwind' }
    | { readonly framework: 'html'; readonly styling: 'css' }
  );

export const registryConsumerSkins = ['video', 'video-minimal'] as const;

/** External projects exercised against the local, hosted registry output. */
export const registryConsumerProjects = [
  {
    name: 'next-react-tailwind',
    directory: 'next-react-tailwind',
    framework: 'react',
    styling: 'tailwind',
    port: 5310,
  },
  {
    name: 'next-react-css',
    directory: 'next-react-css',
    framework: 'react',
    styling: 'css',
    port: 5311,
  },
  {
    name: 'vite-html-css',
    directory: 'vite-html-css',
    framework: 'html',
    styling: 'css',
    port: 5312,
  },
] as const satisfies readonly RegistryConsumerProject[];
