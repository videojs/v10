import * as path from 'node:path';

import { simpleGit } from 'simple-git';

/** Git service interface for dependency injection (testability). */
export interface GitService {
  getLastModifiedDate: (filePath: string) => Promise<Date | null>;
}

/** The slice of simple-git the service drives, so tests can inject a fake client. */
export interface GitClient {
  raw: (args: string[]) => Promise<string>;
  revparse: (args: string[]) => Promise<string>;
}

// ASCII record separator: prefixes each commit's date so it cannot be confused with a path line.
const COMMIT_MARKER = '\u001e';

/**
 * Parse `git log --format=<marker>%aI --name-only` output into the most recent author date per path.
 *
 * Git prints commits newest first, so the first date seen for a path is its last modification. Paths are repo-relative,
 * exactly as git prints them.
 */
export function parseLastModifiedDates(log: string): Map<string, Date> {
  const dates = new Map<string, Date>();
  let current: Date | null = null;

  for (const line of log.split('\n')) {
    if (line.startsWith(COMMIT_MARKER)) {
      current = new Date(line.slice(COMMIT_MARKER.length));
      continue;
    }

    if (!line || !current || dates.has(line)) continue;

    dates.set(line, current);
  }

  return dates;
}

/**
 * Create a git service that answers per-file lookups from one history walk of `scope`.
 *
 * One `--name-only` log over `scope` costs a single history walk no matter how many entries ask. Results are keyed by
 * absolute path, so lookups do not depend on the working directory Astro is launched from.
 *
 * @param scope Absolute directory whose history should be loaded. Files outside it resolve to `null`.
 * @param git Git client; defaults to simple-git in the current working directory, which only needs to be inside the
 *   repo.
 */
export function createGitService(scope: string, git: GitClient = simpleGit()): GitService {
  let dates: Promise<Map<string, Date>> | undefined;

  async function loadDates(): Promise<Map<string, Date>> {
    const [toplevel, log] = await Promise.all([
      git.revparse(['--show-toplevel']),
      // Non-ASCII filenames would otherwise arrive C-quoted and never match a real path.
      git.raw(['-c', 'core.quotePath=false', 'log', `--format=${COMMIT_MARKER}%aI`, '--name-only', '--', scope]),
    ]);
    const root = toplevel.trim();

    return new Map(
      Array.from(parseLastModifiedDates(log), ([relativePath, date]) => [path.resolve(root, relativePath), date])
    );
  }

  return {
    async getLastModifiedDate(filePath: string): Promise<Date | null> {
      try {
        dates ??= loadDates();

        return (await dates).get(path.resolve(filePath)) ?? null;
      } catch {
        dates = undefined;

        return null;
      }
    },
  };
}
