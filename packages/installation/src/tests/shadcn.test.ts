import { describe, expect, it } from 'vitest';

import {
  defaultInstallationTemplate,
  defaultRegistryStyling,
  REGISTRY_PRESETS,
  REGISTRY_SKINS,
  INSTALLATION_TEMPLATES,
  installationTemplates,
  installationTemplatesForMethod,
  registryNamespaceUrl,
  registrySkinSelection,
  registryStylings,
  resolveInstallationTemplate,
  resolveRegistryStyling,
  shadcnAddCommand,
  shadcnCommand,
  shadcnComponentsConfig,
  shadcnInitCommand,
  optionalShadcnInitCommand,
  shadcnProjectConfiguration,
  shadcnProjectConfigurationPlacement,
  shadcnRegistryAddCommand,
} from '../index';

describe('registryNamespaceUrl', () => {
  it('selects the catalog through the URL, not the item name', () => {
    expect(registryNamespaceUrl('react', 'tailwind')).toBe('https://shadcn.videojs.org/r/react/{name}.json');
    expect(registryNamespaceUrl('react', 'css')).toBe('https://shadcn.videojs.org/r/react/css/{name}.json');
    expect(registryNamespaceUrl('html', 'css')).toBe('https://shadcn.videojs.org/r/html/{name}.json');
    expect(registryNamespaceUrl('react', 'tailwind', 'minimal')).toBe(
      'https://shadcn.videojs.org/r/react/minimal/{name}.json'
    );
    expect(registryNamespaceUrl('react', 'css', 'minimal')).toBe(
      'https://shadcn.videojs.org/r/react/css/minimal/{name}.json'
    );
    expect(registryNamespaceUrl('html', 'css', 'minimal')).toBe(
      'https://shadcn.videojs.org/r/html/minimal/{name}.json'
    );
  });
});

describe('registryStylings', () => {
  it('defaults React to Tailwind and HTML to CSS', () => {
    expect(registryStylings('react')).toEqual(['tailwind', 'css']);
    expect(registryStylings('html')).toEqual(['css']);
    expect(defaultRegistryStyling('react')).toBe('tailwind');
    expect(defaultRegistryStyling('html')).toBe('css');
  });

  it('falls back when a choice does not exist for the framework', () => {
    expect(resolveRegistryStyling('html', 'tailwind')).toBe('css');
    expect(resolveRegistryStyling('react', 'css')).toBe('css');
    expect(resolveRegistryStyling('react', null)).toBe('tailwind');
  });
});

describe('shadcnAddCommand', () => {
  it('namespaces every item and follows the package manager', () => {
    expect(shadcnAddCommand('npm', ['video'])).toBe('npx shadcn@latest add @videojs/video --overwrite --yes');
    expect(shadcnAddCommand('pnpm', ['video', 'play-button'])).toBe(
      'pnpm dlx shadcn@latest add @videojs/video @videojs/play-button --overwrite --yes'
    );
    expect(shadcnCommand('bun', 'init')).toBe('bunx --bun shadcn@latest init');
  });
});

describe('shadcnRegistryAddCommand', () => {
  it('sets the selected catalog through the Shadcn CLI', () => {
    expect(shadcnRegistryAddCommand('pnpm', 'react', 'css', 'minimal')).toBe(
      'pnpm dlx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/react/css/minimal/{name}.json'
    );
    expect(shadcnRegistryAddCommand('npm', 'html', 'css')).toBe(
      'npx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/html/{name}.json'
    );
  });
});

