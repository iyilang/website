#!/usr/bin/env node
// The standard library reference, checked against the release and cut into
// pages.
//
// records/stdlib.json is what `iyi doc` printed for every module under
// src/std and every prelude type, recorded by `npm run record:stdlib` at the
// release's tag. The Pages build has no compiler, so this script does not
// make the record: it refuses one that is not about the release the site
// publishes, or that was printed from source the release does not ship, and
// then writes src/generated/stdlib.json, the record cut into what a page
// renders.
//
// WHAT IS THE COMPILER'S AND WHAT IS THE SOURCE'S. Every signature and every
// doc comment on a reference page is in the recorded surface, verbatim. The
// one thing no compiler output carries is a module's header comment, the
// block above `module std/...`, so that is read out of the source at the tag,
// whose digest the record already pins.
//
// WHAT THIS PARSES. Not iyi. The surface is a listing: optional `#` lines,
// then a declaration at the left margin, then whatever is indented under it,
// then an `end` at the margin if the declaration opened a block. That shape is
// cut into one item per declaration, so each type and each top-level function
// gets a heading and an address. The declaration's own text goes to the page
// unchanged; the cut only decides where one item stops.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { escape } from "./markdown.mjs";
import { blobAt, releaseRef, treeAt } from "./release-ref.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, "..");
const repo = process.env.IYI_REPO ? resolve(process.env.IYI_REPO) : resolve(site, "..", "iyi");
const recordPath = resolve(site, "records", "stdlib.json");
const out = resolve(site, "src", "generated", "stdlib.json");

const release = releaseRef(repo);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const problems = [];
const problem = (message) => problems.push(message);
const again = "Regenerate with npm run record:stdlib, at the release's tag.";

if (!existsSync(recordPath)) {
  throw new Error(`records/stdlib.json is not there. ${again}`);
}
const record = JSON.parse(readFileSync(recordPath, "utf8"));

// ---------------------------------------------------------------------------
// The record is about this release, and about what it ships
// ---------------------------------------------------------------------------

for (const field of ["compiler", "commit", "machine", "command", "when"]) {
  if (typeof record.recorded?.[field] !== "string" || record.recorded[field] === "") {
    problem(`records/stdlib.json: provenance field "${field}" is empty`);
  }
}
if (record.recorded?.commit !== release.commit) {
  problem(
    `records/stdlib.json was recorded at ${String(record.recorded?.commit).slice(0, 9)} ` +
      `and the site publishes ${release.tag}, ${release.commit.slice(0, 9)}. ${again}`,
  );
}

const shipped = treeAt(repo, release.tag, "src/std").filter((path) =>
  /^src\/std\/[^/]+\.iyi$/.test(path),
);
const recordedPaths = new Set(record.modules.map((module) => module.path));
for (const path of shipped) {
  if (!recordedPaths.has(path)) problem(`${path} is in ${release.tag} and not in the record. ${again}`);
}
for (const module of record.modules) {
  const bytes = blobAt(repo, release.tag, module.path);
  if (bytes === null) {
    problem(`records/stdlib.json documents ${module.path}, which ${release.tag} does not ship. ${again}`);
  } else if (sha256(bytes) !== module.sourceSha256) {
    problem(`${module.path} at ${release.tag} is not the file its surface was printed from. ${again}`);
  }
}

const preludeShipped = treeAt(repo, release.tag, "src/iyi").filter((path) => path.endsWith(".iyi"));
const preludeRecorded = new Map(record.prelude.sources.map((source) => [source.path, source.sha256]));
for (const path of preludeShipped) {
  const digest = preludeRecorded.get(path);
  if (digest === undefined) {
    problem(`${path} is in ${release.tag} and the prelude record does not name it. ${again}`);
  } else if (digest !== sha256(blobAt(repo, release.tag, path))) {
    problem(`${path} at ${release.tag} is not the prelude the record was printed from. ${again}`);
  }
}
if (preludeRecorded.size !== preludeShipped.length) {
  problem(`the prelude record names files ${release.tag} does not ship. ${again}`);
}

