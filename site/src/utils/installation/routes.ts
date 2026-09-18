import type { SupportedFramework } from '../../types/docs';

export const INSTALLATION_ROUTE_SEGMENTS = ['react', 'html', 'vue', 'svelte', 'shadcn', 'cdn'] as const;
export type InstallationRouteSegment = (typeof INSTALLATION_ROUTE_SEGMENTS)[number];

export interface InstallationRouteConfig {
  description: string;
  framework: SupportedFramework;
  frameworks: readonly SupportedFramework[];
  slug: string;
}

/** Public installation routes and the source document each route renders. */
export const INSTALLATION_ROUTES = {
  react: {
    description:
      'Install Video.js in React and build an accessible, customizable video player with composable controls',
    framework: 'react',
    frameworks: ['react'],
    slug: 'guides/installation',
  },
  html: {
    description: 'Install Video.js with HTML custom elements and build an accessible, customizable video player',
    framework: 'html',
    frameworks: ['html'],
    slug: 'guides/installation',
  },
  vue: {
    description: 'Install Video.js in Vue or Nuxt and build a video player with HTML custom elements',
    framework: 'html',
    frameworks: ['html'],
    slug: 'guides/installation-vue',
  },
  svelte: {
    description: 'Install Video.js in Svelte or SvelteKit and build a video player with HTML custom elements',
    framework: 'html',
    frameworks: ['html'],
    slug: 'guides/installation-svelte',
  },
  shadcn: {
    description: 'Use the Video.js Shadcn registry to add editable skin source and build a React or HTML video player',
    framework: 'react',
    frameworks: ['react', 'html'],
    slug: 'guides/installation-shadcn',
  },
  cdn: {
    description: 'Load Video.js from jsDelivr and build an HTML video player without a package manager',
    framework: 'html',
    frameworks: ['html'],
    slug: 'guides/cdn',
  },
} as const satisfies Record<InstallationRouteSegment, InstallationRouteConfig>;

export const CANONICAL_INSTALLATION_SLUGS: ReadonlySet<string> = new Set(
  Object.values(INSTALLATION_ROUTES).map(({ slug }) => slug)
);

export function getInstallationRoutePath(route: InstallationRouteSegment): string {
  return `/docs/guides/installation/${route}`;
}
