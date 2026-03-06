import type { MarkdownHeading } from 'astro';
import clsx from 'clsx';
import { Select } from '@/components/Select';

interface TableOfContentsMobileProps {
  headings: MarkdownHeading[];
  activeId: string;
  onNavigate: (slug: string) => void;
  className?: string;
}

export function TableOfContentsMobile({ headings, activeId, onNavigate, className }: TableOfContentsMobileProps) {
  const handleChange = (slug: string | null) => {
    if (slug) onNavigate(slug);
  };

  const options = [
    { value: null, label: 'On this page…' },
    ...headings.map((heading) => ({
      value: heading.slug,
      label: `${'\u00A0'.repeat((heading.depth - 2) * 2)}${heading.text}`,
    })),
  ];

  return (
    <div
      className={clsx(
        'border-y md:border-t-0 border-manila-75 dark:border-warm-gray bg-manila-light dark:bg-faded-black px-6 lg:px-12 flex items-center',
        className
      )}
      style={{ height: 'var(--mobile-toc-h)' }}
    >
      <div className="w-full max-w-3xl mx-auto">
        <Select
          value={activeId || null}
          onChange={handleChange}
          options={options}
          aria-label="Table of contents"
          className="w-full"
        />
      </div>
    </div>
  );
}
