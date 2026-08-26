type TaskPath = string | { auto: boolean } | { pattern: string; base: 'package' | 'workspace' };
type WorkspaceDependencyField = 'dependencies' | 'devDependencies';

/** Stable automatic inputs shared by cached build and generator tasks. */
export const cachedTaskInputs: TaskPath[] = [
  { auto: true },
  '!*.tsbuildinfo',
  '!**/*.tsbuildinfo',
  // Framework and bundler optimization caches are mutable implementation
  // details. Tasks may populate them while running, but their contents do not
  // define the resulting build artifacts.
  '!node_modules/.astro',
  '!node_modules/.astro/**',
  '!node_modules/.vite',
  '!node_modules/.vite/**',
  // pnpm rewrites this install metadata on fresh runners. The lockfile and the
  // dependency files actually read by each task remain automatically tracked.
  { pattern: '!node_modules/.modules.yaml', base: 'workspace' },
];

/** Stable automatic outputs shared by cached tasks with dynamic write sets. */
export const cachedTaskOutputs: TaskPath[] = [
  { auto: true },
  '!*.tsbuildinfo',
  '!**/*.tsbuildinfo',
  '!node_modules/.astro',
  '!node_modules/.astro/**',
  '!node_modules/.vite',
  '!node_modules/.vite/**',
  { pattern: '!node_modules/.modules.yaml', base: 'workspace' },
];

/** Build the same task in each workspace dependency used by the current package. */
export function workspaceTaskDependencies(task = 'build') {
  const from: WorkspaceDependencyField[] = ['dependencies', 'devDependencies'];

  return [{ task, from }];
}

/** Run package tests after their build graph without caching the test result. */
export function packageTestTask(command = 'pnpm test') {
  return {
    command,
    cache: false,
    dependsOn: ['build'],
  };
}
