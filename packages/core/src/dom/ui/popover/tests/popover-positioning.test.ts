import { describe, expect, it, vi } from 'vitest';
import { PopoverCSSVars } from '../../../../core/ui/popover/popover-css-vars';
import {
  getAnchorNameStyle,
  getAnchorPositionStyle,
  getManualPositionStyle,
  getPopoverCSSVars,
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
  const boundary = makeDOMRect(0, 0, 800, 600);
  const trigger = makeDOMRect(100, 200, 120, 40);
  const positioner = makeDOMRect(0, 0, 200, 80);

  it('positions above trigger for side=top', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'top',
      align: 'center',
      sideOffset: 0,
      alignOffset: 0,
    });

    // top = trigger.top - boundary.top - positioner.height - sideOffset = 200 - 0 - 80 - 0 = 120
    expect(style.top).toBe('120px');
    // left = trigger.left + (trigger.width - positioner.width)/2 = 100 + (120-200)/2 = 60
    expect(style.left).toBe('60px');
  });

  it('positions below trigger for side=bottom', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'bottom',
      align: 'center',
      sideOffset: 0,
      alignOffset: 0,
    });

    // top = trigger.bottom - boundary.top + sideOffset = 240 - 0 + 0 = 240
    expect(style.top).toBe('240px');
  });

  it('positions to the left of trigger for side=left', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'left',
      align: 'center',
      sideOffset: 0,
      alignOffset: 0,
    });

    // left = trigger.left - boundary.left - positioner.width - sideOffset = 100 - 0 - 200 - 0 = -100
    expect(style.left).toBe('-100px');
  });

  it('positions to the right of trigger for side=right', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'right',
      align: 'center',
      sideOffset: 0,
      alignOffset: 0,
    });

    // left = trigger.right - boundary.left + sideOffset = 220 - 0 + 0 = 220
    expect(style.left).toBe('220px');
  });

  it('applies sideOffset for top side', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'top',
      align: 'center',
      sideOffset: 8,
      alignOffset: 0,
    });

    // top = 200 - 0 - 80 - 8 = 112
    expect(style.top).toBe('112px');
  });

  it('applies sideOffset for bottom side', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'bottom',
      align: 'center',
      sideOffset: 8,
      alignOffset: 0,
    });

    // top = 240 - 0 + 8 = 248
    expect(style.top).toBe('248px');
  });

  it('aligns to start for horizontal sides', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'top',
      align: 'start',
      sideOffset: 0,
      alignOffset: 0,
    });

    // left = trigger.left - boundary.left + alignOffset = 100
    expect(style.left).toBe('100px');
  });

  it('aligns to end for horizontal sides', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'top',
      align: 'end',
      sideOffset: 0,
      alignOffset: 0,
    });

    // left = trigger.right - boundary.left - positioner.width = 220 - 0 - 200 = 20
    expect(style.left).toBe('20px');
  });

  it('applies alignOffset', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'top',
      align: 'start',
      sideOffset: 0,
      alignOffset: 10,
    });

    // left = trigger.left + alignOffset = 100 + 10 = 110
    expect(style.left).toBe('110px');
  });

  it('aligns vertically for left/right sides', () => {
    const style = getManualPositionStyle(trigger, positioner, boundary, {
      side: 'right',
      align: 'start',
      sideOffset: 0,
      alignOffset: 0,
    });

    // top = trigger.top - boundary.top + alignOffset = 200
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
    const style = getAnchorPositionStyle('my-anchor', {
      side: 'top',
      align: 'center',
      sideOffset: 0,
      alignOffset: 0,
    });

    expect(style).toEqual({});
  });

  it('returns manual positioning when rects are provided and anchor unsupported', () => {
    const boundary = makeDOMRect(0, 0, 800, 600);
    const trigger = makeDOMRect(100, 200, 120, 40);
    const positioner = makeDOMRect(0, 0, 200, 80);

    const style = getAnchorPositionStyle(
      'my-anchor',
      { side: 'top', align: 'center', sideOffset: 0, alignOffset: 0 },
      trigger,
      positioner,
      boundary
    );

    expect(style.top).toBe('120px');
    expect(style.left).toBe('60px');
    expect(style.position).toBe('absolute');
    // Also includes sizing CSS vars
    expect(style[PopoverCSSVars.anchorWidth]).toBe('120px');
  });
});

