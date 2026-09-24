import {
  generateHTMLUsageCode,
  installationHtmlEntrySetup,
  installationHtmlPageCode,
  installationProjectFiles,
} from '@videojs/installation';

import ClientCode from '@/components/Code/ClientCode';
import { focusLinesContaining } from '@/components/Code/focusLines';
import { DynamicStep, DynamicSteps } from '@/components/docs/DynamicSteps';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { shared } from '@/components/typography/styles';

import { useSelection } from './useSelection';

interface Props {
  installMethod?: 'cdn';
}

function CodeBlock({
  code,
  filename,
  focusLines,
  language,
}: {
  code: string;
  filename: string;
  focusLines?: readonly number[];
  language: 'html' | 'js' | 'json' | 'ts';
}) {
  return (
    <TabsRoot maxWidth={false}>
      <TabsList label="HTML implementation">
        <Tab value={filename} initial>
          {filename}
        </Tab>
      </TabsList>
      <TabsPanel value={filename} initial>
        <ClientCode code={code} focusLines={focusLines} lang={language} />
      </TabsPanel>
    </TabsRoot>
  );
}

export default function HTMLUsageCodeBlock({ installMethod }: Props) {
  const $useCase = useSelection('useCase');
  const $skin = useSelection('skin');
  const $renderer = useSelection('renderer');
  const selectedInstallMethod = useSelection('installMethod');
  const $sourceUrl = useSelection('sourceUrl');
  const $template = useSelection('template');
  const project = installationProjectFiles('html', $template);
  const method = installMethod ?? selectedInstallMethod;

  const result = generateHTMLUsageCode({
    useCase: $useCase,
    skin: $skin,
    renderer: $renderer,
    sourceUrl: $sourceUrl,
    installMethod: method,
  });
  const entrySetup = method === 'cdn' ? [] : installationHtmlEntrySetup($template, project.usage!);
  const html = method === 'cdn' ? result.html : installationHtmlPageCode(result.html, $template, project.usage!);

  if (method === 'cdn') return <CodeBlock code={html} filename={project.player} language="html" />;

  const steps = [
    ...entrySetup.map((block) => ({
      key: block.filename,
      title: `Configure ${block.filename}`,
      content: (
        <>
          <p className={`${shared.p} ${shared.prose}`}>
            Merge this entry into the existing configuration, keeping its other inputs, plugins, and options.
          </p>
          <CodeBlock
            code={block.code}
            filename={block.filename}
            focusLines={focusLinesContaining(block.code, [
              'import ',
              'plugins:',
              'input:',
              'laravel({',
              'resolve:',
              'alias:',
            ])}
            language={block.language}
          />
        </>
      ),
    })),
    ...(result.imports
      ? [
          {
            key: 'imports',
            title: 'Add the imports',
            content: <CodeBlock code={result.imports} filename={project.usage!} language="ts" />,
          },
        ]
      : []),
    {
      key: 'player',
      title: 'Add the player markup',
      content: <CodeBlock code={html} filename={project.player} language="html" />,
    },
  ];

  return (
    <DynamicSteps>
      {steps.map((step, index) => (
        <DynamicStep key={step.key} number={index + 1} title={step.title}>
          {step.content}
        </DynamicStep>
      ))}
    </DynamicSteps>
  );
}
