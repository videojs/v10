import { DocSearch } from '@docsearch/react';
import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';

import { GITHUB_REPO_URL } from '@/consts';
import {
  DOCSEARCH_API_KEY,
  DOCSEARCH_APP_ID,
  DOCSEARCH_BLOG_INDEX,
  DOCSEARCH_CHANGELOG_INDEX,
  DOCSEARCH_DOCS_INDEX,
} from '@/search.config';
import { currentFramework } from '@/stores/preferences';
import { ANALYTICS_EVENTS, trackEvent } from '@/utils/analytics';

interface SearchProps {
  className?: string;
}

/**
 * Tags the portaled DocSearch modal for autocapture and reports when it opens.
 *
 * DocSearch exposes no open/close callbacks, and it portals the modal to `document.body`, outside this component's
 * markup — so the attributes cannot be written declaratively and the open has to be observed. Watching for the modal
 * element covers every entry point (button, `Ctrl/Cmd+K`, `/`) in one place. If DocSearch renames these classes the
 * events simply stop firing; nothing breaks.
 */
function useSearchModalAnalytics(): void {
  useEffect(() => {
    let modalObserver: MutationObserver | null = null;

    const tagModal = (container: HTMLElement) => {
      container.dataset.phCaptureAttributeLocation = 'search';

      const reportLink = container.querySelector<HTMLAnchorElement>('.DocSearch-NoResults-Help a');
      if (!reportLink) return;

      reportLink.dataset.phCaptureAttributeCta = 'report-search-issue';
      reportLink.dataset.phCaptureAttributeDestination = 'github';
    };

    const openObserver = new MutationObserver(() => {
      const container = document.querySelector<HTMLElement>('.DocSearch-Container');

      if (!container) {
        modalObserver?.disconnect();
        modalObserver = null;
        return;
      }

      if (modalObserver) return;

      trackEvent(ANALYTICS_EVENTS.searchOpened);
      tagModal(container);

      // The no-results screen mounts after the first query, so keep tagging while the modal is open.
      modalObserver = new MutationObserver(() => tagModal(container));
      modalObserver.observe(container, { childList: true, subtree: true });
    });

    openObserver.observe(document.body, { childList: true });

    return () => {
      openObserver.disconnect();
      modalObserver?.disconnect();
    };
  }, []);
}

export default function Search({ className }: SearchProps) {
  const framework = useStore(currentFramework);
  const reportedQueryRef = useRef<string | null>(null);

  useSearchModalAnalytics();

  // DocSearch calls this while rendering the "no results" screen, so it re-runs on every render of that screen.
  // Reporting once per query keeps one event per dead-end search rather than one per keystroke.
  const getMissingResultsUrl = ({ query }: { query: string }) => {
    if (reportedQueryRef.current !== query) {
      reportedQueryRef.current = query;
      trackEvent(ANALYTICS_EVENTS.searchNoResults, { query });
    }

    return `${GITHUB_REPO_URL}issues/new?title=${encodeURIComponent(`Search: no results for "${query}"`)}&labels=search`;
  };

  return (
    <div className={className} data-ph-capture-attribute-location="search">
      <DocSearch
        appId={DOCSEARCH_APP_ID}
        apiKey={DOCSEARCH_API_KEY}
        indices={[
          {
            name: DOCSEARCH_DOCS_INDEX,
            searchParameters: {
              facetFilters: framework ? [`framework:${framework}`] : [],
            },
          },
          {
            name: DOCSEARCH_BLOG_INDEX,
          },
          {
            name: DOCSEARCH_CHANGELOG_INDEX,
          },
        ]}
        getMissingResultsUrl={getMissingResultsUrl}
      />
    </div>
  );
}
