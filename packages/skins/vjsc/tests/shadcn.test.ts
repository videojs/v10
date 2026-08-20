import { resolve } from 'node:path';
import { build } from 'tsdown';
import { describe, expect, it } from 'vitest';
import type { ShadcnRegistry } from 'vjsc/shadcn';

const packageDir = resolve(import.meta.dirname, '../..');
const configFile = resolve(packageDir, 'tsdown.vjsc.config.ts');

describe('Skins Shadcn registry', () => {
  it('emits editable React and Tailwind JSON without a synthetic runtime chunk', async () => {
    const [result] = await build({
      cwd: packageDir,
      config: configFile,
      configLoader: 'unrun',
      logLevel: 'silent',
      write: false,
    });
    if (!result) throw new Error('Expected one registry build output.');
    const output = result.chunks;

    expect(output.some((item) => item.type === 'chunk')).toBe(false);
    const assets = new Map<string, string>(
      output.filter((item) => item.type === 'asset').map((item) => [item.fileName, String(item.source)] as const)
    );
    const registry = assetJson<ShadcnRegistry>(assets, 'registry.json');
    const playButton = assetJson<BuiltItem>(assets, 'play-button.json');
    const defaultVideo = assetJson<BuiltItem>(assets, 'default-video.json');
    const container = assetJson<BuiltItem>(assets, 'container.json');
    const styles = assetJson<BuiltItem>(assets, 'styles.json');
    const utils = assetJson<BuiltItem>(assets, 'utils.json');
    const playSource = playButton.files.find((file) => file.target?.endsWith('/play-button.tsx'))?.content;

    expect(registry.items.map((item: { name: string }) => item.name)).toContain('play-button');
    expect(playSource).toContain('export interface PlayButtonProps');
    expect(playSource).toContain('<PlayButtonPrimitive className=');
    expect(playSource).toContain('grid min-h-0');
    expect(playSource).toContain(`from "@/components/videojs/utils"`);
    expect(playSource).not.toContain('const meta');
    expect(playSource).not.toContain('jsx-runtime');
    expect(playButton.dependencies).toEqual(['@videojs/react', 'react']);
    expect(playButton.registryDependencies).toEqual(['@videojs/styles', '@videojs/utils']);
    expect(defaultVideo.registryDependencies).toEqual(
      expect.arrayContaining(['@videojs/container', '@videojs/overlay', '@videojs/play-button', '@videojs/poster'])
    );
    expect(defaultVideo.registryDependencies).not.toContain('@videojs/seek-button');
    expect(container.dependencies).toEqual(['@videojs/react', 'react']);
    expect(container.registryDependencies).toEqual(['@videojs/styles', '@videojs/utils']);
    expect(registry.items.some((item: { name: string }) => item.name === 'button-tooltip')).toBe(false);
    expect(styles.files.map((file) => file.target)).toEqual([
      'components/videojs/styles/tailwind.css',
      'components/videojs/styles/tailwind.shared.css',
      'components/videojs/styles/base.css',
      'components/videojs/styles/captions.css',
      'components/videojs/styles/themes/video.css',
      'components/videojs/styles/themes/default.css',
      'components/videojs/styles/themes/minimal.css',
    ]);
    expect(utils).toMatchObject({
      type: 'registry:lib',
      dependencies: ['clsx', 'tailwind-merge'],
    });
    expect(utils.files[0]).toMatchObject({
      type: 'registry:lib',
      target: 'components/videojs/utils.ts',
    });
    expect(utils.files[0]?.content).toContain('export function resolveClassName');
  }, 30_000);
});

type BuiltItem = Omit<ShadcnRegistry['items'][number], 'files'> & {
  files: Array<{ type: string; path: string; target?: string | undefined; content: string }>;
};

function assetJson<Value>(assets: ReadonlyMap<string, string>, fileName: string): Value {
  const source = assets.get(fileName);
  if (!source) throw new Error(`Missing registry asset: ${fileName}`);
  return JSON.parse(source) as Value;
}
