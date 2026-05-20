/** Reason a popup is closed by its enclosing popup group. */
export type PopupGroupCloseReason = 'group-open';

/** Single popup participating in a popup group. */
export interface PopupGroupMember {
  /** Called when the group asks the member to close. */
  close: (reason: PopupGroupCloseReason) => void;
}

/** Coordinator enforcing at-most-one-open across a set of popups. */
export interface PopupGroup {
  /** Open a member; closes any other currently open member. */
  open: (member: PopupGroupMember) => void;
  /** Remove a member that has closed itself. */
  close: (member: PopupGroupMember) => void;
}

/** Build a popup group that allows at most one member to be open at a time. */
export function createPopupGroup(): PopupGroup {
  let current: PopupGroupMember | null = null;

  return {
    open(member) {
      if (current === member) return;

      current?.close('group-open');
      current = member;
    },

    close(member) {
      if (current === member) current = null;
    },
  };
}
