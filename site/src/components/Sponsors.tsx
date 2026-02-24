import MuxLogo from './icons/mux-logo.svg?react';
import BrightcoveLogo from './icons/sponsors/brightcove.svg?react';
import BrowserStackLogo from './icons/sponsors/browserstack.svg?react';
import FastlyLogo from './icons/sponsors/fastly.svg?react';
import NetlifyLogo from './icons/sponsors/netlify.svg?react';

export function Sponsors() {
  return (
    <section className="w-full max-w-6xl mx-auto grid grid-rows-subgrid row-span-2 px-5 md:px-5">
      <header className="py-4 border-t border-b-0  border-y-faded-black">
        <h2 className="text-h5 text-faded-black text-center font-display-extended uppercase font-bold border-b-0">
          SPONSORS
        </h2>
      </header>
      <div className="border border-faded-black p-2 grid grid-cols-1 md:grid-cols-2 text-light-manila rounded-sm">
        <div className="bg-faded-black flex items-center justify-center aspect-5/3 md:aspect-auto md:h-full">
          <div className="hidden md:block">
            <MuxLogo width="12rem" />
          </div>
          <div className="block md:hidden">
            <MuxLogo width="10rem" />
          </div>
        </div>
        <div className="flex flex-col gap-2 p-2.5 md:p-15">
          <h3 className="md:border-0 py-3 mb:py-0 text-center md:text-left border-b border-dark-manila mb-2.5 md:mb-0 text-sm text-orange font-display-extended uppercase font-bold">
            CORPORATE SHEPHERD
          </h3>
          <p className="text-base text-warm-gray">
            The role of Corporate Shepherd is held by the company that has been elected by the Video.js Technical
            Steering Committee (TSC) to be a steward of the project and make significant investment into the development
            of Video.js. The role is currently held by Mux, taking over for Brigthcove in 2025. Mux is a leader in
            streaming video technology and was founded by Steve Heffernan, the creator of Video.js.
          </p>
        </div>
      </div>
      <div className="gap-4 md:gap-0 md:border border-faded-black grid text-light-manila rounded-sm mt-5 md:grid-cols-4 z-0 relative">
        <div className="px-2.5 md:px-0 rounded-sm border md:border-0 border-faded-black h-auto bg-blue">
          <div className="md:grid-separators md:h-full relative p-14 flex items-center justify-center -m-px">
            <FastlyLogo width="7.8rem" />
          </div>
          <h3 className="block md:hidden relative -m-px border-t border-dark-manila text-orange font-display-extended font-bold uppercase text-base text-center py-5">
            CDN
          </h3>
        </div>
        <div className="px-2.5 md:px-0 rounded-sm border md:border-0 border-faded-black">
          <div className="md:grid-separators md:h-full relative p-14 flex items-center justify-center -m-px">
            <BrightcoveLogo width="11rem" />
          </div>
          <h3 className="block md:hidden relative -m-px border-t border-dark-manila text-orange font-display-extended font-bold uppercase text-base text-center py-5">
            EMERITUS SPONSOR
          </h3>
        </div>
        <div className="px-2.5 md:px-0 rounded-sm border md:border-0 border-faded-black">
          <div className="md:grid-separators md:h-full relative p-14 flex items-center justify-center -m-px">
            <BrowserStackLogo width="12rem" />
          </div>
          <h3 className="block md:hidden relative -m-px border-t border-dark-manila text-orange font-display-extended font-bold uppercase text-base text-center py-5">
            DEVICE TESTING
          </h3>
        </div>
        <div className="px-2.5 md:px-0 rounded-sm border md:border-0 border-faded-black">
          <div className="md:grid-separators md:h-full relative p-14 flex items-center justify-center -m-px">
            <NetlifyLogo width="11rem" />
          </div>
          <h3 className="block md:hidden relative -m-px border-t border-dark-manila text-orange font-display-extended font-bold uppercase text-base text-center py-5">
            STATIC HOSTING
          </h3>
        </div>
        <h3 className="hidden md:block md:grid-separators relative -m-px text-orange font-display-extended font-bold uppercase text-base text-center py-5">
          CDN
        </h3>
        <h3 className="hidden md:block md:grid-separators relative -m-px text-orange font-display-extended font-bold uppercase text-base text-center py-5">
          EMERITUS SPONSOR
        </h3>
        <h3 className="hidden md:block md:grid-separators relative -m-px text-orange font-display-extended font-bold uppercase text-base text-center py-5">
          DEVICE TESTING
        </h3>
        <h3 className="hidden md:block md:grid-separators relative -m-px text-orange font-display-extended font-bold uppercase text-base text-center py-5">
          STATIC HOSTING
        </h3>
      </div>
    </section>
  );
}
