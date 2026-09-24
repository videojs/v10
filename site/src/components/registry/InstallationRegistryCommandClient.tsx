import {
  DEFAULT_REGISTRY_PRESET,
  defaultInstallationTemplate,
  installationProjectFiles,
  type RegistryFramework,
  registrySkinSelection,
  resolveInstallationTemplate,
  resolveRegistryStyling,
  shadcnProjectConfiguration,
  shadcnProjectConfigurationPlacement,
} from '@videojs/installation';

import {
  useInstallationTemplate,
  useRegistryProjectFramework,
  useRegistryStyling,
} from '@/components/installation/useRegistryProjectFramework';
import { useSelection } from '@/components/installation/useSelection';

import RegistryCommandClient from './RegistryCommandClient';

interface Props {
  framework: RegistryFramework;
}

/** The registry command for the skin the installation page's pickers chose. */
export default function InstallationRegistryCommandClient({ framework }: Props) {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const projectFramework = useRegistryProjectFramework(framework);
  const $template = useInstallationTemplate(defaultInstallationTemplate(projectFramework));
  const template = resolveInstallationTemplate(projectFramework, $template);
  const styling = resolveRegistryStyling(framework, useRegistryStyling());
  const projectFiles = installationProjectFiles(projectFramework, template);
  const configuration = shadcnProjectConfiguration(projectFramework, template, styling, projectFiles.componentsAlias);
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

  if (shadcnProjectConfigurationPlacement(configuration, 'existing') === 'registry') {
    return (
      <>
        <div data-installation-project-content="new">{command(false)}</div>
        <div data-installation-project-content="existing">{command(true)}</div>
      </>
    );
  }

  return command(false);
}
