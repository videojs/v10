import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { KeyboardEventHandler, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { ControlsContextProvider } from '../../controls/context';
import { MenuCheckboxItem } from '../menu-checkbox-item';
import { MenuContent } from '../menu-content';
import { MenuGroup } from '../menu-group';
import { MenuGroupLabel } from '../menu-group-label';
import { MenuItem } from '../menu-item';
import { MenuItemIndicator } from '../menu-item-indicator';
import { MenuRadioGroup } from '../menu-radio-group';
import { MenuRadioItem } from '../menu-radio-item';
import { MenuRoot } from '../menu-root';
import { MenuSeparator } from '../menu-separator';
import { MenuTrigger } from '../menu-trigger';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return new DOMRect(x, y, width, height);
}

function SubmenuFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <div data-testid="root-items">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuItem data-testid="submenu-back">Back</MenuItem>
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
        </div>
      </MenuContent>
    </MenuRoot>
  );
}

function SubmenuPropagationFixture({ onRootKeyDown }: { onRootKeyDown: KeyboardEventHandler<HTMLDivElement> }) {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content" onKeyDown={onRootKeyDown}>
        <div data-testid="root-items">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
        </div>
      </MenuContent>
    </MenuRoot>
  );
}

function SubmenuKeyboardFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <div data-testid="root-items">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
          <MenuItem data-testid="root-item">Copy link</MenuItem>
        </div>
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
        <div data-testid="root-items">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content" onKeyDown={onSubmenuKeyDown}>
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
        </div>
      </MenuContent>
    </MenuRoot>
  );
}

function SubmenuSelectFixture({ onSelect }: { onSelect: () => void }) {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <div data-testid="root-items">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuItem data-testid="submenu-item" onSelect={onSelect}>
                Auto
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </div>
      </MenuContent>
    </MenuRoot>
  );
}

function SubmenuEscapeFixture({ onRootOpenChange }: { onRootOpenChange: (open: boolean) => void }) {
  return (
    <MenuRoot defaultOpen onOpenChange={onRootOpenChange}>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <div data-testid="root-items">
          <MenuRoot>
            <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="submenu-content">
              <MenuItem data-testid="submenu-item">Auto</MenuItem>
            </MenuContent>
          </MenuRoot>
        </div>
      </MenuContent>
    </MenuRoot>
  );
}

function NestedSubmenuFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="root-content">
        <div data-testid="root-items">
          <MenuRoot>
            <MenuTrigger data-testid="first-submenu-trigger">Quality</MenuTrigger>
            <MenuContent data-testid="first-submenu-content">
              <div data-testid="first-submenu-items">
                <MenuRoot>
                  <MenuTrigger data-testid="second-submenu-trigger">Advanced</MenuTrigger>
                  <MenuContent data-testid="second-submenu-content">
                    <MenuItem data-testid="second-submenu-item">HDR</MenuItem>
                  </MenuContent>
                </MenuRoot>
              </div>
            </MenuContent>
          </MenuRoot>
        </div>
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

function GroupLabelFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent>
        <MenuGroup data-testid="group">
          <MenuGroupLabel data-testid="label">Playback</MenuGroupLabel>
          <MenuItem>Copy link</MenuItem>
        </MenuGroup>
      </MenuContent>
    </MenuRoot>
  );
}

function RadioGroupLabelFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent>
        <MenuRadioGroup data-testid="group" value="auto" onValueChange={vi.fn()}>
          <MenuGroupLabel data-testid="label">Quality</MenuGroupLabel>
          <MenuRadioItem value="auto">Auto</MenuRadioItem>
        </MenuRadioGroup>
      </MenuContent>
    </MenuRoot>
  );
}

