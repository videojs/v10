import MuxLogo from './icons/MuxLogo';
import { BrightcoveLogo, BrowserStackLogo, FastlyLogo, NetlifyLogo } from './icons/SponsorLogos';

export function Sponsors() {
  return (
    <section className="w-full max-w-6xl mx-auto grid grid-rows-subgrid row-span-2">
      <header className="py-4 border-t border-b-0  border-y-faded-black">
        <h2 className="text-h5 text-faded-black text-center font-display-extended uppercase font-bold border-b-0">
          SPONSORS
        </h2>
      </header>
      <div className="border border-faded-black p-2 grid grid-cols-2 text-light-manila rounded-sm">
        <div className="bg-faded-black flex items-center justify-center">
          <MuxLogo width={12} />
        </div>
        <div className="flex flex-col gap-2 p-15">
          <h3 className="text-sm text-orange font-display-extended uppercase font-bold">CORPORATE SHEPHERD</h3>
          <p className="text-base text-warm-gray">
            The role of Corporate Shepherd is held by the company that has been elected by the Video.js Technical
            Steering Committee (TSC) to be a steward of the project and make significant investment into the development
            of Video.js. The role is currently held by Mux, taking over for Brigthcove in 2025. Mux is a leader in
            streaming video technology and was founded by Steve Heffernan, the creator of Video.js.
          </p>
        </div>
      </div>
      <div className="border border-faded-black grid text-light-manila rounded-sm mt-5 grid-cols-4 z-0 relative">
        <div className="grid-separators relative p-14 flex items-center justify-center -m-px">
          <FastlyLogo width="7.8" />
        </div>

        <div className="grid-separators relative p-14 flex items-center justify-center -m-px">
          <BrightcoveLogo width="11" />
        </div>
        <div className="grid-separators relative p-14 flex items-center justify-center -m-px">
          <BrowserStackLogo width="12" />
        </div>
        <div className="grid-separators relative p-14 flex items-center justify-center -m-px">
          <NetlifyLogo width="11" />
        </div>
        <h3 className="grid-separators relative -m-px text-orange font-display-extended font-bold uppercase text-base text-center py-5">
          CDN
        </h3>
        <h3 className="grid-separators relative -m-px text-orange font-display-extended font-bold uppercase text-base text-center py-5">
          EMERITUS SPONSOR
        </h3>
        <h3 className="grid-separators relative -m-px text-orange font-display-extended font-bold uppercase text-base text-center py-5">
          DEVICE TESTING
        </h3>
        <h3 className="grid-separators relative -m-px text-orange font-display-extended font-bold uppercase text-base text-center py-5">
          STATIC HOSTING
        </h3>
      </div>
    </section>
  );
}
