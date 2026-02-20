import TriangleArrow from '../icons/TriangleArrow';

const REPEAT_COUNT = 4;

function MarqueeItem() {
  return (
    <span className="inline-flex items-center gap-7 shrink-0 pr-7">
      <span>Streaming bits on millions of sites</span>
      <TriangleArrow />
    </span>
  );
}

export function Marquee() {
  const items = Array.from({ length: REPEAT_COUNT }, (_, i) => <MarqueeItem key={`marquee-${i}-${REPEAT_COUNT}`} />);

  return (
    <div
      className="col-span-full overflow-hidden py-8 border-b border-b-dark-manila relative z-1"
      aria-label="Streaming bits on millions of sites"
      role="marquee"
    >
      <div
        id="logos"
        className="flex whitespace-nowrap animate-marquee2 text-base font-display-extended uppercase text-light-manila"
      >
        {items}
        {items}
      </div>
    </div>
  );
}
