import { useStore } from '@nanostores/react';
import type { ReactNode } from 'react';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { framework, skin } from '@/stores/homePageDemos';

interface BaseDemoProps {
  className?: string;
  baseDefaultHtml: ReactNode;
  baseMinimalHtml: ReactNode;
  baseDefaultReact: ReactNode;
  baseMinimalReact: ReactNode;
}

export default function BaseDemo(props: BaseDemoProps) {
  const $framework = useStore(framework);
  const $skin = useStore(skin);

  const isHtml = $framework === 'html';
  const isDefault = $skin === 'default';

  const codeSlot = isHtml
    ? isDefault
      ? props.baseDefaultHtml
      : props.baseMinimalHtml
    : isDefault
      ? props.baseDefaultReact
      : props.baseMinimalReact;

  const codeLabel = isHtml ? 'HTML' : 'React';

  return (
    <TabsRoot variant="expanded" key={`${$framework}-${$skin}`} className={props.className} maxWidth={false}>
      <TabsList variant="expanded" label={`${codeLabel} implementation`}>
        <Tab variant="expanded" value="code" initial>
          {codeLabel}
        </Tab>
      </TabsList>
      <TabsPanel variant="expanded" value="code" initial className="bg-faded-black dark:bg-soot m-2.5 mt-0">
        {codeSlot}
      </TabsPanel>
    </TabsRoot>
  );
}
