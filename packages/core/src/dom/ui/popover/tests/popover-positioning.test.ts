import { describe, expect, it, vi } from 'vitest';
import { PopoverCSSVars } from '../../../../core/ui/popover/popover-css-vars';
import {
  getAnchorNameStyle,
  getAnchorPositionStyle,
  getManualPositionStyle,
  getPopoverCSSVars,
  type ManualOffsets,
} from '../popover-positioning';

// Mock supportsAnchorPositioning for deterministic tests.
vi.mock('@videojs/utils/dom', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    supportsAnchorPositioning: vi.fn(() => false),
  };
});

function makeDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON() {},
  };
}

describe('getManualPositionStyle', () => {
  const trigger = makeDOMRect(100, 200, 120, 40);
  const popup = makeDOMRect(0, 0, 200, 80);

  it('positions above trigger for side=top', () => {
    const style = getManualPositionStyle(trigger, popup, { side: 'top', align: 'center' });

    // top = trigger.top - popup.height = 200 - 80 = 120
    expect(style.top).toBe('120px');
    // left = trigger.left + (trigger.width - popup.width)/2 = 100 + (120-200)/2 = 60
    expect(style.left).toBe('60px');
  });

  it('positions below trigger for side=bottom', () => {
    const style = getManualPositionStyle(trigger, popup, { side: 'bottom', align: 'center' });

    // top = trigger.bottom = 240
    expect(style.top).toBe('240px');
  });

  it('positions to the left of trigger for side=left', () => {
    const style = getManualPositionStyle(trigger, popup, { side: 'left', align: 'center' });

    // left = trigger.left - popup.width = 100 - 200 = -100
    expect(style.left).toBe('-100px');
  });

  it('positions to the right of trigger for side=right', () => {
    const style = getManualPositionStyle(trigger, popup, { side: 'right', align: 'center' });

    // left = trigger.right = 220
    expect(style.left).toBe('220px');
  });

  it('applies sideOffset from resolved CSS vars', () => {
    const offsets: ManualOffsets = { sideOffset: 8, alignOffset: 0 };
    const style = getManualPositionStyle(trigger, popup, { side: 'top', align: 'center' }, offsets);

    // top = 200 - 80 - 8 = 112
    expect(style.top).toBe('112px');
  });

  it('applies sideOffset for bottom side', () => {
    const offsets: ManualOffsets = { sideOffset: 8, alignOffset: 0 };
    const style = getManualPositionStyle(trigger, popup, { side: 'bottom', align: 'center' }, offsets);

    // top = 240 + 8 = 248
    expect(style.top).toBe('248px');
  });

  it('aligns to start for horizontal sides', () => {
    const style = getManualPositionStyle(trigger, popup, { side: 'top', align: 'start' });

    // left = trigger.left = 100
    expect(style.left).toBe('100px');
  });

  it('aligns to end for horizontal sides', () => {
    const style = getManualPositionStyle(trigger, popup, { side: 'top', align: 'end' });

    // left = trigger.right - popup.width = 220 - 200 = 20
    expect(style.left).toBe('20px');
  });

  it('applies alignOffset from resolved CSS vars', () => {
    const offsets: ManualOffsets = { sideOffset: 0, alignOffset: 10 };
    const style = getManualPositionStyle(trigger, popup, { side: 'top', align: 'start' }, offsets);

    // left = trigger.left + alignOffset = 100 + 10 = 110
    expect(style.left).toBe('110px');
  });

  it('aligns vertically for left/right sides', () => {
    const style = getManualPositionStyle(trigger, popup, { side: 'right', align: 'start' });

    // top = trigger.top = 200
    expect(style.top).toBe('200px');
  });
});

describe('getPopoverCSSVars', () => {
  const boundary = makeDOMRect(0, 0, 800, 600);
  const trigger = makeDOMRect(100, 200, 120, 40);

  it('includes anchor dimensions', () => {
    const vars = getPopoverCSSVars(trigger, boundary, 'top');

    expect(vars[PopoverCSSVars.anchorWidth]).toBe('120px');
    expect(vars[PopoverCSSVars.anchorHeight]).toBe('40px');
  });

  it('computes available height for top side', () => {
    const vars = getPopoverCSSVars(trigger, boundary, 'top');

    // availableHeight = trigger.top - boundary.top = 200
    expect(vars[PopoverCSSVars.availableHeight]).toBe('200px');
    expect(vars[PopoverCSSVars.availableWidth]).toBe('800px');
  });

  it('computes available height for bottom side', () => {
    const vars = getPopoverCSSVars(trigger, boundary, 'bottom');

    // availableHeight = boundary.bottom - trigger.bottom = 600 - 240 = 360
    expect(vars[PopoverCSSVars.availableHeight]).toBe('360px');
  });

  it('computes available width for left side', () => {
    const vars = getPopoverCSSVars(trigger, boundary, 'left');

    // availableWidth = trigger.left - boundary.left = 100
    expect(vars[PopoverCSSVars.availableWidth]).toBe('100px');
    expect(vars[PopoverCSSVars.availableHeight]).toBe('600px');
  });

  it('computes available width for right side', () => {
    const vars = getPopoverCSSVars(trigger, boundary, 'right');

    // availableWidth = boundary.right - trigger.right = 800 - 220 = 580
    expect(vars[PopoverCSSVars.availableWidth]).toBe('580px');
  });
});

