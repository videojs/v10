import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDOMRect } from '../../../utils/layout';
import { PopupPositioner } from '../popup-positioner';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockRect(element: Element, left: number, top: number, width: number, height: number): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(createDOMRect(left, top, width, height));
}

describe('PopupPositioner', () => {
  it('positions immediately and restores authored popup styles on cleanup', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const trigger = document.createElement('button');
    const popup = document.createElement('div');
    popup.style.position = 'absolute';
    popup.style.top = '12px';

    mockRect(document.documentElement, 0, 0, 800, 600);
    mockRect(trigger, 100, 200, 120, 40);
    mockRect(popup, 0, 0, 200, 80);
    Object.defineProperty(popup, 'offsetWidth', { configurable: true, value: 200 });
    Object.defineProperty(popup, 'offsetHeight', { configurable: true, value: 80 });

    const positioner = new PopupPositioner();
    positioner.sync({
      anchorName: 'settings',
      position: { side: 'top', align: 'center' },
      trigger,
      popup,
    });

    expect(popup.style.position).toBe('fixed');
    expect(popup.style.top).toBe('auto');
    expect(popup.style.bottom).toBe('calc(100% - 200px)');
    expect(popup.style.left).toBe('60px');

    positioner.cleanup();

    expect(popup.style.position).toBe('absolute');
    expect(popup.style.top).toBe('12px');
    expect(popup.style.bottom).toBe('');
    expect(popup.style.left).toBe('');
  });

  it('shares resize tracking and batches follow-up measurements', () => {
    let resize: (() => void) | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    class MockResizeObserver {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe = observe;
      disconnect = disconnect;
    }

    let frameCallback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 1;
    });
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const trigger = document.createElement('button');
    const popup = document.createElement('div');
    mockRect(document.documentElement, 0, 0, 800, 600);
    mockRect(trigger, 100, 200, 120, 40);
    mockRect(popup, 0, 0, 200, 80);
    Object.defineProperty(popup, 'offsetWidth', { configurable: true, value: 200 });
    Object.defineProperty(popup, 'offsetHeight', { configurable: true, value: 80 });

    const onSideChange = vi.fn();
    const positioner = new PopupPositioner();
    positioner.sync({
      anchorName: 'settings',
      position: { side: 'top', align: 'center' },
      trigger,
      popup,
      onSideChange,
    });

    expect(onSideChange).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledTimes(2);

    resize?.();
    expect(requestFrame).toHaveBeenCalledTimes(1);
    frameCallback?.(0);
    expect(onSideChange).toHaveBeenCalledTimes(2);

    positioner.cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('remeasures when the position callback changes the popup size', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const trigger = document.createElement('button');
    const popup = document.createElement('div');
    let popupWidth = 200;

    mockRect(document.documentElement, 0, 0, 800, 600);
    mockRect(trigger, 100, 200, 120, 40);
    vi.spyOn(popup, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, popupWidth, 80));
    Object.defineProperty(popup, 'offsetWidth', { configurable: true, get: () => popupWidth });
    Object.defineProperty(popup, 'offsetHeight', { configurable: true, value: 80 });

    const onSideChange = vi.fn(() => {
      popupWidth = 100;
    });
    const positioner = new PopupPositioner();
    positioner.sync({
      anchorName: 'settings',
      position: { side: 'top', align: 'center' },
      trigger,
      popup,
      onSideChange,
    });

    expect(popup.style.left).toBe('110px');
    expect(onSideChange).toHaveBeenCalledOnce();
  });

  it('preserves consumer-authored and active popup anchor styles', async () => {
    vi.resetModules();
    vi.doMock('@videojs/utils/dom', async (importOriginal) => {
      const original = (await importOriginal()) as Record<string, unknown>;
      return { ...original, supportsAnchorPositioning: () => true };
    });
    const { PopupPositioner: AnchorPopupPositioner } = await import('../popup-positioner');
    vi.stubGlobal('ResizeObserver', undefined);

    const trigger = document.createElement('button');
    const popup = document.createElement('div');
    const secondPopup = document.createElement('div');
    trigger.style.setProperty('anchor-name', '--consumer');
    popup.style.setProperty('position-anchor', '--consumer-popup');
    mockRect(document.documentElement, 0, 0, 800, 600);
    mockRect(trigger, 100, 200, 120, 40);

    const positioner = new AnchorPopupPositioner();
    positioner.sync({
      anchorName: 'settings',
      position: { side: 'top', align: 'center' },
      trigger,
      popup,
    });

    expect(trigger.style.getPropertyValue('anchor-name')).toBe('--consumer, --settings');
    expect(popup.style.getPropertyValue('position-anchor')).toBe('--settings');

    const secondPositioner = new AnchorPopupPositioner();
    secondPositioner.sync({
      anchorName: 'tooltip',
      position: { side: 'top', align: 'center' },
      trigger,
      popup: secondPopup,
    });

    expect(trigger.style.getPropertyValue('anchor-name')).toBe('--consumer, --settings, --tooltip');

    positioner.cleanup();

    expect(trigger.style.getPropertyValue('anchor-name')).toBe('--consumer, --tooltip');

    secondPositioner.cleanup();

    expect(trigger.style.getPropertyValue('anchor-name')).toBe('--consumer');
    expect(popup.style.getPropertyValue('position-anchor')).toBe('--consumer-popup');
  });
});
