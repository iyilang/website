/**
 * Which install command a reader is shown first.
 *
 * WHY THIS EXISTS. 0.14.0 is the first release with a Windows build, and the
 * two installers are not variants of one command: `install.sh` is piped into
 * `sh` and unpacks a tarball into `~/.local`, `install.ps1` is piped into
 * `iex` and unpacks a zip into `%LOCALAPPDATA%`. A page that prints both and
 * lets the reader work out which is theirs is a page that makes every Windows
 * reader read a command they must not run, and the other way round.
 *
 * WHAT IT DECIDES, AND WHAT IT DOES NOT. It decides which of two blocks is
 * shown first. Both are in the page, server-rendered, and the switch between
 * them is two buttons - so a reader whose machine is guessed wrong is one
 * press away, and a reader with no JavaScript sees both rather than neither.
 * Nothing is downloaded, refused or rewritten on this evidence: the browser's
 * word about the operating system is a hint, and `install.ps1` itself is what
 * refuses a 32-bit Windows, because it is the thing that can see the machine.
 *
 * THREE ANSWERS, NEWEST FIRST. `navigator.userAgentData.platform` is the one
 * browsers still fill in truthfully; `navigator.platform` is deprecated but
 * present everywhere and says `Win32` on a 64-bit Windows too; the user agent
 * string is the last resort, where Windows is `Windows NT`. The first one
 * that answers is taken, because a later reading is not a better one - it is
 * the same fact through a frozen field.
 */
export type Platform = "posix" | "windows";

/** The machine this page is being read on, as far as the browser will say. */
export function detectPlatform(): Platform {
  const hint = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
    ?.platform;
  if (hint) return /^win/i.test(hint) ? "windows" : "posix";
  if (/^win/i.test(navigator.platform ?? "")) return "windows";
  return /windows nt/i.test(navigator.userAgent) ? "windows" : "posix";
}

/** Where a reader's own choice is kept, beside `iyi-theme`. */
const STORED = "iyi-platform";

const isPlatform = (value: string | null): value is Platform =>
  value === "posix" || value === "windows";

/**
 * Wire every platform switch in the page, and move them together.
 *
 * ONE CHOICE PER PAGE, not one per switch. The install page carries two - the
 * one-liner and the archive by hand - and a reader who picks Windows at the
 * top and finds a tarball further down has been told two different things
 * about their own machine. The choice is remembered for the next page the
 * same way the colour scheme is, because a reader's operating system does not
 * change between two clicks and being asked again reads as the site having
 * forgotten.
 *
 * The tablist is hidden until this runs (the `data-js` handshake the masthead
 * and the duration chart use), so without a script both panels stay in the
 * page as two captioned blocks rather than one unreachable behind a dead
 * control.
 */
export function wirePlatformSwitch(): void {
  const switches = [...document.querySelectorAll<HTMLElement>("[data-platform-switch]")];
  if (switches.length === 0) return;

  const stored = localStorage.getItem(STORED);
  let current: Platform = isPlatform(stored) ? stored : detectPlatform();

  const show = (want: Platform) => {
    current = want;
    for (const box of switches) {
      for (const tab of box.querySelectorAll<HTMLButtonElement>("[data-platform]")) {
        const selected = tab.dataset.platform === want;
        tab.setAttribute("aria-selected", String(selected));
        /* Roving tabindex: one stop for the whole tablist, arrows for the
         * rest, which is the tabs pattern a screen reader user expects. */
        tab.tabIndex = selected ? 0 : -1;
      }
      for (const panel of box.querySelectorAll<HTMLElement>("[data-platform-panel]")) {
        panel.hidden = panel.dataset.platformPanel !== want;
      }
    }
  };

  for (const box of switches) {
    box.dataset.js = "true";
    const tabs = [...box.querySelectorAll<HTMLButtonElement>("[data-platform]")];
    for (const [index, tab] of tabs.entries()) {
      tab.addEventListener("click", () => {
        const want = tab.dataset.platform;
        if (!isPlatform(want ?? null)) return;
        show(want as Platform);
        localStorage.setItem(STORED, want as Platform);
      });
      tab.addEventListener("keydown", (event) => {
        const step =
          event.key === "ArrowRight" || event.key === "ArrowDown"
            ? 1
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? -1
              : 0;
        if (step === 0) return;
        event.preventDefault();
        const next = tabs[(index + step + tabs.length) % tabs.length];
        next.focus();
        next.click();
      });
    }
  }

  show(current);
}
