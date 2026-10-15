/**
 * The /agents page's interactions: the recorded loop's step and reader
 * switches, and the rebuild question's edit switch. The race at the top wires
 * itself, in `agent-race.ts`; this module only opens the step one of its links
 * names, in place rather than by jumping to the loop.
 *
 * Every panel the loop and the rebuild question can show is in the built
 * HTML, so with scripts off the page is the whole recording laid out in
 * order. This module only hides the panels that are not selected, and the
 * controls that select them are hidden until it runs.
 */

import { reducedMotion } from "./play-when-seen";

const store = (key: string, value?: string): string | null => {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {}
  return null;
};

/* The loop ---------------------------------------------------------------- */

function wireLoop(box: HTMLElement): (step: number) => void {
  box.dataset.js = "true";
  const steps = [...box.querySelectorAll<HTMLElement>("[data-step-panel]")];
  const tabs = [...box.querySelectorAll<HTMLButtonElement>("[data-step]")];
  const readers = [...box.querySelectorAll<HTMLButtonElement>("[data-reader]")];
  const next = box.querySelector<HTMLButtonElement>("[data-next]");
  const readerNote = box.querySelector<HTMLElement>("[data-reader-note]");

  let step = 0;
  let reader = store("iyi-reader") === "agent" ? "agent" : "person";

  const render = () => {
    tabs.forEach((tab, i) => tab.setAttribute("aria-selected", String(i === step)));
    steps.forEach((panel, i) => (panel.hidden = i !== step));
    readers.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.reader === reader)));
    box.dataset.reader = reader;
    if (readerNote) readerNote.textContent = reader === "person" ? "rendered for you" : "exactly what the agent receives";
    if (next) next.textContent = step === steps.length - 1 ? "Start over" : "Next step →";
  };

  box.addEventListener("click", (event) => {
    const b = (event.target as HTMLElement).closest("button");
    if (!b) return;
    if (b.dataset.step !== undefined) step = Number(b.dataset.step);
    else if (b.dataset.reader !== undefined) {
      reader = b.dataset.reader;
      store("iyi-reader", reader);
    } else if (b.hasAttribute("data-next")) step = (step + 1) % steps.length;
    else return;
    render();
  });

  render();
  return (to: number) => {
    step = to;
    render();
    box.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  };
}

/* The rebuild question ---------------------------------------------------- */

function wireDiff(box: HTMLElement, options: HTMLElement) {
  options.dataset.js = "true";
  box.dataset.js = "true";
  const buttons = [...options.querySelectorAll<HTMLButtonElement>("[data-edit]")];
  const panels = [...box.querySelectorAll<HTMLElement>("[data-edit-panel]")];
  const pick = (edit: string) => {
    buttons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.edit === edit)));
    panels.forEach((p) => (p.hidden = p.dataset.editPanel !== edit));
  };
  options.addEventListener("click", (event) => {
    const b = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-edit]");
    if (b?.dataset.edit) pick(b.dataset.edit);
  });
  pick(buttons[0]?.dataset.edit ?? "body");
}

export function wireAgentsPage() {
  const loop = document.querySelector<HTMLElement>("#loopbox");
  const goStep = loop ? wireLoop(loop) : () => {};
  const diff = document.querySelector<HTMLElement>("#diffbox");
  const options = document.querySelector<HTMLElement>("#diffopts");
  if (diff && options) wireDiff(diff, options);
  /* The race's step links lead to the loop; here they open that step. */
  document.querySelector("[data-agent-race]")?.addEventListener("click", (event) => {
    const step = (event.target as HTMLElement).closest<HTMLElement>("[data-goto]");
    if (!step) return;
    event.preventDefault();
    goStep(Number(step.dataset.goto));
  });
}
