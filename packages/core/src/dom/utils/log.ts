const warned = new Set<string>();

export function logMissingFeature(displayName: string, featureName: string): void {
  const key = `${displayName}:${featureName}`;
  if (warned.has(key)) return;

  warned.add(key);
  console.warn(`${displayName} requires ${featureName} feature`);
}
