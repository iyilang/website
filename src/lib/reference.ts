/**
 * The standard library reference: what `iyi doc` printed for every std
 * module and every prelude type at the release, cut into pages by
 * scripts/stdlib.mjs. That script says what is the compiler's and what is the
 * source's; this file only names the pages and says what a results page is
 * told about each.
 */
import stdlib from "../generated/stdlib.json";

/** A comment, as blocks: a paragraph or a list as HTML, code as text. */
export type Block =
  | { kind: "paragraph"; html: string }
  | { kind: "list"; items: string[] }
  | { kind: "code"; text: string };

/** One declaration: its heading, its doc comment, and its listing verbatim. */
export interface Item {
  id: string;
  kind: string;
  name: string;
  doc: Block[];
  code: string;
}

export interface ReferencePage {
  name: string;
  slug: string;
  /** The first sentence of the header comment, or null where there is none. */
  summary: string | null;
  intro: Block[];
  items: Item[];
}

export interface ModulePage extends ReferencePage {
  /** Repository relative path of the module's source. */
  path: string;
}

export const reference = stdlib as unknown as {
  release: { version: string; tag: string; commit: string };
  recorded: { compiler: string; commit: string; machine: string; command: string; when: string };
  modules: ModulePage[];
  prelude: ReferencePage[];
};

const base = import.meta.env.BASE_URL.replace(/\/*$/, "/");

export const referenceHref = (): string => `${base}reference/`;
export const moduleHref = (page: ModulePage): string => `${base}reference/std/${page.slug}/`;
export const typeHref = (page: ReferencePage): string => `${base}reference/prelude/${page.slug}/`;

/* A results page's description: the header comment's first sentence when it
 * is one a reader can use, then what the page is. A first sentence that cites
 * SPEC.md or the README is written for someone holding the repository
 * ("Text, SPEC.md, item 3"), so it is left to the page and the generic
 * description stands in. Either way it has to fit the 155 characters the
 * layout allows. */
const DESCRIPTION_MAX = 155;
const usable = (summary: string | null): summary is string =>
  summary !== null && !/SPEC\.md|README/.test(summary);

function describe(summary: string | null, what: string, fallback: string): string {
  if (usable(summary)) {
    const joined = `${summary} ${what}`;
    if (joined.length <= DESCRIPTION_MAX) return joined;
  }
  return fallback;
}

export function moduleSearch(page: ModulePage): { title: string; description: string } {
  return {
    title: `${page.name} module, iyi standard library`,
    description: describe(
      page.summary,
      `Reference for ${page.name} in the iyi standard library.`,
      `Reference for ${page.name} in the iyi standard library: every exported type and function, with its doc comments.`,
    ),
  };
}

export function typeSearch(page: ReferencePage): { title: string; description: string } {
  return {
    title: `${page.name} methods in iyi: prelude reference`,
    description: describe(
      page.summary,
      `Every method iyi's prelude gives ${page.name}.`,
      `The ${page.name} type in iyi: every method the prelude gives it, with its signature and doc comment.`,
    ),
  };
}
