/**
 * Where a reference page's subject turns up in the recorded samples.
 *
 * A reference page is what `iyi doc` printed, and for a good many types that is
 * a signature or two and a sentence: `ChannelClosed` is a struct with nothing
 * in it, and its whole meaning is the line in a program that matches on it.
 * The samples are where that line already exists, compiled and recorded, so
 * this file finds it rather than anyone writing an example for the page. A
 * code example on this site is never typed by hand, and a derived one is the
 * only kind a page can carry without breaking that.
 *
 * WHAT COUNTS AS A USE. For a prelude type, its name as a whole word in the
 * program's code: comments and string literals are blanked first, because a
 * sample's header comment mentions `Reference` in prose and `"Nil"` printed as
 * text is not the type. For a std module, `import std/<slug>`, and then the
 * first later line that names something the import brought in, because an
 * import line on its own shows the reader nothing they did not already read
 * in the page's own hero. `records/break/*` is never searched: those programs
 * are wrong on purpose, and an example that does not compile is the last thing
 * a reference page should offer. Nor is the rest of `records/`, whose fixtures
 * exist for the agent race and have no page of their own to link to, and a
 * link scheme invented for them would be a second way of pointing at a file.
 *
 * WHICH ONES. At most two, from different files, the tour first, in the tour's
 * own order, since those are the programs written to be read; then the
 * repository's samples the playground can run; then the rest of them. Each
 * links where the site already sends a reader for that file: its playground
 * page when it has one, and otherwise the file in the iyi repository at the
 * release tag, which is how the std pages already link their module's source.
 *
 * THE EXCERPT is the top-level block holding the first use: from the nearest
 * line above it that starts at column zero to the `end` that closes it, with
 * the comment written directly above it when that still fits. Capped, because
 * a match inside a two hundred line class is a reason to show the lines around
 * the match and not the class. The result is a line range handed to
 * `Sample.astro`, so the listing is painted from the compiler's tokens and
 * checked against the file exactly like every other listing on the site.
 */
import samples from "../generated/samples/index.json";
import { curatedSamples, playgroundHref, tourSamples } from "../playground/samples";
import { reference, type ModulePage, type ReferencePage } from "./reference";

export interface SampleExample {
  /** Repository relative path, as `Sample.astro` takes it. */
  path: string;
  /** Inclusive, one based. */
  start: number;
  end: number;
  /** The matched line's text, handed to `Sample.astro` as `must`, so an
   * excerpt that stops containing the use fails the build. */
  must: string;
  href: string;
  /** What the link leads to, which differs: a page that runs the program, a
   * page with its recorded output, or the file in the repository. */
  link: "run" | "recorded" | "source";
}

type Indexed = { path: string; text: string };

/** At most this many examples on one page, each from a different file. */
const PER_PAGE = 2;
/** Lines in one excerpt. Long enough for a whole short function, short
 * enough that two of them do not bury the page's own declarations. */
const CAP = 16;

const base = import.meta.env.BASE_URL.replace(/\/*$/, "/");

/* The search order, built once. Every tour step has a page under
 * /playground/, runnable or recorded, which is the same href the learn index
 * builds for a step the wasm record does not cover. */
const tourOrder = tourSamples.map((step) => step.path);
const curatedIyi = curatedSamples.filter((sample) => sample.set === "iyi").map((sample) => sample.path);
const indexed = Object.values(samples as Record<string, Indexed>);
const otherIyi = indexed
  .map((sample) => sample.path)
  .filter((path) => path.startsWith("samples/iyi/") && !curatedIyi.includes(path));
const order = [...tourOrder, ...curatedIyi, ...otherIyi];

const byPath = new Map(indexed.map((sample) => [sample.path, sample]));
for (const path of order) {
  if (!byPath.has(path)) {
    throw new Error(
      `reference-samples: the playground record names ${path} and the samples ` +
        `index has no such file, so the two disagree about what the samples are.`,
    );
  }
}

/**
 * The program's text with every comment and string literal blanked to spaces,
 * line for line, so a match found here is at the same line in the original.
 * Done over the whole file rather than per line because a string literal can
 * span lines (`samples/iyi/calc.iyi` has one). Interpolations are blanked with
 * their string: a use there would be found again in plainer code, and if not,
 * a missed example costs less than a wrong one.
 */
function codeOnly(text: string): string[] {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\n") {
      out += c;
      continue;
    }
    if (inString) {
      if (c === "\\") {
        out += " ";
        if (text[i + 1] !== undefined && text[i + 1] !== "\n") {
          out += " ";
          i++;
        }
        continue;
      }
      if (c === '"') inString = false;
      out += c === '"' ? c : " ";
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === "'") {
      const literal = /^'(?:\\.|[^'\\])'/.exec(text.slice(i, i + 8));
      if (literal) {
        out += " ".repeat(literal[0].length);
        i += literal[0].length - 1;
        continue;
      }
    }
    if (c === "#") {
      while (i < text.length && text[i] !== "\n") {
        out += " ";
        i++;
      }
      i--;
      continue;
    }
    out += c;
  }
  return out.split("\n");
}

