import { DataViz } from './DataViz';
import { Intro } from './Intro';
import { SocialProof } from './SocialProof';

export function Built() {
  return (
    <section className="w-full bg-faded-black relative pt-20 mt-30 mb-30 border-t border-faded-black">
      <div className="absolute w-full -mt-20 built-bg z-0"></div>
      <div className="w-full max-w-6xl mx-auto px-6 md:px-5 -mt-30 z-1 relative">
        <header className="relative flex flex-col justify-center items-center text-center mb-10 p-4 h-20">
          <div className="absolute z-0 inset-0 grid bg-faded-black" style={{ gridTemplateRows: '1fr auto 1fr' }}>
            <div className="bg-gold" />
            <div className="h-0.5 bg-faded-black" />
            <div className="bg-orange" />
          </div>
          <h3 className="text-h5 inline py-1 px-4 rounded-sm bg-faded-black text-center relative z-2 text-light-manila font-display-extended uppercase font-bold">
            v10 is built different
          </h3>
        </header>
        <div className="grid grid-cols-2 auto-rows-auto gap-5">
          <Intro />
          <DataViz />
          <SocialProof />
        </div>
      </div>
    </section>
  );
}
