import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

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
    render(<SubmenuFixture />);

    fireEvent.click(screen.getByTestId('submenu-trigger'));

    await waitFor(() => {
      expect(screen.queryByTestId('submenu-content')).not.toBeNull();
    });

    fireEvent.keyDown(screen.getByTestId('submenu-content'), { key: 'ArrowDown' });

    expect(screen.getByTestId('submenu-item').hasAttribute('data-highlighted')).toBe(true);
    expect(screen.getByTestId('submenu-trigger').hasAttribute('data-highlighted')).toBe(false);
  });
});
