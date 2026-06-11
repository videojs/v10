/** Toggle a popup host linked via `commandfor` (menu, popover, etc.). */
export function toggleCommandTarget(host: HTMLElement, commandfor: string): void {
  const root = host.getRootNode() as Document | ShadowRoot;
  const target =
    ('getElementById' in root ? root.getElementById(commandfor) : null) ??
    root.querySelector<HTMLElement>(`#${CSS.escape(commandfor)}`);

  if (!target || !('open' in target)) return;

  const popup = target as { open: boolean };
  popup.open = !popup.open;
}
