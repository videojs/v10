import { describe, expect, it, vi } from 'vitest';
import { isEventWithinElement } from '../event';

describe('isEventWithinElement', () => {
  it('returns true when the event path contains the element', () => {
    const element = document.createElement('div');
    const event = new Event('scroll');
    vi.spyOn(event, 'composedPath').mockReturnValue([document.createElement('span'), element, document]);

    expect(isEventWithinElement(event, element)).toBe(true);
  });

  it('returns false when the event path does not contain the element', () => {
    const element = document.createElement('div');
    const event = new Event('scroll');
    vi.spyOn(event, 'composedPath').mockReturnValue([document.createElement('span'), document]);

    expect(isEventWithinElement(event, element)).toBe(false);
  });

  it('falls back to target containment when composedPath is unavailable', () => {
    const element = document.createElement('div');
    const child = document.createElement('span');
    element.append(child);

    const event = new Event('scroll');
    Object.defineProperty(event, 'target', { value: child });
    Object.defineProperty(event, 'composedPath', { value: undefined });

    expect(isEventWithinElement(event, element)).toBe(true);
  });
});
