import {
  type RegistryFramework,
  type RegistryPreset,
  type RegistryTheme,
  registryNamespaceConfig,
  resolveRegistryStyling,
  shadcnAddCommand,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import PackageManagerTabs from '@/components/installation/PackageManagerTabs';
import {
  useRegistrySkin,
  useRegistryStyling,
  useRegistryTheme,
} from '@/components/installation/useRegistryProjectFramework';

interface Props {
  /** Skin to add until the page's skin selector changes it. Omit for commands with fixed items. */
  defaultSkin?: RegistryPreset | undefined;
  /** Keep the supplied skin and theme fixed instead of following shared page selectors. */
  fixedSelection?: boolean | undefined;
  framework: RegistryFramework;
  /** Registry item names, without the `@videojs/` namespace. Empty registers the namespace and installs nothing. */
  items: readonly string[];
  /** Theme to use until the page's theme selector changes it. */
  theme?: RegistryTheme | undefined;
}

/**
 * The Shadcn configuration and command one install needs. The explicit `components.json` merge also replaces a
 * previously selected Video.js catalog instead of relying on Shadcn's add-only namespace command.
 */
export default function RegistryCommandClient({
  defaultSkin,
  fixedSelection = false,
  framework,
  items,
  theme = 'default',
}: Props) {
  const $skin = useRegistrySkin();
  const $styling = useRegistryStyling();
  const $theme = useRegistryTheme();
  const selectedItems = defaultSkin ? [fixedSelection ? defaultSkin : ($skin ?? defaultSkin)] : items;
  const selectedTheme = fixedSelection ? theme : ($theme ?? theme);
  const styling = resolveRegistryStyling(framework, $styling);
  const config = registryNamespaceConfig(framework, styling, selectedTheme);
  const commands = {
    npm: shadcnAddCommand('npm', selectedItems),
    pnpm: shadcnAddCommand('pnpm', selectedItems),
    yarn: shadcnAddCommand('yarn', selectedItems),
    bun: shadcnAddCommand('bun', selectedItems),
  };

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-p4 mb-2">
          Merge into <code>components.json</code>, replacing the existing <code>@videojs</code> value:
        </p>
        <ClientCode code={config} lang="json" />
      </div>
      <PackageManagerTabs commands={commands} />
    </div>
  );
}
