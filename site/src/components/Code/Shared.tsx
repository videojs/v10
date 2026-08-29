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

export interface Highlighted {
  html: string;
  preClassName: string | undefined;
  codeClassName: string | undefined;
}

// Build-time memo: identical (code, lang) pairs repeat across pages
// (e.g. registry source reused by Skin and component reference pages).
// Shiki's codeToHast + hastToHtml is the
// dominant cost per ServerCode; caching the rendered output reuses
// it across every page in a single build.
const highlightCache = new Map<string, Highlighted>();

export function highlightCode(code: string, lang: BundledLanguage, highlighter: Highlighter): Highlighted {
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
  let preClassName: string | undefined;
  let codeClassName: string | undefined;

  if (hast.type === 'root') {
    const pre = hast.children[0];

    if (pre && pre.type === 'element' && pre.tagName === 'pre') {
      // SAFETY: Shiki emits the generated `class` property as a string on this known `pre` node.
      preClassName = pre.properties.class as string | undefined;
      const codeNode = pre.children[0];

      if (codeNode && codeNode.type === 'element' && codeNode.tagName === 'code') {
        // SAFETY: Shiki emits the generated `class` property as a string on this known `code` node.
        codeClassName = codeNode.properties.class as string | undefined;
        // everything looked as expected! Let's use the code's children as the new root
        hast.children = codeNode.children;
      }
    }
  }

  const result: Highlighted = {
    html: hastToHtml(hast),
    preClassName,
    codeClassName,
  };

  highlightCache.set(cacheKey, result);
  return result;
}

export default function Shared({ code, lang, highlighter }: SharedProps) {
  const { html, preClassName, codeClassName } = highlightCode(code, lang, highlighter);

  return (
    <pre className={clsx(shared.pre, preClassName)}>
      <code className={clsx(shared.codeBlock, codeClassName)} dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
