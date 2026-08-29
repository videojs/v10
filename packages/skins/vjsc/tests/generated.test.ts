import type { Dirent } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

import { createLogger, createServer, type Plugin, type ViteDevServer } from 'vite';
import { afterEach, describe, it, vi } from 'vite-plus/test';

const packageDir = resolve(import.meta.dirname, '../..');
const configFile = resolve(packageDir, 'dev/vite.config.ts');
const sourceDir = resolve(packageDir, 'vjsc');
const snapshotFile = resolve(import.meta.dirname, '__snapshots__/generated.tsx.snap');
const targets = ['react', 'html'] as const;
const skins = [
  'default-video',
  'minimal-video',
  'default-live-video',
  'minimal-live-video',
  'default-live-audio',
  'minimal-live-audio',
  'default-audio',
  'minimal-audio',
] as const;
const styles = ['css', 'tailwind'] as const;

interface GeneratedModule {
  readonly key: string;
  readonly request: string;
}

describe('generated VJSC source', () => {
  let server: ViteDevServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  }, 120_000);

  it('matches every transformed component and skin variant', async ({ expect }) => {
    const sources = await sourceModules();
    const modules = generatedModules(sources);
    const sourceNames = new Map(sources.map((filename) => [filename, sourceName(filename)]));
    const transformed = new Map<string, string>();
    const logger = createLogger('silent');
    const warn = vi.spyOn(logger, 'warn');
    const warnOnce = vi.spyOn(logger, 'warnOnce');
    const capture: Plugin = {
      name: 'test:capture-generated-vjsc-source',
      enforce: 'pre',
      transform(code, id) {
        const key = generatedKey(id, sourceNames);

        if (key) transformed.set(key, normalizeGeneratedSource(code));

        return null;
      },
    };

    server = await createServer({
      configFile,
      customLogger: logger,
      logLevel: 'silent',
      optimizeDeps: { include: [], noDiscovery: true },
      plugins: [capture],
      server: { middlewareMode: true },
    });

    await Promise.all(
      modules.map(async (module) => {
        let result;

        try {
          result = await server!.transformRequest(module.request);
        } catch (error) {
          throw new Error(`Failed to transform \`${module.key}\`.`, { cause: error });
        }

        expect(result, module.key).not.toBeNull();
      })
    );

    expect(transformed.size).toBe(modules.length);
    expect([...warn.mock.calls, ...warnOnce.mock.calls].flat().join('\n')).not.toContain('emitFile() is not supported');

    const output = modules
      .map((module) => {
        const code = transformed.get(module.key);
        if (!code) throw new Error(`VJSC did not transform \`${module.key}\`.`);

        return `// ===== ${module.key} =====\n${code.trim()}\n`;
      })
      .join('\n');

    expect(output).not.toContain('_jsxDEV');
    expect(output).not.toContain('/@fs/');
    expect(output).not.toMatch(/from ["']@videojs\/core\/vjsc["']/);
    expect(output).not.toMatch(/media-(?:feedback-|thumbnail-|tooltip-)?surface/);
    expect(output).not.toContain('media-popup-transition');
    expect(output).not.toContain('media-popup-safe-area');
    expect(output).not.toMatch(/import ["']@videojs\/html\/icons\/element(?:\/minimal)?["']/);
    expect(output).not.toContain('from "@videojs/html/icons/element/register"');
    expect(output).toMatch(/import \{[^}]*registerIcons[^}]*\} from "@videojs\/html\/icons"/);
    expect(output).toContain('from "@videojs/html/icons"');
    expect(output).toContain('from "@videojs/html/icons/minimal"');

    for (const target of targets) {
      for (const style of styles) {
        for (const filename of sources.filter((source) => sourceName(source).startsWith('components/'))) {
          const name = sourceName(filename);

          for (const [defaultSkin, minimalSkin] of [
            ['default-video', 'minimal-video'],
            ['default-live-video', 'minimal-live-video'],
            ['default-audio', 'minimal-audio'],
            ['default-live-audio', 'minimal-live-audio'],
          ] as const) {
            expect(
              transformed.get(`${target}/${defaultSkin}/${style}/${name}`),
              `${target}/${style}/${name} must be theme-invariant`
            ).toBe(transformed.get(`${target}/${minimalSkin}/${style}/${name}`));
          }
        }
      }
    }

    const htmlPlayButton = generatedSection(output, 'html/default-video/css/components/buttons/play-button.tsx');
    const reactLiveButton = generatedSection(output, 'react/default-video/tailwind/components/buttons/live-button.tsx');
    const htmlLiveButton = generatedSection(output, 'html/minimal-video/css/components/buttons/live-button.tsx');
    const reactAudioSettingsMenu = generatedSection(output, 'react/default-audio/css/skins/audio/settings-menu.tsx');
    const htmlAudioSettingsMenu = generatedSection(output, 'html/default-audio/css/skins/audio/settings-menu.tsx');
    const reactPlaybackRateSubmenu = generatedSection(
      output,
      'react/default-audio/css/components/menus/playback-rate-submenu.tsx'
    );
    const htmlPlaybackRateSubmenu = generatedSection(
      output,
      'html/default-audio/css/components/menus/playback-rate-submenu.tsx'
    );
    const reactDefaultAudio = generatedSection(output, 'react/default-audio/css/skins/default-audio/skin.tsx');
    const htmlMinimalAudio = generatedSection(output, 'html/minimal-audio/css/skins/minimal-audio/skin.tsx');
    const reactCaptionsMenu = generatedSection(
      output,
      'react/default-live-video/css/components/menus/captions-menu.tsx'
    );
    const htmlCaptionsMenu = generatedSection(output, 'html/default-live-video/css/components/menus/captions-menu.tsx');
    const reactDefaultLiveVideo = generatedSection(
      output,
      'react/default-live-video/css/skins/default-live-video/skin.tsx'
    );
    const htmlMinimalLiveVideo = generatedSection(
      output,
      'html/minimal-live-video/css/skins/minimal-live-video/skin.tsx'
    );
    const reactDefaultLiveAudio = generatedSection(
      output,
      'react/default-live-audio/css/skins/default-live-audio/skin.tsx'
    );
    const htmlMinimalLiveAudio = generatedSection(
      output,
      'html/minimal-live-audio/css/skins/minimal-live-audio/skin.tsx'
    );

    expect(htmlPlayButton).toContain('pauseIcon');
    expect(htmlPlayButton).toContain('playIcon');
    expect(htmlPlayButton).toContain('restartIcon');
    expect(htmlPlayButton).not.toContain('seekIcon');
    expect(reactAudioSettingsMenu).toContain('<Menu.Trigger render={<PlaybackRateButton />}');
    expect(reactAudioSettingsMenu).not.toContain('keepMounted');
    expect(reactLiveButton).toContain('LiveButton as LiveButtonPrimitive');
    expect(reactLiveButton).toContain('render={<Button />}');
    expect(reactLiveButton).toContain('data-live-edge:before:bg-[oklch(0.65_0.22_27)]');
    expect(htmlLiveButton).toContain('import "@videojs/html/ui/live-button";');
    expect(htmlLiveButton).toContain('<media-live-button');
    expect(reactAudioSettingsMenu).not.toContain('usePlaybackRateOptions');
    expect(htmlAudioSettingsMenu).toContain('<media-playback-rate-button');
    expect(htmlAudioSettingsMenu).toContain('commandfor=');
    expect(htmlAudioSettingsMenu).not.toContain('<button commandfor=');
    expect(reactPlaybackRateSubmenu).toContain('<PlaybackRateRadioGroup.Root>');
    expect(reactPlaybackRateSubmenu).toContain('<PlaybackRateRadioGroup.Value');
    expect(reactPlaybackRateSubmenu).toContain('<PlaybackRateRadioGroup.Options');
    expect(reactPlaybackRateSubmenu).toContain('<Menu.Trigger className=');
    expect(htmlPlaybackRateSubmenu).toContain('<media-menu-item commandfor=');
    expect(htmlPlaybackRateSubmenu).toContain('data-part="value"');
    expect(htmlPlaybackRateSubmenu).not.toContain('PlaybackRateRadioGroup.Root');
    expect(reactDefaultAudio).toContain('export interface DefaultAudioSkinProps');
    expect(reactDefaultAudio).toContain('media-skin media-skin--audio');
    expect(htmlMinimalAudio).toContain('export interface MinimalAudioSkinProps');
    expect(htmlMinimalAudio).toContain('media-skin--minimal media-skin--audio');
    expect(reactCaptionsMenu).toContain('render={<Button />}');
    expect(reactCaptionsMenu).toContain('aria-label="Enable captions"');
    expect(reactCaptionsMenu).not.toContain('keepMounted');
    expect(reactCaptionsMenu).not.toContain('useCaptionsOptions');
    expect(htmlCaptionsMenu).toContain('<button commandfor="__vjsc-id-<module>');
    expect(htmlCaptionsMenu).not.toContain('menu-for');
    expect(reactDefaultLiveVideo).toContain('export interface DefaultLiveVideoSkinProps');
    expect(reactDefaultLiveVideo).toContain('media-skin media-skin--live-video');
    expect(htmlMinimalLiveVideo).toContain('export interface MinimalLiveVideoSkinProps');
    expect(htmlMinimalLiveVideo).toContain('media-skin--minimal media-skin--live-video');
    expect(reactDefaultLiveVideo).not.toContain('TimeSlider');
    expect(htmlMinimalLiveVideo).not.toContain('media-time-slider');
    expect(reactDefaultLiveAudio).toContain('export interface DefaultLiveAudioSkinProps');
    expect(reactDefaultLiveAudio).toContain('media-skin media-skin--live-audio');
    expect(htmlMinimalLiveAudio).toContain('export interface MinimalLiveAudioSkinProps');
    expect(htmlMinimalLiveAudio).toContain('media-skin--minimal media-skin--live-audio');
    expect(reactDefaultLiveAudio).not.toContain('AudioTimeSlider');
    expect(htmlMinimalLiveAudio).not.toContain('media-audio-time-slider');
    expect(reactDefaultLiveAudio).not.toContain('PlaybackRateMenu');

    if (process.env.UPDATE_VJSC_SNAPSHOTS) await writeFile(snapshotFile, output);

    const snapshot = await readFile(snapshotFile, 'utf8');

    expect(output).toBe(snapshot);
  }, 120_000);
});

