export function isMacOS(): boolean {
  return typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);
}

export function isAndroid(userAgent = globalThis.navigator?.userAgent ?? '') {
  return /\bAndroid\b/.test(userAgent);
}

export function getChromeVersion(userAgent = globalThis.navigator?.userAgent ?? '') {
  const match = /Chrome\/(\d+)/.exec(userAgent);
  return match ? Number(match[1]) : null;
}
