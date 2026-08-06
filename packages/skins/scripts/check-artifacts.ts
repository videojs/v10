import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { formatCompilerDiagnostic } from '@videojs/compiler';
import { serializeArtifactGraph } from '@videojs/compiler/artifacts';
import { buildSkinArtifactGraph, skinsRoot } from './build-artifact-graph';

const outputFile = resolve(skinsRoot, 'artifacts.generated.json');

async function run(): Promise<void> {
  const result = await buildSkinArtifactGraph();
  if (result.diagnostics.length > 0) {
    for (const diagnostic of result.diagnostics) {
      process.stderr.write(formatCompilerDiagnostic(diagnostic, { color: false, cwd: skinsRoot }));
    }
    process.exitCode = 1;
    return;
  }

  const output = serializeArtifactGraph(result.graph);
  if (process.argv.includes('--write')) {
    await writeFile(outputFile, output);
    process.stdout.write(`Wrote ${outputFile}\n`);
    return;
  }

  let expected: unknown;
  try {
    expected = JSON.parse(await readFile(outputFile, 'utf8'));
  } catch {
    process.stderr.write('Artifact graph snapshot is missing or invalid. Run `pnpm generate:artifacts`.\n');
    process.exitCode = 1;
    return;
  }

  if (JSON.stringify(result.graph) !== JSON.stringify(expected)) {
    process.stderr.write('Artifact graph snapshot is stale. Run `pnpm generate:artifacts`.\n');
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Checked ${result.graph.artifacts.length} Skin artifacts.\n`);
}

await run();