async function sourceModules(): Promise<string[]> {
  return (await Promise.all([walkFiles(resolve(sourceDir, 'components')), walkFiles(resolve(sourceDir, 'skins'))]))
    .flat()
    .filter((filename) => filename.endsWith('.tsx'))
    .sort((left, right) => sourceName(left).localeCompare(sourceName(right)));
}

async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  return (
    await Promise.all(
      entries.map((entry: Dirent) => {
        const path = resolve(directory, entry.name);

        return entry.isDirectory() ? walkFiles(path) : [path];
      })
    )
  ).flat();
}

function generatedModules(sources: readonly string[]): GeneratedModule[] {
  const modules: GeneratedModule[] = [];

  for (const target of targets) {
    for (const skin of skins) {
      for (const style of styles) {
        for (const filename of sources) {
          const name = sourceName(filename);
          const owner = /^skins\/([^/]+)\//.exec(name)?.[1];
          if (owner && !supportsSkin(owner, skin)) continue;

          const parameters = new URLSearchParams({ target, skin, style });
          const key = `${target}/${skin}/${style}/${name}`;

          modules.push({ key, request: `/@fs${filename}?${parameters}` });
        }
      }
    }
  }

  return modules;
}

function supportsSkin(owner: string, skin: (typeof skins)[number]): boolean {
  if ((skins as readonly string[]).includes(owner)) return owner === skin;

  if (owner === 'audio') return skin.endsWith('audio');

  if (owner === 'video') return skin === 'default-video' || skin === 'minimal-video';

  if (owner === 'live-video') return skin === 'default-live-video' || skin === 'minimal-live-video';

  return owner === 'shared';
}

