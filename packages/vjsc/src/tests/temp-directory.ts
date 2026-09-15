import { mkdtempSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach } from 'vite-plus/test';

export function useTemporaryDirectories() {
  const directories = new Set<string>();

  afterEach(async () => {
    const pending = [...directories].map((directory) => rm(directory, { recursive: true, force: true }));

    directories.clear();
    await Promise.all(pending);
  });

  return {
    async create(prefix: string): Promise<string> {
      const directory = await mkdtemp(join(tmpdir(), prefix));

      directories.add(directory);
      return directory;
    },
    createSync(prefix: string): string {
      const directory = mkdtempSync(join(tmpdir(), prefix));

      directories.add(directory);
      return directory;
    },
  };
}
