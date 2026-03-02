import type { ComponentType, SVGProps } from 'react';
import MuxLogo from './icons/mux-logo.svg?react';
import BrightcoveLogo from './icons/sponsors/brightcove.svg?react';
import BrowserStackLogo from './icons/sponsors/browserstack.svg?react';
import FastlyLogo from './icons/sponsors/fastly.svg?react';
import NetlifyLogo from './icons/sponsors/netlify.svg?react';

type SponsorItem = {
  Logo: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  width: string;
  className?: string;
};

const sponsors: SponsorItem[] = [
  { Logo: FastlyLogo, label: 'CDN', width: '7.8rem', className: 'bg-blue' },
  { Logo: BrightcoveLogo, label: 'EMERITUS SPONSOR', width: '11rem' },
  { Logo: BrowserStackLogo, label: 'DEVICE TESTING', width: '12rem' },
  { Logo: NetlifyLogo, label: 'STATIC HOSTING', width: '11rem' },
];

export function Sponsors() {
  return (
    <section className="w-full max-w-295 mx-auto grid grid-rows-subgrid row-span-2 px-5 md:px-5">
      <header className="py-4 border-t border-b-0  border-y-faded-black dark:border-y-light-manila">
        <h2 className="text-display-h2 text-faded-black dark:text-light-manila text-center font-display-extended uppercase font-bold border-b-0">
          SPONSORS
        </h2>
      </header>
      <div className="md:items-center border border-faded-black dark:border-light-manila p-2 grid grid-cols-1 md:grid-cols-2 text-light-manila dark:text-faded-black rounded-sm min-h-77.5 h-max">
        <div className="bg-faded-black dark:bg-warm-gray dark:text-light-manila flex items-center justify-center aspect-5/3 md:aspect-auto md:h-full">
          <div className="hidden md:block">
            <MuxLogo width="12rem" />
          </div>
          <div className="block md:hidden">
            <MuxLogo width="10rem" />
          </div>
        </div>
        <div className="flex flex-col gap-2 p-2.5 md:px-15">
          <h3 className="md:border-0 py-3 mb:py-0 text-center md:text-left border-b border-dark-manila dark:border-warm-gray mb-2.5 md:mb-0 text-display-h5 text-orange font-display-extended uppercase font-bold">
            CORPORATE SHEPHERD
          </h3>
          <p className="text-p2 text-warm-gray dark:text-light-manila">
            The role of Corporate Shepherd is held by the company that has been elected by the Video.js Technical
            Steering Committee (TSC) to be a steward of the project and make significant investment into the development
            of Video.js. The role is currently held by Mux, taking over for Brigthcove in 2025. Mux is a leader in
            streaming video technology and was founded by Steve Heffernan, the creator of Video.js.
          </p>
        </div>
      </div>
      <div className="md:border md:border-faded-black dark:border-light-manila rounded-sm mt-5 z-0 relative h-max overflow-hidden">
        <div className="md:border gap-4 md:grid-separator-container md:gap-0 md:border-light-manila dark:border-faded-black grid text-fa dark:text-light-manila md:grid-cols-4">
          {sponsors.map(({ Logo, label, width, className }) => (
            <div
              key={label}
              className={`px-2.5 md:px-0 rounded-sm border md:border-0 border-faded-black dark:border-light-manila md:border-dark-manila md:dark:border-light-manila h-auto${className ? ` ${className}` : ''}`}
            >
              <div className="md:grid-separators md:h-full relative aspect-5/3 flex items-center justify-center bg-light-manila dark:bg-faded-black">
                <Logo width={width} />
              </div>
              <h3 className="block md:hidden relative border-t border-dark-manila text-orange font-display-extended font-bold uppercase text-display-h5 text-center py-5 ">
                {label}
              </h3>
            </div>
          ))}
          {sponsors.map(({ label }) => (
            <div key={label} className="border-dark-manila hidden md:block ">
              <h3 className="md:grid-separators relative bg-light-manila dark:bg-faded-black text-orange font-display-extended font-bold uppercase text-display-h5 text-center py-5">
                {label}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