const code = new Map(order.map((path) => [path, codeOnly(byPath.get(path)!.text)]));

const escape = (word: string): string => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* A whole word: not part of a longer identifier, not an instance variable,
 * not the tail of a `Foo::Name` path or a `:symbol`, not a method `name?`. */
const wordOf = (name: string): RegExp => new RegExp(`(?<![\\w@:$])${escape(name)}(?![\\w?!])`);

const indentOf = (line: string): number => /^\s*/.exec(line)![0].length;
const blank = (line: string): boolean => line.trim() === "";
const comment = (line: string): boolean => line.trimStart().startsWith("#");
/* The line that closes a block: `end` (or `end!`, `end.each`), or the brace
 * or parenthesis a block or a multi-line call was opened with. */
const closer = (line: string): boolean => /^(end\b|\}|\))/.test(line.trimStart());

/* The next line of code after `index`, past blanks and comments, or the
 * length of the file. A line opens a block when this one is indented deeper
 * than it; a comment is skipped because a block often opens on one. */
function nextCode(lines: string[], index: number): number {
  let next = index + 1;
  while (next < lines.length && (blank(lines[next]) || comment(lines[next]))) next++;
  return next;
}

/**
 * The line range to show for a use at `at` (zero based), as one based
 * inclusive numbers.
 */
function excerpt(lines: string[], at: number): { start: number; end: number } {
  // The statement at column zero that holds the use.
  let top = at;
  while (top > 0 && (indentOf(lines[top]) > 0 || blank(lines[top]) || comment(lines[top]))) top--;

  const next = nextCode(lines, top);
  const opens = next < lines.length && indentOf(lines[next]) > 0;

  let last: number;
  if (opens) {
    // Through the first later line back at column zero, if it is the closer;
    // a program that ends inside the block ends the excerpt there too.
    let close = Math.max(next, at);
    while (close + 1 < lines.length && (blank(lines[close + 1]) || indentOf(lines[close + 1]) > 0)) close++;
    if (close + 1 < lines.length && closer(lines[close + 1])) close++;
    last = close;
  } else {
    // A plain statement: the paragraph it sits in.
    last = at;
    while (last + 1 < lines.length && !blank(lines[last + 1])) last++;
    while (top > 0 && !blank(lines[top - 1]) && !comment(lines[top - 1])) top--;
  }
  while (last > at && blank(lines[last])) last--;

  // The comment written directly above, when it still fits.
  let lead = top;
  while (lead > 0 && comment(lines[lead - 1]) && indentOf(lines[lead - 1]) === 0) lead--;
  if (last - lead + 1 <= CAP) top = lead;

  if (last - top + 1 <= CAP) return { start: top + 1, end: last + 1 };

  // Too long: a window around the use. It opens on the outermost line within
  // a few lines above the use that the use is nested under, so the excerpt
  // starts on a `g.spawn do` or a `def` rather than on the tail of whatever
  // came before, and never reaches past a blank line, because a program's
  // blank lines are where its author put the seams.
  let from = at;
  let floor = indentOf(lines[at]);
  for (let line = at - 1; line >= Math.max(top, at - 4); line--) {
    if (blank(lines[line])) break;
    const indent = indentOf(lines[line]);
    if (indent <= floor && !closer(lines[line])) from = line;
    floor = Math.min(floor, indent);
  }

  // It closes where that opening line's block does, when it opens one and
  // that fits. Otherwise at the last blank line before the cap, so what is
  // shown is whole methods or whole steps, and only failing both at the cap.
  let to = Math.min(last, from + CAP - 1);
  const opening = indentOf(lines[from]);
  const inner = nextCode(lines, from);
  const shut =
    inner < lines.length && indentOf(lines[inner]) > opening
      ? lines.findIndex((line, index) => index > at && index <= to && !blank(line) && indentOf(line) <= opening)
      : -1;
  if (shut !== -1) {
    to = closer(lines[shut]) ? shut : shut - 1;
  } else if (to < last) {
    let seam = to;
    while (seam > at && !blank(lines[seam])) seam--;
    if (seam > at) to = seam - 1;
  }
  while (to > at && blank(lines[to])) to--;
  return { start: from + 1, end: to + 1 };
}

