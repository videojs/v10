import { useStore } from '@nanostores/react';

import ClientCode from '@/components/Code/ClientCode';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { registrySkin, registryStyling, registryTheme } from '@/stores/registry';
import {
  type RegistryFramework,
  type RegistryPreset,
  type RegistryTheme,
  registryInstallCommands,
  resolveRegistryStyling,
  SHADCN_RUNNER_NAMES,
  type ShadcnRunner,
} from '@/utils/installation/shadcn';

interface Props {
  /** Skin to add until the page's skin selector changes it. Omit for commands with fixed items. */
  defaultSkin?: RegistryPreset | undefined;
  /** Keep the supplied skin and theme fixed instead of following shared page selectors. */
  fixedSelection?: boolean | undefined;
  framework: RegistryFramework;
  /** Registry item names, without the `@videojs/` namespace. Empty registers the namespace and installs nothing. */
  items: readonly string[];
  /** Show one package manager instead of tabs, for pages that already asked. */
  runner?: ShadcnRunner | undefined;
  /** Theme to use until the page's theme selector changes it. */
  theme?: RegistryTheme | undefined;
}

/**
 * The Shadcn commands one install needs: `registry add` points the `@videojs` namespace at the styling catalog the
 * page's select box chose, then `add` installs the items.
 */
export default function RegistryCommandClient({
  defaultSkin,
  fixedSelection = false,
  framework,
  items,
  runner,
  theme = 'default',
}: Props) {
  const $skin = useStore(registrySkin);
  const $styling = useStore(registryStyling);
  const $theme = useStore(registryTheme);
  const selectedItems = defaultSkin ? [fixedSelection ? defaultSkin : ($skin ?? defaultSkin)] : items;
  const selectedTheme = fixedSelection ? theme : ($theme ?? theme);
  const styling = resolveRegistryStyling(framework, $styling);
  const runners: readonly ShadcnRunner[] = runner ? [runner] : SHADCN_RUNNER_NAMES;

  return (
    <TabsRoot>
      <TabsList label="Package manager">
        {runners.map((candidate, index) => (
          <Tab key={candidate} value={candidate} initial={index === 0}>
            {candidate}
          </Tab>
        ))}
      </TabsList>
      {runners.map((candidate, index) => (
        <TabsPanel key={candidate} value={candidate} initial={index === 0}>
          <ClientCode
            code={registryInstallCommands(candidate, framework, styling, selectedItems, selectedTheme)}
            lang="bash"
          />
        </TabsPanel>
      ))}
    </TabsRoot>
  );
}
