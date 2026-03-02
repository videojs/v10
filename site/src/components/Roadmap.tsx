import clsx from 'clsx';
import type React from 'react';
import Check from './icons/check.svg?react';

const milestones = [
  {
    date: 'OCT 2025',
    title: 'TECH PREVIEW',
    description: 'Kick the tires, and light the fires',
    completed: true,
  },
  {
    date: 'MAR 2026',
    title: 'BETA',
    description: 'Close to stable. Experimental adoption in real projects',
    completed: true,
  },
  {
    date: 'MID 2026',
    title: 'GA',
    description: 'Stable APIs. Feature parity w/ Media Chrome, Vidstack, Plyr.',
    completed: false,
  },
  {
    date: 'END OF 2026',
    title: 'CORE FEATURE PARITY',
    description: 'Video.js core/contrib plugins migrated',
    completed: false,
  },
];

export function RoadMap() {
  return (
    <section className="w-full max-w-295 mx-auto grid grid-rows-subgrid row-span-2 px-5 md:px-5 md:mb-20 ">
      <header className="py-4 border-t mb-12 border-b  border-y-faded-black dark:border-y-light-manila">
        <h2 className="text-display-h2 text-faded-black dark:text-light-manila text-center font-display-extended uppercase font-bold">
          ROADMAP
        </h2>
      </header>

      <div className="h-full relative">
        <div className="grid md:grid-cols-4 gap-15 md:gap-12 relative md:pb-10 mb-10 md:mb-0">
          {milestones.map((milestone, i) => (
            <div
              key={milestone.date}
              className="flex md:flex-col gap-12 md:gap-0 md:items-center text-left md:text-center relative"
            >
              <p className="hidden md:block relative z-10 text-display-h5 font-display-extended font-bold uppercase tracking-wider pb-4 text-faded-black dark:text-light-manila">
                {milestone.date}
              </p>
              <div className="relative w-auto md:w-full flex justify-center py-0.5">
                <div
                  className={clsx(
                    'relative z-10 w-10 h-10 rounded-full border bg-light-manila dark:bg-faded-black flex items-center justify-center',
                    milestone.completed ? 'border-orange' : 'border-dark-manila'
                  )}
                >
                  {milestone.completed && <Check width={'1.03rem'} className="text-orange" />}
                </div>
              </div>
              <div>
                <p className="block md:hidden relative z-10 font-display-extended font-bold uppercase tracking-wider text-faded-black dark:text-light-manila text-p2">
                  {milestone.date}
                </p>
                <h3 className="text-orange font-display-extended font-bold uppercase text-display-h3 md:text-display-h2 leading-none md:mt-5 md:px-1">
                  {milestone.title}
                </h3>
                <p className="text-p2 md:text-p3 md:mx-auto mt-2.5 max-w-55 text-warm-gray dark:text-light-manila">
                  {milestone.description}
                </p>
              </div>
            </div>
          ))}
          <div className="hidden md:block absolute mt-5 left-0 w-full">
            <div className="absolute top-3 left-0 h-8 w-full data-bar brightness-50 dark:brightness-100 z-0" />
            <div
              className="absolute bg-light-manila dark:bg-faded-black top-3 left-0 h-8 data-bar data-bar-orange z-2"
              style={{ maxWidth: '37.5%' }}
            />
            <div className="absolute top-3 left-0 h-10 w-50 bg-linear-to-r from-light-manila dark:from-faded-black to-transparent z-3" />
            <div className="absolute top-3 right-0 h-10 w-50 bg-linear-to-r to-light-manila dark:to-faded-black from-transparent z-4" />
          </div>
          <div className="block md:hidden absolute mt-0 left-0 h-full w-10 t-0">
            <div className="absolute top-0 left-0 h-8 w-full horizontal-bars brightness-50 dark:brightness-100  z-0" />
            <div
              className="absolute bg-light-manila dark:bg-faded-black top-0 left-0 h-10 horizontal-bars horizontal-bars-orange z-2"
              style={{ maxHeight: '30%' }}
            />
            <div className="absolute bottom-0 right-0 w-10 h-50 bg-linear-to-b to-light-manila dark:to-faded-black from-transparent z-4" />
            <div className="absolute top-0 right-0 w-10 h-20 bg-linear-to-b from-light-manila dark:from-faded-black to-transparent z-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
