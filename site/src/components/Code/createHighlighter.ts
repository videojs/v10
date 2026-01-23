import { createHighlighter as libCreateHighlighter } from 'shiki';
import gruvboxDarkSoft from 'shiki/themes/gruvbox-dark-soft.mjs';
import gruvboxLightHard from 'shiki/themes/gruvbox-light-hard.mjs';

export default function createHighlighter(config: Omit<Parameters<typeof libCreateHighlighter>[0], 'themes'>) {
  return libCreateHighlighter({
    ...config,
    themes: [gruvboxLightHard, gruvboxDarkSoft],
  });
}
