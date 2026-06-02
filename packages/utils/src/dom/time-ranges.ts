/** Converts a TimeRanges object to an array of [start, end] tuples. */
export function serializeTimeRanges(ranges: TimeRanges): Array<[number, number]> {
  const result: Array<[number, number]> = [];

  for (let i = 0; i < ranges.length; i++) {
    result.push([ranges.start(i), ranges.end(i)]);
  }

  return result;
}

export class TimeRangesLike {
  #ranges: Array<[number, number]>;

  constructor(ranges: Array<[number, number]>) {
    this.#ranges = ranges;
  }

  get length(): number {
    return this.#ranges.length;
  }

  start(index: number): number {
    const range = this.#ranges[index];
    if (this.#isOutOfRange(index) || !range) {
      throw new DOMException('Index out of range', 'IndexSizeError');
    }
    return range[0];
  }

  end(index: number): number {
    const range = this.#ranges[index];
    if (this.#isOutOfRange(index) || !range) {
      throw new DOMException('Index out of range', 'IndexSizeError');
    }
    return range[1];
  }

  #isOutOfRange(index: number): boolean {
    return index < 0 || index >= this.#ranges.length;
  }
}

export const EMPTY_TIME_RANGES = new TimeRangesLike([]);
