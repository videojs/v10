import { Dialog } from '@base-ui-components/react/dialog';
import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import { currentFramework, currentStyle } from '@/stores/preferences';

interface SearchProps {
  children: React.ReactNode;
  className?: string;
  baseUrl: string;
  bundlePath: string;
  searchId: string;
  searchStyle?: React.CSSProperties;
}
export default function Search({ children, className, baseUrl, bundlePath, searchId, searchStyle }: SearchProps) {
  const [open, setOpen] = useState(false);
  const framework = useStore(currentFramework);
  const style = useStore(currentStyle);
  const searchRef = useRef<HTMLDivElement>(null);

  // load Pagefind when opened
  useEffect(() => {
    if (!open) return;
    let search: any;
    const init = async () => {
      // default-ui is actually an ultra-lightweight svelte app
      // ...which we're loading in this react component, in an astro app.
      // this isn't relevant to dev. I just found it funny.
      const { PagefindUI } = await import('@pagefind/default-ui');
      // I'd love if we built our own ui with BaseUI/Autocomplete, but... time, ya know?
      search = new PagefindUI({
        element: `#${searchId}`,
        baseUrl,
        bundlePath,
        showImages: false,
        showSubResults: true,
        autofocus: true,
      });
      search.triggerFilters({
        framework: [framework],
        style: [style],
      });
    };
    init();
    return () => {
      search.destroy();
    };
  }, [baseUrl, bundlePath, framework, open, searchId, style]);

  // open with cmd+k or ctrl+k
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
      }}
      modal
    >
      <Dialog.Trigger aria-label="Search" className={className}>
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 flex items-start justify-center bg-dark-110/20 backdrop-blur-xs z-50">
          <Dialog.Popup
            initialFocus={false} // pagefind.autofocus = true
            id={searchId}
            ref={searchRef}
            className="w-full max-w-5xl mx-4 mb-4 p-4 rounded-3xl bg-light-80 dark:bg-dark-110 overflow-y-scroll overflow-x-hidden"
            style={{
              minHeight: '50svh',
              maxHeight: '75svh',
              marginTop: '12.5svh',
              ...searchStyle,
            }}
          />
        </Dialog.Backdrop>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
