/**
 * Shapes this directory's `package.json` for the StackBlitz template that pkg.pr.new uploads. The upload is this
 * directory alone: pnpm has no workspace catalog to resolve a `catalog:` spec against, and no preview publishes a
 * private package, so a `workspace:` range on one can never install.
 */

export interface TemplateManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export interface PrepareTemplateOptions {
  /** The workspace's default catalog, so a `catalog:` spec becomes the version the workspace resolved. */
  readonly catalog: Readonly<Record<string, string>>;
  /** Whether a `workspace:` dependency names a private package. */
  readonly isPrivate: (name: string) => boolean;
}

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const;

/** The default catalog of a `pnpm-workspace.yaml`: the `name: version` lines indented under `catalog:`. */
export function parseWorkspaceCatalog(yaml: string): Record<string, string> {
  const catalog: Record<string, string> = {};
  let inCatalog = false;

  for (const line of yaml.split('\n')) {
    if (/^catalog:\s*$/.test(line)) {
      inCatalog = true;
      continue;
    }

    if (!inCatalog || line.trim() === '' || line.trimStart().startsWith('#')) continue;

    // The block ends at the next key that is not indented under it.
    if (!/^\s/.test(line)) {
      inCatalog = false;
      continue;
    }

    const entry = line.match(/^\s+(["']?)([^"':\s]+)\1:\s*(["']?)(.+?)\3\s*$/);

    if (entry) catalog[entry[2]!] = entry[4]!;
  }

  return catalog;
}

/**
 * The manifest with every `catalog:` spec inlined and every `workspace:` dependency on a private package removed.
 * Published workspace dependencies stay as they are; pkg.pr.new rewrites those to its preview URLs.
 */
export function prepareTemplateManifest<T extends TemplateManifest>(
  manifest: T,
  { catalog, isPrivate }: PrepareTemplateOptions
): T {
  const prepared: TemplateManifest = { ...manifest };

  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = manifest[field];
    if (!dependencies) continue;

    const next: Record<string, string> = {};

    for (const [name, spec] of Object.entries(dependencies)) {
      if (spec.startsWith('workspace:') && isPrivate(name)) continue;

      if (spec.startsWith('catalog:')) {
        if (spec !== 'catalog:' && spec !== 'catalog:default') {
          throw new Error(`${name} uses the named catalog "${spec}", which the template does not resolve.`);
        }

        const version = catalog[name];
        if (!version) throw new Error(`${name} uses "${spec}" but the workspace catalog has no entry for it.`);

        next[name] = version;
        continue;
      }

      next[name] = spec;
    }

    prepared[field] = next;
  }

  // SAFETY: only the dependency fields changed, and each kept its record shape.
  return prepared as T;
}
