import type { ComponentType } from 'react';

import { useInstallationSelectionReady } from './useSelection';

/**
 * Mark an installation island whose prerendered markup shows the default picks. While `<html>` carries
 * `data-installation-pending`, the CSS in `InstallationFrameworkInit.astro` hides the island until the marker reports
 * that it renders the stores' picks. The marker stays a direct child of the island so that CSS can find it.
 */
export function withSelectionMarker<Props extends object>(Island: ComponentType<Props>): ComponentType<Props> {
  return function SelectionMarkedIsland(props: Props) {
    const isReady = useInstallationSelectionReady();

    return (
      <>
        <span hidden data-installation-selection={isReady ? 'ready' : 'prerendered'} />
        <Island {...props} />
      </>
    );
  };
}