function ExplicitGroupLabelFixture() {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent>
        <MenuGroup data-testid="aria-label-group" aria-label="Playback">
          <MenuGroupLabel data-testid="aria-label-label">Ignored</MenuGroupLabel>
        </MenuGroup>
        <MenuRadioGroup
          data-testid="aria-labelledby-group"
          aria-labelledby="external-label"
          value="auto"
          onValueChange={vi.fn()}
        >
          <MenuGroupLabel data-testid="aria-labelledby-label">Ignored</MenuGroupLabel>
          <MenuRadioItem value="auto">Auto</MenuRadioItem>
        </MenuRadioGroup>
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

const menuStateAttrs = ['data-open', 'data-side', 'data-align', 'data-starting-style', 'data-ending-style'] as const;

function expectNoMenuStateAttrs(element: HTMLElement): void {
  for (const attr of menuStateAttrs) {
    expect(element.hasAttribute(attr), `${element.dataset.testid ?? element.tagName} should not have ${attr}`).toBe(
      false
    );
  }
}

function createRect(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    width,
    height,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

function mockElementSize(element: HTMLElement, getHeight: () => number): void {
  element.getBoundingClientRect = vi.fn(() => createRect(160, getHeight()));

  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    get: () => 160,
  });

  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    get: getHeight,
  });
}

function DynamicMenuFixture({ showCaptions }: { showCaptions: boolean }) {
  return (
    <MenuRoot defaultOpen>
      <MenuTrigger>Settings</MenuTrigger>
      <MenuContent data-testid="content">
        <div data-testid="root-items">
          <MenuItem>Speed</MenuItem>
          {showCaptions ? <MenuItem>Captions</MenuItem> : null}
        </div>
      </MenuContent>
    </MenuRoot>
  );
}

