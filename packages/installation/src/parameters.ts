export interface InstallationInput {
  method?: string;
  framework?: string;
  preset?: string;
  skin?: string;
  media?: string;
  sourceUrl?: string;
  packageManager?: string;
  template?: string;
  styling?: string;
}

export type InstallationInputKey = keyof InstallationInput;

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface InstallationParameter<Key extends InstallationInputKey = InstallationInputKey> {
  key: Key;
  flag: `--${string}`;
  query: string;
  private?: boolean;
}

/** Canonical mapping shared by CLI parsing, URL parsing, rendered instructions, and discovery output. */
export const INSTALLATION_PARAMETERS = Object.freeze([
  { key: 'method', flag: '--method', query: 'method' },
  { key: 'framework', flag: '--framework', query: 'framework' },
  { key: 'preset', flag: '--preset', query: 'preset' },
  { key: 'skin', flag: '--skin', query: 'skin' },
  { key: 'media', flag: '--media', query: 'media' },
  { key: 'sourceUrl', flag: '--source-url', query: 'source-url', private: true },
  { key: 'packageManager', flag: '--package-manager', query: 'package-manager' },
  { key: 'template', flag: '--template', query: 'template' },
  { key: 'styling', flag: '--styling', query: 'styling' },
] as const satisfies readonly InstallationParameter[]);

export function installationParameterForKey<Key extends InstallationInputKey>(
  key: Key
): Extract<(typeof INSTALLATION_PARAMETERS)[number], { key: Key }> {
  const parameter = INSTALLATION_PARAMETERS.find((candidate) => candidate.key === key);
  if (!parameter) throw new Error(`Unknown installation input: ${key}`);

  return parameter as Extract<(typeof INSTALLATION_PARAMETERS)[number], { key: Key }>;
}

export function installationInputKeyFromFlag(flag: string): InstallationInputKey | null {
  return INSTALLATION_PARAMETERS.find((parameter) => parameter.flag === flag)?.key ?? null;
}

export function installationInputKeyFromQuery(query: string): InstallationInputKey | null {
  return INSTALLATION_PARAMETERS.find((parameter) => parameter.query === query)?.key ?? null;
}

export const INSTALLATION_QUERY_PARAMETERS = Object.freeze(
  INSTALLATION_PARAMETERS.map(({ query }) => query)
) as readonly string[];

export const PRIVATE_INSTALLATION_QUERY_PARAMETERS = Object.freeze(
  INSTALLATION_PARAMETERS.filter((parameter) => 'private' in parameter && parameter.private).map(({ query }) => query)
) as readonly string[];
