/**
 * Play a figure once, when the reader can see it.
 *
 * Two ways of deciding that, because the figures sit in two places.
 *
 * A figure in the middle of a page waits until the whole of it is on screen,
 * in the upper two thirds, so it is not over by the time the eye gets there.
 * A figure taller than that band can never be wholly inside it, so for one of
 * those it is enough that it fills the band; without that, a tall figure on a
 * short screen never played and stayed empty.
 *
 * A figure in the first screen, the home page's rebuild, passes `threshold`
 * instead and plays as soon as that share of it shows, which on load is at
 * once.
 *
 * The caller owns the Replay control and calls `play` itself.
 */
export function playWhenSeen(element: Element, play: () => void, options: { threshold?: number } = {}): void {
  const { threshold } = options;
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        let ready: boolean;
        if (threshold !== undefined) {
          ready = entry.intersectionRatio >= threshold;
        } else {
          const band = entry.rootBounds?.height ?? innerHeight;
          const whole = entry.intersectionRatio >= 0.999;
          const fills = entry.boundingClientRect.height >= band && entry.intersectionRect.height >= band * 0.9;
          ready = whole || fills;
        }
        if (ready) {
          seen.disconnect();
          play();
          return;
        }
      }
    },
    /* A callback comes only when the ratio crosses a threshold. A figure that
     * fills the band stops growing at band / height of itself, short of 1, so
     * with coarse steps the moment it filled could fall between two of them:
     * the /agents race on a phone, 825 px tall in a 566 px band, sat at 0.69
     * between 0.5 and 0.75 and never played. Steps of a hundredth leave no such
     * gap for any figure up to ten bands tall. */
    threshold !== undefined
      ? { threshold }
      : { threshold: Array.from({ length: 101 }, (_, i) => i / 100), rootMargin: "0px 0px -33% 0px" },
  );
  seen.observe(element);
}

/** Whether the reader asked for less motion. */
export const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;
