import {
  installationProjectCreateCommand,
  installationProjectFrameworkSetupCommand,
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
  const command = (packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun') =>
    part === 'create' && method === 'shadcn' && framework === 'react' && styling === 'tailwind'
      ? shadcnInitCommand(packageManager, template)
      : part === 'create'
        ? installationProjectCreateCommand(framework, template, packageManager)
        : installationProjectRunCommand(template, packageManager);
  const commands = {
    npm: command('npm'),
    pnpm: command('pnpm'),
    yarn: command('yarn'),
    bun: command('bun'),
  };

  if (part === 'create' && framework === 'react' && template === 'astro') {
    const existingCommands = {
      npm: installationProjectFrameworkSetupCommand(framework, template, 'npm'),
      pnpm: installationProjectFrameworkSetupCommand(framework, template, 'pnpm'),
      yarn: installationProjectFrameworkSetupCommand(framework, template, 'yarn'),
      bun: installationProjectFrameworkSetupCommand(framework, template, 'bun'),
    };

    return (
      <div className="grid gap-6">
        <PackageManagerTabs commands={commands} syncSelection />
        <div>
          <p className="text-p4 mb-2">
            Existing Astro app without React configured? Add the React integration instead of creating another app:
          </p>
          <PackageManagerTabs commands={existingCommands} syncSelection />
        </div>
      </div>
    );
  }

  return <PackageManagerTabs commands={commands} syncSelection />;
}
