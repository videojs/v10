import type { SelectOption } from '@/components/Select';
import type { InstallMethod } from '@/utils/installation/types';

export const INSTALL_METHOD_LABELS: Record<InstallMethod, string> = {
  cdn: 'CDN',
  npm: 'npm',
  pnpm: 'pnpm',
  yarn: 'yarn',
  bun: 'bun',
};

const PACKAGE_MANAGERS: InstallMethod[] = ['npm', 'pnpm', 'yarn', 'bun'];

// CDN is listed first when available — HTML-only, and only for renderers that
// ship a CDN build. The caller decides availability (the install page from the
// cdn-media manifest, the CLI from framework + manifest) so this stays pure.
export function buildOptions({ includeCdn }: { includeCdn: boolean }): SelectOption<InstallMethod>[] {
  const methods: InstallMethod[] = includeCdn ? ['cdn', ...PACKAGE_MANAGERS] : PACKAGE_MANAGERS;
  return methods.map((value) => ({ value, label: INSTALL_METHOD_LABELS[value] }));
}
