import { describe, expect, it } from 'vitest';

import { installationCompatibility, installationOptionDefinitions, installationOptionDefinitionsFor } from '../options';

function valuesFor(
  definitions: ReturnType<typeof installationOptionDefinitionsFor>,
  flag: string
): readonly string[] | undefined {
  return definitions.find((option) => option.flag === flag)?.values;
}

describe('installationOptionDefinitions', () => {
  it('only advertises methods supported by each package', () => {
    const react = installationOptionDefinitions('react');

    expect(valuesFor(react, '--method')).toEqual(['packaged', 'shadcn']);
    expect(react.find(({ flag }) => flag === '--method')?.description).toBe(
      'Choose packaged modules or editable Shadcn source.'
    );
    expect(valuesFor(installationOptionDefinitions('html'), '--method')).toEqual(['packaged', 'shadcn', 'cdn']);
  });

  it('advertises every app setup supported by the HTML package frameworks', () => {
    const definitions = installationOptionDefinitions('html');

    expect(valuesFor(definitions, '--template')).toEqual(['none', 'vite', 'astro', 'laravel', 'nuxt', 'sveltekit']);
    expect(valuesFor(definitions, '--styling')).toEqual(['css']);
    expect(definitions.find(({ flag }) => flag === '--template')?.default).toBe('vite');
    expect(definitions.find(({ flag }) => flag === '--styling')?.default).toBe('css');
  });
});

describe('installationOptionDefinitionsFor', () => {
  it('filters choices for a Shadcn-only route', () => {
    const definitions = installationOptionDefinitionsFor({
      methods: ['shadcn'],
      frameworks: ['react', 'html', 'vue', 'svelte'],
    });

    expect(valuesFor(definitions, '--preset')).not.toContain('background-video');
    expect(valuesFor(definitions, '--skin')).not.toContain('none');
    expect(valuesFor(definitions, '--template')).toEqual([
      'next',
      'vite',
      'start',
      'react-router',
      'astro',
      'laravel',
      'nuxt',
      'sveltekit',
    ]);
    expect(valuesFor(definitions, '--styling')).toEqual(['tailwind', 'css']);
    expect(definitions.find(({ flag }) => flag === '--template')?.default).toBe('next for React; vite otherwise');
    expect(definitions.find(({ flag }) => flag === '--styling')?.default).toBe('tailwind for React; css otherwise');
  });

  it('offers an existing page or Vite scaffold for CDN instructions', () => {
    const definitions = installationOptionDefinitionsFor({ methods: ['cdn'], frameworks: ['html'] });

    expect(valuesFor(definitions, '--template')).toEqual(['none', 'vite']);
    expect(definitions.find(({ flag }) => flag === '--template')?.default).toBe('vite');
  });
});

describe('installationCompatibility', () => {
  it('exposes installation methods by project framework', () => {
    expect(installationCompatibility.methodsByFramework).toEqual({
      react: ['packaged', 'shadcn'],
      html: ['packaged', 'shadcn', 'cdn'],
      vue: ['packaged', 'shadcn'],
      svelte: ['packaged', 'shadcn'],
    });
  });

  it('exposes the exact media choices for every preset', () => {
    expect(installationCompatibility.mediaByPreset.audio).toEqual(['html5-audio', 'mux-audio', 'spotify']);
    expect(installationCompatibility.mediaByPreset['live-video']).toEqual(['hls', 'mux-video']);
    expect(installationCompatibility.mediaByPreset['background-video']).toEqual([
      'background-video',
      'hls-background-video',
      'mux-background-video',
    ]);
    expect(installationCompatibility.templatesByFramework.vue).toEqual(['vite', 'nuxt']);
    expect(installationCompatibility.shadcn.stylingsByFramework.svelte).toEqual(['css']);
  });
});
