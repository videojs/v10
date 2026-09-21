import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vite-plus/test';

import { cdnHtmlEntries, cdnHtmlEntry } from '../cdn-html-entries.ts';

describe('cdnHtmlEntry', () => {
  it('maps a definition module to a bundle name and its npm subpath', () => {
    expect(cdnHtmlEntry('ui/dialog.js')).toEqual({ name: 'ui/dialog', src: '@videojs/html/ui/dialog' });
    expect(cdnHtmlEntry('media/mux-video/spf.js')).toEqual({
      name: 'media/mux-video/spf',
      src: '@videojs/html/media/mux-video/spf',
    });
  });

  it('publishes a flavor directory index under the directory name', () => {
    expect(cdnHtmlEntry('media/mux-video/index.js')).toEqual({
      name: 'media/mux-video',
      src: '@videojs/html/media/mux-video',
    });
  });

  it('normalizes Windows separators', () => {
    expect(cdnHtmlEntry('media\\mux-video\\spf.js').name).toBe('media/mux-video/spf');
  });
});

describe('cdnHtmlEntries', () => {
  const dirs: string[] = [];

  function defineDir(files: string[]): string {
    const dir = mkdtempSync(join(tmpdir(), 'cdn-html-entries-'));

    for (const file of files) {
      mkdirSync(join(dir, file, '..'), { recursive: true });
      writeFileSync(join(dir, file), '');
    }

    dirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('lists one entry per module, grouped by subpath and sorted by name', () => {
    const dir = defineDir([
      'ui/play-button.js',
      'ui/dialog.js',
      'ui/dialog.js.map',
      'media/youtube-video.js',
      'media/mux-video/index.js',
      'media/mux-video/spf.js',
      'extensions/mux-data.js',
      'video/skin.js',
    ]);

    expect(cdnHtmlEntries(dir).map((entry) => entry.name)).toEqual([
      'media/mux-video',
      'media/mux-video/spf',
      'media/youtube-video',
      'extensions/mux-data',
      'ui/dialog',
      'ui/play-button',
    ]);
  });

  it('returns nothing when html has not been built', () => {
    expect(cdnHtmlEntries(join(tmpdir(), 'cdn-html-entries-missing'))).toEqual([]);
  });
});
