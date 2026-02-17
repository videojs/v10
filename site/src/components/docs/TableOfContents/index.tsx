import type { MarkdownHeading } from 'astro';
import { TableOfContentsDesktop } from './TableOfContents.desktop';
import { TableOfContentsMobile } from './TableOfContents.mobile';
import { filterHeadingsForToc, navigateToHeading, useActiveHeading } from './utils';

interface TableOfContentsProps {
  headings: MarkdownHeading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const filteredHeadings = filterHeadingsForToc(headings);
  const activeId = useActiveHeading(filteredHeadings);

  if (filteredHeadings.length === 0) {
    return null;
  }

  return (
    <>
      <TableOfContentsMobile
        headings={filteredHeadings}
        activeId={activeId}
        onNavigate={navigateToHeading}
        className="xl:hidden"
      />
      <TableOfContentsDesktop
        headings={filteredHeadings}
        activeId={activeId}
        onNavigate={navigateToHeading}
        className="hidden xl:block"
      />
    </>
  );
}
