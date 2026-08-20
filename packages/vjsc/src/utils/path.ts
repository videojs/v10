import { relative } from 'node:path';

export function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

/** Whether a path is a strict descendant of a root directory. */
export function isInsideRoot(root: string, path: string): boolean {
  const relativePath = relative(root, path);
  return Boolean(relativePath) && !escapesRoot(toPosixPath(relativePath));
}

export function escapesRoot(path: string): boolean {
  return path === '..' || path.startsWith('../');
}