describe('getAnchorNameStyle', () => {
  it('returns empty object when anchor positioning is not supported', () => {
    const style = getAnchorNameStyle('my-anchor');
    expect(style).toEqual({});
  });
});

describe('getAnchorPositionStyle', () => {
  it('returns empty object when anchor positioning unsupported and no rects', () => {
    const style = getAnchorPositionStyle('my-anchor', { side: 'top', align: 'center' });

    expect(style).toEqual({});
  });

  it('returns manual positioning when rects are provided and anchor unsupported', () => {
    const boundary = makeDOMRect(0, 0, 800, 600);
    const trigger = makeDOMRect(100, 200, 120, 40);
    const positioner = makeDOMRect(0, 0, 200, 80);

    const style = getAnchorPositionStyle('my-anchor', { side: 'top', align: 'center' }, trigger, positioner, boundary);

    expect(style.top).toBe('120px');
    expect(style.left).toBe('60px');
    expect(style.position).toBe('fixed');
    // Also includes sizing CSS vars
    expect(style[PopoverCSSVars.anchorWidth]).toBe('120px');
  });
});

// Tests the CSS anchor positioning path via getAnchorPositionStyle with
// a fresh module import where supportsAnchorPositioning returns true.
describe('getAnchorPositionStyle (CSS Anchor Positioning)', () => {
  const SIDE_VAR = 'var(--media-popover-side-offset, 0px)';
  const ALIGN_VAR = 'var(--media-popover-align-offset, 0px)';

  async function importWithAnchorSupport() {
    vi.resetModules();
    vi.doMock('@videojs/utils/dom', async (importOriginal) => {
      const original = (await importOriginal()) as Record<string, unknown>;
      return { ...original, supportsAnchorPositioning: () => true };
    });
    const mod = await import('../popover-positioning');
    return mod.getAnchorPositionStyle;
  }

  it('includes positionAnchor and position: fixed', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('my-popover', { side: 'top', align: 'center' });

    expect(style.positionAnchor).toBe('--my-popover');
    expect(style.position).toBe('fixed');
  });

  it('places popover above trigger for side=top using CSS var offset', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'top', align: 'center' });

    expect(style.bottom).toBe(`calc(anchor(top) + ${SIDE_VAR})`);
    expect(style.top).toBeUndefined();
    expect(style.justifySelf).toBe('anchor-center');
    expect(style.marginInlineStart).toBe(ALIGN_VAR);
  });

  it('places popover below trigger for side=bottom', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'bottom', align: 'center' });

    expect(style.top).toBe(`calc(anchor(bottom) + ${SIDE_VAR})`);
    expect(style.bottom).toBeUndefined();
  });

  it('places popover to the left for side=left', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'left', align: 'center' });

    expect(style.right).toBe(`calc(anchor(left) + ${SIDE_VAR})`);
    expect(style.left).toBeUndefined();
  });

  it('places popover to the right for side=right', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'right', align: 'center' });

    expect(style.left).toBe(`calc(anchor(right) + ${SIDE_VAR})`);
    expect(style.right).toBeUndefined();
  });

  it('aligns to start with CSS var offset for top/bottom sides', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'top', align: 'start' });

    expect(style.left).toBe(`calc(anchor(left) + ${ALIGN_VAR})`);
    expect(style.right).toBeUndefined();
  });

  it('aligns to end with CSS var offset for top/bottom sides', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'bottom', align: 'end' });

    expect(style.right).toBe(`calc(anchor(right) + ${ALIGN_VAR})`);
    expect(style.left).toBeUndefined();
  });

  it('uses anchor-center and margin for center alignment', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'top', align: 'center' });

    expect(style.justifySelf).toBe('anchor-center');
    expect(style.marginInlineStart).toBe(ALIGN_VAR);
  });

  it('aligns vertically for left/right sides', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'left', align: 'start' });

    expect(style.top).toBe(`calc(anchor(top) + ${ALIGN_VAR})`);
  });

  it('uses alignSelf for center on left/right sides', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'right', align: 'center' });

    expect(style.alignSelf).toBe('anchor-center');
    expect(style.marginBlockStart).toBe(ALIGN_VAR);
  });
});
