import ArrowIcon from './icons/Arrow';

export default function GetStartedBanner() {
  return (
    <section className="mb-5 group/banner relative grid md:grid-cols-[1fr_300px_16%] items-center gap-6 bg-faded-black px-8 py-12 text-light-manila">
      <h2 className="relative z-10 font-display-extended text-h2 uppercase font-bold flex gap-6 transition-colors duration-300 group-has-[a:hover]/banner:text-faded-black">
        <span>Get</span>
        Started
      </h2>
      <p className="relative max-w-md z-10 text-lg text-light-manila transition-colors duration-300 group-has-[a:hover]/banner:text-faded-black">
        Everything you need to install and launch your player
      </p>

      <a
        href="/docs"
        className="absolute flex items-center gap-0 justify-end pr-12 z-0 col-start-0 transition-all duration-300 right-2 bottom-2 w-[16%] hover:w-[calc(100%-1rem)] bg-orange h-[calc(100%-1rem)]"
      >
        <ArrowIcon width={'3.8'} />
      </a>
    </section>
  );
}
