export const INSTALLATION_METHODS = ['packaged', 'shadcn', 'cdn'] as const;
export type InstallationMethod = (typeof INSTALLATION_METHODS)[number];

export const INSTALLATION_FRAMEWORKS = ['react', 'html', 'vue', 'svelte'] as const;
export type InstallationFramework = (typeof INSTALLATION_FRAMEWORKS)[number];

export interface InstallationTarget {
  method?: InstallationMethod;
  framework?: InstallationFramework;
}

export interface BundledInstallationDocument {
  docsFramework: 'html' | 'react';
  slug: string;
}

export function parseInstallationSlug(slug: string): InstallationTarget | null {
  switch (slug) {
    case 'guides/installation':
      return {};
    case 'guides/installation/react':
      return { method: 'packaged', framework: 'react' };
    case 'guides/installation/html':
      return { method: 'packaged', framework: 'html' };
    case 'guides/installation/vue':
    case 'guides/installation-vue':
      return { method: 'packaged', framework: 'vue' };
    case 'guides/installation/svelte':
    case 'guides/installation-svelte':
      return { method: 'packaged', framework: 'svelte' };
    case 'guides/installation/shadcn':
    case 'guides/installation-shadcn':
      return { method: 'shadcn' };
    case 'guides/installation/cdn':
    case 'guides/cdn':
      return { method: 'cdn', framework: 'html' };
    default:
      return null;
  }
}

export function bundledInstallationDocument(
  method: InstallationMethod,
  framework: InstallationFramework
): BundledInstallationDocument {
  if (method === 'cdn') return { docsFramework: 'html', slug: 'guides/cdn' };

  if (method === 'shadcn') {
    return {
      docsFramework: framework === 'react' ? 'react' : 'html',
      slug: 'guides/installation-shadcn',
    };
  }

  if (framework === 'vue') return { docsFramework: 'html', slug: 'guides/installation-vue' };

  if (framework === 'svelte') return { docsFramework: 'html', slug: 'guides/installation-svelte' };

  return { docsFramework: framework, slug: 'guides/installation' };
}
