/**
 * Accessible tabs component implementing the WAI-ARIA Tabs pattern.
 * Reference: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * Built without context, using some unusual patterns,
 * to work around some restrictions with Astro islands:
 * namely, that separate islands can't share context, and that,
 * depending on rendering context, Astro may render the component tree
 * bottom-up or top-down
 *
 * IMPORTANT: Use `client:idle` instead of `client:visible` when hydrating
 * these components. TabsPanel elements start with `hidden` attribute,
 * which prevents them from triggering Intersection Observer visibility,
 * causing `client:visible` to never hydrate non-initial panels.
 */

import clsx from 'clsx';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import useIsHydrated from '@/utils/useIsHydrated';

import CopyButton from './CopyButton';

interface TabsRootProps {
  children: React.ReactNode;
  maxWidth?: boolean;
  className?: string;
  id?: string;
}
export function TabsRoot({ children, maxWidth = true, className, id: propId }: TabsRootProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHydrated = useIsHydrated();
  /**
   * When this component initializes,
   * it generates an ID for itself, and then
   * uses that ID to
   * - set [role="tab"] ID
   * - set [role="tab"][aria-controls]
   * - set [role="tabpanel"] ID
   * - set [role="tabpanel"][aria-labelledby]
   *
   * This allows tabs and tabpanels to be associated
   * without relying on context or parent-child relationships,
   * as well as complying with WAI-ARIA authoring practices.
   */
  useEffect(() => {
    // I know this isHydrated check looks weird,
    // but it actually delays this effect until later,
    // giving tab and tabpanel elements time to mount.
    if (!isHydrated) return;
    const id = propId || new Date().getTime().toString();
    const tabs = ref.current?.querySelectorAll('[role="tab"]') || [];
    const panels = ref.current?.querySelectorAll('[role="tabpanel"]') || [];
    tabs.forEach((tab) => {
      const value = tab.getAttribute('data-value');
      tab.id = `tab-${id}-${value}`;
      tab.setAttribute('aria-controls', `panel-${id}-${value}`);
    });
    panels.forEach((panel) => {
      const value = panel.getAttribute('data-value');
      panel.id = `panel-${id}-${value}`;
      panel.setAttribute('aria-labelledby', `tab-${id}-${value}`);
    });
  }, [isHydrated, propId]);

  return (
    <div
      ref={ref}
      className={twMerge(
        clsx(
          'rounded-lg overflow-hidden border border-light-40 dark:border-dark-80',
          'bg-light-100 dark:bg-dark-110 flex flex-col',
          'my-6',
          maxWidth && 'w-full max-w-3xl mx-auto',
          className,
        ),
      )}
      data-tabs-root
    >
      {children}
    </div>
  );
}

interface TabsListProps {
  label: string;
  children: React.ReactNode;
}
export function TabsList({ label, children }: TabsListProps) {
  return (
    <div className="w-full border-b border-light-40 dark:border-dark-80 flex bg-light-80 dark:bg-dark-100 overflow-x-scroll not-content">
      <ul role="tablist" data-orientation="horizontal" aria-label={label} className="flex list-none p-0 m-0">
        {children}
      </ul>
      <CopyButton
        copyFrom={{
          container: `[data-tabs-root]`,
          target: '[role="tabpanel"]:not([hidden])',
        }}
        className="ml-auto sticky right-0 border-l border-light-40 dark:border-dark-80 h-9 w-9 flex items-center justify-center not-disabled:intent:bg-light-100 dark:not-disabled:intent:bg-dark-110 cursor-pointer disabled:cursor-wait"
        copied={<Check size={16} />}
      >
        <Copy size={16} />
      </CopyButton>
    </div>
  );
}

