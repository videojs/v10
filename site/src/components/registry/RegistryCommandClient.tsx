import {
  type RegistryFramework,
  type RegistryPreset,
  type RegistryTheme,
  registryInstallCommands,
  resolveRegistryStyling,
} from '@videojs/installation';

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
 * The Shadcn commands one install needs: `registry add` points the `@videojs` namespace at the styling catalog the
 * page's select box chose, then `add` installs the items. The package-manager tabs follow the installation page's other
 * command steps.
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
  const commands = {
    npm: registryInstallCommands('npm', framework, styling, selectedItems, selectedTheme),
    pnpm: registryInstallCommands('pnpm', framework, styling, selectedItems, selectedTheme),
    yarn: registryInstallCommands('yarn', framework, styling, selectedItems, selectedTheme),
    bun: registryInstallCommands('bun', framework, styling, selectedItems, selectedTheme),
  };

  return <PackageManagerTabs commands={commands} />;
}
