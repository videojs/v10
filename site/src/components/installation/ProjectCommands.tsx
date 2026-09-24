import {
  installationProjectCreateCommand,
  installationProjectRunCommand,
  resolveRegistryStyling,
  shadcnInitCommand,
  type InstallationFramework,
  type InstallationTemplate,
} from '@videojs/installation';

import PackageManagerTabs from './PackageManagerTabs';
import { useRegistryStyling } from './useRegistryProjectFramework';
import { useSelection } from './useSelection';

interface Props {
  method?: 'shadcn';
  part: 'create' | 'run';
  serverFramework: InstallationFramework;
  serverTemplate: InstallationTemplate;
}

export default function ProjectCommands({ method, part, serverFramework, serverTemplate }: Props) {
  const framework = useSelection('framework', serverFramework);
  const template = useSelection('template', serverTemplate);
  const styling = resolveRegistryStyling(framework === 'react' ? 'react' : 'html', useRegistryStyling());

  const commandFor = (packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun') => {
    const value =
      part === 'create' && method === 'shadcn' && framework === 'react' && styling === 'tailwind'
        ? shadcnInitCommand(packageManager, template)
        : part === 'create'
          ? installationProjectCreateCommand(framework, template, packageManager)
          : installationProjectRunCommand(template, packageManager);
    if (!value) return '';

    return value;
  };
  const commands = {
    npm: commandFor('npm'),
    pnpm: commandFor('pnpm'),
    yarn: commandFor('yarn'),
    bun: commandFor('bun'),
  };

  if (template === 'none') return null;

  if (part === 'run') return <PackageManagerTabs commands={commands} syncSelection />;

  return (
    <>
      <div data-installation-project-content="new">
        <PackageManagerTabs commands={commands} syncSelection />
      </div>
      <div data-installation-project-content="existing" />
    </>
  );
}