describe('MenuContent', () => {
  it('waits for a controlled owner to commit requested open changes', async () => {
    const onOpenChange = vi.fn();
    const renderMenu = (open: boolean) => (
      <MenuRoot open={open} onOpenChange={onOpenChange}>
        <MenuTrigger data-testid="trigger">Settings</MenuTrigger>
        <MenuContent data-testid="content">Settings</MenuContent>
      </MenuRoot>
    );
    const { rerender } = render(renderMenu(false));

    fireEvent.click(screen.getByTestId('trigger'));

    expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    expect(screen.queryByTestId('content')).toBeNull();

    rerender(renderMenu(true));

    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeNull();
    });
  });

  it('exposes the positioned side on root content', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.testid === 'trigger') return makeDOMRect(100, 10, 40, 20);
      if (this.dataset.testid === 'content') return makeDOMRect(0, 0, 100, 60);
      return makeDOMRect(0, 0, 300, 200);
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'content' ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'content' ? 60 : 0;
    });

    render(
      <MenuRoot defaultOpen side="top" boundary="viewport">
        <MenuTrigger
          render={(props, state) => <button {...props} data-render-side={state.side} data-testid="trigger" />}
        >
          Settings
        </MenuTrigger>
        <MenuContent data-testid="content">
          <MenuItem>Auto</MenuItem>
        </MenuContent>
      </MenuRoot>
    );

    await waitFor(() => {
      expect(screen.getByTestId('content').getAttribute('data-side')).toBe('bottom');
      expect(screen.getByTestId('trigger').getAttribute('data-render-side')).toBe('bottom');
    });
  });

  it('scopes menu state data attributes to content elements', async () => {
    render(
      <MenuRoot defaultOpen side="top" align="end">
        <MenuTrigger data-testid="trigger">Settings</MenuTrigger>
        <MenuContent data-testid="root-content">
          <MenuGroup data-testid="group">
            <MenuGroupLabel data-testid="label">Playback</MenuGroupLabel>
            <MenuItem data-testid="item">Copy link</MenuItem>
            <MenuCheckboxItem data-testid="checkbox-item" checked={false} onCheckedChange={vi.fn()}>
              Autoplay
            </MenuCheckboxItem>
            <MenuRadioGroup data-testid="radio-group" aria-label="Quality" value="auto" onValueChange={vi.fn()}>
              <MenuRadioItem data-testid="radio-item" value="auto">
                Auto
                <MenuItemIndicator data-testid="indicator" checked>
                  Checked
                </MenuItemIndicator>
              </MenuRadioItem>
            </MenuRadioGroup>
          </MenuGroup>
          <MenuSeparator data-testid="separator" />
          <div data-testid="root-items">
            <MenuRoot>
              <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
              <MenuContent data-testid="submenu-content">
                <MenuItem data-testid="back">Back</MenuItem>
                <MenuItem data-testid="submenu-item">Auto</MenuItem>
              </MenuContent>
            </MenuRoot>
          </div>
        </MenuContent>
      </MenuRoot>
    );

    const rootContent = screen.getByTestId('root-content');

    expect(rootContent.hasAttribute('data-open')).toBe(true);
    expect(rootContent.getAttribute('data-side')).toBe('top');
    expect(rootContent.getAttribute('data-align')).toBe('end');

    for (const testId of [
      'trigger',
      'label',
      'group',
      'separator',
      'item',
      'checkbox-item',
      'radio-group',
      'radio-item',
      'indicator',
      'submenu-trigger',
    ]) {
      expectNoMenuStateAttrs(screen.getByTestId(testId));
    }

    expect(screen.getByTestId('item').hasAttribute('data-item')).toBe(true);
    expect(screen.getByTestId('radio-item').hasAttribute('data-item')).toBe(true);
    expect(screen.getByTestId('checkbox-item').hasAttribute('data-item')).toBe(true);
    expect(screen.getByTestId('submenu-trigger').hasAttribute('data-item')).toBe(true);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => expect(screen.queryByTestId('submenu-content')).not.toBeNull());

    const submenuContent = screen.getByTestId('submenu-content');

    expect(submenuContent.hasAttribute('data-submenu')).toBe(true);
    expect(submenuContent.hasAttribute('data-open')).toBe(true);
    expect(submenuContent.hasAttribute('data-side')).toBe(false);
    expect(submenuContent.hasAttribute('data-align')).toBe(false);
    expectNoMenuStateAttrs(screen.getByTestId('back'));
  });

  it('covers ordinary root content while a submenu is active', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      const rootItems = screen.getByTestId('root-items');

      expect(rootItems.getAttribute('aria-hidden')).toBe('true');
      expect(rootItems.hasAttribute('inert')).toBe(true);
      expect(screen.getByTestId('root-content').getAttribute('data-submenu-expanded')).toBe('true');
    });
  });

  it('exposes starting and ending style hooks on submenu content', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    expect(screen.getByTestId('submenu-content').hasAttribute('data-starting-style')).toBe(true);

    fireEvent.click(screen.getByTestId('submenu-back'));

    const submenu = screen.getByTestId('submenu-content');
    expect(submenu.hasAttribute('data-ending-style')).toBe(true);
    expect(submenu.hasAttribute('data-open')).toBe(true);
    expect(screen.getByTestId('submenu-trigger').getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('root-content').getAttribute('data-submenu-expanded')).toBe('false');
  });

  it('portals submenu content into the parent content', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('submenu-content').parentElement).toBe(screen.getByTestId('root-content'));
    });
  });

  it('portals deeper submenu content into the active parent submenu', async () => {
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
        screen.getByTestId('first-submenu-items')
      );
    });
  });

  it('propagates the deepest submenu size to the root content', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const widths: Record<string, number> = {
        'root-items': 180,
        'first-submenu-items': 200,
        'second-submenu-item': 220,
      };
      const heights: Record<string, number> = {
        'root-items': 100,
        'first-submenu-items': 150,
        'second-submenu-item': 240,
      };
      return createRect(widths[this.dataset.testid ?? ''] ?? 0, heights[this.dataset.testid ?? ''] ?? 0);
    });

    render(<NestedSubmenuFixture />);
    fireEvent.click(screen.getByTestId('first-submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-content').style.getPropertyValue('--media-menu-width')).toBe('200px');
      expect(screen.getByTestId('root-content').style.getPropertyValue('--media-menu-height')).toBe('150px');
    });

    fireEvent.click(screen.getByTestId('second-submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('first-submenu-content').style.getPropertyValue('--media-menu-width')).toBe('220px');
      expect(screen.getByTestId('root-content').style.getPropertyValue('--media-menu-width')).toBe('220px');
      expect(screen.getByTestId('first-submenu-content').style.getPropertyValue('--media-menu-height')).toBe('240px');
      expect(screen.getByTestId('root-content').style.getPropertyValue('--media-menu-height')).toBe('240px');
    });
  });

  it('syncs root content size without position options', async () => {
    const getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRectMock() {
      if (this.getAttribute('data-testid') === 'root-items') {
        return new DOMRect(0, 0, 180, 96);
      }

      return getBoundingClientRect.call(this);
    };

    try {
      render(
        <MenuRoot defaultOpen side={null as never}>
          <MenuTrigger>Settings</MenuTrigger>
          <MenuContent data-testid="root-content">
            <div data-testid="root-items">
              <MenuItem>Auto</MenuItem>
            </div>
          </MenuContent>
        </MenuRoot>
      );

      await waitFor(() => {
        expect(screen.getByTestId('root-content').style.getPropertyValue('--media-menu-height')).toBe('96px');
      });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
    }
  });

  it('remeasures open root content when menu items are added', async () => {
    const { rerender } = render(<DynamicMenuFixture showCaptions={false} />);
    const content = screen.getByTestId('content');
    const rootItems = screen.getByTestId('root-items');

    mockElementSize(rootItems, () => rootItems.children.length * 20);

    rerender(<DynamicMenuFixture showCaptions />);

    await waitFor(() => {
      expect(content.style.getPropertyValue('--media-menu-height')).toBe('40px');
    });
  });

  it('can reopen a submenu immediately after closing it', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await waitFor(() => {
      expect(screen.queryByTestId('submenu-content')).not.toBeNull();
    });

    fireEvent.click(screen.getByTestId('submenu-back'));
    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-items').hasAttribute('inert')).toBe(true);
      expect(screen.getByTestId('submenu-content').hasAttribute('hidden')).toBe(false);
    });
  });

  it('resets an open submenu when its parent menu closes', async () => {
    const onSubmenuOpenChange = vi.fn();
    const renderMenu = (open: boolean) => (
      <MenuRoot open={open}>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent data-testid="root-content">
          <div>
            <MenuRoot onOpenChange={onSubmenuOpenChange}>
              <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
              <MenuContent data-testid="submenu-content">
                <MenuItem>Auto</MenuItem>
              </MenuContent>
            </MenuRoot>
          </div>
        </MenuContent>
      </MenuRoot>
    );
    const { rerender } = render(renderMenu(true));
    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await waitFor(() => expect(screen.getByTestId('submenu-content')).not.toBeNull());
    onSubmenuOpenChange.mockClear();

    rerender(renderMenu(false));

    await waitFor(() => {
      expect(onSubmenuOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'imperative-action' }));
      expect(screen.getByTestId('submenu-trigger').getAttribute('aria-expanded')).toBe('false');
    });
  });

  it('handles keyboard navigation in the active submenu', async () => {
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

  it('highlights the first item when a submenu becomes active', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('submenu-back').hasAttribute('data-highlighted')).toBe(true);
    });
  });

  it('returns to the parent content when selecting an item in a submenu', async () => {
    const onSelect = vi.fn();

    render(<SubmenuSelectFixture onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-items').hasAttribute('inert')).toBe(true);
    });

    fireEvent.click(screen.getByTestId('submenu-item'));

    expect(onSelect).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId('root-items').hasAttribute('inert')).toBe(false);
    });
  });

  it('returns to the parent content without closing the root menu when Escape is pressed in a submenu', async () => {
    const onRootOpenChange = vi.fn();

    render(<SubmenuEscapeFixture onRootOpenChange={onRootOpenChange} />);
    onRootOpenChange.mockClear();

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-items').hasAttribute('inert')).toBe(true);
    });

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByTestId('root-items').hasAttribute('inert')).toBe(false);
    });

    expect(onRootOpenChange).not.toHaveBeenCalledWith(false, expect.anything());
    expect(screen.getByTestId('root-content').hasAttribute('data-open')).toBe(true);
  });

  it('returns to the parent content when ArrowLeft is pressed in a submenu', async () => {
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-items').hasAttribute('inert')).toBe(true);
    });

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByTestId('root-items').hasAttribute('inert')).toBe(false);
    });
  });

  it('honors preventDefault from submenu key handlers', async () => {
    const onSubmenuKeyDown = vi.fn((event: ReactKeyboardEvent<HTMLDivElement>) => event.preventDefault());

    render(<SubmenuPreventDefaultFixture onSubmenuKeyDown={onSubmenuKeyDown} />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('root-items').hasAttribute('inert')).toBe(true);
    });

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'ArrowLeft' });

    expect(screen.getByTestId('root-items').hasAttribute('inert')).toBe(true);
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

  it('holds a controls visibility lock while a root menu is open', async () => {
    const releaseControlsLock = vi.fn();
    const requestControlsLock = vi.fn(() => releaseControlsLock);
    const { Wrapper } = createPlayerWrapper({
      userActive: true,
      controlsVisible: true,
      requestControlsLock,
      toggleControls: vi.fn(),
    });

    render(<ControlsHiddenFixture visible onOpenChange={vi.fn()} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(requestControlsLock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('trigger'));

    await waitFor(() => {
      expect(releaseControlsLock).toHaveBeenCalledTimes(1);
    });
  });

  it('wires GroupLabel to Group with aria-labelledby', async () => {
    render(<GroupLabelFixture />);

    await waitFor(() => {
      expect(screen.getByTestId('group').getAttribute('aria-labelledby')).toBe(screen.getByTestId('label').id);
    });
  });

  it('wires GroupLabel to RadioGroup with aria-labelledby', async () => {
    render(<RadioGroupLabelFixture />);

    await waitFor(() => {
      expect(screen.getByTestId('group').getAttribute('aria-labelledby')).toBe(screen.getByTestId('label').id);
    });
  });

  it('lets explicit group labels override generated aria-labelledby', async () => {
    render(<ExplicitGroupLabelFixture />);

    await waitFor(() => {
      expect(screen.getByTestId('aria-label-label').id).not.toBe('');
      expect(screen.getByTestId('aria-labelledby-label').id).not.toBe('');
    });

    expect(screen.getByTestId('aria-label-group').getAttribute('aria-label')).toBe('Playback');
    expect(screen.getByTestId('aria-label-group').hasAttribute('aria-labelledby')).toBe(false);
    expect(screen.getByTestId('aria-labelledby-group').getAttribute('aria-labelledby')).toBe('external-label');
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

  it('routes focus leaving a submenu through the submenu popover', async () => {
    const onSubmenuOpenChange = vi.fn();
    render(
      <>
        <MenuRoot defaultOpen>
          <MenuTrigger>Settings</MenuTrigger>
          <MenuContent>
            <div>
              <MenuRoot onOpenChange={onSubmenuOpenChange}>
                <MenuTrigger data-testid="submenu-trigger">Quality</MenuTrigger>
                <MenuContent data-testid="submenu-content">
                  <MenuItem>Auto</MenuItem>
                </MenuContent>
              </MenuRoot>
            </div>
          </MenuContent>
        </MenuRoot>
        <button type="button" data-testid="outside">
          Outside
        </button>
      </>
    );
    fireEvent.click(screen.getByTestId('submenu-trigger'));
    await waitFor(() => expect(screen.getByTestId('submenu-content')).not.toBeNull());
    onSubmenuOpenChange.mockClear();

    fireEvent.blur(screen.getByTestId('submenu-content'), { relatedTarget: screen.getByTestId('outside') });

    await waitFor(() => {
      expect(onSubmenuOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'blur' }));
    });
  });

  it('forwards disabled to a root trigger render prop and prevents opening', () => {
    render(
      <MenuRoot>
        <MenuTrigger disabled render={<button type="button" data-testid="trigger" />} />
        <MenuContent data-testid="content">Captions</MenuContent>
      </MenuRoot>
    );

    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveProperty('disabled', true);

    fireEvent.click(trigger);

    expect(screen.queryByTestId('content')).toBeNull();

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    trigger.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.queryByTestId('content')).toBeNull();
  });
});
