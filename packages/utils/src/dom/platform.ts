export function isMacOS(): boolean {
  return 'navigator' in globalThis && /mac/i.test(navigator.userAgent);
}
