import type { MarkdownHeading } from 'astro';
import debounce from 'just-debounce-it';
import throttle from 'just-throttle';
import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

/**
 * Find the first scrollable ancestor of an element
 */
export function getScrollParent(element: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflow = style.overflow;

    if (/auto|scroll/.test(overflow + overflowY)) {
      if (current.scrollHeight > current.clientHeight) {
        return current;
      }
    }
    current = current.parentElement;
  }
  return document.body;
}

/**
 * Check if an element is outside the visible bounds of its scroll container
 */
export function isElementOffscreen(element: HTMLElement, container: HTMLElement): boolean {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  const isAboveView = elementRect.top < containerRect.top;
  const isBelowView = elementRect.bottom > containerRect.bottom;

  return isAboveView || isBelowView;
}

/**
 * Filter headings by depth range
 */
export function filterHeadingsByDepth(
  headings: MarkdownHeading[],
  minDepth: number,
  maxDepth: number
): MarkdownHeading[] {
  return headings.filter((h) => h.depth >= minDepth && h.depth <= maxDepth);
}

/**
 * Navigate to a heading by scrolling it into view and updating the URL
 */
export function navigateToHeading(slug: string): void {
  const element = document.getElementById(slug);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    window.history.pushState({}, '', `#${slug}`);
  }
}

interface UseAutoScrollOptions {
  activeId: string;
  containerRef: RefObject<HTMLElement | null>;
}

/**
 * Auto-scrolls the active link into view when it becomes active and is offscreen
 */
export function useAutoScroll({ activeId, containerRef }: UseAutoScrollOptions) {
  useEffect(() => {
    if (!activeId || !containerRef.current) return;

    const activeLink = containerRef.current.querySelector<HTMLAnchorElement>(`a[href="#${activeId}"]`);
    if (!activeLink) return;

    const scrollParent = getScrollParent(containerRef.current);
    if (!scrollParent) return;

    if (isElementOffscreen(activeLink, scrollParent)) {
      activeLink.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeId, containerRef]);
}

/**
 * Tracks which heading is currently active based on scroll position
 */
export function useActiveHeading(headings: MarkdownHeading[]): string {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      // globals.css SHOULD define a scroll-margin-top for headings
      // let's get the value of that, here
      let scrollOffset = 125; // idk, a sensible default
      const idElement = document.querySelector('main [id]');
      if (idElement) {
        const computedStyle = getComputedStyle(idElement);
        const scrollMarginTop = computedStyle.scrollMarginTop;
        if (scrollMarginTop) {
          const parsed = Number.parseFloat(scrollMarginTop);
          if (!Number.isNaN(parsed)) scrollOffset = parsed;
        }
      }
      scrollOffset = scrollOffset + 1;
      const scrollPosition = window.scrollY + scrollOffset;

      // Find the last heading that's above the scroll position
      let currentActiveId = '';
      for (const heading of headings) {
        const element = document.getElementById(heading.slug);
        if (element) {
          const elementTop = element.offsetTop;
          if (elementTop <= scrollPosition) {
            currentActiveId = heading.slug;
          } else {
            break;
          }
        }
      }

      // since this function is mostly only called in events...
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setActiveId(currentActiveId);
    };

    // Throttle to limit how often it runs during scrolling
    const throttledHandleScroll = throttle(handleScroll, 100);
    // Debounce to ensure it runs after scrolling stops
    const debouncedHandleScroll = debounce(throttledHandleScroll, 50);

    // Set initial active heading
    handleScroll();

    // Add scroll listeners
    window.addEventListener('scroll', throttledHandleScroll);
    window.addEventListener('scroll', debouncedHandleScroll);

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      window.removeEventListener('scroll', debouncedHandleScroll);
    };
  }, [headings]);

  return activeId;
}
