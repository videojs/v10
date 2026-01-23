import type { MarkdownHeading } from 'astro';
import clsx from 'clsx';
import { useRef } from 'react';
import { useAutoScroll } from './utils';

interface TableOfContentsDesktopProps {
  headings: MarkdownHeading[];
  activeId: string;
  onNavigate: (slug: string) => void;
  className?: string;
}

export function TableOfContentsDesktop({ headings, activeId, onNavigate, className }: TableOfContentsDesktopProps) {
  const navRef = useRef<HTMLElement>(null);

  useAutoScroll({ activeId, containerRef: navRef });

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    onNavigate(slug);
  };

  return (
    <nav ref={navRef} className={clsx('', className)}>
      <div className="py-8 pr-6">
        <h2 className="text-sm mb-3 font-semibold">On this page</h2>
        <ul className="space-y-3">
          {headings.map((heading) => (
            <li key={heading.slug}>
              <a
                href={`#${heading.slug}`}
                onClick={(e) => handleClick(e, heading.slug)}
                className={clsx(
                  'text-sm block',
                  activeId === heading.slug
                    ? 'text-dark-100 dark:text-light-100'
                    : 'text-dark-40 dark:text-light-40 intent:text-dark-100 dark:intent:text-light-100'
                )}
                style={{ paddingLeft: `calc(${heading.depth - 2} * var(--spacing) * 4)` }}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
