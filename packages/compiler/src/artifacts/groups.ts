export type MutableGroups = Map<string, Set<string>>;

/** Artifact groups are normalized here so graph output and closures share one ordering policy. */
export function createMutableGroups(keys: Iterable<string> = []): MutableGroups {
  const groups: MutableGroups = new Map();
  for (const key of keys) getOrCreateGroup(groups, key);
  return groups;
}

export function getOrCreateGroup(groups: MutableGroups, key: string): Set<string> {
  let values = groups.get(key);
  if (!values) {
    values = new Set();
    groups.set(key, values);
  }
  return values;
}

export function mergeGroups(target: MutableGroups, source: Readonly<Record<string, readonly string[]>>): void {
  for (const [key, values] of Object.entries(source)) {
    const group = getOrCreateGroup(target, key);
    for (const value of values) group.add(value);
  }
}

export function normalizeGroups(groups: Readonly<Record<string, readonly string[]>>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(groups)
      .sort(([a], [b]) => compareStrings(a, b))
      .map(([key, values]) => [key, sortedUnique(values)])
  );
}

export function freezeGroups(groups: ReadonlyMap<string, ReadonlySet<string>>): Record<string, string[]> {
  return Object.fromEntries(
    [...groups.entries()].sort(([a], [b]) => compareStrings(a, b)).map(([key, values]) => [key, sortedUnique(values)])
  );
}

export function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareStrings);
}

export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
