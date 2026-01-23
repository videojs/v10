import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { useColorScheme } from '@/hooks';

export interface CodeBlockProps {
  code: string;
}

export function CodeBlock(props: CodeBlockProps): JSX.Element {
  const { code } = props;
  const [output, setOutput] = useState<string>('');
  const colorScheme = useColorScheme();

  useEffect(() => {
    codeToHtml(code, {
      theme: colorScheme === 'light' ? 'vitesse-light' : 'vitesse-dark',
      lang: 'javascript',
    }).then((result) => {
      setOutput(result);
    });
  }, [code, colorScheme]);

  return (
    <div dangerouslySetInnerHTML={{ __html: output }} className="h-full [&_pre]:rounded-lg [&_pre]:overflow-auto [&_pre]:h-full [&_pre]:w-0 [&_pre]:min-w-full font-mono text-sm *:p-3" />
  );
}