// Tests the CSS anchor positioning path via getAnchorPositionStyle with
// a fresh module import where supportsAnchorPositioning returns true.
describe('getAnchorPositionStyle (CSS Anchor Positioning)', () => {
  async function importWithAnchorSupport() {
    vi.resetModules();
    vi.doMock('@videojs/utils/dom', async (importOriginal) => {
      const original = (await importOriginal()) as Record<string, unknown>;
      return { ...original, supportsAnchorPositioning: () => true };
    });
    const mod = await import('../popover-positioning');
    return mod.getAnchorPositionStyle;
  }

  it('includes position-anchor and position: fixed', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('my-popover', { side: 'top', align: 'center', sideOffset: 0, alignOffset: 0 });

    expect(style['position-anchor']).toBe('--my-popover');
    expect(style.position).toBe('fixed');
  });

  it('places popover above trigger for side=top', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'top', align: 'center', sideOffset: 0, alignOffset: 0 });

    // bottom inset anchored to the trigger's top edge
    expect(style.bottom).toBe('anchor(top)');
    expect(style.top).toBeUndefined();
    expect(style['justify-self']).toBe('anchor-center');
  });

  it('places popover below trigger for side=bottom', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'bottom', align: 'center', sideOffset: 0, alignOffset: 0 });

    // top inset anchored to the trigger's bottom edge
    expect(style.top).toBe('anchor(bottom)');
    expect(style.bottom).toBeUndefined();
  });

  it('places popover to the left for side=left', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'left', align: 'center', sideOffset: 0, alignOffset: 0 });

    // right inset anchored to the trigger's left edge
    expect(style.right).toBe('anchor(left)');
    expect(style.left).toBeUndefined();
  });

  it('places popover to the right for side=right', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'right', align: 'center', sideOffset: 0, alignOffset: 0 });

    // left inset anchored to the trigger's right edge
    expect(style.left).toBe('anchor(right)');
    expect(style.right).toBeUndefined();
  });

  it('applies sideOffset for side=top', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'top', align: 'center', sideOffset: 8, alignOffset: 0 });

    expect(style.bottom).toBe('calc(anchor(top) + 8px)');
  });

  it('applies sideOffset for side=bottom', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'bottom', align: 'center', sideOffset: 8, alignOffset: 0 });

    expect(style.top).toBe('calc(anchor(bottom) + 8px)');
  });

  it('aligns to start for top/bottom sides', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'top', align: 'start', sideOffset: 0, alignOffset: 0 });

    expect(style.left).toBe('anchor(left)');
    expect(style.right).toBeUndefined();
  });

  it('aligns to end for top/bottom sides', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'bottom', align: 'end', sideOffset: 0, alignOffset: 0 });

    expect(style.right).toBe('anchor(right)');
    expect(style.left).toBeUndefined();
  });

  it('applies alignOffset for start alignment', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'top', align: 'start', sideOffset: 0, alignOffset: 4 });

    expect(style.left).toBe('calc(anchor(left) + 4px)');
  });

  it('applies center alignment with alignOffset via margin', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'top', align: 'center', sideOffset: 0, alignOffset: 6 });

    expect(style['justify-self']).toBe('anchor-center');
    expect(style['margin-inline-start']).toBe('6px');
  });

  it('aligns vertically for left/right sides', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'left', align: 'start', sideOffset: 0, alignOffset: 0 });

    expect(style.top).toBe('anchor(top)');
  });

  it('uses align-self for center on left/right sides', async () => {
    const getStyle = await importWithAnchorSupport();
    const style = getStyle('a', { side: 'right', align: 'center', sideOffset: 0, alignOffset: 0 });

    expect(style['align-self']).toBe('anchor-center');
  });
});
