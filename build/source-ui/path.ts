import { sep } from 'node:path';

export function toPosixPath(path: string): string {
  return path.split(sep).join('/');
}
