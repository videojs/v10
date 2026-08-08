import type { Dirent } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { createHtmlSourceOutput } from '../../packages/html/scripts/source-presets/output.ts';
import { createReactSourceOutput } from '../../packages/react/scripts/source-presets/output.ts';
import { buildSkinArtifactGraph, skinsRoot } from '../../packages/skins/scripts/build-artifact-graph.ts';
import {
  createDefaultVideoSourcePreset,
  defaultVideoSourcePreset,
} from '../../packages/skins/scripts/source-presets/default-video.ts';
import type { SourceOutputManifest, SourceTarget } from '../../packages/skins/scripts/source-presets/output.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const targets = [
  { framework: 'react', style: 'tailwind' },
  { framework: 'react', style: 'css' },
  { framework: 'html', style: 'tailwind' },
  { framework: 'html', style: 'css' },
] as const satisfies readonly SourceTarget[];

export interface GenerateSourcePresetOptions {
  rootDir?: string | undefined;
  check?: boolean | undefined;
}

export async function generateSourcePresets(options: GenerateSourcePresetOptions = {}): Promise<void> {
  const rootDir = resolve(options.rootDir ?? repositoryRoot);
  const expected = await createSourcePresetFiles();
  const existing = await generatedSkinPaths(rootDir, defaultVideoSourcePreset.slug);

  if (options.check) {
    const differences = await generatedDifferences(rootDir, expected, existing);
    if (differences.length > 0) {
      throw new Error(
        `Generated source presets are out of date:\n${differences.map((path) => `- ${path}`).join('\n')}`
      );
    }
    return;
  }

  for (const [path, content] of expected) {
    const fileName = resolve(rootDir, path);
    await mkdir(dirname(fileName), { recursive: true });
    await writeFile(fileName, content);
  }

  for (const path of existing) {
    if (!expected.has(path)) await rm(resolve(rootDir, path));
  }
}

export async function createSourcePresetFiles(): Promise<ReadonlyMap<string, string>> {
  const { graph, diagnostics } = await buildSkinArtifactGraph();
  if (diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    throw new Error('Cannot generate source presets from an invalid artifact graph.');
  }

  const preset = createDefaultVideoSourcePreset(graph);
  const files = new Map<string, string>();

  for (const target of targets) {
    const artifactIds = target.framework === 'html' ? [preset.rootArtifactId] : preset.artifactIds;
    const options = {
      rootDir: skinsRoot,
      style: target.style,
      targetRoot: '',
      rootArtifactId: preset.rootArtifactId,
      artifactIds,
    } as const;
    const output =
      target.framework === 'html'
        ? await createHtmlSourceOutput(graph, options)
        : await createReactSourceOutput(graph, options);
    await addTargetFiles(files, output, target, preset.slug);
  }

  return files;
}

async function addTargetFiles(
  files: Map<string, string>,
  output: SourceOutputManifest,
  target: SourceTarget,
  presetSlug: string
): Promise<void> {
  for (const artifactFiles of Object.values(output.artifacts)) {
    for (const file of artifactFiles) {
      const path = posix.join(
        'packages',
        target.framework,
        'src/__generated__/skins',
        presetSlug,
        target.style,
        file.target
      );
      const content = await formatSourceFile(path, file.content);
      const previous = files.get(path);
      if (previous !== undefined && previous !== content) throw new Error(`Generated output collision: ${path}`);
      files.set(path, content);
    }
  }
}

async function formatSourceFile(path: string, content: string): Promise<string> {
  const parser = path.endsWith('.tsx') || path.endsWith('.ts') ? 'typescript' : path.endsWith('.css') ? 'css' : 'html';
  return format(content, { parser, printWidth: 120, singleQuote: true, htmlWhitespaceSensitivity: 'ignore' });
}

async function generatedDifferences(
  rootDir: string,
  expected: ReadonlyMap<string, string>,
  existing: readonly string[]
): Promise<string[]> {
  const differences: string[] = [];
  for (const [path, content] of expected) {
    try {
      if ((await readFile(resolve(rootDir, path), 'utf8')) !== content) differences.push(path);
    } catch {
      differences.push(path);
    }
  }
  for (const path of existing) {
    if (!expected.has(path)) differences.push(path);
  }
  return [...new Set(differences)].sort();
}

async function generatedSkinPaths(rootDir: string, presetSlug: string): Promise<string[]> {
  const roots = targets.map(({ framework, style }) =>
    posix.join('packages', framework, 'src/__generated__/skins', presetSlug, style)
  );
  const paths = await Promise.all(
    roots.map(async (root) => (await walkFiles(resolve(rootDir, root))).map((path) => posix.join(root, path)))
  );
  return paths.flat().sort();
}

async function walkFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(currentDir, entry.name);
      if (entry.isDirectory()) return walkFiles(rootDir, path);
      return [toPosixPath(relative(rootDir, path))];
    })
  );
  return files.flat();
}

function toPosixPath(path: string): string {
  return path.split(sep).join('/');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateSourcePresets({ check: process.argv.includes('--check') });
}