function linkOf(path: string): Pick<SampleExample, "href" | "link"> {
  const run = playgroundHref(path);
  if (run !== null) return { href: run, link: "run" };
  const step = tourSamples.find((candidate) => candidate.path === path);
  if (step !== undefined) return { href: `${base}playground/${step.id}/`, link: "recorded" };
  return {
    href: `https://github.com/iyilang/iyi/blob/${reference.release.tag}/${path}`,
    link: "source",
  };
}

function example(path: string, at: number): SampleExample {
  const lines = byPath.get(path)!.text.replace(/\n$/, "").split("\n");
  return { path, ...excerpt(lines, at), must: lines[at].trim(), ...linkOf(path) };
}

/** The samples that use a prelude type, at most two. */
export function typeExamples(page: ReferencePage): SampleExample[] {
  const word = wordOf(page.name);
  const found: SampleExample[] = [];
  for (const path of order) {
    if (found.length === PER_PAGE) break;
    const at = code.get(path)!.findIndex((line) => word.test(line));
    if (at !== -1) found.push(example(path, at));
  }
  return found;
}

/* What an import brings into scope, by name: the braces when it lists them,
 * otherwise everything the module declares under a name of its own. An impl
 * or a reopened prelude type adds methods, not a name, so it cannot be looked
 * for. */
function importedNames(page: ModulePage, rest: string): string[] {
  const listed = /^::\{([^}]*)\}/.exec(rest);
  if (listed) return listed[1].split(",").map((name) => name.trim()).filter(Boolean);
  return page.items
    .filter((item) => item.kind !== "impl" && !item.kind.includes("reopened"))
    .map((item) => /^[A-Za-z_]\w*/.exec(item.name)?.[0])
    .filter((name): name is string => name !== undefined);
}

/** The samples that import a std module, at most two. */
export function moduleExamples(page: ModulePage): SampleExample[] {
  const importLine = new RegExp(`^import ${escape(page.name)}(?=::|\\s*$)(.*)$`);
  const found: SampleExample[] = [];
  for (const path of order) {
    if (found.length === PER_PAGE) break;
    const lines = code.get(path)!;
    const at = lines.findIndex((line) => importLine.test(line));
    if (at === -1) continue;
    const words = importedNames(page, importLine.exec(lines[at])![1].trim()).map(wordOf);
    const use = lines.findIndex(
      (line, index) => index > at && !/^import\s/.test(line) && words.some((word) => word.test(line)),
    );
    // Nothing nameable used (a module that only reopens `String`, say): the
    // first code after the imports, which is where such a sample starts using
    // what it imported.
    let first = at + 1;
    while (first < lines.length && (blank(lines[first]) || /^import\s/.test(lines[first]))) first++;
    found.push(example(path, use !== -1 ? use : Math.min(first, lines.length - 1)));
  }
  return found;
}