interface TabProps {
  value: string;
  children: React.ReactNode;
  initial?: boolean;
}
export function Tab({ value, children, initial }: TabProps) {
  const isHydrated = useIsHydrated();
  const ref = useRef<HTMLButtonElement>(null);
  const [isActive, setIsActive] = useState(initial);

  const onClick = () => {
    if (ref.current) {
      // set data-tab-active on this button to true
      ref.current.setAttribute('data-tab-active', 'true');
      // set data-tab-active on all sibling buttons to false
      const siblings = ref.current.closest('[data-tabs-root]')?.querySelectorAll('[role="tab"]') || [];
      siblings.forEach((sibling) => {
        if (sibling !== ref.current) {
          sibling.setAttribute('data-tab-active', 'false');
        }
      });
      // and each tab will handle updating its own React state with the effects below.
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Find all tab siblings within the tablist
    const tabsRoot = ref.current?.closest('[data-tabs-root]');
    const allTabs = Array.from(tabsRoot?.querySelectorAll('[role="tab"]') || []) as HTMLElement[];
    const currentIndex = allTabs.indexOf(ref.current!);

    if (currentIndex === -1) return;

    let targetIndex: number | null = null;

    switch (e.key) {
      case 'ArrowLeft':
        // Move to previous tab, wrap to last if at start
        targetIndex = currentIndex - 1;
        if (targetIndex < 0) targetIndex = allTabs.length - 1;
        break;
      case 'ArrowRight':
        // Move to next tab, wrap to first if at end
        targetIndex = currentIndex + 1;
        if (targetIndex >= allTabs.length) targetIndex = 0;
        break;
      case 'Home':
        // Jump to first tab
        targetIndex = 0;
        break;
      case 'End':
        // Jump to last tab
        targetIndex = allTabs.length - 1;
        break;
    }

    if (targetIndex !== null) {
      e.preventDefault();
      const targetTab = allTabs[targetIndex];

      // Activate the tab (reuse existing activation logic)
      targetTab.click();

      // Move focus to the tab
      targetTab.focus();
    }
  };

  // since we're communicating through the DOM, not through context,
  // we'll need to update isActive with a mutation observer
  // that observer will listen to data-tab-active
  useEffect(() => {
    // on mount, let's set the initial state of data-tab-active
    if (ref.current) {
      ref.current.setAttribute('data-tab-active', initial ? 'true' : 'false');
    }
  }, [initial]);
  useEffect(() => {
    // then, let's listen for the changes that our event handlers make
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-tab-active') {
          // Fix: mutation.target is Node, cast to Element to use getAttribute
          const target = mutation.target as Element;
          const newValue = target.getAttribute('data-tab-active') === 'true';
          setIsActive(newValue);
        }
      });
    });
    if (ref.current) {
      observer.observe(ref.current, { attributes: true });
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <li key={value} role="presentation" className="flex">
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={onClick}
        onKeyDown={onKeyDown}
        data-value={value}
        className={clsx(
          'flex items-center h-9 px-4 py-2 text-sm',
          'border-x border-light-40 dark:border-dark-80',
          'first:-ml-px last:-mr-px -mx-[0.5px] no-underline',
          isActive ? 'bg-light-100 dark:bg-dark-110' : 'bg-light-80 dark:bg-dark-100',
          isHydrated ? 'cursor-pointer intent:bg-light-100 dark:intent:bg-dark-110' : 'cursor-wait',
        )}
      >
        {children}
      </button>
    </li>
  );
}

interface TabsPanelProps {
  value: string;
  children: React.ReactNode;
  initial?: boolean;
  className?: string;
}
export function TabsPanel({ value, children, initial, className }: TabsPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(initial);

  // Observe the corresponding Tab element's data-tab-active attribute
  // to sync panel visibility with tab activation
  useEffect(() => {
    const tabsRoot = ref.current?.closest('[data-tabs-root]');
    const correspondingTab = tabsRoot?.querySelector(`[role="tab"][data-value="${value}"]`);

    if (!correspondingTab) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-tab-active') {
          const target = mutation.target as Element;
          const newValue = target.getAttribute('data-tab-active') === 'true';
          setIsActive(newValue);
        }
      });
    });

    observer.observe(correspondingTab, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, [value]);

  return (
    <div
      ref={ref}
      role="tabpanel"
      hidden={!isActive}
      data-value={value}
      className={twMerge(clsx('overflow-scroll p-6 max-h-96 flex-1'), className)}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