if (problems.length > 0) {
  throw new Error(`stdlib:\n  ${problems.join("\n  ")}`);
}

// ---------------------------------------------------------------------------
// Comments into blocks
// ---------------------------------------------------------------------------

/* The inline spans doc comments use: code in backticks, an argument's name in
 * single asterisks. Code first and whole, because what is inside a code span
 * is not markup. Nothing else is read as markup: `a[i][j]` outside backticks
 * is text, not a reference link. */
function inline(text) {
  const spans = [];
  let html = text.replace(/`([^`]+)`/g, (_, code) => {
    spans.push(`<code>${escape(code)}</code>`);
    return `\u0000${spans.length - 1}\u0000`;
  });
  html = escape(html).replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s.,;:)]|$)/g, "$1<em>$2</em>");
  return html.replace(/\u0000(\d+)\u0000/g, (_, index) => spans[Number(index)]);
}

/** Comment text, its `#` and one space already gone, as page blocks. */
function blocksOf(lines) {
  const blocks = [];
  let paragraph = [];
  let list = null;
  let code = null;
  let fenced = false;

  /* A rule drawn in the comment (`── Channel — III.4.6 ───`, `---- lazy
   * adaptors ----`) is the source file's furniture, a divider between
   * stretches of code, and on a page it would be a paragraph of dashes. */
  const DIVIDER = /──|^-{3,}|^={3,}/;
  const flush = () => {
    const text = paragraph.join(" ");
    if (paragraph.length > 0 && !DIVIDER.test(text)) blocks.push({ kind: "paragraph", html: inline(text) });
    if (list !== null) blocks.push({ kind: "list", items: list.map((item) => inline(item.join(" "))) });
    if (code !== null) blocks.push({ kind: "code", text: code.join("\n").replace(/\n+$/, "") });
    paragraph = [];
    list = null;
    code = null;
  };

  for (const line of lines) {
    if (fenced) {
      if (/^```/.test(line)) {
        fenced = false;
        flush();
      } else code.push(line);
      continue;
    }
    if (/^```/.test(line)) {
      flush();
      fenced = true;
      code = [];
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    const item = /^[*-]\s+(.*)$/.exec(line);
    if (item) {
      if (list === null) {
        flush();
        list = [];
      }
      list.push([item[1]]);
      continue;
    }
    if (list !== null && /^ {2}\S/.test(line)) {
      list[list.length - 1].push(line.trim());
      continue;
    }
    if (/^\s{2,}\S/.test(line)) {
      if (code === null) {
        flush();
        code = [];
      }
      code.push(line.replace(/^ {2}/, ""));
      continue;
    }
    if (code !== null || list !== null) flush();
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

const uncomment = (line) => line.replace(/^#\s?/, "");

/** The first sentence of a comment, as plain text, or null where it has none. */
function sentenceOf(blocks) {
  const first = blocks.find((block) => block.kind === "paragraph");
  if (!first) return null;
  const text = first.html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  const sentence = /^(.+?[.!?])(?:\s|$)/.exec(text)?.[1] ?? text;
  return sentence.trim();
}

// ---------------------------------------------------------------------------
// A surface into items
// ---------------------------------------------------------------------------

const DECLARATION =
  /^(?:(?:pub|protected|private)\s+)?(?:abstract\s+)?(struct|class|trait|enum|module|lib|impl|annotation|alias|type|def|macro|fun|metaclass|function|tuple)\s+(.+)$/;

/** What a declaration line is, and what to call it in a heading. */
function headingOf(line) {
  const match = DECLARATION.exec(line);
  if (!match) return { kind: "declaration", name: line.trim() };
  const [, kind, rest] = match;
  if (kind === "impl") return { kind, name: rest.trim() };
  if (kind === "def" || kind === "macro" || kind === "fun") {
    return { kind, name: /^(\S+?)(?:\(|\s|$)/.exec(rest)?.[1] ?? rest };
  }
  const name = /^(::)?([^\s(<]+(?:\([^)]*\))?)/.exec(rest);
  return {
    kind: name?.[1] ? `${kind}, reopened` : kind,
    name: name?.[2] ?? rest,
  };
}

/** The listing cut at its left margin into one item per declaration. */
function itemsOf(surface) {
  const lines = surface.replace(/\n+$/, "").split("\n");
  const items = [];
  let comment = [];
  let at = 0;
  while (at < lines.length) {
    const line = lines[at];
    if (line === "") {
      comment = [];
      at += 1;
      continue;
    }
    if (line.startsWith("#")) {
      comment.push(uncomment(line));
      at += 1;
      continue;
    }
    /* A declaration, then what is indented under it, blank lines included
     * where more indentation follows, then its `end`. */
    const body = [line];
    at += 1;
    while (at < lines.length) {
      const next = lines[at];
      if (/^\s/.test(next)) {
        body.push(next);
        at += 1;
      } else if (next === "") {
        const ahead = lines.slice(at).find((candidate) => candidate !== "");
        if (ahead !== undefined && /^\s/.test(ahead)) {
          body.push(next);
          at += 1;
        } else break;
      } else break;
    }
    if (lines[at] === "end") {
      body.push("end");
      at += 1;
    }
    items.push({ ...headingOf(line), doc: blocksOf(comment), code: body.join("\n") });
    comment = [];
  }
  return items;
}

/** An address per item, unique on its page. */
function withIds(items) {
  const taken = new Map();
  return items.map((item) => {
    const base =
      (item.kind === "impl" ? `impl-${item.name}` : item.name)
        .replace(/[^A-Za-z0-9_?!]+/g, "-")
        .replace(/[?!]/g, (c) => (c === "?" ? "-q" : "-bang"))
        .replace(/^-+|-+$/g, "") || "item";
    const count = (taken.get(base) ?? 0) + 1;
    taken.set(base, count);
    return { id: count === 1 ? base : `${base}-${count}`, ...item };
  });
}

// ---------------------------------------------------------------------------
// The pages
// ---------------------------------------------------------------------------

const modules = record.modules.map((module) => {
  const source = blobAt(repo, release.tag, module.path).toString("utf8").replace(/\r\n/g, "\n");
  const lines = source.split("\n");
  const declaredAt = lines.findIndex((line) => /^module\s/.test(line));
  const header = lines
    .slice(0, declaredAt)
    .filter((line) => line.startsWith("#") || line.trim() === "")
    .map((line) => (line.startsWith("#") ? uncomment(line) : ""));
  const intro = blocksOf(header);
  const surface = module.surface.slice(module.surface.indexOf("\n") + 1);
  return {
    name: module.name,
    slug: module.name.slice("std/".length),
    path: module.path,
    summary: sentenceOf(intro),
    intro,
    items: withIds(itemsOf(surface)),
  };
});

const prelude = record.prelude.types.map((type) => {
  const items = withIds(itemsOf(type.surface));
  /* A type's surface is one declaration, sometimes followed by the same
   * type's reopening in another prelude file. The first item's comment is
   * the type's own and becomes the page's introduction. */
  const intro = items[0]?.doc ?? [];
  return {
    name: type.name,
    slug: type.name.toLowerCase(),
    summary: sentenceOf(intro),
    intro,
    items: items.map((item, index) => (index === 0 ? { ...item, doc: [] } : item)),
  };
});

const slugs = new Set();
for (const page of [...modules.map((m) => `std/${m.slug}`), ...prelude.map((p) => `prelude/${p.slug}`)]) {
  if (slugs.has(page)) throw new Error(`stdlib: two reference pages would be at /reference/${page}/`);
  slugs.add(page);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  `${JSON.stringify(
    {
      release: { version: release.version, tag: release.tag, commit: release.commit },
      recorded: record.recorded,
      modules,
      prelude,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const declarations = [...modules, ...prelude].reduce((n, page) => n + page.items.length, 0);
console.log(
  `stdlib: ${modules.length} modules and ${prelude.length} prelude types, ` +
    `${declarations} declarations, checked against ${release.tag}`,
);
