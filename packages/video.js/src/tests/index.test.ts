import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vite-plus/test';

import * as root from '../index';
import videojs, { getComponent, getPlayer, getPlugin, options, registerComponent, registerPlugin } from '../videojs';

describe('video.js', () => {
  it('exports only the Video.js 8 stubs', () => {
    expect(Object.keys(root).sort()).toEqual(
      ['default', 'getComponent', 'getPlayer', 'getPlugin', 'options', 'registerComponent', 'registerPlugin'].sort()
    );

    expect(root.default).toBe(videojs);
    expect(root.registerPlugin).toBe(registerPlugin);
    expect(root.getPlugin).toBe(getPlugin);
    expect(root.registerComponent).toBe(registerComponent);
    expect(root.getComponent).toBe(getComponent);
    expect(root.getPlayer).toBe(getPlayer);
    expect(root.options).toBe(options);
  });
});

describe('video.js/dist/video-js.css', () => {
  it('resolves to a stylesheet without rules', () => {
    // Node's resolver follows `exports`, as bundlers do; the literal `dist/video-js.css` path is the CDN redirect.
    const file = createRequire(import.meta.url).resolve('video.js/dist/video-js.css');
    const css = readFileSync(file, 'utf-8').replaceAll(/\/\*[\s\S]*?\*\//g, '');

    expect(css.trim()).toBe('');
  });
});
