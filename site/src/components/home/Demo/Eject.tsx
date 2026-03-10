import { useStore } from '@nanostores/react';
import { Tab, TabsList, TabsPanel, TabsRoot } from '@/components/Tabs';
import { framework, skin } from '@/stores/homePageDemos';

interface EjectDemoProps {
  className?: string;
  defaultHtmlCode: React.ReactNode;
  defaultHtmlCss: React.ReactNode;
  defaultReactCode: React.ReactNode;
  defaultReactCss: React.ReactNode;
  minimalHtmlCode: React.ReactNode;
  minimalHtmlCss: React.ReactNode;
  minimalReactCode: React.ReactNode;
  minimalReactCss: React.ReactNode;
}

export default function EjectDemo(props: EjectDemoProps) {
  const $framework = useStore(framework);
  const $skin = useStore(skin);

  const isHtml = $framework === 'html';
  const isDefault = $skin === 'default';

  const codeSlot = isHtml
    ? isDefault
      ? props.defaultHtmlCode
      : props.minimalHtmlCode
    : isDefault
      ? props.defaultReactCode
      : props.minimalReactCode;
  const cssSlot = isHtml
    ? isDefault
      ? props.defaultHtmlCss
      : props.minimalHtmlCss
    : isDefault
      ? props.defaultReactCss
      : props.minimalReactCss;

  const codeLabel = isHtml ? 'HTML' : 'React';

  return (
    <TabsRoot variant="expanded" key={`${$framework}-${$skin}`} className={props.className} maxWidth={false}>
      <TabsList variant="expanded" label={`${codeLabel} implementation`}>
        <Tab variant="expanded" value="code" initial>
          {codeLabel}
        </Tab>
        <Tab variant="expanded" value="css">
          CSS
        </Tab>
      </TabsList>
      <TabsPanel variant="expanded" value="code" initial className="bg-faded-black dark:bg-soot m-2.5 mt-0">
        {codeSlot}
      </TabsPanel>
      <TabsPanel variant="expanded" value="css" className="bg-faded-black dark:bg-soot m-2.5 mt-0">
        {cssSlot}
      </TabsPanel>
    </TabsRoot>
  );
}
