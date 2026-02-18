import clsx from 'clsx';

export function DataViz() {
  const seconds = [0, 4, 8, 12, 16];
  return (
    <div className="bg-faded-black border border-dark-manila p-15 rounded-sm">
      <p className="text-base font-bold text-light-manila">
        Download speeds
        <span className="font-normal text-dark-manila ml-1">(based on slow 4G connection)</span>
      </p>
      <div className="my-4 w-full data-bar" />
      <div className="flex gap-0.5">
        <p className="text-base flex items-center py-0.5 px-8 rounded-2xl bg-faded-black border border-light-manila text-center text-light-manila font-display-extended uppercase font-bold">
          VJS 8
        </p>
        <p className="text-base inline py-1 px-4 rounded-2xl text-center text-light-manila font-display-extended uppercase font-bold">
          3.96s
          <span className="ml-3 font-light">/ 722 KB</span>
        </p>
      </div>

      <div className="my-4 w-full data-bar data-bar-orange max-w-43" />

      <div className="flex gap-0.5">
        <p className="flex items-center text-base py-0 px-8 rounded-2xl bg-faded-black border border-orange text-center text-orange font-display-extended uppercase font-bold">
          VJS 10
        </p>
        <p className="text-base inline py-1 px-4 rounded-2xl text-center text-orange font-display-extended uppercase font-bold">
          1.29s
          <span className="ml-3 font-light">/ 198 KB</span>
        </p>
      </div>

      <div className="flex justify-between w-full px-1 pt-4 pb-2">
        {Array.from({ length: 17 }, (_, i) => (
          <div
            key={seconds[i]}
            className={clsx('w-px h-4', seconds.includes(i) ? 'bg-light-manila' : 'bg-warm-gray')}
          />
        ))}
      </div>
      <div className="flex justify-between w-[calc(100% + 3rem)] -mx-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={seconds[i]} className="text-light-manila text-center w-5 ">
            {i}s
          </div>
        ))}
      </div>
    </div>
  );
}
