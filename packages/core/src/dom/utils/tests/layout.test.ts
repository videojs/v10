import { describe, expect, it, vi } from 'vitest';
import { createDOMRect, getPositioningBoundaryRect, intersectDOMRects, resolvePositioningBoundary } from '../layout';

describe('createDOMRect', () => {
  it('creates a DOMRect-like object from position and size', () => {
    const rect = createDOMRect(10, 20, 30, 40);

    expect(rect.left).toBe(10);
    expect(rect.top).toBe(20);
    expect(rect.right).toBe(40);
    expect(rect.bottom).toBe(60);
    expect(rect.toJSON()).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      top: 20,
      right: 40,
      bottom: 60,
      left: 10,
    });
  });
});

describe('intersectDOMRects', () => {
  it('returns the overlapping region of two rects', () => {
    const rect = intersectDOMRects(createDOMRect(0, 0, 300, 200), createDOMRect(250, 150, 100, 100));

    expect(rect.left).toBe(250);
    expect(rect.top).toBe(150);
    expect(rect.width).toBe(50);
    expect(rect.height).toBe(50);
  });

  it('clamps non-overlapping dimensions to zero', () => {
    const rect = intersectDOMRects(createDOMRect(0, 0, 100, 100), createDOMRect(200, 200, 100, 100));

    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });
});

describe('getPositioningBoundaryRect', () => {
  it('returns the viewport rect without an element boundary', () => {
    const viewportRect = createDOMRect(0, 0, 300, 200);
    const viewportSpy = vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue(viewportRect);

    expect(getPositioningBoundaryRect()).toBe(viewportRect);

    viewportSpy.mockRestore();
  });

  it('intersects element boundaries with the viewport', () => {
    const boundary = document.createElement('div');
    const viewportSpy = vi
      .spyOn(document.documentElement, 'getBoundingClientRect')
      .mockReturnValue(createDOMRect(0, 0, 300, 200));
    const boundarySpy = vi.spyOn(boundary, 'getBoundingClientRect').mockReturnValue(createDOMRect(250, 150, 100, 100));

    const rect = getPositioningBoundaryRect(boundary);

    expect(rect.left).toBe(250);
    expect(rect.top).toBe(150);
    expect(rect.width).toBe(50);
    expect(rect.height).toBe(50);

    viewportSpy.mockRestore();
    boundarySpy.mockRestore();
  });
});

describe('resolvePositioningBoundary', () => {
  it('returns null for the viewport boundary', () => {
    expect(resolvePositioningBoundary(undefined)).toBeNull();
    expect(resolvePositioningBoundary('viewport')).toBeNull();
  });

  it('returns the provided container for the container boundary', () => {
    const container = document.createElement('div');

    expect(resolvePositioningBoundary('container', { container })).toBe(container);
  });

  it('returns element boundaries directly', () => {
    const boundary = document.createElement('div');

    expect(resolvePositioningBoundary(boundary)).toBe(boundary);
  });

  it('resolves selector boundaries from the provided root', () => {
    const root = document.createElement('div');
    const boundary = document.createElement('div');
    boundary.className = 'boundary';
    root.append(boundary);

    expect(resolvePositioningBoundary('.boundary', { root })).toBe(boundary);
  });

  it('returns null for invalid selector boundaries', () => {
    expect(resolvePositioningBoundary('[')).toBeNull();
  });
});
