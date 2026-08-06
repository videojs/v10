import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  type ArtifactDefinition,
  buildArtifactGraph,
  defineArtifact,
  resolveArtifactClosure,
  serializeArtifactGraph,
} from '../artifacts';

const roots: string[] = [];

function setup(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-artifacts-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return root;
}

function options(rootDir: string) {
  return {
    rootDir,
    dependencyModules: {
      '@videojs/core/components': 'component' as const,
      '@videojs/icons/components': 'icon' as const,
    },
    isArtifactEntry: (fileName: string) => fileName.endsWith('.skin.tsx'),
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('artifact graph', () => {
  it('infers exact dependencies and resolves deterministic multi-file closure', async () => {
    const root = setup({
      'components/play-button.skin.tsx': `
        import { PlayButton as PlayButtonPrimitive, SeekButton } from '@videojs/core/components';
        import { PauseIcon, PlayIcon as StartIcon } from '@videojs/icons/components';
        import type { Config } from '@example/types/config';
        import { label } from './play-button-label';
        import './play-button.css';
        export function PlayButton(_props: Config) {
          return <PlayButtonPrimitive>{label}<StartIcon /></PlayButtonPrimitive>;
        }
      `,
      'components/play-button-label.ts': `export const label = 'Play';`,
      'components/play-button.css': `.play-button { display: block; }`,
      'skins/video.skin.tsx': `
        import { PlayButton } from '../components/play-button.skin';
        export function VideoSkin() { return <PlayButton />; }
      `,
    });
    const definitions = [
      defineArtifact({ id: 'video', kind: 'skin', entry: './skins/video.skin.tsx', styles: ['controls'] }),
      defineArtifact({
        id: 'play-button',
        kind: 'component',
        entry: './components/play-button.skin.tsx',
        styles: ['tooltip', 'button'],
        metadata: { order: 1, category: 'button' },
      }),
    ] as const;

    const result = await buildArtifactGraph(definitions, options(root));

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.artifacts).toMatchObject([
      {
        id: 'play-button',
        files: [
          { path: './components/play-button-label.ts', role: 'source' },
          { path: './components/play-button.css', role: 'source' },
          { path: './components/play-button.skin.tsx', role: 'entry' },
        ],
        styles: ['button', 'tooltip'],
        dependencies: {
          artifacts: [],
          packages: ['@example/types', '@videojs/core', '@videojs/icons'],
          components: ['PlayButton'],
          icons: ['PlayIcon'],
          elements: [],
        },
        metadata: { category: 'button', order: 1 },
      },
      {
        id: 'video',
        files: [{ path: './skins/video.skin.tsx', role: 'entry' }],
        dependencies: { artifacts: ['play-button'] },
      },
    ]);

    expect(resolveArtifactClosure(result.graph, 'video')).toEqual({
      artifactIds: ['play-button', 'video'],
      files: [
        { path: './components/play-button-label.ts', role: 'source' },
        { path: './components/play-button.css', role: 'source' },
        { path: './components/play-button.skin.tsx', role: 'entry' },
        { path: './skins/video.skin.tsx', role: 'entry' },
      ],
      styles: ['button', 'controls', 'tooltip'],
      artifacts: ['play-button'],
      packages: ['@example/types', '@videojs/core', '@videojs/icons'],
      components: ['PlayButton'],
      icons: ['PlayIcon'],
      elements: [],
    });
  });

  it('serializes independently of definition and metadata key order', async () => {
    const root = setup({
      'a.ts': 'export const a = true;',
      'b.ts': 'export const b = true;',
    });
    const first: ArtifactDefinition[] = [
      { id: 'b', kind: 'utility', entry: './b.ts', metadata: { z: true, a: false } },
      { id: 'a', kind: 'utility', entry: './a.ts' },
    ];
    const second: ArtifactDefinition[] = [
      { id: 'a', kind: 'utility', entry: './a.ts' },
      { id: 'b', kind: 'utility', entry: './b.ts', metadata: { a: false, z: true } },
    ];

    const a = await buildArtifactGraph(first, { rootDir: root });
    const b = await buildArtifactGraph(second, { rootDir: root });

    expect(serializeArtifactGraph(a.graph)).toBe(serializeArtifactGraph(b.graph));
  });

  it('reports duplicate definitions, unresolved imports, and unregistered entries', async () => {
    const root = setup({
      'entry.skin.tsx': `
        import './missing';
        import './orphan.skin';
      `,
      'orphan.skin.tsx': 'export const orphan = true;',
      'duplicate.ts': 'export const duplicate = true;',
    });
    const definitions: ArtifactDefinition[] = [
      { id: 'entry', kind: 'component', entry: './entry.skin.tsx' },
      { id: 'entry', kind: 'component', entry: './duplicate.ts' },
      { id: 'duplicate-entry', kind: 'utility', entry: './entry.skin.tsx' },
      { id: 'outside', kind: 'utility', entry: '../outside.ts' },
    ];

    const result = await buildArtifactGraph(definitions, options(root));

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'artifact-duplicate-id',
      'artifact-entry-outside-root',
      'artifact-duplicate-entry',
      'artifact-import-missing',
      'artifact-entry-unregistered',
    ]);
  });

  it('reports artifact cycles and imports whose exact dependency cannot be inferred', async () => {
    const root = setup({
      'a.skin.tsx': `
        import * as Components from '@videojs/core/components';
        import { B } from './b.skin';
        export function A() { return <Components.Text><B /></Components.Text>; }
      `,
      'b.skin.tsx': `
        import { A } from './a.skin';
        export function B() { return <A />; }
      `,
    });
    const definitions: ArtifactDefinition[] = [
      { id: 'a', kind: 'component', entry: './a.skin.tsx' },
      { id: 'b', kind: 'component', entry: './b.skin.tsx' },
    ];

    const result = await buildArtifactGraph(definitions, options(root));

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'artifact-dependency-cycle',
      'artifact-dependency-ambiguous',
    ]);
  });

  it('rejects closure requests for unknown artifacts', () => {
    expect(() => resolveArtifactClosure({ version: 1, artifacts: [] }, 'missing')).toThrowError(
      'Artifact `missing` does not exist in the graph.'
    );
  });
});
