import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { KeyboardEventHandler } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MenuBack } from '../menu-back';
import { MenuContent } from '../menu-content';
import { MenuItem } from '../menu-item';
import { MenuRoot } from '../menu-root';
import { MenuTrigger } from '../menu-trigger';
import { MenuView } from '../menu-view';

afterEach(cleanup);

function SubmenuFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <MenuView data-testid="root-view">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuBack data-testid="submenu-back">Back</MenuBack>
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
        </MenuView>
      </MenuContent>
    </MenuRoot>
  );
}

function SubmenuPropagationFixture({ onRootKeyDown }: { onRootKeyDown: KeyboardEventHandler<HTMLDivElement> }) {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content" onKeyDown={onRootKeyDown}>
        <MenuView data-testid="root-view">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
        </MenuView>
      </MenuContent>
    </MenuRoot>
  );
}

function SubmenuKeyboardFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <MenuView data-testid="root-view">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
          <MenuItem data-testid="root-item">Copy link</MenuItem>
        </MenuView>
      </MenuContent>
    </MenuRoot>
  );
}

function SubmenuSelectFixture({ onSelect }: { onSelect: () => void }) {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <MenuView data-testid="root-view">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuItem data-testid="submenu-item" onSelect={onSelect}>
                Auto
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </MenuView>
      </MenuContent>
    </MenuRoot>
  );
}

function SubmenuEscapeFixture({ onRootOpenChange }: { onRootOpenChange: (open: boolean) => void }) {
  return (
    <MenuRoot defaultOpen onOpenChange={onRootOpenChange}>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <MenuView data-testid="root-view">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
        </MenuView>
      </MenuContent>
    </MenuRoot>
  );
}

function NestedSubmenuFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <MenuView data-testid="root-view">
          <MenuRoot>
            <MenuTrigger data-testid="first-submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="first-submenu-content">
              <MenuView data-testid="first-submenu-view">
                <MenuRoot>
                  <MenuTrigger data-testid="second-submenu-trigger">Advanced</MenuTrigger>
                  <MenuContent data-testid="second-submenu-content">
                    <MenuItem data-testid="second-submenu-item">HDR</MenuItem>
                  </MenuContent>
                </MenuRoot>
              </MenuView>
            </MenuContent>
          </MenuRoot>
        </MenuView>
      </MenuContent>
    </MenuRoot>
  );
}

function ItemOrderFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="content">
        <MenuItem data-testid="first-item">Quality</MenuItem>
        <MenuItem data-testid="second-item">Speed</MenuItem>
        <MenuItem data-testid="third-item">Copy link</MenuItem>
      </MenuContent>
    </MenuRoot>
  );
}

describe('MenuContent', () => {
  it('marks the root view inactive while a submenu view is active', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-view').getAttribute('data-menu-view-state')).toBe('inactive');
    });
  });

  it('portals submenu content into the parent content viewport', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('submenu-content').parentElement).toBe(screen.getByTestId('root-content'));
    });
  });

  it('portals deeper submenu content into the active parent submenu viewport', async () => {
    render(<NestedSubmenuFixture />);

    fireEvent.click(screen.getByTestId('first-submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('first-submenu-content').parentElement).toBe(screen.getByTestId('root-content'));
    });

    fireEvent.click(screen.getByTestId('second-submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('second-submenu-content').parentElement).toBe(
        screen.getByTestId('first-submenu-content')
      );
      expect(screen.getByTestId('second-submenu-content').parentElement).not.toBe(
        screen.getByTestId('first-submenu-view')
      );
    });
  });

  it('marks root content and view with viewport data attributes', () => {
    render(<SubmenuFixture />);

    expect(screen.getByTestId('root-content').hasAttribute('data-menu-viewport')).toBe(true);
    expect(screen.getByTestId('root-view').hasAttribute('data-menu-root-view')).toBe(true);
    expect(screen.getByTestId('root-view').hasAttribute('data-menu-view')).toBe(true);
  });

  it('forces layout while the submenu starting style is applied', async () => {
    const startingStyleMeasurements: boolean[] = [];
    const getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRectMock() {
      if (this.hasAttribute('data-submenu')) {
        startingStyleMeasurements.push(this.hasAttribute('data-starting-style'));
      }

      return getBoundingClientRect.call(this);
    };

    try {
      render(<SubmenuFixture />);

      fireEvent.click(screen.getByTestId('submenu-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('submenu-content').hasAttribute('data-menu-view')).toBe(true);
        expect(startingStyleMeasurements).toContain(true);
      });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
    }
  });

  it('can reopen a submenu while its previous exit transition is pending', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await waitFor(() => {
      expect(screen.queryByTestId('submenu-content')).not.toBeNull();
    });

    fireEvent.click(screen.getByTestId('submenu-back'));
    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-view').getAttribute('data-menu-view-state')).toBe('inactive');
      expect(screen.getByTestId('submenu-content').hasAttribute('hidden')).toBe(false);
    });
  });

  it('handles keyboard navigation in the active submenu view', async () => {
    render(<SubmenuKeyboardFixture />);

    fireEvent.pointerEnter(screen.getByTestId('submenu-trigger'));
    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.queryByTestId('submenu-content')).not.toBeNull();
    });

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'ArrowDown' });

    expect(screen.getByTestId('submenu-item').hasAttribute('data-highlighted')).toBe(true);
    expect(screen.getByTestId('root-item').hasAttribute('data-highlighted')).toBe(false);
  });

  it('highlights the first item when a submenu view becomes active', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('submenu-item').hasAttribute('data-highlighted')).toBe(true);
    });
  });

  it('returns to the parent view when selecting an item in a submenu', async () => {
    const onSelect = vi.fn();

    render(<SubmenuSelectFixture onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-view').getAttribute('data-menu-view-state')).toBe('inactive');
    });

    fireEvent.click(screen.getByTestId('submenu-item'));

    expect(onSelect).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId('root-view').getAttribute('data-menu-view-state')).toBe('active');
    });
  });

  it('returns to the parent view without closing the root menu when Escape is pressed in a submenu', async () => {
    const onRootOpenChange = vi.fn();

    render(<SubmenuEscapeFixture onRootOpenChange={onRootOpenChange} />);
    onRootOpenChange.mockClear();

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-view').getAttribute('data-menu-view-state')).toBe('inactive');
    });

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByTestId('root-view').getAttribute('data-menu-view-state')).toBe('active');
    });

    expect(onRootOpenChange).not.toHaveBeenCalledWith(false, expect.anything());
    expect(screen.getByTestId('root-content').hasAttribute('data-open')).toBe(true);
  });

  it('only stops propagation for submenu-owned keyboard events', async () => {
    const onRootKeyDown = vi.fn();
    render(<SubmenuPropagationFixture onRootKeyDown={onRootKeyDown} />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.queryByTestId('submenu-content')).not.toBeNull();
    });

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'ArrowDown' });
    expect(onRootKeyDown).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'Tab' });
    expect(onRootKeyDown).toHaveBeenCalledTimes(1);
  });

  it('uses DOM order for keyboard navigation', () => {
    render(<ItemOrderFixture />);

    fireEvent.keyDown(screen.getByTestId('content'), { key: 'ArrowDown' });

    expect(screen.getByTestId('first-item').hasAttribute('data-highlighted')).toBe(true);
    expect(screen.getByTestId('third-item').hasAttribute('data-highlighted')).toBe(false);
  });
});
