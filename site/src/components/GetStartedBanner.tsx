import ArrowIcon from './icons/Arrow';

export default function GetStartedBanner() {
  return (
    <section className="relative mb-5 group/banner text-center md:text-left grid grid-rows-[1fr_auto_60px] md:grid-rows-1 md:grid-cols-[1fr_300px_16%] items-center gap-4 md:gap-6 bg-faded-black px-4 md:px-8 py-4 md:py-12 text-light-manila">
      <h2 className="relative text-center pt-4 md:pt-0 md:text-left z-10 font-display-extended text-h4 md:text-h2 uppercase font-bold gap-6 transition-colors duration-300 group-has-[a:hover]/banner:text-faded-black">
        <span className="">Get</span>
        <br className="md:hidden" />
        Started
      </h2>
      <p className="relative w-full max-w-md z-10 text-base md:text-lg text-light-manila transition-colors duration-300 group-has-[a:hover]/banner:text-faded-black">
        Everything you need to install and launch your player
      </p>

      <a
        href="/docs"
        className="absolute flex items-end md:items-center gap-0 justify-center md:justify-end pb-3 md:pb-0 md:pr-12 z-0 col-start-0 transition-all duration-300 right-2 bottom-2 w-[calc(100%-1rem)] md:w-[16%] md:hover:w-[calc(100%-1rem)] hover:h-[calc(100%-1rem)] bg-orange h-16 md:h-[calc(100%-1rem)]"
      >
        <ArrowIcon width={'3.8'} />
      </a>
    </section>
  );
}
