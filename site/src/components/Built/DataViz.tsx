import clsx from 'clsx';
import type React from 'react';

export function DataViz() {
  const seconds = [0, 5, 10, 15, 20];
  return (
    <div className="bg-faded-black border border-dark-manila p-5 md:p-15 rounded-sm">
      <p className="text-p2 font-bold text-light-manila">
        Download speeds
        <br className="block md:hidden" />
        <span className="font-normal text-dark-manila ml-1">(based on slow 4G connection)</span>
      </p>
      <p className="inline-block mt-6 md:hidden text-display-h5 items-center py-0.5 px-8 rounded-2xl bg-faded-black border border-light-manila text-center text-light-manila font-display-extended uppercase font-bold">
        VJS 8
      </p>
      <div className="mb-2 mt-4 md:mt-5 md:mb-2.5 w-full data-bar" />
      <div className="flex gap-0.5">
        <p className="hidden md:flex min-w-30 text-display-h5 items-center py-0.5 justify-center rounded-2xl bg-faded-black border border-light-manila text-center text-light-manila font-display-extended uppercase font-bold">
          VJS 8
        </p>
        <p className="text-display-h5 inline py-1 px-0 md:px-4 rounded-2xl text-center text-light-manila font-display-extended uppercase font-bold">
          3.96s
          <span className="ml-3 font-light">/ 722 KB</span>
        </p>
      </div>
      <p className="inline-block mt-6 md:hidden text-display-h5 items-center py-0.5 px-8 rounded-2xl bg-faded-black border text-orange text-center border-orange font-display-extended uppercase font-bold">
        VJS 10
      </p>
      <div className="mb-2 mt-4 md:mt-5 md:mb-2.5 data-bar data-bar-orange" style={{ maxWidth: '32.25%' }} />

      <div className="flex gap-0.5">
        <p className="hidden md:flex min-w-30 items-center text-display-h5 py-0 justify-center rounded-2xl bg-faded-black border border-orange text-center text-orange font-display-extended uppercase font-bold">
          VJS 10
        </p>
        <p className="text-display-h5 inline py-1 px-0 md:px-4 rounded-2xl text-center text-orange font-display-extended uppercase font-bold">
          1.29s
          <span className="ml-3 font-light">/ 198 KB</span>
        </p>
      </div>

      <div className="flex justify-between w-full px-1 pt-4 pb-2">
        {Array.from({ length: 21 }, (_, i) => (
          <div
            key={seconds[i]}
            className={clsx('w-px h-4', seconds.includes(i) ? 'bg-light-manila' : 'bg-warm-gray')}
          />
        ))}
      </div>
      <div className="flex justify-between -mx-1.5" style={{ width: 'calc(100% + 0.85rem)' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={seconds[i]} className="text-p3 text-light-manila text-center w-5 ">
            {i}s
          </div>
        ))}
      </div>
    </div>
  );
}
