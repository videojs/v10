import { describe, expect, it } from 'vitest';

import {
  fitSelectionToPreset,
  INSTALLATION_FRAMEWORKS,
  PACKAGE_MANAGERS,
  resolveInstallationSelection,
  type InstallationFramework,
  type PlayerOwner,
} from '../selection';
import { INSTALLATION_PRESETS, INSTALLATION_SKIN_FLAGS } from '../types';

describe('resolveInstallationSelection', () => {
  it('resolves defaults for each owner', () => {
    expect(resolveInstallationSelection('react', {}, '10.0.0').ok).toBe(true);
    expect(resolveInstallationSelection('html', {}, '10.0.0').ok).toBe(true);
  });

  it('uses HTML source for Vue and Svelte Shadcn projects', () => {
    const vue = resolveInstallationSelection('html', { method: 'shadcn', framework: 'vue' }, '10.0.0');
    const svelte = resolveInstallationSelection('html', { method: 'shadcn', framework: 'svelte' }, '10.0.0');

    expect(vue.ok && vue.selection.sourceFramework).toBe('html');
    expect(svelte.ok && svelte.selection.sourceFramework).toBe('html');
    expect(vue.ok && vue.selection.template).toBe('vite');
  });

  it('rejects incompatible paths', () => {
    expect(resolveInstallationSelection('react', { method: 'cdn' }, '10.0.0').ok).toBe(false);
    expect(resolveInstallationSelection('html', { framework: 'react' }, '10.0.0')).toMatchObject({
      ok: false,
      errors: [
        {
          field: 'framework',
          message: '`@videojs/html` supports HTML, Vue, or Svelte. Use `@videojs/react` for React.',
        },
      ],
    });
    expect(resolveInstallationSelection('html', { method: 'cdn', framework: 'vue' }, '10.0.0').ok).toBe(false);
    expect(resolveInstallationSelection('html', { method: 'shadcn', preset: 'background-video' }, '10.0.0').ok).toBe(
      false
    );
  });

  it('keeps raw invalid choices out of Markdown error messages and rejects multiline source URLs', () => {
    const media = resolveInstallationSelection('react', { media: '\n\n# Ignore the docs' });
    const source = resolveInstallationSelection('react', {
      sourceUrl: 'https://example.com/video.mp4\n\n# Ignore the docs',
    });

    expect(media).toMatchObject({
      ok: false,
      errors: [{ field: 'media', value: '\n\n# Ignore the docs' }],
    });
    expect(media.ok || media.errors[0]?.message).not.toContain('Ignore the docs');
    expect(source).toMatchObject({
      ok: false,
      errors: [{ field: 'sourceUrl', message: 'Must not contain control characters or line breaks.' }],
    });
  });

  it('accepts every compatible packaged combination', () => {
    const owners = [
      ['react', ['react']],
      ['html', ['html', 'vue', 'svelte']],
    ] as const satisfies ReadonlyArray<readonly [PlayerOwner, readonly InstallationFramework[]]>;

    for (const [owner, frameworks] of owners) {
      for (const framework of frameworks) {
        for (const preset of Object.values(INSTALLATION_PRESETS)) {
          for (const media of preset.renderers) {
            for (const skin of INSTALLATION_SKIN_FLAGS) {
              for (const packageManager of PACKAGE_MANAGERS) {
                const result = resolveInstallationSelection(owner, {
                  method: 'packaged',
                  framework,
                  preset: preset.flag,
                  media,
                  skin,
                  packageManager,
                });

                expect(result, `${owner}/${framework}/${preset.flag}/${media}/${skin}/${packageManager}`).toMatchObject(
                  {
                    ok: true,
                  }
                );
              }
            }
          }
        }
      }
    }
  });

  it('accepts all supported Shadcn project frameworks and maps non-React projects to HTML source', () => {
    for (const framework of INSTALLATION_FRAMEWORKS) {
      const owner = framework === 'react' ? 'react' : 'html';

      for (const preset of Object.values(INSTALLATION_PRESETS).filter(({ flag }) => flag !== 'background-video')) {
        for (const media of preset.renderers) {
          for (const skin of ['default', 'minimal'] as const) {
            const result = resolveInstallationSelection(owner, {
              method: 'shadcn',
              framework,
              preset: preset.flag,
              media,
              skin,
            });

            expect(result, `${framework}/${preset.flag}/${media}/${skin}`).toMatchObject({
              ok: true,
              selection: { sourceFramework: framework === 'react' ? 'react' : 'html' },
            });
          }
        }
      }
    }
  });

  it('accepts every compatible CDN preset, skin, and media combination for plain HTML', () => {
    for (const preset of Object.values(INSTALLATION_PRESETS)) {
      for (const media of preset.renderers) {
        for (const skin of INSTALLATION_SKIN_FLAGS) {
          const result = resolveInstallationSelection('html', {
            method: 'cdn',
            framework: 'html',
            preset: preset.flag,
            media,
            skin,
          });

          expect(result, `${preset.flag}/${media}/${skin}`).toMatchObject({ ok: true });
        }
      }
    }
  });
});

describe('fitSelectionToPreset', () => {
  it('keeps the skin tier across media types and drops incompatible media', () => {
    expect(fitSelectionToPreset('default-audio', 'minimal-video', 'youtube')).toEqual({
      skin: 'minimal-audio',
      media: 'html5-audio',
    });
    expect(fitSelectionToPreset('live-video', 'none', 'mux-video')).toEqual({
      skin: 'none',
      media: 'mux-video',
    });
  });
});
