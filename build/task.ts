type TaskInput = string | { auto: boolean } | { pattern: string; base: 'package' | 'workspace' };

/** Stable automatic inputs shared by cached build and generator tasks. */
export const cachedTaskInputs: TaskInput[] = [
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
