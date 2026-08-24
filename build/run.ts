type TaskInput = string | { auto: boolean } | { pattern: string; base: 'package' | 'workspace' };

/** Stable automatic inputs shared by cached build and generator tasks. */
export const cachedTaskInputs: TaskInput[] = [
  { auto: true },
  '!*.tsbuildinfo',
  '!**/*.tsbuildinfo',
  // pnpm rewrites this install metadata on fresh runners. The lockfile and the
  // dependency files actually read by each task remain automatically tracked.
  { pattern: '!node_modules/.modules.yaml', base: 'workspace' },
];
