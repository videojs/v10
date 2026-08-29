import { describe, expect, it } from 'vitest';

import { resolveShadcnInstallation, shadcnAddCommand, shadcnItemUrl, shadcnRegistryUrl } from '../shadcn';

describe('resolveShadcnInstallation', () => {
  it('resolves Default and Minimal Skin block names without framework or styling suffixes', () => {
    expect(
      resolveShadcnInstallation({
        useCase: 'default-video',
        skin: 'video',
      })
    ).toEqual({ item: 'video', packageOnly: false });
    expect(
      resolveShadcnInstallation({
        useCase: 'live-audio',
        skin: 'minimal-audio',
      })
    ).toEqual({ item: 'live-audio-minimal', packageOnly: false });
  });

  it('keeps no-skin and Background Video selections package-managed', () => {
    expect(
      resolveShadcnInstallation({
        useCase: 'default-video',
        skin: 'none',
      })
    ).toEqual({ item: null, packageOnly: true });
    expect(
      resolveShadcnInstallation({
        useCase: 'background-video',
        skin: 'video',
      })
    ).toEqual({ item: null, packageOnly: true });
  });
});

describe('Shadcn registry URLs', () => {
  it('selects one of the four static catalogs', () => {
    expect(shadcnRegistryUrl('react', 'tailwind')).toBe('https://shadcn.videojs.org/r/react/{name}.json');
    expect(shadcnRegistryUrl('react', 'css')).toBe('https://shadcn.videojs.org/r/react/css/{name}.json');
    expect(shadcnRegistryUrl('html', 'tailwind')).toBe('https://shadcn.videojs.org/r/html/{name}.json');
    expect(shadcnRegistryUrl('html', 'css')).toBe('https://shadcn.videojs.org/r/html/css/{name}.json');
    expect(shadcnItemUrl('react', 'css', 'play-button')).toBe(
      'https://shadcn.videojs.org/r/react/css/play-button.json'
    );
  });

  it('formats namespaced item commands', () => {
    expect(shadcnAddCommand('video-minimal')).toBe('pnpm dlx shadcn@latest add @videojs/video-minimal');
    expect(shadcnAddCommand(null)).toBeNull();
  });
});
