import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEMO_PLACEHOLDERS,
  demoPlaceholderPlugin,
  replaceDemoPlaceholders,
  transformDemoPlaceholders,
} from '../replace-demo-placeholders.ts';

const DEMOS_DIRECTORY = resolve('src/components/docs/demos');

describe('replaceDemoPlaceholders', () => {
  it('resolves known placeholders', () => {
    const source = Object.keys(DEMO_PLACEHOLDERS)
      .map((name) => `{{${name}}}`)
      .join(' ');

    expect(replaceDemoPlaceholders(source)).toBe(Object.values(DEMO_PLACEHOLDERS).join(' '));
  });

  it('throws for unknown placeholders', () => {
    expect(() => replaceDemoPlaceholders('{{UNKNOWN_DEMO_VIDEO}}')).toThrow(
      'Unknown demo placeholder: {{UNKNOWN_DEMO_VIDEO}}'
    );
  });
});

describe('demoPlaceholderPlugin', () => {
  it('registers the demo transform as a pre-transform', () => {
    expect(demoPlaceholderPlugin()).toMatchObject({
      enforce: 'pre',
      transform: transformDemoPlaceholders,
    });
  });
});

describe('transformDemoPlaceholders', () => {
  it('resolves placeholders in raw HTML demo imports', () => {
    expect(
      transformDemoPlaceholders('{{VJS10_DEMO_VIDEO_MP4}}', '/site/src/components/docs/demos/play-button.html?raw')
    ).toBe(DEMO_PLACEHOLDERS.VJS10_DEMO_VIDEO_MP4);
  });

  it.each([
    '/site/src/components/docs/demos/play-button/react/css/BasicUsage.tsx',
    '/site/src/components/docs/demos/play-button/react/css/BasicUsage.tsx?raw',
  ])('resolves placeholders in React demo import %s', (id) => {
    expect(transformDemoPlaceholders('{{VJS10_DEMO_VIDEO_MP4}}', id)).toBe(DEMO_PLACEHOLDERS.VJS10_DEMO_VIDEO_MP4);
  });

  it.each([
    '/site/src/components/docs/demos/play-button.html?draw=true',
    '/site/src/components/docs/demos/play-button.ts?raw',
    '/site/src/components/play-button.html?raw',
    '/site/src/components/play-button.tsx',
  ])('ignores unsupported demo import %s', (id) => {
    expect(transformDemoPlaceholders('{{VJS10_DEMO_VIDEO_MP4}}', id)).toBeNull();
  });
});

describe('demo placeholders', () => {
  it('does not hardcode shared demo media URLs', () => {
    const demoFiles = [
      ...globSync('**/*.html', { cwd: DEMOS_DIRECTORY }),
      ...globSync('**/*.tsx', { cwd: DEMOS_DIRECTORY }),
    ];
    const hardcodedSources = demoFiles.filter((file) => {
      const source = readFileSync(resolve(DEMOS_DIRECTORY, file), 'utf8');
      return /https:\/\/(?:(?:stream|image)\.mux\.com|dash\.akamaized\.net|vimeo\.com)\//.test(source);
    });

    expect(hardcodedSources).toEqual([]);
  });
});
