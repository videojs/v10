import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vite-plus/test';

// --- Fixtures ---

const INSTALLATION_DOC = `# Installation

Intro paragraph.

<!-- cli:omit installation -->
Run the CLI to generate install code.
<!-- /cli:omit installation -->

<!-- cli:replace installation -->
Placeholder for CLI-generated code.
<!-- /cli:replace installation -->

## Next steps

Footer content.`;

const SHADCN_INSTALLATION_DOC = `${INSTALLATION_DOC}

## Change the skin source

<!-- cli:framework react -->
### React

Edit the React skin source.
<!-- /cli:framework react -->

<!-- cli:framework html -->
### HTML

Edit the HTML skin source.
<!-- /cli:framework html -->

## Choose what to do next

<!-- cli:framework react -->
[Customize skin source](https://videojs.org/docs/framework/react/guides/customize-skins)
<!-- /cli:framework react -->

<!-- cli:framework html -->
[Customize skin source](https://videojs.org/docs/framework/html/guides/customize-skins)
<!-- /cli:framework html -->`;

const REGULAR_DOC = `# Skins

Video.js comes with several skins.`;

const LLMS_TXT = `# Video.js Docs
/guides/installation
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

import cdnPackage from '../../../../cdn/package.json' with { type: 'json' };
import { getConfigValue } from '../../utils/config.js';
import { docExistsInAnyFramework, readBundledDoc, readLlmsTxt } from '../../utils/docs.js';
import { supportsCdnInstall } from '../../utils/prompts.js';
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
  vi.clearAllMocks();
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
    if (slug === 'guides/installation-shadcn') return SHADCN_INSTALLATION_DOC;

    if (
      [
        'guides/installation',
        'guides/installation-vue',
        'guides/installation-svelte',
        'guides/installation-cdn',
      ].includes(slug)
    ) {
      return INSTALLATION_DOC;
    }

    if (slug === 'concepts/skins' || slug === 'guides/cdn') return REGULAR_DOC;

    return null;
  });
  (readLlmsTxt as Mock).mockReturnValue(LLMS_TXT);
  (docExistsInAnyFramework as Mock).mockImplementation((slug: string) =>
    ['guides/installation', 'guides/cdn', 'concepts/skins'].includes(slug)
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
      expect(output()).toContain('/guides/installation');
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
      await expect(
        handleDocs(
          {
            method: 'packaged',
            framework: 'html',
            preset: 'livestream',
            skin: 'default',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'npm',
          },
          ['guides/installation']
        )
      ).rejects.toThrow(ExitError);
      expect(errors()).toContain('Invalid preset: "livestream"');
      expect(errors()).toContain('"live-video"');
    });

    it('errors with invalid skin', async () => {
      await expect(
        handleDocs(
          {
            method: 'packaged',
            framework: 'html',
            preset: 'video',
            skin: 'custom',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'npm',
          },
          ['guides/installation']
        )
      ).rejects.toThrow(ExitError);
      expect(errors()).toContain('Invalid skin: "custom"');
    });

    it('errors when the media type is not valid for the preset', async () => {
      await expect(
        handleDocs(
          {
            framework: 'html',
            preset: 'live-audio',
            skin: 'default',
            media: 'html5-video',
            'source-url': '',
            'install-method': 'npm',
          },
          ['guides/installation']
        )
      ).rejects.toThrow(ExitError);
      expect(errors()).toContain('Invalid media type "html5-video" for the "live-audio" preset');
      expect(errors()).toContain('mux-audio');
    });

    it('errors with invalid install method for framework', async () => {
      await expect(
        handleDocs({ framework: 'react', 'install-method': 'cdn' }, ['guides/installation'])
      ).rejects.toThrow(ExitError);
      expect(errors()).toContain('CDN installation only supports HTML');
    });

    it('errors when a canonical route conflicts with the framework flag', async () => {
      await expect(handleDocs({ framework: 'react' }, ['guides/installation/vue'])).rejects.toThrow(ExitError);
      expect(errors()).toContain('Conflicting installation frameworks: "vue" and "react"');
    });

    it('errors when a canonical route conflicts with the method flag', async () => {
      await expect(handleDocs({ method: 'cdn' }, ['guides/installation/react'])).rejects.toThrow(ExitError);
      expect(errors()).toContain('Conflicting installation methods: "packaged" and "cdn"');
    });

    it('limits the legacy install-method flag to the method selected by a canonical route', async () => {
      await expect(handleDocs({ 'install-method': 'cdn' }, ['guides/installation/html'])).rejects.toThrow(ExitError);
      expect(errors()).toContain('Conflicting installation methods: "packaged" and "cdn"');
    });

    it('rejects Vue for Shadcn installation', async () => {
      await expect(handleDocs({ method: 'shadcn', framework: 'vue' }, ['guides/installation'])).rejects.toThrow(
        ExitError
      );
      expect(errors()).toContain('Shadcn installation supports React and HTML source');
    });

    it('errors when the old and new package-manager flags conflict', async () => {
      await expect(
        handleDocs(
          {
            'install-method': 'pnpm',
            'package-manager': 'npm',
          },
          ['guides/installation/react']
        )
      ).rejects.toThrow(ExitError);
      expect(errors()).toContain('Conflicting package managers: "npm" and "pnpm"');
    });

    it('names the legacy package-manager flag when it is invalid for CDN installation', async () => {
      await expect(handleDocs({ 'install-method': 'npm' }, ['guides/installation/cdn'])).rejects.toThrow(ExitError);

      expect(errors()).toContain('Remove `--install-method`');
      expect(errors()).not.toContain('Remove `--package-manager`');
    });

    it('rejects the headless skin as a Shadcn theme', async () => {
      await expect(handleDocs({ framework: 'react', skin: 'none' }, ['guides/installation/shadcn'])).rejects.toThrow(
        ExitError
      );
      expect(errors()).toContain('Invalid Shadcn theme: "none"');
    });

    it.each([{ template: 'next' }, { styling: 'tailwind' }, { theme: 'default' }])(
      'rejects Shadcn-only flags on packaged routes',
      async (flags) => {
        await expect(handleDocs(flags, ['guides/installation/react'])).rejects.toThrow(ExitError);
        expect(errors()).toContain('only apply to Shadcn installation');
      }
    );
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
      it('generates npm installation with TypeScript imports and HTML sections', async () => {
        await handleDocs(htmlFlags(), ['guides/installation']);
        const out = output();

        expect(out).toContain('## Install Video.js');
        expect(out).toContain('npm install @videojs/html');
        expect(out).toContain('## TypeScript imports');
        expect(out).toContain('```ts');
        expect(out).toContain('## HTML');
        expect(out).toContain('<video-player>');
        expect(out).not.toContain('<!-- cli:replace');
        expect(out).not.toContain('<!-- cli:omit');
        expect(out).not.toContain('Run the CLI to generate install code');
        expect(out).toContain('Intro paragraph');
        expect(out).toContain('## Next steps');
      });

      it('generates CDN installation without TypeScript imports section', async () => {
        await handleDocs(htmlFlags({ 'install-method': 'cdn' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('## Load Video.js');
        expect(out).toContain('<script');
        expect(out).not.toContain('## TypeScript imports');
        expect(out).toContain('## Add your player');
      });

      it('switches install command for pnpm', async () => {
        await handleDocs(htmlFlags({ 'install-method': 'pnpm' }), ['guides/installation']);
        expect(output()).toContain('pnpm add @videojs/html');
      });

      it('generates audio preset with audio-specific elements', async () => {
        await handleDocs(htmlFlags({ preset: 'audio', skin: 'default', media: 'html5-audio' }), [
          'guides/installation',
        ]);
        expect(output()).toContain('audio-player');
      });

      it('generates minimal skin variant', async () => {
        await handleDocs(htmlFlags({ skin: 'minimal' }), ['guides/installation']);
        expect(output()).toContain('minimal');
      });

      it('generates headless (no skin) variant with skin none', async () => {
        await handleDocs(htmlFlags({ skin: 'none' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('<video-player>');
        expect(out).not.toContain('<video-skin>');
        expect(out).not.toContain("'@videojs/html/video/skin'");
      });

      it('includes custom source URL in generated code', async () => {
        await handleDocs(htmlFlags({ 'source-url': 'https://example.com/my-video.mp4' }), ['guides/installation']);
        expect(output()).toContain('https://example.com/my-video.mp4');
      });

      it('uses demo URLs when source-url is empty', async () => {
        await handleDocs(htmlFlags({ 'source-url': '' }), ['guides/installation']);
        expect(output()).toMatch(/stream\.mux\.com|mux\.com/);
      });

      it('generates background-video preset', async () => {
        await handleDocs(htmlFlags({ preset: 'background-video', skin: 'default', media: 'background-video' }), [
          'guides/installation',
        ]);
        expect(output()).toContain('background-video-player');
      });

      it('generates DASH media variant', async () => {
        await handleDocs(htmlFlags({ media: 'dash' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('<dash-video src=');
        expect(out).toContain("import '@videojs/html/media/dash-video'");
      });

      it('generates Mux media variant', async () => {
        await handleDocs(htmlFlags({ media: 'mux-video' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('<mux-video src=');
        expect(out).toContain("import '@videojs/html/media/mux-video'");
        expect(out).toContain('<mux-data></mux-data>');
        expect(out).toContain("import '@videojs/html/extensions/mux-data'");
      });

      it('generates Vimeo media variant via npm', async () => {
        await handleDocs(htmlFlags({ media: 'vimeo' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('<vimeo-video src=');
        expect(out).toContain("import '@videojs/html/media/vimeo-video'");
      });

      it('generates YouTube media variant via npm', async () => {
        await handleDocs(htmlFlags({ media: 'youtube' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('<youtube-video src=');
        expect(out).toContain("import '@videojs/html/media/youtube-video'");
      });

      it('generates Spotify media variant for the audio preset', async () => {
        await handleDocs(htmlFlags({ preset: 'audio', skin: 'default', media: 'spotify' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('<spotify-audio src=');
        expect(out).toContain("import '@videojs/html/media/spotify-audio'");
      });

      it('generates a CDN media script for renderers with a CDN build (mux)', async () => {
        await handleDocs(htmlFlags({ media: 'mux-video', 'install-method': 'cdn' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('<script');
        expect(out).toContain('media/mux-video.js');
        expect(out).toContain('extensions/mux-data.js');
      });

      it('errors when requesting CDN for a renderer without a CDN build (vimeo)', async () => {
        await expect(
          handleDocs(htmlFlags({ media: 'vimeo', 'install-method': 'cdn' }), ['guides/installation'])
        ).rejects.toThrow(ExitError);
        expect(errors()).toContain('no CDN build');
      });

      it('generates the live-video preset', async () => {
        await handleDocs(htmlFlags({ preset: 'live-video', media: 'hls' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('<live-video-player>');
        expect(out).toContain('<live-video-skin>');
        expect(out).toContain("import '@videojs/html/live-video/player'");
        expect(out).toContain("import '@videojs/html/media/hlsjs-video'");
      });

      it('generates a CDN script for the live-video preset', async () => {
        await handleDocs(htmlFlags({ preset: 'live-video', media: 'hls', 'install-method': 'cdn' }), [
          'guides/installation',
        ]);
        const out = output();

        expect(out).toContain(`@videojs/cdn@${cdnPackage.version}/live-video.js`);
        expect(out).toContain('media/hlsjs-video.js');
      });
    });

    describe('React framework', () => {
      it('generates npm installation with one add-player section', async () => {
        await handleDocs(reactFlags(), ['guides/installation']);
        const out = output();

        expect(out).toContain('## Install Video.js');
        expect(out).toContain('npm install @videojs/react');
        expect(out).toContain('## Add your player');
        expect(out).toContain('Add to `app/page.tsx`');
        expect(out).toContain('export default function Page()');
        expect(out).not.toContain('MyPlayer');
        expect(out.match(/```tsx/g)).toHaveLength(1);
      });

      it('generates HLS media variant', async () => {
        await handleDocs(reactFlags({ media: 'hls' }), ['guides/installation']);
        expect(output()).toContain('hls');
      });

      it('generates the live-audio preset with its player and skin', async () => {
        await handleDocs(reactFlags({ preset: 'live-audio', media: 'mux-audio' }), ['guides/installation']);
        const out = output();

        expect(out).toContain('<LiveAudioPlayer>');
        expect(out).toContain('<LiveAudioSkin>');
      });
    });

    describe('canonical routes', () => {
      it('infers packaged React and accepts the package-manager flag', async () => {
        await handleDocs(
          {
            preset: 'video',
            skin: 'default',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'pnpm',
          },
          ['guides/installation/react']
        );

        expect(output()).toContain('pnpm add @videojs/react');
        expect(readBundledDoc).toHaveBeenCalledWith('react', 'guides/installation');
      });

      it('generates the Vue guide from the shared choices', async () => {
        await handleDocs(
          {
            preset: 'video',
            skin: 'default',
            media: 'hls',
            'source-url': 'https://example.com/live.m3u8',
            'package-manager': 'pnpm',
          },
          ['guides/installation/vue']
        );
        const out = output();

        expect(out).toContain('pnpm add @videojs/html @videojs/hlsjs-video');
        expect(out).toContain('## Register the custom elements');
        expect(out).toContain('components/VideoPlayer.vue');
      });

      it('generates the Svelte guide from the shared choices', async () => {
        await handleDocs(
          {
            preset: 'video',
            skin: 'default',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'bun',
          },
          ['guides/installation/svelte']
        );
        const out = output();

        expect(out).toContain('bun add @videojs/html');
        expect(out).toContain('src/lib/VideoPlayer.svelte');
        expect(out).toContain('src/routes/+page.svelte');
      });

      it('generates the CDN guide without a framework or package manager', async () => {
        await handleDocs(
          {
            preset: 'video',
            skin: 'default',
            media: 'html5-video',
            'source-url': '',
          },
          ['guides/installation/cdn']
        );

        expect(output()).toContain('## Load Video.js');
        expect(output()).toContain('<script type="module"');
        expect(readBundledDoc).toHaveBeenCalledWith('html', 'guides/installation-cdn');
      });

      it('generates a tailored Shadcn guide', async () => {
        await handleDocs(
          {
            framework: 'react',
            preset: 'video',
            theme: 'default',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'pnpm',
            template: 'next',
            styling: 'tailwind',
          },
          ['guides/installation/shadcn']
        );
        const out = output();

        expect(out).toContain('pnpm dlx shadcn@latest init --template next');
        expect(out).toContain('pnpm dlx shadcn@latest add @videojs/video');
        expect(out).toContain("from '@/components/videojs/video/skin'");
        expect(out).toContain('Edit the React skin source');
        expect(out).not.toContain('Edit the HTML skin source');
        expect(out).toContain('/docs/framework/react/guides/customize-skins');
        expect(out).not.toContain('/docs/framework/html/guides/customize-skins');
        expect(readBundledDoc).toHaveBeenCalledWith('react', 'guides/installation-shadcn');
      });

      it('keeps only HTML follow-up guidance in a tailored Shadcn guide', async () => {
        await handleDocs(
          {
            framework: 'html',
            preset: 'video',
            theme: 'default',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'pnpm',
            template: 'vite',
            styling: 'css',
          },
          ['guides/installation/shadcn']
        );
        const out = output();

        expect(out).toContain('Edit the HTML skin source');
        expect(out).not.toContain('Edit the React skin source');
        expect(out).toContain('/docs/framework/html/guides/customize-skins');
        expect(out).not.toContain('/docs/framework/react/guides/customize-skins');
        expect(readBundledDoc).toHaveBeenCalledWith('html', 'guides/installation-shadcn');
      });

      it('supports a packaged Vue choice from the generic route', async () => {
        await handleDocs(
          {
            method: 'packaged',
            framework: 'vue',
            preset: 'video',
            skin: 'default',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'pnpm',
          },
          ['guides/installation']
        );

        expect(output()).toContain('pnpm add @videojs/html');
        expect(readBundledDoc).toHaveBeenCalledWith('html', 'guides/installation-vue');
      });

      it.each([
        {
          slug: 'guides/installation-vue',
          flags: {
            preset: 'video',
            skin: 'default',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'pnpm',
          },
          document: ['html', 'guides/installation-vue'],
        },
        {
          slug: 'guides/installation-svelte',
          flags: {
            preset: 'video',
            skin: 'default',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'pnpm',
          },
          document: ['html', 'guides/installation-svelte'],
        },
        {
          slug: 'guides/installation-shadcn',
          flags: {
            framework: 'react',
            preset: 'video',
            theme: 'default',
            media: 'html5-video',
            'source-url': '',
            'package-manager': 'pnpm',
            template: 'next',
            styling: 'tailwind',
          },
          document: ['react', 'guides/installation-shadcn'],
        },
        {
          slug: 'guides/installation-cdn',
          flags: {
            preset: 'video',
            skin: 'default',
            media: 'html5-video',
            'source-url': '',
          },
          document: ['html', 'guides/installation-cdn'],
        },
      ])('keeps the legacy $slug route working', async ({ slug, flags, document }) => {
        await handleDocs(flags, [slug]);
        expect(readBundledDoc).toHaveBeenCalledWith(...document);
      });
    });
  });

  describe('framework resolution', () => {
    it('keeps the CDN environment guide separate from CDN installation', async () => {
      await handleDocs({ framework: 'html' }, ['guides/cdn']);

      expect(output()).toContain(REGULAR_DOC);
      expect(readBundledDoc).toHaveBeenCalledWith('html', 'guides/cdn');
    });

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
    it('prints the method decision tree instead of prompting in a non-interactive process', async () => {
      await expect(handleDocs({}, ['guides/installation'], { interactive: false })).rejects.toThrow(ExitError);

      expect(errors()).toContain('Choose an installation route');
      expect(errors()).toContain('Packaged');
      expect(errors()).toContain('Shadcn');
      expect(errors()).toContain('CDN');
      expect(errors()).toContain('Packaged  guides/installation/{react|html|vue|svelte}');
      expect(errors()).not.toContain(' /guides/installation');
      expect(p.select).not.toHaveBeenCalled();
    });

    it('lists missing flags for a canonical route without prompting', async () => {
      await expect(
        handleDocs({ preset: 'video' }, ['guides/installation/react'], { interactive: false })
      ).rejects.toThrow(ExitError);

      expect(errors()).toContain('Missing installation flags');
      expect(errors()).toContain('--skin');
      expect(errors()).toContain('--package-manager');
      expect(p.select).not.toHaveBeenCalled();
    });

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
        ['guides/installation']
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

      await handleDocs({ method: 'packaged', framework: 'html', preset: 'video' }, ['guides/installation'], {
        interactive: true,
      });

      expect(p.intro).toHaveBeenCalledWith('Video.js Installation');
      expect(p.select).toHaveBeenCalled();
      expect(p.outro).toHaveBeenCalledTimes(1);
      expect(output()).toContain('## Install Video.js');
    });

    it('prints the introduction before prompting for an installation method', async () => {
      (p.select as Mock).mockResolvedValueOnce('packaged');

      await handleDocs(
        {
          framework: 'html',
          preset: 'video',
          skin: 'default',
          media: 'html5-video',
          'source-url': '',
          'package-manager': 'npm',
        },
        ['guides/installation'],
        { interactive: true }
      );

      expect(p.intro).toHaveBeenCalledTimes(1);
      expect((p.intro as Mock).mock.invocationCallOrder[0]).toBeLessThan(
        (p.select as Mock).mock.invocationCallOrder[0]!
      );
      expect(p.outro).toHaveBeenCalledTimes(1);
    });

    it('source-url without --media still requires prompting (detection is a hint, not auto-set)', async () => {
      (p.select as Mock)
        .mockResolvedValueOnce('default-video') // preset
        .mockResolvedValueOnce('video') // skin
        .mockResolvedValueOnce('hls') // media (user confirms detection hint)
        .mockResolvedValueOnce('npm'); // installMethod

      await handleDocs(
        { method: 'packaged', framework: 'html', 'source-url': 'https://example.com/video.m3u8' },
        ['guides/installation'],
        { interactive: true }
      );

      expect(p.intro).toHaveBeenCalled();
      expect(p.select).toHaveBeenCalled();
    });

    it('offers only media sources supported by the CDN route', async () => {
      vi.mocked(p.select).mockResolvedValueOnce('html5-video');

      await handleDocs(
        {
          preset: 'video',
          skin: 'default',
          'source-url': '',
        },
        ['guides/installation/cdn'],
        { interactive: true }
      );

      const mediaPrompt = vi
        .mocked(p.select)
        .mock.calls.map(([options]) => options)
        .find(({ message }) => message === 'Media source type');

      expect(mediaPrompt).toBeDefined();
      expect(
        mediaPrompt.options.every(({ value }: { value: Parameters<typeof supportsCdnInstall>[0] }) =>
          supportsCdnInstall(value)
        )
      ).toBe(true);
    });
  });
});
