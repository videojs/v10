export type PopupGroupCloseReason = 'group-open';

export interface PopupGroupMember {
  close: (reason: PopupGroupCloseReason) => void;
}

export interface PopupGroup {
  open: (member: PopupGroupMember) => void;
  close: (member: PopupGroupMember) => void;
  /** Register a trigger element so peers skip capture-phase outside-dismiss when opening another member. */
  addMemberTrigger: (element: HTMLElement) => () => void;
  /** True if the event path hits another member's trigger (not `ownTrigger`). */
  pathHasPeerMemberTrigger: (path: EventTarget[], ownTrigger: HTMLElement | null) => boolean;
  /**
   * True if `element` is a registered peer trigger (not `ownTrigger`). Used to avoid yanking
   * focus during deferred trigger restoration while a sibling menu’s trigger or surface already
   * owns focus.
   */
  isPeerTrigger: (element: HTMLElement | null, ownTrigger: HTMLElement | null) => boolean;
}

let sharedMenuPopupGroup: PopupGroup | null = null;

/**
 * Test-only: discard the lazy document-wide group so the next `getSharedMenuPopupGroup()` is fresh.
 * Avoids open-state leakage between tests that use the default group.
 */
export function resetSharedMenuPopupGroupForTests(): void {
  sharedMenuPopupGroup = null;
}

/**
 * Document-wide menu coordination: exclusive open + peer-trigger outside-dismiss skipping.
 * Used when a menu's `group` resolver is omitted or returns `undefined` (no player or shell group).
 */
export function getSharedMenuPopupGroup(): PopupGroup {
  sharedMenuPopupGroup ??= createPopupGroup();
  return sharedMenuPopupGroup;
}

export function createPopupGroup(): PopupGroup {
  let current: PopupGroupMember | null = null;
  const memberTriggers = new Set<HTMLElement>();

  return {
    open(member) {
      if (current === member) return;

      current?.close('group-open');
      current = member;
    },

    close(member) {
      if (current === member) current = null;
    },

    addMemberTrigger(element: HTMLElement) {
      memberTriggers.add(element);
      return () => memberTriggers.delete(element);
    },

    pathHasPeerMemberTrigger(path: EventTarget[], ownTrigger: HTMLElement | null) {
      for (const node of path) {
        if (node instanceof HTMLElement && memberTriggers.has(node) && node !== ownTrigger) {
          return true;
        }
      }
      return false;
    },

    isPeerTrigger(element: HTMLElement | null, ownTrigger: HTMLElement | null) {
      return element !== null && element !== ownTrigger && memberTriggers.has(element);
    },
  };
}
