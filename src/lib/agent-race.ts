/**
 * The agent race's replay: the same four verbs in two lanes, one reading the
 * sources and one reading `iyi mod context`'s pack.
 *
 * The race is illustrative, and every page that shows it says so under it.
 * It plays once when it is seen and again on Replay, never on a loop. The
 * module bodies scrolling through its lanes are generated here from a fixed
 * seed; the numbers it lands on are the measured ones, which the component
 * hands it through data attributes read out of facts.json.
 *
 * The steps under each lane are links to the recorded loop. The /agents page
 * opens the matching step in place; anywhere else the link is followed.
 */

import { playWhenSeen, reducedMotion } from "./play-when-seen";

export function wireAgentRace(race: HTMLElement) {
  const modules = Number(race.dataset.modules);
  const packLow = Number(race.dataset.packLow);
  const packHigh = Number(race.dataset.packHigh);
  const packMid = (packLow + packHigh) / 2;

  const WORDS = ["http", "json", "strings", "io", "path", "time", "fmt", "hash", "list", "map", "log", "bytes", "math", "sort", "sync", "fs", "uri", "csv", "toml", "term", "env", "cli", "color", "diff", "test", "net", "rand", "os"];
  const TYPES = ["String", "Int32", "Bool", "Bytes", "Float64", "Array(String)"];
  let seed = 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

  const srcLines: string[] = [];
  const packLines: string[] = [];
  for (let i = 0; i < modules; i++) {
    const w = i === 0 ? "app" : i === 1 ? "greeter" : WORDS[(i - 2) % WORDS.length];
    if (i === 0) {
      srcLines.push("module app", "import app/greeter::*", "pub def main : Int32", '  puts polit("Türkiye")', "  0", "end");
      packLines.push("pub def main : Int32");
      continue;
    }
    if (i === 1) {
      srcLines.push("module app/greeter", "pub trait Greet", "  abstract def greet : String", "end", "pub def polite(name : String) : String", '  "#{greeting}, #{name}."', "end", "pub def shout(name : String) : String", '  "#{greeting.upcase}, #{name.upcase}!"', "end", "def greeting : String", '  "Hello"', "end");
      packLines.push("def polite(name : String) : String", "def shout(name : String) : String", "trait Greet · abstract def greet : String");
      continue;
    }
    srcLines.push(`module lib/${w}`);
    const count = 2 + Math.floor(rnd() * 3);
    for (let f = 0; f < count; f++) {
      const fn = `${w}_${pick(["parse", "read", "build", "each", "merge", "check", "format", "split"])}`;
      const sig = `def ${fn}(x : ${pick(TYPES)}) : ${pick(TYPES)}`;
      packLines.push(sig);
      srcLines.push(`pub ${sig}`);
      const lines = 2 + Math.floor(rnd() * 5);
      for (let b = 0; b < lines; b++) {
        srcLines.push(`  ${pick(["acc = [] of String", "x.each { |v| acc << v }", "return default unless x", "buf = IO::Memory.new", `check!(x, "${w}")`, "result = step(acc, x)", `raise Error.new("bad ${w}") if x.nil?`, "cache[x] ||= compute(x)"])}`);
      }
      srcLines.push("end");
    }
  }

  const MARKS = [0, 0.66, 0.8, 0.92];
  const lanes = [...race.querySelectorAll<HTMLElement>("[data-lane]")];
  const foot = race.querySelector<HTMLElement>("[data-foot]");
  const dot = race.querySelector<HTMLElement>("[data-dot]");
  let t = 1;

  const tick = () => {
    const done = t >= 1;
    const read = Math.min(1, t / 0.55);
    const arms = [
      { pct: read * 100, lines: srcLines, keep: 12, label: `${Math.round(read * 100)}%` },
      { pct: read * packMid, lines: packLines, keep: 4, label: read >= 1 ? `${packLow}–${packHigh}%` : `${Math.round(read * packMid)}%` },
    ];
    arms.forEach((arm, k) => {
      const lane = lanes[k];
      if (!lane) return;
      const n = Math.floor(read * arm.lines.length);
      lane.dataset.full = String(k === 0 && arm.pct > 85);
      const text = lane.querySelector<HTMLElement>(".lane-text");
      if (text) text.innerHTML = arm.lines.slice(Math.max(0, n - arm.keep), n).map((x) => `<div>${x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`).join("");
      const num = lane.querySelector<HTMLElement>(".lane-num b");
      if (num) num.textContent = arm.label;
      const bar = lane.querySelector<HTMLElement>(".lane-bar i");
      if (bar) bar.style.width = `${arm.pct}%`;
      lane.querySelectorAll<HTMLElement>("[data-goto]").forEach((b, i) => {
        const on = i === 0 ? read >= 1 : t >= MARKS[i];
        const active = !on && (i === 0 ? t > 0 : t >= MARKS[i] - 0.12 && t >= MARKS[i - 1]);
        b.dataset.state = on ? "done" : active ? "active" : "idle";
      });
    });
    race.dataset.done = String(done);
    if (dot) dot.dataset.done = String(done);
    if (foot) foot.dataset.done = String(done);
  };

  /* Under reduced motion there is nothing to replay, so the control is not
   * offered: the race stays at its finished state. */
  if (reducedMotion()) {
    t = 1;
    tick();
    return;
  }
  race.dataset.js = "true";

  /* One run, then the finished result stays. A replay that loops reads as
   * decoration; Replay runs it again. */
  let timer = 0;
  let played = false;
  const play = () => {
    played = true;
    window.clearInterval(timer);
    t = 0;
    tick();
    timer = window.setInterval(() => {
      t = Math.min(1, t + 0.011);
      tick();
      if (t >= 1) window.clearInterval(timer);
    }, 70);
  };

  race.querySelector("[data-replay]")?.addEventListener("click", play);

  /* Once the reader has scrolled and the whole of it is in the upper part of
   * the screen. Either alone was not enough on /agents, where it sits under
   * the heading: at load it started with its numbers below the fold, and on a
   * screen tall enough to hold it whole it played out while the reader was
   * still on the heading. A page restored part way down counts as scrolled. */
  const playOnce = () => {
    if (!played) play();
  };
  if (scrollY > 0) playWhenSeen(race, playOnce);
  else addEventListener("scroll", () => playWhenSeen(race, playOnce), { once: true, passive: true });
}
