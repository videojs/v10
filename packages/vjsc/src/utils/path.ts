import { basename, extname, isAbsolute, relative, resolve } from 'node:path';

/** Resolve a path against a directory unless it is already absolute. */
export function absolutePath(cwd: string, path: string): string {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

/** Return a filename without its final extension. */
export function fileStem(path: string): string {
  return basename(path, extname(path));
}

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
