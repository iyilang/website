/**
 * Which lines of a sample program a listing shows: the selection
 * `components/Sample.astro` renders on a page and `pages/llms-full.txt.ts`
 * writes into plain text. One function, so a lesson's listing and the text an
 * agent reads of the same lesson are the same lines.
 *
 * Three ways to select part of a file, in order of preference:
 *
 *   region  a named top-level declaration, "impl Greet for User". Survives an
 *           edit above it, which is why it is first.
 *   from    the first line containing it. Add `block` to run through the `end`
 *           that closes it, matched on the opener's own indentation, or `to` to
 *           run through the first later line containing another string. Content
 *           anchored, so both survive an edit above them.
 *   lines   "63-69". A guess about a file nobody edits with this site in mind,
 *           so it requires `must` and fails the build when the guess rots.
 *
 * `must` is available on all three: a substring the selection has to contain.
 */
import samples from "../generated/samples/index.json";

export interface Selection {
  path: string;
  region?: string;
  from?: string;
  to?: string;
  block?: boolean;
  lines?: string;
  must?: string;
}

export type RecordedSample = {
  path: string;
  text: string;
  lines: number;
  regions: Record<string, { start: number; end: number }>;
  ambiguous: string[];
};

export interface Selected {
  sample: RecordedSample;
  /** First and last line shown, one based and inclusive. */
  start: number;
  end: number;
  /** Whether the selection is the whole file. */
  whole: boolean;
  /** The selected lines, joined. */
  text: string;
}

export function selectSample({ path, region, from, to, block, lines, must }: Selection): Selected {
  const key = path.replace(/^samples\//, "");
  const sample = (samples as Record<string, RecordedSample>)[key];

  if (!sample) {
    throw new Error(
      `Sample: there is no "${path}" under samples/. The tree has ` +
        `${Object.keys(samples).join(", ")}. A listing on this site is read out ` +
        `of the file it claims to be, so a name that does not resolve is a ` +
        `build failure rather than a blank.`,
    );
  }

  const all = sample.text.replace(/\n$/, "").split("\n");

  let start = 1;
  let end = all.length;
  let whole = true;

  if (region !== undefined) {
    const span = sample.regions[region];
    if (!span) {
      if (sample.ambiguous.includes(region)) {
        throw new Error(
          `Sample: "${region}" is declared more than once in ${sample.path}, so ` +
            `naming it selects nothing. Overloads have to be selected with ` +
            `from/to.`,
        );
      }
      throw new Error(
        `Sample: ${sample.path} declares no "${region}". It declares ` +
          `${Object.keys(sample.regions).join(", ")}.`,
      );
    }
    start = span.start;
    end = span.end;
    whole = false;
  } else if (from !== undefined) {
    const at = all.findIndex((line) => line.includes(from));
    if (at === -1) {
      throw new Error(`Sample: no line of ${sample.path} contains "${from}".`);
    }
    start = at + 1;
    if (block) {
      // Extend to the `end` that closes what `from` opened, found by matching
      // the opener's own indentation. Content anchored like `from` itself, so a
      // block that moves or grows still selects exactly the block.
      const indent = /^\s*/.exec(all[at])?.[0] ?? "";
      const closer = `${indent}end`;
      const close = all.findIndex((line, i) => i > at && line === closer);
      if (close === -1) {
        throw new Error(
          `Sample: ${sample.path} opens a block at line ${start} with "${from}" ` +
            `and no later line is exactly "${closer}", so the block cannot be ` +
            `closed. Widen the selection or use from/to.`,
        );
      }
      end = close + 1;
    } else if (to !== undefined) {
      const close = all.findIndex((line, i) => i > at && line.includes(to));
      if (close === -1) {
        throw new Error(
          `Sample: ${sample.path} has "${from}" at line ${start} but no later ` +
            `line containing "${to}".`,
        );
      }
      end = close + 1;
    } else {
      end = start;
    }
    whole = false;
  } else if (lines !== undefined) {
    if (must === undefined) {
      throw new Error(
        `Sample: selecting ${sample.path} by line number requires "must", a ` +
          `substring the selection has to contain. Without it a line that moves ` +
          `silently shows the wrong code.`,
      );
    }
    const m = /^(\d+)(?:-(\d+))?$/.exec(lines.trim());
    if (!m) throw new Error(`Sample: "${lines}" is not a line or a line range.`);
    start = Number(m[1]);
    end = m[2] ? Number(m[2]) : start;
    if (start < 1 || end > all.length || end < start) {
      throw new Error(`Sample: ${sample.path} has ${all.length} lines, so ${lines} is not in it.`);
    }
    whole = false;
  }

  const text = all.slice(start - 1, end).join("\n");

  if (must !== undefined && !text.includes(must)) {
    throw new Error(
      `Sample: ${sample.path} lines ${start} to ${end} do not contain "${must}". ` +
        `The file changed under this selection, so the page would have shown ` +
        `code the lesson is not talking about.`,
    );
  }

  return { sample, start, end, whole, text };
}
