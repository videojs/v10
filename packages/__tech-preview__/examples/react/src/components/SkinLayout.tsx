import type { ReactNode } from 'react';
import { CodeBlock } from './CodeBlock';
import { Tabs } from './Tabs';

export interface SkinLayoutProps {
  code: string;
  preview: ReactNode;
}

export function SkinLayout(props: SkinLayoutProps): JSX.Element {
  const { code, preview } = props;

  return (
    <Tabs.Root defaultValue="preview" className="h-full flex flex-col flex-1 max-w-5xl mx-auto py-8 gap-6">
      <Tabs.List className="justify-center">
        <Tabs.Tab value="preview">Preview</Tabs.Tab>
        <Tabs.Tab value="source">Source</Tabs.Tab>
        <Tabs.Indicator />
      </Tabs.List>

      <Tabs.Panel value="preview" className="flex-1 flex flex-col justify-center">
        {preview}
      </Tabs.Panel>
      <Tabs.Panel value="source" className="flex-1">
        <CodeBlock code={code} />
      </Tabs.Panel>
    </Tabs.Root>
  );
}
