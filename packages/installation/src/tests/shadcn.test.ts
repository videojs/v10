import { describe, expect, it } from 'vitest';

import {
  defaultRegistryTemplate,
  defaultRegistryStyling,
  REGISTRY_PRESETS,
  REGISTRY_SKINS,
  REGISTRY_TEMPLATES,
  registryInstallCommands,
  registryNamespaceUrl,
  registrySkinSelection,
  registryStylings,
  registryTemplates,
  resolveRegistryStyling,
  resolveRegistryTemplate,
  shadcnAddCommand,
  shadcnCommand,
  shadcnInitCommand,
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
    expect(shadcnAddCommand('npm', ['video'])).toBe('npx shadcn@latest add @videojs/video');
    expect(shadcnAddCommand('pnpm', ['video', 'play-button'])).toBe(
      'pnpm dlx shadcn@latest add @videojs/video @videojs/play-button'
    );
    expect(shadcnCommand('bun', 'init')).toBe('bunx --bun shadcn@latest init');
  });
});

describe('shadcnInitCommand', () => {
  it('offers every supported React project template', () => {
    expect(REGISTRY_TEMPLATES).toEqual(['next', 'vite', 'start', 'laravel', 'react-router', 'astro']);
  });

  it('defaults each app framework to a suitable project template', () => {
    expect(defaultRegistryTemplate('react')).toBe('next');
    expect(defaultRegistryTemplate('html')).toBe('vite');
    expect(defaultRegistryTemplate('vue')).toBe('vite');
    expect(defaultRegistryTemplate('svelte')).toBe('vite');
  });

  it('only offers compatible project templates for HTML source', () => {
    expect(registryTemplates('react')).toEqual(['next', 'vite', 'start', 'laravel', 'react-router', 'astro']);
    expect(registryTemplates('html')).toEqual(['vite', 'astro', 'laravel']);
  });

  it('falls back when a project template does not support the source framework', () => {
    expect(resolveRegistryTemplate('html', 'next')).toBe('vite');
    expect(resolveRegistryTemplate('html', 'astro')).toBe('astro');
    expect(resolveRegistryTemplate('react', 'next')).toBe('next');
    expect(resolveRegistryTemplate('react', null)).toBe('next');
  });

  it('sets the selected project template', () => {
    expect(shadcnInitCommand('pnpm', 'start')).toBe('pnpm dlx shadcn@latest init --template start');
    expect(shadcnInitCommand('npm', 'vite')).toBe('npx shadcn@latest init --template vite');
  });
});

describe('shadcnRegistryAddCommand', () => {
  it('registers the namespace against the chosen catalog', () => {
    expect(shadcnRegistryAddCommand('npm', 'react', 'tailwind')).toBe(
      'npx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/react/{name}.json'
    );
    expect(shadcnRegistryAddCommand('yarn', 'html', 'css')).toBe(
      'yarn dlx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/html/{name}.json'
    );
    expect(shadcnRegistryAddCommand('pnpm', 'react', 'tailwind', 'minimal')).toBe(
      'pnpm dlx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/react/minimal/{name}.json'
    );
  });
});

describe('registryInstallCommands', () => {
  it('registers the namespace before adding the items', () => {
    expect(registryInstallCommands('pnpm', 'react', 'css', ['video'], 'minimal')).toBe(
      [
        'pnpm dlx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/react/css/minimal/{name}.json',
        'pnpm dlx shadcn@latest add @videojs/video',
      ].join('\n')
    );
  });

  it('only registers the namespace when there is nothing to add', () => {
    expect(registryInstallCommands('npm', 'html', 'css', [])).toBe(
      'npx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/html/{name}.json'
    );
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
