import {
  defaultInstallationTemplate,
  installationProjectFiles,
  resolveRegistryStyling,
  shadcnInitCommand,
  resolveInstallationTemplate,
  shadcnProjectConfiguration,
  type RegistryFramework,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { focusLinesContaining } from '@/components/Code/focusLines';
import { DynamicStep, DynamicSteps } from '@/components/docs/DynamicSteps';
import PackageManagerTabs from '@/components/installation/PackageManagerTabs';
import { useRegistryFramework, useRegistryStyling } from '@/components/installation/useRegistryFramework';
import { useSelection } from '@/components/installation/useSelection';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { shared } from '@/components/typography/styles';

interface Props {
  framework: RegistryFramework;
  installation: boolean;
}

function ConfigurationBlock({ block }: { block: { code: string; filename: string; language: 'js' | 'json' | 'ts' } }) {
  const focusLines = focusLinesContaining(block.code, [
    '"$schema"',
    '"paths"',
    '"@/*"',
    '"./src/*"',
    'resolve:',
    'alias:',
    "'@':",
    '"components"',
  ]);

  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="App configuration">
        <Tab value={block.filename} initial>
          {block.filename}
        </Tab>
      </TabsList>
      <TabsPanel value={block.filename} initial>
        <ClientCode code={block.code} focusLines={focusLines} lang={block.language} />
      </TabsPanel>
    </TabsRoot>
  );
}

export default function RegistryInitCommandClient({ framework, installation }: Props) {
  const selectedFramework = useRegistryFramework(framework);
  const $template = useSelection('template', defaultInstallationTemplate(selectedFramework));
  const template = resolveInstallationTemplate(selectedFramework, $template);
  const styling = resolveRegistryStyling(selectedFramework, useRegistryStyling());
  const project = installationProjectFiles(selectedFramework, template);
  const configuration = shadcnProjectConfiguration(selectedFramework, template, styling, project.componentsAlias);
  const aliasSteps = configuration.aliasSetup.map((block) => ({
    key: block.filename,
    title: `Configure ${block.filename}`,
    content: <ConfigurationBlock block={block} />,
  }));

  if (configuration.mode === 'shadcn-init') {
    return (
      <div data-installation-project-content="existing">
        <ConfigurationSteps configuration={configuration} installation={installation} steps={aliasSteps} />
      </div>
    );
  }

  return <ConfigurationSteps configuration={configuration} installation={installation} steps={aliasSteps} />;
}

function ConfigurationSteps({
  configuration,
  installation,
  steps: aliasSteps,
}: {
  configuration: ReturnType<typeof shadcnProjectConfiguration>;
  installation: boolean;
  steps: Array<{ content: React.ReactNode; key: string; title: string }>;
}) {
  const finalStep =
    configuration.mode === 'components-json'
      ? {
          key: 'components-json',
          title: 'Create components.json',
          content: (
            <ConfigurationBlock
              block={{ code: configuration.componentsConfig, filename: 'components.json', language: 'json' }}
            />
          ),
        }
      : {
          key: 'shadcn-init',
          title: 'Initialize Shadcn',
          content: (
            <PackageManagerTabs
              commands={{
                npm: shadcnInitCommand('npm'),
                pnpm: shadcnInitCommand('pnpm'),
                yarn: shadcnInitCommand('yarn'),
                bun: shadcnInitCommand('bun'),
              }}
              syncSelection={installation}
            />
          ),
        };
  const steps = [...aliasSteps, finalStep];
  const description = (
    <p className={`${shared.p} ${shared.prose} mx-auto max-w-3xl`}>
      If <code>components.json</code> already exists, keep its aliases and skip this section. Otherwise, complete the
      setup below. The registry uses <code>aliases.components</code> for skin source. In a monorepo, run commands from
      the app workspace or pass <code>--cwd &lt;path&gt;</code>.
    </p>
  );

  return (
    <>
      {description}
      {steps.length === 1 ? (
        <div className="mx-auto my-8 max-w-3xl">{steps[0]!.content}</div>
      ) : (
        <DynamicSteps>
          {steps.map((step, index) => (
            <DynamicStep key={step.key} number={index + 1} title={step.title}>
              {step.content}
            </DynamicStep>
          ))}
        </DynamicSteps>
      )}
    </>
  );
}
