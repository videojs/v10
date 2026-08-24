export interface NoticeProps {
  /** Whether the notice is open. */
  open?: boolean;
}

export interface NoticeState {
  /** Whether the notice is open. */
  open: boolean;
}

export class NoticeCore {
  static readonly defaultProps = {
    open: false,
  };
}
