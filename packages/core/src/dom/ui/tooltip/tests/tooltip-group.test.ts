import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTooltipGroup } from '../tooltip-group';

describe('createTooltipGroup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes default delay and closeDelay', () => {
    const group = createTooltipGroup();

    expect(group.delay).toBe(600);
    expect(group.closeDelay).toBe(0);
  });

  it('accepts custom delay and closeDelay', () => {
    const group = createTooltipGroup({ delay: 300, closeDelay: 100 });

    expect(group.delay).toBe(300);
    expect(group.closeDelay).toBe(100);
  });

  it('should not skip delay initially', () => {
    const group = createTooltipGroup();

    expect(group.shouldSkipDelay()).toBe(false);
  });

  it('should skip delay after a tooltip closes', () => {
    const group = createTooltipGroup({ timeout: 400 });

    group.notifyOpen();
    group.notifyClose();

    expect(group.shouldSkipDelay()).toBe(true);
  });

  it('should not skip delay after timeout expires', () => {
    const group = createTooltipGroup({ timeout: 400 });

    group.notifyOpen();
    group.notifyClose();

    vi.advanceTimersByTime(400);

    expect(group.shouldSkipDelay()).toBe(false);
  });

  it('clears pending timeout on notifyOpen', () => {
    const group = createTooltipGroup({ timeout: 400 });

    group.notifyOpen();
    group.notifyClose();
    // A new tooltip opens before timeout expires
    group.notifyOpen();

    expect(group.shouldSkipDelay()).toBe(false);
  });

  it('should not skip delay when a tooltip is currently open', () => {
    const group = createTooltipGroup();

    group.notifyOpen();

    expect(group.shouldSkipDelay()).toBe(false);
  });

  it('cleans up on destroy', () => {
    const group = createTooltipGroup({ timeout: 400 });

    group.notifyOpen();
    group.notifyClose();
    group.destroy();

    expect(group.shouldSkipDelay()).toBe(false);
  });

  it('ignores calls after destroy', () => {
    const group = createTooltipGroup();

    group.destroy();
    group.notifyOpen();
    group.notifyClose();

    expect(group.shouldSkipDelay()).toBe(false);
  });
});
