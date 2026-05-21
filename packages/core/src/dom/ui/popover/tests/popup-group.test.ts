import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPopupGroup, getSharedMenuPopupGroup, resetSharedMenuPopupGroupForTests } from '../popup-group';

afterEach(() => {
  resetSharedMenuPopupGroupForTests();
});

describe('getSharedMenuPopupGroup', () => {
  it('returns the same instance across calls', () => {
    expect(getSharedMenuPopupGroup()).toBe(getSharedMenuPopupGroup());
  });

  it('is distinct from a freshly created group', () => {
    expect(getSharedMenuPopupGroup()).not.toBe(createPopupGroup());
  });
});

describe('createPopupGroup', () => {
  it('closes the previously open member when another opens', () => {
    const group = createPopupGroup();
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    const first = { close: closeFirst };
    const second = { close: closeSecond };

    group.open(first);
    closeFirst.mockClear();

    group.open(second);

    expect(closeFirst).toHaveBeenCalledWith('group-open');
    expect(closeSecond).not.toHaveBeenCalled();
  });

  it('does not close when the same member opens twice', () => {
    const group = createPopupGroup();
    const close = vi.fn();
    const member = { close };

    group.open(member);
    close.mockClear();
    group.open(member);

    expect(close).not.toHaveBeenCalled();
  });

  it('allows a new member to open after the current member closes', () => {
    const group = createPopupGroup();
    const closeA = vi.fn();
    const closeB = vi.fn();
    const a = { close: closeA };
    const b = { close: closeB };

    group.open(a);
    group.close(a);
    closeB.mockClear();
    group.open(b);

    expect(closeB).not.toHaveBeenCalled();
    expect(closeA).not.toHaveBeenCalled();
  });

  it('tracks member triggers for peer detection', () => {
    const group = createPopupGroup();
    const a = document.createElement('button');
    const b = document.createElement('button');
    group.addMemberTrigger(a);
    const unregB = group.addMemberTrigger(b);

    expect(group.pathHasPeerMemberTrigger([b], a)).toBe(true);
    expect(group.pathHasPeerMemberTrigger([b], b)).toBe(false);
    expect(group.pathHasPeerMemberTrigger([document.body], a)).toBe(false);

    unregB();
    expect(group.pathHasPeerMemberTrigger([b], a)).toBe(false);
  });

  it('detects peer triggers for focus-restore suppression', () => {
    const group = createPopupGroup();
    const a = document.createElement('button');
    const b = document.createElement('button');
    group.addMemberTrigger(a);
    group.addMemberTrigger(b);

    expect(group.isPeerTrigger(b, a)).toBe(true);
    expect(group.isPeerTrigger(a, a)).toBe(false);
    expect(group.isPeerTrigger(null, a)).toBe(false);
  });
});
