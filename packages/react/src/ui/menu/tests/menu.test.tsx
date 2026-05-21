import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { flush } from '@videojs/store';
import type { KeyboardEventHandler, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlsContextProvider } from '../../controls/context';
import { MenuBack } from '../menu-back';
import { MenuCheckboxItem } from '../menu-checkbox-item';
import { MenuContent } from '../menu-content';
import { MenuItem } from '../menu-item';
import { MenuRoot } from '../menu-root';
import { MenuTrigger } from '../menu-trigger';
import { MenuView } from '../menu-view';

afterEach(cleanup);

async function settleActiveSubmenuView(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flush();
        resolve();
      });
    });
  });
}

function PeerMenusWithSubmenuFixture({
  onSecondOpenChange,
}: {
  onSecondOpenChange?: (open: boolean, details: { reason: string }) => void;
}) {
  return (
    <>
      <MenuRoot defaultOpen>
        <MenuTrigger data-testid="peer-a-trigger">Menu A</MenuTrigger>
        <MenuContent data-testid="peer-a-content">
          <MenuView data-testid="peer-a-view">
            <MenuRoot>
              <MenuTrigger data-testid="peer-sub-trigger">Sub</MenuTrigger>
              <MenuContent data-testid="peer-sub-content">
                <MenuItem>Sub item</MenuItem>
              </MenuContent>
            </MenuRoot>
          </MenuView>
        </MenuContent>
      </MenuRoot>
      <MenuRoot {...(onSecondOpenChange ? { onOpenChange: onSecondOpenChange } : {})}>
        <MenuTrigger data-testid="peer-b-trigger">Menu B</MenuTrigger>
        <MenuContent data-testid="peer-b-content">
          <MenuItem data-testid="peer-b-item">Option</MenuItem>
        </MenuContent>
      </MenuRoot>
    </>
  );
}

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

