import clsx from 'clsx';
import type { BundledLanguage, Highlighter } from 'shiki';
import { hastToHtml } from 'shiki';

export interface SharedProps {
  code: string;
  lang: BundledLanguage;
  highlighter: Highlighter;
}

export default function Shared({ code, lang, highlighter }: SharedProps) {
  const hast = highlighter.codeToHast(code, {
    lang,
    themes: {
      light: 'gruvbox-light-hard',
      dark: 'gruvbox-dark-soft',
    },
  });

  // shiki gives us a root > pre > code > text structure
  // since we want to define pre and code ourselves, let's extract the text
  let preProps: Record<string, any> = {};
  let codeProps: Record<string, any> = {};
  if (hast.type === 'root') {
    const pre = hast.children[0];
    if (pre && pre.type === 'element' && pre.tagName === 'pre') {
      preProps = pre.properties;
      const code = pre.children[0];
      if (code && code.type === 'element' && code.tagName === 'code') {
        codeProps = code.properties;
        // everything looked as expected! Let's use the code's children as the new root
        hast.children = code.children;
      }
    }
  }

  const html = hastToHtml(hast);
  const { class: preClassName } = preProps;
  const { class: codeClassName } = codeProps;

  return (
    <pre className={clsx('shiki text-white', preClassName)}>
      <code className={clsx('font-mono text-code', codeClassName)} dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
