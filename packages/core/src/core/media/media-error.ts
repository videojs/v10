// Typescript says it's strictly a string, but it can also be a number or an object with a toString method.
// https://github.com/microsoft/TypeScript/issues/6032
// https://262.ecma-international.org/6.0/#sec-error-message

type Stringable = string | { toString(): string };

declare global {
  interface ErrorConstructor {
    new (message?: Stringable): Error;
    (message?: Stringable): Error;
    readonly prototype: Error;
  }
}

export class MediaError extends Error {
  static MEDIA_ERR_ABORTED = 1 as const;
  static MEDIA_ERR_NETWORK = 2 as const;
  static MEDIA_ERR_DECODE = 3 as const;
  static MEDIA_ERR_SRC_NOT_SUPPORTED = 4 as const;
  static MEDIA_ERR_ENCRYPTED = 5 as const;
  // Technically this is Mux specific but it's generic enough to be used here.
  // @see https://docs.mux.com/guides/data/monitor-html5-video-element#customize-error-tracking-behavior
  static MEDIA_ERR_CUSTOM = 100 as const;

  static defaultMessages: Record<number, string> = {
    1: 'You aborted the media playback',
    2: 'A network error caused the media download to fail.',
    3: 'A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.',
    4: 'An unsupported error occurred. The server or network failed, or your browser does not support this format.',
    5: 'The media is encrypted and there are no keys to decrypt it.',
  };

  name: string;
  code: number;
  context: string | undefined;
  fatal: boolean;
  data?: any;

  constructor(message?: Stringable, code: number = MediaError.MEDIA_ERR_CUSTOM, fatal?: boolean, context?: string) {
    super(message);
    this.name = 'MediaError';
    this.code = code;
    this.context = context;
    this.fatal = fatal ?? (code >= MediaError.MEDIA_ERR_NETWORK && code <= MediaError.MEDIA_ERR_ENCRYPTED);

    if (!this.message) {
      this.message = MediaError.defaultMessages[this.code] ?? '';
    }
  }
}
