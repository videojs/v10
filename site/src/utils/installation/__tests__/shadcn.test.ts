import { describe, expect, it } from 'vitest';

import {
  defaultRegistryStyling,
  REGISTRY_SKINS,
  registryComponentsJson,
  registryItemUrl,
  registryNamespaceUrl,
  registrySkinItem,
  registryStylings,
  resolveRegistryStyling,
  shadcnAddCommand,
  shadcnCommand,
} from '../shadcn';

describe('registryNamespaceUrl', () => {
  it('selects the catalog through the URL, not the item name', () => {
    expect(registryNamespaceUrl('react', 'tailwind')).toBe('https://shadcn.videojs.org/r/react/{name}.json');
    expect(registryNamespaceUrl('react', 'css')).toBe('https://shadcn.videojs.org/r/react/css/{name}.json');
    expect(registryNamespaceUrl('html', 'css')).toBe('https://shadcn.videojs.org/r/html/{name}.json');
  });

  it('formats one item URL from the same template', () => {
    expect(registryItemUrl('react', 'css', 'video-minimal')).toBe(
      'https://shadcn.videojs.org/r/react/css/video-minimal.json'
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

describe('registryComponentsJson', () => {
  it('writes the registries entry Shadcn reads', () => {
    expect(JSON.parse(registryComponentsJson('react', 'tailwind'))).toEqual({
      registries: { '@videojs': 'https://shadcn.videojs.org/r/react/{name}.json' },
    });
  });
});

describe('registrySkinItem', () => {
  it('maps the installation selection onto a registry item', () => {
    expect(registrySkinItem({ useCase: 'default-video', skin: 'video' })).toBe('video');
    expect(registrySkinItem({ useCase: 'default-video', skin: 'minimal-video' })).toBe('video-minimal');
    expect(registrySkinItem({ useCase: 'live-audio', skin: 'minimal-audio' })).toBe('live-audio-minimal');
  });

  it('leaves package-only selections alone', () => {
    expect(registrySkinItem({ useCase: 'background-video', skin: 'video' })).toBeNull();
    expect(registrySkinItem({ useCase: 'default-video', skin: 'none' })).toBeNull();
  });

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
