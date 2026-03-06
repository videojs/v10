import FrameworkControl from '../FrameworkControl';
import BaseDemo from './Base';
import EjectDemo from './Eject';

/**
 * Both BaseDemo and EjectDemo use ClientCode which has a top-level await (Shiki highlighter).
 * If they're in separate Astro islands, Safari may throw a hydration error.
 * https://github.com/withastro/astro/issues/10055
 *
 * Keep them in a single island to work around this.
 */
export default function Demo() {
  return (
    <section className="grid gap-y-20 lg:gap-y-0 gap-x-5 lg:grid-cols-2 mb-10 lg:mb-0 w-full max-w-305 mx-auto px-5">
      <section className="grid lg:grid-rows-subgrid row-span-4 lg:border-t lg:py-10 border-faded-black dark:border-manila-light">
        <h2 className="text-h2 dark:text-manila-light text-faded-black text-center font-display uppercase mb-2.5 lg:mb-1.25">
          Assemble your player
        </h2>
        <p className="text-p2 mb-8 md:mb-10 dark:text-manila-dark text-warm-gray text-center font-instrument-sans font-light">
          Feel at home with your framework, skin, and media source
        </p>

        <FrameworkControl className="mb-5 md:hidden" />
        <BaseDemo className="lg:h-100 m-0" />
      </section>
      <section className="grid lg:grid-rows-subgrid row-span-4 lg:border-t lg:py-10 border-y border-faded-black dark:border-manila-light">
        <h2 className="text-h2 dark:text-manila-light text-faded-black text-center font-display uppercase mb-2.5 lg:mb-1.25">
          Take full control
        </h2>
        <p className="text-p2 mb-8 md:mb-10 dark:text-manila-dark text-warm-gray text-center font-instrument-sans font-light">
          Make your player truly your own with fully-editable components
        </p>
        <FrameworkControl className="mb-5 md:hidden" />
        <EjectDemo className="lg:h-100 m-0" />
      </section>
    </section>
  );
}
