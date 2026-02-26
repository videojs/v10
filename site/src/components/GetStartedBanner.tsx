import styles from './GetStartedBanner.module.css';
import ArrowIcon from './icons/arrow.svg?react';

export default function GetStartedBanner() {
  return (
    <section
      className={`${styles.section} relative mb-5 text-center md:text-left grid items-center gap-4 md:gap-6 bg-faded-black dark:bg-light-manila px-4 md:px-8 py-4 md:py-12 text-light-manila dark:text-faded-black`}
    >
      <h2
        className={`${styles.text} relative md:flex text-center pt-4 md:pt-0 md:text-left z-10 font-display-extended text-display-h2 md:text-display-h1 uppercase font-bold gap-2 md:gap-4 transition-colors duration-300`}
      >
        <span className="">Get</span>
        <br className="md:hidden" />
        <span className={`${styles.stroke} text-stroke-white dark:text-stroke-faded-black`}>Started</span>
      </h2>
      <p
        className={`${styles.text} relative w-full max-w-md z-10 text-p2 md:text-p2 text-light-manila dark:text-faded-black transition-colors duration-300`}
      >
        Everything you need to install and launch your player
      </p>

      <a
        href="/docs"
        className={`${styles.arrow} absolute flex items-end md:items-center gap-0 justify-center md:justify-end pb-3 md:pb-0 md:pr-13 z-0 col-start-0 transition-all duration-300 right-2 bottom-2 bg-orange h-16`}
      >
        <ArrowIcon width="3.8rem" />
      </a>
    </section>
  );
}
