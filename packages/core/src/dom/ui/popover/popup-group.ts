export type PopupGroupCloseReason = 'group-open';

export interface PopupGroupMember {
  close: (reason: PopupGroupCloseReason) => void;
}

export interface PopupGroup {
  open: (member: PopupGroupMember) => void;
  close: (member: PopupGroupMember) => void;
}

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
