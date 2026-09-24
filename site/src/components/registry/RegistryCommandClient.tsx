import {
  type RegistryFramework,
  type RegistryPreset,
  type RegistryTheme,
  optionalShadcnInitCommand,
  resolveRegistryStyling,
  shadcnAddCommand,
  shadcnRegistryAddCommand,
} from '@videojs/installation';

import { DynamicStep, DynamicSteps } from '@/components/docs/DynamicSteps';
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
  /** Initialize an existing compatible app first when it has no components config. */
  optionalInit?: boolean | undefined;
  /** Theme to use until the page's theme selector changes it. */
  theme?: RegistryTheme | undefined;
}

/** The Shadcn steps that configure the selected Video.js catalog and add its source files. */
export default function RegistryCommandClient({
  defaultSkin,
  fixedSelection = false,
  framework,
  items,
  optionalInit = false,
  theme = 'default',
}: Props) {
  const $skin = useRegistrySkin();
  const $styling = useRegistryStyling();
  const $theme = useRegistryTheme();
  const selectedItems = defaultSkin ? [fixedSelection ? defaultSkin : ($skin ?? defaultSkin)] : items;
  const selectedTheme = fixedSelection ? theme : ($theme ?? theme);
  const styling = resolveRegistryStyling(framework, $styling);
  const initCommands = optionalInit
    ? {
        npm: optionalShadcnInitCommand('npm'),
        pnpm: optionalShadcnInitCommand('pnpm'),
        yarn: optionalShadcnInitCommand('yarn'),
        bun: optionalShadcnInitCommand('bun'),
      }
    : null;
  const registryCommands = {
    npm: shadcnRegistryAddCommand('npm', framework, styling, selectedTheme),
    pnpm: shadcnRegistryAddCommand('pnpm', framework, styling, selectedTheme),
    yarn: shadcnRegistryAddCommand('yarn', framework, styling, selectedTheme),
    bun: shadcnRegistryAddCommand('bun', framework, styling, selectedTheme),
  };
  const addCommands = selectedItems.length
    ? {
        npm: shadcnAddCommand('npm', selectedItems),
        pnpm: shadcnAddCommand('pnpm', selectedItems),
        yarn: shadcnAddCommand('yarn', selectedItems),
        bun: shadcnAddCommand('bun', selectedItems),
      }
    : null;

  return (
    <DynamicSteps>
      {initCommands && (
        <DynamicStep number={1} title="Create components.json (optional)">
          <PackageManagerTabs commands={initCommands} />
        </DynamicStep>
      )}
      <DynamicStep number={initCommands ? 2 : 1} title="Add the Video.js Registry">
        <PackageManagerTabs commands={registryCommands} />
      </DynamicStep>
      {addCommands && (
        <DynamicStep number={initCommands ? 3 : 2} title="Add the skin source">
          <PackageManagerTabs commands={addCommands} />
        </DynamicStep>
      )}
    </DynamicSteps>
  );
}
