import {
  DEFAULT_REGISTRY_PRESET,
  defaultInstallationTemplate,
  installationProjectFiles,
  type RegistryFramework,
  registrySkinSelection,
  resolveInstallationTemplate,
  resolveRegistryStyling,
  shadcnProjectConfiguration,
  shadcnProjectSetup,
} from '@videojs/installation';

import {
  useInstallationTemplate,
  useRegistryFramework,
  useRegistryStyling,
} from '@/components/installation/useRegistryFramework';
import { useSelection } from '@/components/installation/useSelection';

import RegistryCommandClient from './RegistryCommandClient';

interface Props {
  framework: RegistryFramework;
}

/** The registry command for the skin the installation page's pickers chose. */
export default function InstallationRegistryCommandClient({ framework }: Props) {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const selectedFramework = useRegistryFramework(framework);
  const $template = useInstallationTemplate(defaultInstallationTemplate(selectedFramework));
  const template = resolveInstallationTemplate(selectedFramework, $template);
  const styling = resolveRegistryStyling(framework, useRegistryStyling());
  const projectFiles = installationProjectFiles(selectedFramework, template);
  const configuration = shadcnProjectConfiguration(selectedFramework, template, styling, projectFiles.componentsAlias);
  const selection = registrySkinSelection({ useCase: $useCase, skin: $skin });
  const command = (optionalInit: boolean) => (
    <RegistryCommandClient
      defaultSkin={selection?.item ?? DEFAULT_REGISTRY_PRESET}
      framework={framework}
      items={[]}
      optionalInit={optionalInit}
      theme={selection?.theme ?? 'default'}
    />
  );

  // Without a separate configuration step, the registry commands carry the optional init for an existing project.
  if (shadcnProjectSetup(configuration, 'existing') === 'init') {
    return (
      <>
        <div data-installation-project-content="new">{command(false)}</div>
        <div data-installation-project-content="existing">{command(true)}</div>
      </>
    );
  }

  return command(false);
}
