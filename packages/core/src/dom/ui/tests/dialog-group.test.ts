import { describe, expect, it, vi } from 'vite-plus/test';

import { createDialogGroup } from '../dialog-group';

describe('createDialogGroup', () => {
  it('closes the previous dialog and carries its focus-restoration target forward', () => {
    const group = createDialogGroup();
    const focusTarget = document.createElement('button');
    const first = { closeForGroup: vi.fn(() => focusTarget) };
    const second = { closeForGroup: vi.fn(() => null) };

    expect(group.open(first)).toBeNull();
    expect(group.open(second)).toBe(focusTarget);
    expect(first.closeForGroup).toHaveBeenCalledOnce();
  });

  it('does not close a member after it leaves the group', () => {
    const group = createDialogGroup();
    const first = { closeForGroup: vi.fn(() => null) };
    const second = { closeForGroup: vi.fn(() => null) };

    group.open(first);
    group.close(first);
    group.open(second);

    expect(first.closeForGroup).not.toHaveBeenCalled();
  });
});
