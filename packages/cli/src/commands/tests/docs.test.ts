import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// --- Fixtures ---

const INSTALLATION_DOC = `# Installation

Intro paragraph.

<!-- cli:replace installation -->
Placeholder for CLI-generated code.
<!-- /cli:replace installation -->

## Next steps

Footer content.`;

const REGULAR_DOC = `# Skins

Video.js comes with several skins.`;

const LLMS_TXT = `# Video.js Docs
/how-to/installation
/concepts/skins`;

// --- Mocks ---

vi.mock('../../utils/docs.js', () => ({
  readBundledDoc: vi.fn(),
  readLlmsTxt: vi.fn(),
  docExistsInAnyFramework: vi.fn(),
}));

vi.mock('../../utils/config.js', () => ({
  getConfigValue: vi.fn(() => undefined),
  setConfigValue: vi.fn(),
  listConfig: vi.fn(() => ({})),
}));

vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  text: vi.fn(),
  isCancel: vi.fn(() => false),
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
}));

import * as p from '@clack/prompts';
import { getConfigValue } from '../../utils/config.js';
import { docExistsInAnyFramework, readBundledDoc, readLlmsTxt } from '../../utils/docs.js';
import { handleDocs } from '../docs.js';

// --- Helpers ---

class ExitError extends Error {
  code: number;
  constructor(code?: number | string | null) {
    super(`process.exit(${code})`);
    this.code = typeof code === 'number' ? code : 0;
  }
}

let stdout: string[];
let stderr: string[];

function output(): string {
  return stdout.join('\n');
}

function errors(): string {
  return stderr.join('\n');
}

beforeEach(() => {
  stdout = [];
  stderr = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    stdout.push(args.map(String).join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    stderr.push(args.map(String).join(' '));
  });
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new ExitError(code);
  });

  (readBundledDoc as Mock).mockImplementation((_fw: string, slug: string) => {
    if (slug === 'how-to/installation') return INSTALLATION_DOC;
    if (slug === 'concepts/skins') return REGULAR_DOC;
    return null;
  });
  (readLlmsTxt as Mock).mockReturnValue(LLMS_TXT);
  (docExistsInAnyFramework as Mock).mockImplementation((slug: string) =>
    ['how-to/installation', 'concepts/skins'].includes(slug)
  );
  (getConfigValue as Mock).mockReturnValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Tests ---

