import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FooterEasterEgg from '../FooterEasterEgg';

type IOEntry = Pick<IntersectionObserverEntry, 'isIntersecting'>;
type IOCallback = (entries: IOEntry[]) => void;

interface FakeObserver {
  callback: IOCallback;
  target: Element | null;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  fire: (intersecting: boolean) => void;
}

const observers: FakeObserver[] = [];

class FakeIntersectionObserver {
  constructor(callback: IOCallback) {
    const self: FakeObserver = {
      callback,
      target: null,
      observe: vi.fn((el: Element) => {
        self.target = el;
      }),
      disconnect: vi.fn(),
      fire: (intersecting: boolean) => self.callback([{ isIntersecting: intersecting }]),
    };
    observers.push(self);
    Object.assign(this, self);
  }
}

let reducedMotion = false;

beforeEach(() => {
  observers.length = 0;
  reducedMotion = false;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('reduce') ? reducedMotion : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList
  );
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function getBottomObserver() {
  // The observers are created in source order: bottom first (the sentinel
  // observed by the second IntersectionObserver) is registered second in the
  // useEffect. We grab by target element class to be unambiguous.
  return observers.find((o) => o.target?.previousElementSibling != null);
}

function getTopObserver() {
  return observers.find((o) => o.target?.nextElementSibling != null);
}

function fireUserInput(type: 'wheel' | 'keydown' | 'pointerdown' = 'wheel') {
  act(() => {
    window.dispatchEvent(new Event(type));
  });
}

function getWrapper(container: HTMLElement) {
  // Wrapper is the second top-level child (between the two 1px sentinels).
  return container.children[1] as HTMLElement;
}

describe('FooterEasterEgg', () => {
  it('renders two sentinels around a hidden bars wrapper', () => {
    const { container } = render(<FooterEasterEgg />);
    expect(container.children).toHaveLength(3);
    const wrapper = getWrapper(container);
    expect(wrapper).toHaveClass('hidden', 'motion-reduce:block');
    expect(wrapper).not.toHaveClass('block');
  });

  it('forwards variant and className to the inner bars', () => {
    const { container } = render(<FooterEasterEgg variant="short" className="md:col-start-2" />);
    const bars = getWrapper(container).firstElementChild as HTMLElement;
    expect(bars).toHaveClass('h-25', 'md:col-start-2');
  });

  it('short-circuits when prefers-reduced-motion is set', () => {
    reducedMotion = true;
    const { container } = render(<FooterEasterEgg />);
    // Wrapper still uses motion-reduce:block so CSS shows the bars.
    expect(getWrapper(container)).toHaveClass('motion-reduce:block');
    // No observers attached; controller short-circuited.
    expect(observers).toHaveLength(0);
  });

  it('reveals the bars after a user input + bottom intersect + arm dwell', () => {
    const { container } = render(<FooterEasterEgg />);
    expect(getWrapper(container)).not.toHaveClass('block');

    // Simulate the user scrolling: input fires hasScrolled, then bottom
    // sentinel intersects, then dwell elapses.
    fireUserInput();
    act(() => getBottomObserver()?.fire(true));
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(getWrapper(container)).toHaveClass('block');
    expect(getWrapper(container)).not.toHaveClass('hidden');
  });

  it('does not arm without a user input even if bottom intersects', () => {
    const { container } = render(<FooterEasterEgg />);
    act(() => getBottomObserver()?.fire(true));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(getWrapper(container)).not.toHaveClass('block');
  });

  it('disconnects observers on unmount', () => {
    const { unmount } = render(<FooterEasterEgg />);
    const bottom = getBottomObserver();
    const top = getTopObserver();
    unmount();
    expect(bottom?.disconnect).toHaveBeenCalled();
    expect(top?.disconnect).toHaveBeenCalled();
  });
});
