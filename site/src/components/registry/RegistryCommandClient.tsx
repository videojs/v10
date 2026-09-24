import {
  type RegistryFramework,
  type RegistryPreset,
  type RegistryTheme,
  resolveRegistryStyling,
  type ShadcnRunner,
  shadcnAddCommand,
  shadcnRegistryAddCommand,
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

/** The Shadcn commands that configure the selected Video.js catalog and add its source files. */
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
  const command = (runner: ShadcnRunner) =>
    [
      shadcnRegistryAddCommand(runner, framework, styling, selectedTheme),
      ...(selectedItems.length > 0 ? [shadcnAddCommand(runner, selectedItems)] : []),
    ].join('\n');
  const commands = {
    npm: command('npm'),
    pnpm: command('pnpm'),
    yarn: command('yarn'),
    bun: command('bun'),
  };

  return <PackageManagerTabs commands={commands} />;
}
