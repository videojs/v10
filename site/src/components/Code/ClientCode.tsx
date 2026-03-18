import { Suspense, use } from 'react';
import type { BundledLanguage } from 'shiki';
import { shared } from '@/components/typography/styles';
import { getClientHighlighter } from './clientHighlighter';
import Shared from './Shared';

interface ClientCodeProps {
  code: string;
  lang: BundledLanguage;
}

function ClientCodeInner({ code, lang }: ClientCodeProps) {
  // React 19's `use()` hook can unwrap a Promise directly in render. When the
  // Promise is still pending, `use()` throws it to the nearest <Suspense>
  // boundary, which renders the fallback. Once resolved, React re-renders this
  // component with the resolved value. See clientHighlighter.ts for why
  // this is a Promise instead of a top-level await.
  const highlighter = use(getClientHighlighter());

  return <Shared code={code} lang={lang} highlighter={highlighter} />;
}

/**
 * Uses `use()` + Suspense instead of top-level `await` because top-level
 * `await` causes Safari hydration errors when multiple `client:idle` islands
 * on the same Astro page share the module.
 * https://github.com/withastro/astro/issues/10055
 *
 * The unhighlighted fallback is a safety net for the brief client hydration
 * gap — Astro's SSR awaits the full React stream, so the server-rendered
 * output already contains highlighted code.
 */
export default function ClientCode({ code, lang }: ClientCodeProps) {
  return (
    <Suspense
      fallback={
        <pre className={shared.pre}>
          <code className={shared.codeBlock}>{code}</code>
        </pre>
      }
    >
      <ClientCodeInner code={code} lang={lang} />
    </Suspense>
  );
}
