import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Menu } from '../index';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Fixture() {
  return (
    <Menu.Root defaultOpen>
      <Menu.Trigger>Settings</Menu.Trigger>
      <Menu.TransitionRoot render={<Menu.Content data-testid="container" />} className="root-panel">
        <Menu.Item>Copy link</Menu.Item>
        <Menu.TransitionView render={<Menu.Root />}>
          <Menu.Trigger>Quality</Menu.Trigger>
          <Menu.Content data-testid="quality-panel">
            <Menu.Item>Back</Menu.Item>
            <Menu.Item>Auto</Menu.Item>
          </Menu.Content>
        </Menu.TransitionView>
      </Menu.TransitionRoot>
    </Menu.Root>
  );
}

describe('Menu transition parts', () => {
  it('generates the root panel and navigates from committed child state', async () => {
    render(<Fixture />);
    const container = await screen.findByTestId('container');
    const root = container.querySelector<HTMLElement>('[data-menu-root-view]');

    expect(root).not.toBeNull();
    expect(root?.classList.contains('root-panel')).toBe(true);
    expect(root?.getAttribute('data-view-state')).toBe('active');
    expect(container.querySelectorAll('[data-menu-root-view]')).toHaveLength(1);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Quality' }));

    const child = await screen.findByTestId('quality-panel');
    expect(child.parentElement).toBe(container);
    expect(child.hasAttribute('data-submenu')).toBe(true);
    expect(child.getAttribute('data-view-state')).toBe('active');
    expect(child.getAttribute('data-direction')).toBe('forward');
    expect(root?.getAttribute('data-view-state')).toBe('inactive');
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.hasAttribute('inert')).toBe(true);
  });

  it('uses an ordinary item as a back row and restores the root panel', async () => {
    render(<Fixture />);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Quality' }));
    const child = await screen.findByTestId('quality-panel');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Back' }));

    await waitFor(() => expect(child.getAttribute('data-view-state')).toBe('inactive'));
    const root = screen.getByTestId('container').querySelector('[data-menu-root-view]');
    expect(root?.getAttribute('data-view-state')).toBe('active');
    expect(root?.getAttribute('data-direction')).toBe('back');
  });

  it('supports ArrowRight, ArrowLeft, and Escape only in the opt-in binding', async () => {
    render(<Fixture />);
    const trigger = await screen.findByRole('menuitem', { name: 'Quality' });

    fireEvent.keyDown(trigger, { key: 'ArrowRight' });
    const child = await screen.findByTestId('quality-panel');
    await waitFor(() => expect(child.getAttribute('data-view-state')).toBe('active'));
    fireEvent.keyDown(child, { key: 'ArrowLeft' });
    await waitFor(() => expect(child.getAttribute('data-view-state')).toBe('inactive'));

    fireEvent.click(trigger);
    await waitFor(() => expect(child.getAttribute('data-view-state')).toBe('active'));
    fireEvent.keyDown(child, { key: 'Escape' });
    await waitFor(() => expect(child.getAttribute('data-view-state')).toBe('inactive'));
    expect(screen.getByTestId('container').isConnected).toBe(true);
  });

  it('does not transition after a controlled child rejects an open request', async () => {
    const onOpenChange = vi.fn();

    function ControlledFixture() {
      const [open, setOpen] = useState(false);
      return (
        <Menu.Root defaultOpen>
          <Menu.Trigger>Settings</Menu.Trigger>
          <Menu.TransitionRoot render={<Menu.Content data-testid="container" />}>
            <button type="button" onClick={() => setOpen(true)}>
              Commit child
            </button>
            <Menu.TransitionView render={<Menu.Root open={open} onOpenChange={onOpenChange} />}>
              <Menu.Trigger>Quality</Menu.Trigger>
              <Menu.Content data-testid="quality-panel">Quality options</Menu.Content>
            </Menu.TransitionView>
          </Menu.TransitionRoot>
        </Menu.Root>
      );
    }

    render(<ControlledFixture />);
    const root = (await screen.findByTestId('container')).querySelector('[data-menu-root-view]');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Quality' }));

    expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    expect(root?.getAttribute('data-view-state')).toBe('active');
    expect(screen.getByTestId('quality-panel').getAttribute('data-view-state')).toBe('inactive');
    expect(screen.getByTestId('quality-panel').hasAttribute('hidden')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Commit child' }));
    expect((await screen.findByTestId('quality-panel')).getAttribute('data-view-state')).toBe('active');
  });

  it('honors preventDefault on a child-view trigger', async () => {
    render(
      <Menu.Root defaultOpen>
        <Menu.Trigger>Settings</Menu.Trigger>
        <Menu.TransitionRoot render={<Menu.Content />}>
          <Menu.TransitionView render={<Menu.Root />}>
            <Menu.Trigger onClick={(event) => event.preventDefault()}>Quality</Menu.Trigger>
            <Menu.Content data-testid="quality-panel">Quality</Menu.Content>
          </Menu.TransitionView>
        </Menu.TransitionRoot>
      </Menu.Root>
    );

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Quality' }));

    expect(screen.getByTestId('quality-panel').getAttribute('data-view-state')).toBe('inactive');
  });
});
