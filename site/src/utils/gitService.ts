import { simpleGit } from 'simple-git';

/**
 * Git service interface for dependency injection (testability).
 */
export interface GitService {
  getLastModifiedDate: (filePath: string) => Promise<Date | null>;
}

/**
 * Create a git service instance using simple-git.
 */
export function createGitService(): GitService {
  const git = simpleGit();

  return {
    async getLastModifiedDate(filePath: string): Promise<Date | null> {
      try {
        const log = await git.log({ file: filePath, maxCount: 1 });
        if (!log.latest) return null;

        return new Date(log.latest.date);
      } catch {
        return null;
      }
    },
  };
}

/**
 * Default git service instance for production use.
 */
export const defaultGitService = createGitService();