describe('handleDocs', () => {
  describe('--help', () => {
    it('prints usage text and exits', async () => {
      await expect(handleDocs({ help: true }, [])).rejects.toThrow(ExitError);
      expect(output()).toContain('Usage:');
      expect(output()).toContain('--framework');
    });
  });

  describe('--list', () => {
    it('prints llms.txt for the given framework', async () => {
      await handleDocs({ list: true, framework: 'html' }, []);
      expect(output()).toContain('Video.js Docs');
      expect(output()).toContain('/how-to/installation');
    });
  });

  describe('error handling', () => {
    it('errors when no slug is provided', async () => {
      await expect(handleDocs({ framework: 'html' }, [])).rejects.toThrow(ExitError);
      expect(errors()).toContain('Usage:');
    });

    it('errors when doc does not exist in any framework', async () => {
      (docExistsInAnyFramework as Mock).mockReturnValue(false);
      await expect(handleDocs({ framework: 'html' }, ['nonexistent'])).rejects.toThrow(ExitError);
      expect(errors()).toContain('Doc not found: "nonexistent"');
    });

    it('errors when doc exists in other framework but not the requested one', async () => {
      (readBundledDoc as Mock).mockReturnValue(null);
      await expect(handleDocs({ framework: 'react' }, ['concepts/skins'])).rejects.toThrow(ExitError);
      expect(errors()).toContain('Doc not found: "concepts/skins" for framework "react"');
    });

    it('errors with invalid framework value', async () => {
      await expect(handleDocs({ framework: 'vue' }, ['concepts/skins'])).rejects.toThrow(ExitError);
      expect(errors()).toContain('Invalid framework: "vue"');
    });

    it('errors with invalid preset', async () => {
      await expect(handleDocs({ framework: 'html', preset: 'livestream' }, ['how-to/installation'])).rejects.toThrow(
        ExitError
      );
      expect(errors()).toContain('Invalid preset: "livestream"');
    });

    it('errors with invalid skin', async () => {
      await expect(
        handleDocs({ framework: 'html', preset: 'video', skin: 'custom' }, ['how-to/installation'])
      ).rejects.toThrow(ExitError);
      expect(errors()).toContain('Invalid skin: "custom"');
    });

    it('errors with invalid install method for framework', async () => {
      await expect(
        handleDocs({ framework: 'react', 'install-method': 'cdn' }, ['how-to/installation'])
      ).rejects.toThrow(ExitError);
      expect(errors()).toContain('Invalid install method: "cdn"');
    });
  });

  describe('regular docs', () => {
    it('prints version header followed by markdown content', async () => {
      await handleDocs({ framework: 'html' }, ['concepts/skins']);
      const out = output();
      expect(out).toContain('@videojs/cli v');
      expect(out).toContain('# Skins');
      expect(out).toContain('Video.js comes with several skins');
    });
  });

  describe('installation page', () => {
    const htmlFlags = (overrides: Record<string, string> = {}) => ({
      framework: 'html',
      preset: 'video',
      skin: 'default',
      media: 'html5-video',
      'source-url': '',
      'install-method': 'npm',
      ...overrides,
    });

    const reactFlags = (overrides: Record<string, string> = {}) => ({
      framework: 'react',
      preset: 'video',
      skin: 'default',
      media: 'html5-video',
      'source-url': '',
      'install-method': 'npm',
      ...overrides,
    });

    describe('HTML framework', () => {
      it('generates npm installation with JS imports and HTML sections', async () => {
        await handleDocs(htmlFlags(), ['how-to/installation']);
        const out = output();
        expect(out).toContain('## Install Video.js');
        expect(out).toContain('npm install @videojs/html');
        expect(out).toContain('## JavaScript imports');
        expect(out).toContain('## HTML');
        expect(out).toContain('<video-player>');
        expect(out).not.toContain('<!-- cli:replace');
        expect(out).toContain('Intro paragraph');
        expect(out).toContain('## Next steps');
      });

      it('generates CDN installation without JS imports section', async () => {
        await handleDocs(htmlFlags({ 'install-method': 'cdn' }), ['how-to/installation']);
        const out = output();
        expect(out).toContain('## Install Video.js');
        expect(out).toContain('<script');
        expect(out).not.toContain('## JavaScript imports');
        expect(out).toContain('## HTML');
      });

      it('switches install command for pnpm', async () => {
        await handleDocs(htmlFlags({ 'install-method': 'pnpm' }), ['how-to/installation']);
        expect(output()).toContain('pnpm add @videojs/html');
      });

      it('generates audio preset with audio-specific elements', async () => {
        await handleDocs(htmlFlags({ preset: 'audio', skin: 'default', media: 'html5-audio' }), [
          'how-to/installation',
        ]);
        expect(output()).toContain('audio-player');
      });

      it('generates minimal skin variant', async () => {
        await handleDocs(htmlFlags({ skin: 'minimal' }), ['how-to/installation']);
        expect(output()).toContain('minimal');
      });

      it('includes custom source URL in generated code', async () => {
        await handleDocs(htmlFlags({ 'source-url': 'https://example.com/my-video.mp4' }), ['how-to/installation']);
        expect(output()).toContain('https://example.com/my-video.mp4');
      });

      it('uses demo URLs when source-url is empty', async () => {
        await handleDocs(htmlFlags({ 'source-url': '' }), ['how-to/installation']);
        expect(output()).toMatch(/stream\.mux\.com|mux\.com/);
      });

      it('generates background-video preset', async () => {
        await handleDocs(htmlFlags({ preset: 'background-video', skin: 'default', media: 'background-video' }), [
          'how-to/installation',
        ]);
        expect(output()).toContain('background-video-player');
      });
    });

    describe('React framework', () => {
      it('generates npm installation with create and use sections', async () => {
        await handleDocs(reactFlags(), ['how-to/installation']);
        const out = output();
        expect(out).toContain('## Install Video.js');
        expect(out).toContain('npm install @videojs/react');
        expect(out).toContain('## Create your player');
        expect(out).toContain('MyPlayer');
        expect(out).toContain('## Use your player');
      });

      it('generates HLS media variant', async () => {
        await handleDocs(reactFlags({ media: 'hls' }), ['how-to/installation']);
        expect(output()).toContain('hls');
      });
    });
  });

  describe('framework resolution', () => {
    it('uses --framework flag directly', async () => {
      await handleDocs({ framework: 'html' }, ['concepts/skins']);
      expect(getConfigValue).not.toHaveBeenCalled();
    });

    it('falls back to saved config when flag is omitted', async () => {
      (getConfigValue as Mock).mockReturnValue('react');
      await handleDocs({}, ['concepts/skins']);
      expect(readBundledDoc).toHaveBeenCalledWith('react', 'concepts/skins');
    });
  });

  describe('prompting behavior', () => {
    it('does not prompt when all flags are provided', async () => {
      await handleDocs(
        {
          framework: 'html',
          preset: 'video',
          skin: 'default',
          media: 'html5-video',
          'source-url': '',
          'install-method': 'npm',
        },
        ['how-to/installation']
      );
      expect(p.intro).not.toHaveBeenCalled();
      expect(p.select).not.toHaveBeenCalled();
      expect(p.text).not.toHaveBeenCalled();
    });

    it('prompts for missing options when only some flags are provided', async () => {
      (p.select as Mock)
        .mockResolvedValueOnce('video') // skin
        .mockResolvedValueOnce('html5-video') // media
        .mockResolvedValueOnce('npm'); // installMethod
      (p.text as Mock).mockResolvedValueOnce(''); // sourceUrl

      await handleDocs({ framework: 'html', preset: 'video' }, ['how-to/installation']);

      expect(p.intro).toHaveBeenCalledWith('Video.js Installation');
      expect(p.select).toHaveBeenCalled();
      expect(output()).toContain('## Install Video.js');
    });

    it('source-url without --media still requires prompting (detection is a hint, not auto-set)', async () => {
      (p.select as Mock)
        .mockResolvedValueOnce('default-video') // preset
        .mockResolvedValueOnce('video') // skin
        .mockResolvedValueOnce('hls') // media (user confirms detection hint)
        .mockResolvedValueOnce('npm'); // installMethod

      await handleDocs({ framework: 'html', 'source-url': 'https://example.com/video.m3u8' }, ['how-to/installation']);

      expect(p.intro).toHaveBeenCalled();
      expect(p.select).toHaveBeenCalled();
    });
  });
});
