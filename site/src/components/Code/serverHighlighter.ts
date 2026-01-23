import { bundledLanguages } from 'shiki';
import createHighlighter from './createHighlighter';

const serverHighlighter = await createHighlighter({
  langs: Object.values(bundledLanguages),
});
// TODO memory leak?
export default serverHighlighter;
