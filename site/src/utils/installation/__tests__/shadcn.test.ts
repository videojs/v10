import { describe, expect, it } from 'vitest';

import {
  defaultRegistryStyling,
  REGISTRY_SKINS,
  registryInstallCommands,
  registryNamespaceUrl,
  registrySkinItem,
  registryStylings,
  resolveRegistryStyling,
  shadcnAddCommand,
  shadcnCommand,
  shadcnRegistryAddCommand,
} from '../shadcn';

describe('registryNamespaceUrl', () => {
  it('selects the catalog through the URL, not the item name', () => {
    expect(registryNamespaceUrl('react', 'tailwind')).toBe('https://shadcn.videojs.org/r/react/{name}.json');
    expect(registryNamespaceUrl('react', 'css')).toBe('https://shadcn.videojs.org/r/react/css/{name}.json');
    expect(registryNamespaceUrl('html', 'css')).toBe('https://shadcn.videojs.org/r/html/{name}.json');
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

describe('shadcnRegistryAddCommand', () => {
  it('registers the namespace against the chosen catalog', () => {
    expect(shadcnRegistryAddCommand('npm', 'react', 'tailwind')).toBe(
      'npx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/react/{name}.json'
    );
    expect(shadcnRegistryAddCommand('yarn', 'html', 'css')).toBe(
      'yarn dlx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/html/{name}.json'
    );
  });
});

describe('registryInstallCommands', () => {
  it('registers the namespace before adding the items', () => {
    expect(registryInstallCommands('pnpm', 'react', 'css', ['video-minimal'])).toBe(
      [
        'pnpm dlx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/react/css/{name}.json',
        'pnpm dlx shadcn@latest add @videojs/video-minimal',
      ].join('\n')
    );
  });

  it('only registers the namespace when there is nothing to add', () => {
    expect(registryInstallCommands('npm', 'html', 'css', [])).toBe(
      'npx shadcn@latest registry add @videojs=https://shadcn.videojs.org/r/html/{name}.json'
    );
  });
});

describe('registrySkinItem', () => {
  it('maps the installation selection onto a skin name', () => {
    expect(registrySkinItem({ useCase: 'default-video', skin: 'video' })).toBe('video');
    expect(registrySkinItem({ useCase: 'default-video', skin: 'minimal-video' })).toBe('video-minimal');
    expect(registrySkinItem({ useCase: 'live-audio', skin: 'minimal-audio' })).toBe('live-audio-minimal');
  });

  it('leaves package-only selections alone', () => {
    expect(registrySkinItem({ useCase: 'background-video', skin: 'video' })).toBeNull();
    expect(registrySkinItem({ useCase: 'default-video', skin: 'none' })).toBeNull();
  });
});

describe('REGISTRY_SKINS', () => {
  it('names every published skin', () => {
    expect(REGISTRY_SKINS.map((skin) => skin.item)).toEqual([
      'video',
      'video-minimal',
      'audio',
      'audio-minimal',
      'live-video',
      'live-video-minimal',
      'live-audio',
      'live-audio-minimal',
    ]);
    expect(REGISTRY_SKINS.find((skin) => skin.item === 'video-minimal')?.directory).toBe(
      'components/videojs/skins/video/minimal'
    );
  });
});