function generatedKey(id: string, sourceNames: ReadonlyMap<string, string>): string | undefined {
  const queryIndex = id.indexOf('?');
  if (queryIndex < 0) return undefined;

  const name = sourceNames.get(id.slice(0, queryIndex));
  if (!name) return undefined;

  const parameters = new URLSearchParams(id.slice(queryIndex + 1));
  const target = parameters.get('target');
  const skin = parameters.get('skin');
  const style = parameters.get('style');

  return target && skin && style ? `${target}/${skin}/${style}/${name}` : undefined;
}

function normalizeGeneratedSource(code: string): string {
  return code
    .replaceAll('\r\n', '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/virtual:vjsc\/css\/[a-f0-9]{12}\//g, 'virtual:vjsc/css/<hash>/')
    .replace(/__vjsc-id-[A-Za-z0-9_-]{8}-/g, '__vjsc-id-<module>-')
    .replace(/(<Scope prefix=")[A-Za-z0-9_-]{8}-/g, '$1<module>-');
}

function sourceName(filename: string): string {
  return relative(sourceDir, filename).split(sep).join('/');
}

function generatedSection(output: string, key: string): string {
  const marker = `// ===== ${key} =====`;
  const start = output.indexOf(marker);
  if (start < 0) throw new Error(`Missing generated section: ${key}`);

  const end = output.indexOf('// =====', start + marker.length);

  return output.slice(start, end < 0 ? undefined : end);
}
