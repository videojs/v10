import type { MarkdownHeading } from 'astro';
import { useMemo } from 'react';

import { TableOfContentsDesktop } from './TableOfContents.desktop';
import { TableOfContentsMobile } from './TableOfContents.mobile';
import { filterHeadingsForToc, navigateToHeading, useActiveHeading, useRenderedHeadings } from './utils';

interface TableOfContentsProps {
  headings: MarkdownHeading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const filteredHeadings = useMemo(() => filterHeadingsForToc(headings), [headings]);
  const renderedHeadings = useRenderedHeadings(filteredHeadings);
  const activeId = useActiveHeading(renderedHeadings);

  if (renderedHeadings.length === 0) {
    // Astro SSR logs false "Invalid hook call" when a React component with hooks returns null. See withastro/astro#12283.
    // oxlint-disable-next-line react/jsx-no-useless-fragment
    return <></>;
  }

  return (
    <>
      <TableOfContentsMobile
        headings={renderedHeadings}
        activeId={activeId}
        onNavigate={navigateToHeading}
        className="xl:hidden"
      />
      <TableOfContentsDesktop
        headings={renderedHeadings}
        activeId={activeId}
        onNavigate={navigateToHeading}
        className="hidden xl:block"
      />
    </>
  );
}
