import { DocSearch } from '@docsearch/react';
import { useStore } from '@nanostores/react';
import { GITHUB_REPO_URL } from '@/consts';
import { DOCSEARCH_API_KEY, DOCSEARCH_APP_ID, DOCSEARCH_BLOG_INDEX, DOCSEARCH_DOCS_INDEX } from '@/search.config';
import { currentFramework } from '@/stores/preferences';

interface SearchProps {
  className?: string;
}

export default function Search({ className }: SearchProps) {
  const framework = useStore(currentFramework);

  return (
    <div className={className}>
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
        ]}
        getMissingResultsUrl={({ query }) =>
          `${GITHUB_REPO_URL}issues/new?title=${encodeURIComponent(`Search: no results for "${query}"`)}&labels=search`
        }
      />
    </div>
  );
}
