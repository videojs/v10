const warned = new Set<string>();

/**
 * Warn once per (component, feature) pair in development when a required feature isn't installed.
 *
 * @param displayName - Component display name.
 * @param featureName - Required feature name.
 */
export function logMissingFeature(displayName: string, featureName: string): void {
  if (!__DEV__) return;
  const key = `${displayName}:${featureName}`;
  if (warned.has(key)) return;

  warned.add(key);
  console.warn(`${displayName} requires ${featureName} feature`);
}
