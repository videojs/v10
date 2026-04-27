export function normalizeSitePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '') || 'index';
}
