import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import type { Graph } from 'vjsc/graph';

import type { SkinModuleMeta } from '../../../src/meta.ts';
import { createReactPackageSkins } from '../react.ts';

describe('createReactPackageSkins', () => {
  it('writes one finalized graph to stable package sources', async () => {
    const root = resolve(import.meta.dirname, 'fixture');
    const graph = fixtureGraph(root);
    const files = new Map(
      (
        await createReactPackageSkins(graph, {
          workspaceDir: resolve(import.meta.dirname, '../../../../..'),
          baseStyles: [],
        })
      ).map((file) => [file.path, file.content])
    );

    expect(files.get('packages/react/src/presets/video/skin.tsx')).toContain('export interface VideoSkinProps');
    expect(files.get('packages/react/src/presets/video/skin.tsx')).toContain('poster={renderPoster}');
    expect(files.get('packages/react/src/internal/skins/default-video/skin.tsx')).toContain(
      "from '../shared/components/button'"
    );
    expect(files.get('packages/react/src/internal/skins/shared/components/button.tsx')).toContain(
      "from '../../../skin-primitives'"
    );
    expect(files.get('packages/react/src/internal/skins/shared/components/button.tsx')).not.toContain(
      '@videojs/react/ui/playback-rate-radio-group'
    );
  });
});

function fixtureGraph(root: string): Graph<SkinModuleMeta> {
  const modules = new Map();

  for (const theme of ['default', 'minimal'] as const) {
    for (const preset of ['audio', 'live-audio', 'live-video', 'video'] as const) {
      const skin = `${theme}-${preset}`;
      const rootId = `${root}/skins/${skin}/skin.tsx?skin=${skin}&style=css&target=react`;
      const buttonId = `${root}/components/button.tsx?skin=${skin}&style=css&target=react`;
      const rootSource = `import { Button } from '../../components/button';\nexport function ${pascalCase(theme)}${pascalCase(preset)}Skin() { return <Button />; }`;
      const buttonSource =
        "import { PlayButton } from '@videojs/react';\nimport { PlaybackRateRadioGroup } from '@videojs/react/ui/playback-rate-radio-group';\nexport function Button() { return <PlaybackRateRadioGroup.Root><PlayButton /></PlaybackRateRadioGroup.Root>; }";

      modules.set(rootId, {
        id: rootId,
        filename: `${root}/skins/${skin}/skin.tsx`,
        sourcePath: `skins/${skin}/skin.tsx`,
        params: { skin, style: 'css', target: 'react' },
        source: rootSource,
        imports: [{ ...importReference(rootSource, '../../components/button'), resolvedId: buttonId }],
        styles: { files: [], assets: [] },
        meta: {
          type: 'skin',
          name: skin,
          title: skin,
          description: skin,
          style: { scope: '.media-skin', theme, variant: theme },
        },
      });
      modules.set(buttonId, {
        id: buttonId,
        filename: `${root}/components/button.tsx`,
        sourcePath: 'components/button.tsx',
        params: { skin, style: 'css', target: 'react' },
        source: buttonSource,
        imports: [
          importReference(buttonSource, '@videojs/react'),
          importReference(buttonSource, '@videojs/react/ui/playback-rate-radio-group'),
        ],
        styles: { files: [], assets: [] },
      });
    }
  }

  return { root, modules, assets: new Map() };
}

function importReference(source: string, specifier: string) {
  const start = source.indexOf(`'${specifier}'`);

  return { specifier, kind: 'static' as const, start, end: start + specifier.length + 2, quote: "'" };
}

function pascalCase(value: string): string {
  return value.replace(/(?:^|-)([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}
