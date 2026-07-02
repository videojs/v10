import clsx from 'clsx';
import type { BundledLanguage, Highlighter } from 'shiki';
import { hastToHtml } from 'shiki';
import { shared } from '@/components/typography/styles';
import { shikiNotationTransformers } from '@/utils/shikiNotationTransformers';

export interface SharedProps {
  code: string;
  lang: BundledLanguage;
  highlighter: Highlighter;
}

interface Highlighted {
  html: string;
  preClassName: string | undefined;
  codeClassName: string | undefined;
}

// Build-time memo: identical (code, lang) pairs repeat across pages
// (e.g. the same ejected skin block on both /concepts/skins and
// /how-to/customize-skins). Shiki's codeToHast + hastToHtml is the
// dominant cost per ServerCode; caching the rendered output reuses
// it across every page in a single build.
const highlightCache = new Map<string, Highlighted>();

function highlight(code: string, lang: BundledLanguage, highlighter: Highlighter): Highlighted {
  const cacheKey = `${lang}\0${code}`;
  const cached = highlightCache.get(cacheKey);
  if (cached) return cached;

  const hast = highlighter.codeToHast(code, {
    lang,
    themes: {
      light: 'gruvbox-dark-hard',
      dark: 'gruvbox-dark-soft',
    },
    transformers: shikiNotationTransformers,
  });

  // shiki gives us a root > pre > code > text structure
  // since we want to define pre and code ourselves, let's extract the text
  let preProps: Record<string, unknown> = {};
  let codeProps: Record<string, unknown> = {};
  if (hast.type === 'root') {
    const pre = hast.children[0];
    if (pre && pre.type === 'element' && pre.tagName === 'pre') {
      preProps = pre.properties;
      const codeNode = pre.children[0];
      if (codeNode && codeNode.type === 'element' && codeNode.tagName === 'code') {
        codeProps = codeNode.properties;
        // everything looked as expected! Let's use the code's children as the new root
        hast.children = codeNode.children;
      }
    }
  }

  const result: Highlighted = {
    html: hastToHtml(hast),
    preClassName: preProps.class as string | undefined,
    codeClassName: codeProps.class as string | undefined,
  };
  highlightCache.set(cacheKey, result);
  return result;
}

export default function Shared({ code, lang, highlighter }: SharedProps) {
  const { html, preClassName, codeClassName } = highlight(code, lang, highlighter);

  return (
    <pre className={clsx(shared.pre, preClassName)}>
      <code className={clsx(shared.codeBlock, codeClassName)} dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
