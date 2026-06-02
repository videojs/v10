export interface GoogleCastProps {
  src: string | undefined;
  receiver: string | undefined;
  contentType: string | undefined;
  streamType: string | undefined;
  customData: Record<string, unknown> | null | undefined;
}

export const googleCastDefaultProps: GoogleCastProps = {
  src: undefined,
  receiver: undefined,
  contentType: undefined,
  streamType: undefined,
  customData: undefined,
};

export type GoogleCastRemotePlayerListener = (event?: cast.framework.RemotePlayerChangedEvent) => void;
