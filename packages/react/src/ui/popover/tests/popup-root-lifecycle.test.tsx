import { render } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertDialogPopup } from '../../alert-dialog/alert-dialog-popup';
import { AlertDialogRoot } from '../../alert-dialog/alert-dialog-root';
import { Tooltip } from '../../tooltip';
import * as Popover from '../index.parts';

interface PopupRootsProps {
  onAlertOpenChange: (open: boolean) => void;
  onPopoverOpenChange: (open: boolean) => void;
  onTooltipOpenChange: (open: boolean) => void;
  children?: ReactNode;
}

function PopupRoots({ onAlertOpenChange, onPopoverOpenChange, onTooltipOpenChange, children }: PopupRootsProps) {
  return (
    <>
      <AlertDialogRoot defaultOpen onOpenChange={onAlertOpenChange}>
        <AlertDialogPopup data-testid="alert">Alert</AlertDialogPopup>
      </AlertDialogRoot>
      <Popover.Root defaultOpen onOpenChange={onPopoverOpenChange}>
        <Popover.Popup data-testid="popover">Popover</Popover.Popup>
      </Popover.Root>
      <Tooltip.Root defaultOpen onOpenChange={onTooltipOpenChange}>
        <Tooltip.Popup data-testid="tooltip">Tooltip</Tooltip.Popup>
      </Tooltip.Root>
      {children}
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('popup root lifecycle', () => {
  it('keeps default-open transitions inactive during server rendering', () => {
    const onAlertOpenChange = vi.fn();
    const onPopoverOpenChange = vi.fn();
    const onTooltipOpenChange = vi.fn();

    const html = renderToString(
      <PopupRoots
        onAlertOpenChange={onAlertOpenChange}
        onPopoverOpenChange={onPopoverOpenChange}
        onTooltipOpenChange={onTooltipOpenChange}
      />
    );

    expect(html).not.toContain('data-testid');
    expect(onAlertOpenChange).not.toHaveBeenCalled();
    expect(onPopoverOpenChange).not.toHaveBeenCalled();
    expect(onTooltipOpenChange).not.toHaveBeenCalled();
  });

  it('does not open from an abandoned render', () => {
    const onAlertOpenChange = vi.fn();
    const onPopoverOpenChange = vi.fn();
    const onTooltipOpenChange = vi.fn();

    function Throw(): ReactNode {
      throw new Error('abandon render');
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(
        <PopupRoots
          onAlertOpenChange={onAlertOpenChange}
          onPopoverOpenChange={onPopoverOpenChange}
          onTooltipOpenChange={onTooltipOpenChange}
        >
          <Throw />
        </PopupRoots>
      )
    ).toThrow('abandon render');

    expect(onAlertOpenChange).not.toHaveBeenCalled();
    expect(onPopoverOpenChange).not.toHaveBeenCalled();
    expect(onTooltipOpenChange).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('opens once under StrictMode effect replay', () => {
    const onAlertOpenChange = vi.fn();
    const onPopoverOpenChange = vi.fn();
    const onTooltipOpenChange = vi.fn();

    render(
      <StrictMode>
        <PopupRoots
          onAlertOpenChange={onAlertOpenChange}
          onPopoverOpenChange={onPopoverOpenChange}
          onTooltipOpenChange={onTooltipOpenChange}
        />
      </StrictMode>
    );

    expect(onAlertOpenChange).toHaveBeenCalledOnce();
    expect(onPopoverOpenChange).toHaveBeenCalledOnce();
    expect(onTooltipOpenChange).toHaveBeenCalledOnce();
  });
});
