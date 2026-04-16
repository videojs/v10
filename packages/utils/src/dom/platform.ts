export function isMacOS(): boolean {
  return __BROWSER__ && /mac/i.test(navigator.userAgent);
}
