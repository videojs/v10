import { createHighlighter as libCreateHighlighter } from 'shiki';
import gruvboxDarkHard from 'shiki/themes/gruvbox-dark-hard.mjs';
import gruvboxDarkSoft from 'shiki/themes/gruvbox-dark-soft.mjs';

export default function createHighlighter(config: Omit<Parameters<typeof libCreateHighlighter>[0], 'themes'>) {
  return libCreateHighlighter({
    ...config,
    themes: [gruvboxDarkHard, gruvboxDarkSoft],
  });
}
