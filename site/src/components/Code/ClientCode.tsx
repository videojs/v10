import { use } from 'react';
import type { BundledLanguage } from 'shiki';

import { getClientHighlighter } from './clientHighlighter';
import Shared from './Shared';

interface ClientCodeProps {
  code: string;
  focusLines?: readonly number[];
  lang: BundledLanguage;
}

/**
 * Uses `use()` instead of top-level `await` because top-level `await` causes Safari hydration errors when multiple
 * `client:idle` islands on the same Astro page share the module. https://github.com/withastro/astro/issues/10055
 *
 * There is deliberately no Suspense boundary here. React streams a completed boundary as a deferred `$RC(...)` script
 * once an island passes its progressive chunk size, and Astro's router runs each inline script text only once per
 * session. Revisiting a page then leaves those boundaries pending until React discards the server HTML. The highlighter
 * is already settled during SSR, and a pending client render suspends the island root, which keeps the server HTML in
 * place while hydration waits.
 */
export default function ClientCode({ code, focusLines, lang }: ClientCodeProps) {
  const highlighter = use(getClientHighlighter());

  return <Shared code={code} focusLines={focusLines} lang={lang} highlighter={highlighter} />;
}