describe('shadcnInitCommand', () => {
  it('owns the complete app-template vocabulary outside the Shadcn model', () => {
    expect(INSTALLATION_TEMPLATES).toEqual([
      'none',
      'next',
      'vite',
      'start',
      'react-router',
      'astro',
      'laravel',
      'nuxt',
      'sveltekit',
    ]);
  });

  it('defaults each app framework to a suitable project template', () => {
    expect(defaultInstallationTemplate('react')).toBe('next');
    expect(defaultInstallationTemplate('html')).toBe('vite');
    expect(defaultInstallationTemplate('vue')).toBe('vite');
    expect(defaultInstallationTemplate('svelte')).toBe('vite');
  });

  it('offers compatible app templates for each project framework', () => {
    expect(installationTemplates('react')).toEqual(['next', 'vite', 'start', 'react-router', 'astro', 'laravel']);
    expect(installationTemplates('html')).toEqual(['vite', 'astro', 'laravel', 'none']);
    expect(installationTemplates('vue')).toEqual(['vite', 'astro', 'nuxt']);
    expect(installationTemplates('svelte')).toEqual(['vite', 'astro', 'sveltekit']);
  });

  it('keeps the no-scaffold setup out of Shadcn', () => {
    expect(installationTemplatesForMethod('html', 'packaged')).toContain('none');
    expect(installationTemplatesForMethod('html', 'cdn')).toEqual(['vite', 'none']);
    expect(installationTemplatesForMethod('html', 'shadcn')).toEqual(['vite', 'astro', 'laravel']);
  });

  it('falls back when a project template does not support the source framework', () => {
    expect(resolveInstallationTemplate('html', 'next')).toBe('vite');
    expect(resolveInstallationTemplate('html', 'astro')).toBe('astro');
    expect(resolveInstallationTemplate('react', 'next')).toBe('next');
    expect(resolveInstallationTemplate('react', null)).toBe('next');
  });

  it('sets the selected project template', () => {
    expect(shadcnInitCommand('pnpm', 'start')).toBe(
      'pnpm dlx shadcn@latest init --template start --no-monorepo --base base --preset nova --name videojs-app --yes\ncd videojs-app'
    );
    expect(shadcnInitCommand('npm', 'vite')).toBe(
      'npx shadcn@latest init --template vite --no-monorepo --base base --preset nova --name videojs-app --yes\ncd videojs-app'
    );
    expect(shadcnInitCommand('npm')).toBe('npx shadcn@latest init --base base --preset nova --yes');
    expect(shadcnInitCommand('yarn', 'vite')).toContain('npm_config_user_agent="yarn/1.22.22"');
  });

  it('marks initialization in an existing project as optional', () => {
    expect(optionalShadcnInitCommand('pnpm')).toBe(
      '# Optional: run if components.json does not exist.\npnpm dlx shadcn@latest init --base base --preset nova --yes'
    );
  });
});

describe('shadcnComponentsConfig', () => {
  it('preserves React server components for Next.js', () => {
    expect(JSON.parse(shadcnComponentsConfig('react', 'next', '@/components')).rsc).toBe(true);
    expect(JSON.parse(shadcnComponentsConfig('react', 'vite', '@/components')).rsc).toBe(false);
  });
});

describe('shadcnProjectConfiguration', () => {
  it('uses Shadcn initialization only for React with Tailwind', () => {
    expect(shadcnProjectConfiguration('react', 'vite', 'tailwind', '@/components')).toMatchObject({
      mode: 'shadcn-init',
      aliasSetup: expect.arrayContaining([
        expect.objectContaining({ filename: 'tsconfig.json' }),
        expect.objectContaining({ filename: 'tsconfig.app.json' }),
        expect.objectContaining({ filename: 'vite.config.ts' }),
      ]),
      componentsConfig: null,
    });
    expect(shadcnProjectConfiguration('html', 'vite', 'css', '@/components')).toMatchObject({
      mode: 'components-json',
      componentsConfig: expect.stringContaining('"tsx": true'),
    });
  });

  it('places setup with app creation, a configuration section, or the registry command', () => {
    const nextTailwind = shadcnProjectConfiguration('react', 'next', 'tailwind', '@/components');
    const viteTailwind = shadcnProjectConfiguration('react', 'vite', 'tailwind', '@/components');
    const nextCss = shadcnProjectConfiguration('react', 'next', 'css', '@/components');

    expect(shadcnProjectConfigurationPlacement(nextTailwind, 'new')).toBe('app');
    expect(shadcnProjectConfigurationPlacement(nextTailwind, 'existing')).toBe('registry');
    expect(shadcnProjectConfigurationPlacement(viteTailwind, 'existing')).toBe('section');
    expect(shadcnProjectConfigurationPlacement(nextCss, 'new')).toBe('section');
  });
});

describe('registrySkinSelection', () => {
  it('maps the installation selection onto a theme catalog and stable item name', () => {
    expect(registrySkinSelection({ useCase: 'default-video', skin: 'video' })).toEqual({
      item: 'video',
      theme: 'default',
    });
    expect(registrySkinSelection({ useCase: 'default-video', skin: 'minimal-video' })).toEqual({
      item: 'video',
      theme: 'minimal',
    });
    expect(registrySkinSelection({ useCase: 'live-audio', skin: 'minimal-audio' })).toEqual({
      item: 'live-audio',
      theme: 'minimal',
    });
  });

  it('leaves package-only selections alone', () => {
    expect(registrySkinSelection({ useCase: 'background-video', skin: 'video' })).toBeNull();
    expect(registrySkinSelection({ useCase: 'default-video', skin: 'none' })).toBeNull();
  });
});

describe('REGISTRY_SKINS', () => {
  it('names every published skin', () => {
    expect(REGISTRY_PRESETS.map((skin) => skin.item)).toEqual(['video', 'audio', 'live-video', 'live-audio']);
    expect(REGISTRY_SKINS.map((skin) => skin.item)).toEqual([
      'video',
      'video',
      'audio',
      'audio',
      'live-video',
      'live-video',
      'live-audio',
      'live-audio',
    ]);
    expect(REGISTRY_SKINS.find((skin) => skin.item === 'video' && skin.theme === 'minimal')?.directory).toBe(
      'components/videojs/video'
    );
  });
});