function SubmenuPreventDefaultFixture({
  onSubmenuKeyDown,
}: {
  onSubmenuKeyDown: KeyboardEventHandler<HTMLDivElement>;
}) {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <MenuView data-testid="root-view">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content" onKeyDown={onSubmenuKeyDown}>
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
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

function SiblingSubmenuFixture({ onRootOpenChange }: { onRootOpenChange?: MenuRoot.Props['onOpenChange'] } = {}) {
  return (
    <MenuRoot defaultOpen {...(onRootOpenChange ? { onOpenChange: onRootOpenChange } : {})}>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <MenuView data-testid="root-view">
          <MenuRoot>
            <MenuTrigger data-testid="quality-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="quality-content">
              <MenuItem data-testid="quality-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
          <MenuRoot>
            <MenuTrigger data-testid="speed-trigger">Speed</MenuTrigger>
            <MenuContent data-testid="speed-content">
              <MenuItem data-testid="speed-item">Normal</MenuItem>
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

function RootPropagationFixture({ onContainerKeyDown }: { onContainerKeyDown: KeyboardEventHandler<HTMLDivElement> }) {
  return (
    <div data-testid="container" onKeyDown={onContainerKeyDown} role="application">
      <MenuRoot defaultOpen>
        <MenuTrigger data-testid="trigger">Settings</MenuTrigger>
        <MenuContent data-testid="content">
          <MenuItem data-testid="item">Auto</MenuItem>
        </MenuContent>
      </MenuRoot>
    </div>
  );
}

function ControlsHiddenFixture({
  visible,
  onOpenChange,
}: {
  visible: boolean;
  onOpenChange: NonNullable<MenuRoot.Props['onOpenChange']>;
}) {
  return (
    <ControlsContextProvider
      value={{
        state: { visible, userActive: visible },
        stateAttrMap: { visible: 'data-visible', userActive: 'data-user-active' },
      }}
    >
      <MenuRoot defaultOpen onOpenChange={onOpenChange}>
        <MenuTrigger data-testid="trigger">Settings</MenuTrigger>
        <MenuContent data-testid="content">
          <MenuItem data-testid="item">Auto</MenuItem>
        </MenuContent>
      </MenuRoot>
    </ControlsContextProvider>
  );
}

function CheckboxFixture({
  onCheckedChange,
  onRootOpenChange,
}: {
  onCheckedChange: (checked: boolean) => void;
  onRootOpenChange: NonNullable<MenuRoot.Props['onOpenChange']>;
}) {
  return (
    <MenuRoot defaultOpen onOpenChange={onRootOpenChange}>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="content">
        <MenuCheckboxItem data-testid="checkbox-item" checked={false} onCheckedChange={onCheckedChange}>
          Autoplay
        </MenuCheckboxItem>
      </MenuContent>
    </MenuRoot>
  );
}

function FocusOutFixture({ onRootOpenChange }: { onRootOpenChange: NonNullable<MenuRoot.Props['onOpenChange']> }) {
  return (
    <>
      <MenuRoot defaultOpen onOpenChange={onRootOpenChange}>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent data-testid="root-content">
          <MenuItem data-testid="root-item">Copy link</MenuItem>
        </MenuContent>
      </MenuRoot>
      <button type="button" data-testid="outside">
        Outside
      </button>
    </>
  );
}

function SubmenuFocusOutFixture({
  onRootOpenChange,
}: {
  onRootOpenChange: NonNullable<MenuRoot.Props['onOpenChange']>;
}) {
  return (
    <>
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
      <button type="button" data-testid="outside">
        Outside
      </button>
    </>
  );
}

describe('MenuContent', () => {
  it('shows the root panel after closing with an open submenu and reopening', async () => {
    const onRootOpenChange = vi.fn();

    render(
      <MenuRoot defaultOpen onOpenChange={onRootOpenChange}>
        <MenuTrigger data-testid="trigger">Settings</MenuTrigger>
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

    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await settleActiveSubmenuView();

    onRootOpenChange.mockClear();
    fireEvent.click(screen.getByTestId('trigger'));

    await waitFor(() => {
      expect(onRootOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'click' }));
    });

    await settleActiveSubmenuView();

    onRootOpenChange.mockClear();
    fireEvent.click(screen.getByTestId('trigger'));

    await waitFor(() => {
      expect(onRootOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    });

    await settleActiveSubmenuView();

    expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(true);
    expect(screen.queryByTestId('submenu-content')).toBeNull();
  });

  it('marks the root view inactive while a submenu view is active', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await settleActiveSubmenuView();

    expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(false);
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
    expect(screen.getByTestId('root-view').hasAttribute('data-menu-view')).toBe(true);
    expect(screen.getByTestId('root-view').getAttribute('data-menu-view-id')).toBe('root');
    expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(true);
    expect(screen.getByTestId('root-view').getAttribute('data-direction')).toBe('forward');
    expect(screen.getByTestId('root-view').hasAttribute('hidden')).toBe(false);
  });

  it('forces layout while the submenu starting style is applied', async () => {
    const startingStyleMeasurements: boolean[] = [];
    const getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRectMock() {
      if (this.hasAttribute('data-menu-view') && this.getAttribute('data-menu-view-id') !== 'root') {
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
    await settleActiveSubmenuView();

    fireEvent.click(screen.getByTestId('submenu-back'));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('submenu-content').hasAttribute('hidden')).toBe(false);
    });

    await settleActiveSubmenuView();
    await waitFor(
      () => {
        expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(false);
      },
      { timeout: 2000 }
    );
  });

  it('does not open a submenu from a secondary pointer button', () => {
    render(<SubmenuFixture />);

    fireEvent.pointerDown(screen.getByTestId('submenu-trigger'), { button: 2 });

    expect(screen.queryByTestId('submenu-content')).toBeNull();
    expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(true);
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

  it('highlights the back button when a submenu view becomes active', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('submenu-back').hasAttribute('data-highlighted')).toBe(true);
    });
  });

  it('does not mark submenu child parts with the submenu panel attribute', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('submenu-content').hasAttribute('data-submenu')).toBe(true);
    });

    expect(screen.getByTestId('submenu-back').hasAttribute('data-submenu')).toBe(false);
    expect(screen.getByTestId('submenu-item').hasAttribute('data-submenu')).toBe(false);
  });

  it('highlights pointer-entered back buttons without moving focus', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.queryByTestId('submenu-content')).not.toBeNull();
    });

    const back = screen.getByTestId('submenu-back');
    const item = screen.getByTestId('submenu-item');
    const focus = vi.spyOn(back, 'focus');

    fireEvent.pointerEnter(item);
    expect(item.hasAttribute('data-highlighted')).toBe(true);

    fireEvent.pointerEnter(back);

    expect(focus).not.toHaveBeenCalled();
    expect(back.hasAttribute('data-highlighted')).toBe(true);
    expect(item.hasAttribute('data-highlighted')).toBe(false);
  });

  it('returns to the parent view when selecting an item in a submenu', async () => {
    const onSelect = vi.fn();

    render(<SubmenuSelectFixture onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await settleActiveSubmenuView();

    expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(false);

    fireEvent.click(screen.getByTestId('submenu-item'));

    expect(onSelect).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(true);
    });
  });

  it('returns to the parent view without closing the root menu when Escape is pressed in a submenu', async () => {
    const onRootOpenChange = vi.fn();

    render(<SubmenuEscapeFixture onRootOpenChange={onRootOpenChange} />);
    onRootOpenChange.mockClear();

    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await settleActiveSubmenuView();

    expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(false);

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(true);
    });

    expect(onRootOpenChange).not.toHaveBeenCalledWith(false, expect.anything());
    expect(screen.getByTestId('root-content').hasAttribute('data-open')).toBe(true);
  });

  it('returns to the parent view when ArrowLeft is pressed in a submenu', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await settleActiveSubmenuView();

    expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(false);

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(true);
    });
  });

  it('honors preventDefault from submenu key handlers', async () => {
    const onSubmenuKeyDown = vi.fn((event: ReactKeyboardEvent<HTMLDivElement>) => event.preventDefault());

    render(<SubmenuPreventDefaultFixture onSubmenuKeyDown={onSubmenuKeyDown} />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await settleActiveSubmenuView();

    expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(false);

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'ArrowLeft' });

    expect(screen.getByTestId('root-view').hasAttribute('data-open')).toBe(false);
  });

  it('allows Escape from an inactive sibling submenu view to close the root menu', async () => {
    const onRootOpenChange = vi.fn();

    render(<SiblingSubmenuFixture onRootOpenChange={onRootOpenChange} />);
    onRootOpenChange.mockClear();

    fireEvent.click(screen.getByTestId('quality-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('quality-content').hasAttribute('data-open')).toBe(true);
    });

    const exitingContent = screen.getByTestId('quality-content');

    fireEvent.click(screen.getByTestId('speed-trigger'));
    fireEvent.keyDown(exitingContent, { key: 'Escape' });

    await waitFor(() => {
      expect(onRootOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'escape' }));
    });
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

  it('stops propagation for root menu keyboard navigation', () => {
    const onContainerKeyDown = vi.fn();

    render(<RootPropagationFixture onContainerKeyDown={onContainerKeyDown} />);

    fireEvent.keyDown(screen.getByTestId('content'), { key: 'ArrowDown' });

    expect(onContainerKeyDown).not.toHaveBeenCalled();
    expect(screen.getByTestId('item').hasAttribute('data-highlighted')).toBe(true);

    fireEvent.keyDown(screen.getByTestId('content'), { key: 'Tab' });

    expect(onContainerKeyDown).toHaveBeenCalledTimes(1);
  });

  it('stops propagation for root trigger keyboard navigation while open', () => {
    const onContainerKeyDown = vi.fn();

    render(<RootPropagationFixture onContainerKeyDown={onContainerKeyDown} />);

    fireEvent.keyDown(screen.getByTestId('trigger'), { key: 'ArrowRight' });

    expect(onContainerKeyDown).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByTestId('trigger'), { key: 'ArrowDown' });

    expect(onContainerKeyDown).not.toHaveBeenCalled();
    expect(screen.getByTestId('item').hasAttribute('data-highlighted')).toBe(true);
  });

  it('closes an open root menu from its trigger in one click', async () => {
    const onRootOpenChange = vi.fn();

    render(
      <MenuRoot defaultOpen onOpenChange={onRootOpenChange}>
        <MenuTrigger data-testid="trigger">Settings</MenuTrigger>
        <MenuContent data-testid="content">
          <MenuItem data-testid="item">Auto</MenuItem>
        </MenuContent>
      </MenuRoot>
    );
    onRootOpenChange.mockClear();

    fireEvent.click(screen.getByTestId('trigger'));

    await waitFor(() => {
      expect(onRootOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'click' }));
    });
  });

  it('prevents default before native player hotkeys receive menu keys', () => {
    const defaultPreventedValues: boolean[] = [];
    const onContainerKeyDown = vi.fn((event: KeyboardEvent) => {
      defaultPreventedValues.push(event.defaultPrevented);
    });

    render(<RootPropagationFixture onContainerKeyDown={vi.fn()} />);

    screen.getByTestId('container').addEventListener('keydown', onContainerKeyDown);
    fireEvent.keyDown(screen.getByTestId('trigger'), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByTestId('content'), { key: 'ArrowLeft' });

    expect(defaultPreventedValues).toEqual([true, true]);
  });

  it('closes an open root menu when parent controls become hidden', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<ControlsHiddenFixture visible onOpenChange={onOpenChange} />);

    onOpenChange.mockClear();
    rerender(<ControlsHiddenFixture visible={false} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'imperative-action' }));
    });
  });

  it('keeps the menu open when a checkbox item is toggled', () => {
    const onCheckedChange = vi.fn();
    const onRootOpenChange = vi.fn();

    render(<CheckboxFixture onCheckedChange={onCheckedChange} onRootOpenChange={onRootOpenChange} />);
    onRootOpenChange.mockClear();

    fireEvent.click(screen.getByTestId('checkbox-item'));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(onRootOpenChange).not.toHaveBeenCalledWith(false, expect.anything());
    expect(screen.queryByTestId('content')).not.toBeNull();
  });

  it('highlights pointer-entered items without moving focus', () => {
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent>
          <MenuItem data-testid="first-item">Auto</MenuItem>
          <MenuItem data-testid="second-item">1080p</MenuItem>
        </MenuContent>
      </MenuRoot>
    );

    const secondItem = screen.getByTestId('second-item');
    const focus = vi.spyOn(secondItem, 'focus');

    fireEvent.pointerEnter(secondItem);

    expect(focus).not.toHaveBeenCalled();
    expect(secondItem.hasAttribute('data-highlighted')).toBe(true);
  });

  it('closes when focus moves outside the root menu', async () => {
    const onRootOpenChange = vi.fn();

    render(<FocusOutFixture onRootOpenChange={onRootOpenChange} />);
    onRootOpenChange.mockClear();

    fireEvent.focusOut(screen.getByTestId('root-content'), { relatedTarget: screen.getByTestId('outside') });

    await waitFor(() => {
      expect(onRootOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'blur' }));
    });
  });

  it('closes when focus moves outside while a submenu is open', async () => {
    const onRootOpenChange = vi.fn();

    render(<SubmenuFocusOutFixture onRootOpenChange={onRootOpenChange} />);
    onRootOpenChange.mockClear();

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.queryByTestId('submenu-content')).not.toBeNull();
    });

    fireEvent.focusOut(screen.getByTestId('root-content'), { relatedTarget: screen.getByTestId('outside') });

    await waitFor(() => {
      expect(onRootOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'blur' }));
    });
  });

  it('stays open when focus moves within the popup while a submenu is open', async () => {
    const onRootOpenChange = vi.fn();

    render(<SubmenuFocusOutFixture onRootOpenChange={onRootOpenChange} />);
    onRootOpenChange.mockClear();

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.queryByTestId('submenu-content')).not.toBeNull();
    });

    fireEvent.focusOut(screen.getByTestId('root-content'), { relatedTarget: screen.getByTestId('submenu-item') });

    expect(onRootOpenChange).not.toHaveBeenCalledWith(false, expect.anything());
  });

  it('keeps the second root menu open after clicking its trigger while a sibling submenu is active', async () => {
    const onSecond = vi.fn();
    render(<PeerMenusWithSubmenuFixture onSecondOpenChange={onSecond} />);

    fireEvent.click(screen.getByTestId('peer-sub-trigger'));
    await waitFor(() => {
      expect(screen.queryByTestId('peer-sub-content')).not.toBeNull();
    });

    fireEvent.click(screen.getByTestId('peer-b-trigger'));

    await waitFor(() => {
      expect(onSecond).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    });

    expect(screen.queryByTestId('peer-b-content')).not.toBeNull();

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onSecond.mock.calls).toEqual([[true, expect.objectContaining({ reason: 'click' })]]);
  });
});
