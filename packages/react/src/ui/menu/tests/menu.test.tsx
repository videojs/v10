import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Menu } from '../index';
import { MenuCheckboxItem } from '../menu-checkbox-item';
import { MenuContent } from '../menu-content';
import { MenuGroup } from '../menu-group';
import { MenuGroupLabel } from '../menu-group-label';
import { MenuItem } from '../menu-item';
import { MenuRoot } from '../menu-root';
import { MenuTrigger } from '../menu-trigger';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return new DOMRect(x, y, width, height);
}

describe('Menu', () => {
  it('exposes transition parts on the existing namespace', () => {
    expect('TransitionRoot' in Menu).toBe(true);
    expect('TransitionView' in Menu).toBe(true);
  });

  it('opens an uncontrolled menu and exposes the base menu contract', async () => {
    render(
      <MenuRoot>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent data-testid="content">
          <MenuItem>Copy link</MenuItem>
        </MenuContent>
      </MenuRoot>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    const content = await screen.findByTestId('content');
    expect(content.getAttribute('role')).toBe('menu');
    expect(content.getAttribute('popover')).toBe('manual');
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true');
    expect(content.hasAttribute('data-menu-view')).toBe(false);
  });

  it('publishes Menu available-size aliases from Popover positioning', async () => {
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
        <MenuTrigger data-testid="trigger">Settings</MenuTrigger>
        <MenuContent data-testid="content">
          <MenuItem>Auto</MenuItem>
        </MenuContent>
      </MenuRoot>
    );

    await waitFor(() => expect(screen.getByTestId('content').getAttribute('data-side')).toBe('bottom'));
    const content = screen.getByTestId('content');
    expect(content.style.getPropertyValue('--media-menu-available-width')).toBe(
      content.style.getPropertyValue('--media-popover-available-width')
    );
    expect(content.style.getPropertyValue('--media-menu-available-height')).toBe(
      content.style.getPropertyValue('--media-popover-available-height')
    );
    expect(content.style.getPropertyValue('--media-menu-available-width')).not.toBe('');
    expect(content.style.getPropertyValue('--media-menu-available-height')).not.toBe('');
  });

  it('does not commit a controlled request until the open prop changes', async () => {
    const onOpenChange = vi.fn();

    function Fixture() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Commit
          </button>
          <MenuRoot open={open} onOpenChange={onOpenChange}>
            <MenuTrigger>Settings</MenuTrigger>
            <MenuContent data-testid="content">Menu</MenuContent>
          </MenuRoot>
        </>
      );
    }

    render(<Fixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    expect(screen.queryByTestId('content')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Commit' }));
    expect((await screen.findByTestId('content')).isConnected).toBe(true);
  });

  it('keeps unwrapped nested roots independent', async () => {
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent data-testid="parent-content">
          <MenuRoot>
            <MenuTrigger>Quality</MenuTrigger>
            <MenuContent data-testid="child-content">Auto</MenuContent>
          </MenuRoot>
        </MenuContent>
      </MenuRoot>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Quality' }));

    expect((await screen.findByTestId('child-content')).isConnected).toBe(true);
    expect(screen.getByTestId('parent-content').isConnected).toBe(true);
    expect(screen.getByTestId('child-content').hasAttribute('data-menu-view')).toBe(false);
  });

  it('leaves left and right keys available to optional bindings', () => {
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent>Menu</MenuContent>
      </MenuRoot>
    );

    const trigger = screen.getByRole('button', { name: 'Settings' });
    expect(fireEvent.keyDown(trigger, { key: 'ArrowLeft' })).toBe(true);
    expect(fireEvent.keyDown(trigger, { key: 'ArrowRight' })).toBe(true);
  });

  it('honors preventDefault before selecting or closing an item', () => {
    const onSelect = vi.fn();
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent data-testid="content">
          <MenuItem onClick={(event) => event.preventDefault()} onSelect={onSelect}>
            Keep open
          </MenuItem>
        </MenuContent>
      </MenuRoot>
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Keep open' }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('content').isConnected).toBe(true);
  });

  it('closes the current menu after an ordinary item selection', async () => {
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent data-testid="content">
          <MenuItem>Done</MenuItem>
        </MenuContent>
      </MenuRoot>
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Done' }));

    await waitFor(() => expect(screen.queryByTestId('content')).toBeNull());
  });

  it('supports keyboard navigation in DOM order', () => {
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent data-testid="content">
          <MenuItem>First</MenuItem>
          <MenuItem>Second</MenuItem>
        </MenuContent>
      </MenuRoot>
    );

    const content = screen.getByTestId('content');
    fireEvent.keyDown(content, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'First' }).hasAttribute('data-highlighted')).toBe(true);
    fireEvent.keyDown(content, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Second' }).hasAttribute('data-highlighted')).toBe(true);
  });

  it('keeps a checkbox menu open', () => {
    const onCheckedChange = vi.fn();
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent data-testid="content">
          <MenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
            Captions
          </MenuCheckboxItem>
        </MenuContent>
      </MenuRoot>
    );

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Captions' }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('content').isConnected).toBe(true);
  });

  it('wires a group label with aria-labelledby', () => {
    render(
      <MenuRoot defaultOpen>
        <MenuTrigger>Settings</MenuTrigger>
        <MenuContent>
          <MenuGroup>
            <MenuGroupLabel>Playback</MenuGroupLabel>
            <MenuItem>Speed</MenuItem>
          </MenuGroup>
        </MenuContent>
      </MenuRoot>
    );

    const label = screen.getByText('Playback');
    expect(screen.getByRole('group').getAttribute('aria-labelledby')).toBe(label.id);
  });

  it('prevents a disabled trigger from opening', () => {
    render(
      <MenuRoot>
        <MenuTrigger disabled>Settings</MenuTrigger>
        <MenuContent data-testid="content">Menu</MenuContent>
      </MenuRoot>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.queryByTestId('content')).toBeNull();
  });
});
