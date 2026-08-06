import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
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
      '@example/behaviors': 'behaviors',
      '@example/graphics': 'graphics',
    },
    isArtifactEntry: (fileName: string) => fileName.endsWith('.item.tsx'),
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('artifact graph', () => {
  it('infers exact dependencies and resolves deterministic multi-file closure', async () => {
    const root = setup({
      'controls/action.item.tsx': `
        import { Button as ButtonPrimitive, UnusedButton } from '@example/behaviors';
        import { PauseIcon, PlayIcon as StartIcon } from '@example/graphics';
        import type { Config } from '@example/types/config';
        import { label } from './action-label';
        import './action.css';
        export function Action(_props: Config) {
          return <ButtonPrimitive>{label}<StartIcon /></ButtonPrimitive>;
        }
      `,
      'controls/action-label.ts': `export const label = 'Run';`,
      'controls/action.css': `.action { display: block; }`,
      'compositions/player.item.tsx': `
        import { Action } from '../controls/action.item';
        export function Player() { return <Action />; }
      `,
    });
    const definitions = [
      defineArtifact({
        id: 'player',
        kind: 'composition',
        entry: './compositions/player.item.tsx',
        resources: { styles: ['controls'] },
      }),
      defineArtifact({
        id: 'action',
        kind: 'control',
        entry: './controls/action.item.tsx',
        resources: { styles: ['tooltip', 'button'] },
        metadata: { order: 1, category: 'button' },
      }),
    ] as const;

    expectTypeOf(definitions[0].kind).toEqualTypeOf<'composition'>();

    const result = await buildArtifactGraph(definitions, options(root));

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.artifacts).toMatchObject([
      {
        id: 'action',
        files: [
          { path: './controls/action-label.ts', role: 'source' },
          { path: './controls/action.css', role: 'source' },
          { path: './controls/action.item.tsx', role: 'entry' },
        ],
        resources: { styles: ['button', 'tooltip'] },
        dependencies: {
          artifacts: [],
          packages: ['@example/behaviors', '@example/graphics', '@example/types'],
          symbols: {
            behaviors: ['Button'],
            graphics: ['PlayIcon'],
          },
        },
        metadata: { category: 'button', order: 1 },
      },
      {
        id: 'player',
        files: [{ path: './compositions/player.item.tsx', role: 'entry' }],
        dependencies: { artifacts: ['action'] },
      },
    ]);

    expect(resolveArtifactClosure(result.graph, 'player')).toEqual({
      artifactIds: ['action', 'player'],
      files: [
        { path: './compositions/player.item.tsx', role: 'entry' },
        { path: './controls/action-label.ts', role: 'source' },
        { path: './controls/action.css', role: 'source' },
        { path: './controls/action.item.tsx', role: 'entry' },
      ],
      resources: { styles: ['button', 'controls', 'tooltip'] },
      artifacts: ['action'],
      packages: ['@example/behaviors', '@example/graphics', '@example/types'],
      symbols: {
        behaviors: ['Button'],
        graphics: ['PlayIcon'],
      },
    });
  });

  it('serializes independently of definition and metadata key order', async () => {
    const root = setup({
      'a.ts': 'export const a = true;',
      'b.ts': 'export const b = true;',
    });
    const first: ArtifactDefinition[] = [
      { id: 'b', kind: 'module', entry: './b.ts', metadata: { z: true, a: false } },
      { id: 'a', kind: 'module', entry: './a.ts' },
    ];
    const second: ArtifactDefinition[] = [
      { id: 'a', kind: 'module', entry: './a.ts' },
      { id: 'b', kind: 'module', entry: './b.ts', metadata: { a: false, z: true } },
    ];

    const a = await buildArtifactGraph(first, { rootDir: root });
    const b = await buildArtifactGraph(second, { rootDir: root });

    expect(serializeArtifactGraph(a.graph)).toBe(serializeArtifactGraph(b.graph));
  });

  it('reports duplicate definitions, unresolved imports, and unregistered entries', async () => {
    const root = setup({
      'entry.item.tsx': `
        import './missing';
        import './orphan.item';
      `,
      'orphan.item.tsx': 'export const orphan = true;',
      'duplicate.ts': 'export const duplicate = true;',
    });
    const definitions: ArtifactDefinition[] = [
      { id: 'entry', kind: 'module', entry: './entry.item.tsx' },
      { id: 'entry', kind: 'module', entry: './duplicate.ts' },
      { id: 'duplicate-entry', kind: 'module', entry: './entry.item.tsx' },
      { id: 'outside', kind: 'module', entry: '../outside.ts' },
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
      'a.item.tsx': `
        import * as behaviors from '@example/behaviors';
        import { B } from './b.item';
        export function A() { return <behaviors.Text><B /></behaviors.Text>; }
      `,
      'b.item.tsx': `
        import { A } from './a.item';
        export function B() { return <A />; }
      `,
    });
    const definitions: ArtifactDefinition[] = [
      { id: 'a', kind: 'module', entry: './a.item.tsx' },
      { id: 'b', kind: 'module', entry: './b.item.tsx' },
    ];

    const result = await buildArtifactGraph(definitions, options(root));

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'artifact-dependency-cycle',
      'artifact-dependency-ambiguous',
    ]);
  });

  it('does not infer runtime symbols from type-only re-exports', async () => {
    const root = setup({
      'entry.ts': `
        export type { Button } from '@example/behaviors';
        export type * from '@example/graphics';
      `,
    });

    const result = await buildArtifactGraph([{ id: 'entry', kind: 'module', entry: './entry.ts' }], options(root));

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.artifacts[0]?.dependencies).toEqual({
      artifacts: [],
      packages: ['@example/behaviors', '@example/graphics'],
      symbols: { behaviors: [], graphics: [] },
    });
  });

  it('rejects closure requests for unknown artifacts', () => {
    expect(() => resolveArtifactClosure({ version: 1, artifacts: [] }, 'missing')).toThrowError(
      'Artifact `missing` does not exist in the graph.'
    );
  });
});
