import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SNAPSHOT_KINDS = ['components', 'utils'] as const;
const MAX_DIFF_BUFFER_BYTES = 32 * 1024 * 1024;
type SnapshotKind = (typeof SNAPSHOT_KINDS)[number];

export interface DirectoryChanges {
  new: string[];
  changed: string[];
  unchanged: string[];
  removed: string[];
}

export interface ApiReferenceChanges {
  components: DirectoryChanges;
  utils: DirectoryChanges;
  hasDiff: boolean;
  hasNew: boolean;
}

function listJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort();
}

export function classifyDirectory(beforeDirectory: string, afterDirectory: string): DirectoryChanges {
  const before = new Set(listJsonFiles(beforeDirectory));
  const after = new Set(listJsonFiles(afterDirectory));
  const added = [...after].filter((file) => !before.has(file));
  const removed = [...before].filter((file) => !after.has(file));
  const common = [...after].filter((file) => before.has(file));
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const file of common) {
    const beforeContent = readFileSync(join(beforeDirectory, file));
    const afterContent = readFileSync(join(afterDirectory, file));
    (beforeContent.equals(afterContent) ? unchanged : changed).push(file);
  }

  return { new: added, changed, unchanged, removed };
}

export function classifySnapshots(artifactDirectory: string): ApiReferenceChanges {
  const changes = Object.fromEntries(
    SNAPSHOT_KINDS.map((kind) => [
      kind,
      classifyDirectory(join(artifactDirectory, `before-${kind}`), join(artifactDirectory, `after-${kind}`)),
    ])
  ) as Record<SnapshotKind, DirectoryChanges>;
  const allChanges = SNAPSHOT_KINDS.flatMap((kind) => [
    ...changes[kind].new,
    ...changes[kind].changed,
    ...changes[kind].removed,
  ]);

  return {
    ...changes,
    hasDiff: allChanges.length > 0,
    hasNew: SNAPSHOT_KINDS.some((kind) => changes[kind].new.length > 0),
  };
}

function directoryDiff(beforeDirectory: string, afterDirectory: string): string {
  const result = spawnSync('diff', ['-ruN', beforeDirectory, afterDirectory], {
    encoding: 'utf-8',
    maxBuffer: MAX_DIFF_BUFFER_BYTES,
  });
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    throw new Error(result.stderr || result.error?.message || `diff exited with status ${result.status}`);
  }
  return result.stdout;
}

function writeList(path: string, values: string[]): void {
  writeFileSync(path, values.length > 0 ? `${values.join('\n')}\n` : '');
}

export function writeClassification(artifactDirectory: string, changes: ApiReferenceChanges): void {
  for (const kind of SNAPSHOT_KINDS) {
    writeList(join(artifactDirectory, `new-${kind}.txt`), changes[kind].new);
    writeList(join(artifactDirectory, `changed-${kind}.txt`), changes[kind].changed);
    writeList(join(artifactDirectory, `removed-${kind}.txt`), changes[kind].removed);
  }

  const patch = SNAPSHOT_KINDS.map((kind) =>
    directoryDiff(join(artifactDirectory, `before-${kind}`), join(artifactDirectory, `after-${kind}`))
  ).join('');
  writeFileSync(join(artifactDirectory, 'diff.patch'), patch);
  writeFileSync(join(artifactDirectory, 'classification.json'), `${JSON.stringify(changes, null, 2)}\n`);
}

export function main(artifactDirectory = process.argv[2] ?? '/tmp/api-sync'): void {
  const changes = classifySnapshots(artifactDirectory);
  writeClassification(artifactDirectory, changes);

  for (const kind of SNAPSHOT_KINDS) {
    console.log(`=== New ${kind} ===\n${changes[kind].new.join('\n')}`);
    console.log(`=== Changed ${kind} ===\n${changes[kind].changed.join('\n')}`);
    console.log(`=== Removed ${kind} ===\n${changes[kind].removed.join('\n')}`);
  }

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(
      process.env.GITHUB_OUTPUT,
      `has_diff=${String(changes.hasDiff)}\nhas_new=${String(changes.hasNew)}\n`,
      { flag: 'a' }
    );
  }
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isEntrypoint) main();
