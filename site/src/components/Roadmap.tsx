import clsx from 'clsx';
import { Check } from 'lucide-react';

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
    <section className="w-full max-w-6xl mx-auto grid grid-rows-subgrid row-span-2">
      <header className="py-4 border-t mb-12 border-b  border-y-faded-black">
        <h2 className="text-h5 text-faded-black text-center font-display-extended uppercase font-bold">ROADMAP</h2>
      </header>

      <div className="h-full relative">
        <div className="grid grid-cols-4 relative pb-10">
          {milestones.map((milestone, i) => (
            <div key={milestone.date} className="flex flex-col items-center text-center relative">
              <p className="relative z-10 text-sm font-display-extended font-bold uppercase tracking-wider pb-3 text-faded-black">
                {milestone.date}
              </p>
              <div className="relative w-full flex justify-center py-1">
                <div
                  className={clsx(
                    'relative z-10 w-10 h-10 rounded-full border-[2.5px] bg-light-manila flex items-center justify-center',
                    milestone.completed ? 'border-orange' : 'border-dark-manila'
                  )}
                >
                  {milestone.completed && <Check size={16} strokeWidth={2.5} className="text-orange" />}
                </div>
              </div>

              <h3 className="text-orange font-display-extended font-bold uppercase text-h5 leading-none mt-5 px-1">
                {milestone.title}
              </h3>
              <p className="text-sm mt-3 max-w-55 text-warm-gray">{milestone.description}</p>
            </div>
          ))}
          <div className="absolute mt-5 left-0 w-full">
            <div className="absolute top-4 left-0 h-8 w-full data-bar brightness-0 z-0" />
            <div className="absolute bg-light-manila top-4 left-0 h-8 max-w-[37.5%] data-bar data-bar-orange z-2" />
            <div className="absolute top-4 left-0 h-10 w-50 bg-linear-to-r from-light-manila to-transparent z-3" />
            <div className="absolute top-4 right-0 h-10 w-50 bg-linear-to-r to-light-manila from-transparent z-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
