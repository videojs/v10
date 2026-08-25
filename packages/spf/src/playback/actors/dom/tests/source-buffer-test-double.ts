const EMPTY_TIME_RANGES: TimeRanges = {
  length: 0,
  start: () => 0,
  end: () => 0,
};

/** Build a structurally complete SourceBuffer double without relying on MSE globals in the test runtime. */
export function createSourceBufferDouble<Overrides extends object>(overrides: Overrides): SourceBuffer & Overrides {
  return Object.assign(
    new EventTarget(),
    {
      appendWindowEnd: Number.POSITIVE_INFINITY,
      appendWindowStart: 0,
      buffered: EMPTY_TIME_RANGES,
      mode: 'segments' as const,
      onabort: null,
      onerror: null,
      onupdate: null,
      onupdateend: null,
      onupdatestart: null,
      timestampOffset: 0,
      updating: false,
      abort: () => {},
      appendBuffer: (data: BufferSource) => {
        void data;
      },
      changeType: (type: string) => {
        void type;
      },
      remove: (start: number, end: number) => {
        void start;
        void end;
      },
    },
    overrides
  );
}
