#!/usr/bin/env node
// When each authored page source last changed, out of this repository's
// history.
//
// WHY. Every page states a `dateModified` in its structured data and every
// sitemap entry a `lastmod`, and answer engines and crawlers read both as how
// fresh a page is. A page here has two kinds of content: the facts, which are
// regenerated against the release CHANGELOG.md names, and the prose around
// them, which is a file under src/pages or src/content. src/layouts/Page.astro
// takes the later of the release's date and the date this record gives the
// page's files. Neither date is typed anywhere, and neither is the build's own
// clock, which would call every page new on every deploy and teach a crawler
// to ignore the field.
//
// It refuses a shallow clone. A clone of depth one gives every file the date
// of its one commit, which is a date with the same confidence as a true one
// and a wrong answer for nearly every page.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, "..");
const out = resolve(site, "src", "generated");

const SOURCES = ["src/pages", "src/content"];

const git = (...args) => execFileSync("git", ["-C", site, ...args], { encoding: "utf8" });

if (git("rev-parse", "--is-shallow-repository").trim() !== "false") {
  throw new Error(
    `modified: ${site} is a shallow clone, so its history cannot say when a ` +
      `page last changed. Fetch the full history (actions/checkout with ` +
      `fetch-depth: 0).`,
  );
}

/* Newest commit first, so the first date a path is seen under is its last
 * change. `%cs` is the committer date, which is when the change reached the
 * branch the site is built from. A file that was renamed is followed no
 * further back than the rename, which is the change that made it this page. */
const files = {};
let date = null;
for (const line of git("log", "--format=%x00%cs", "--name-only", "--", ...SOURCES).split("\n")) {
  if (line.startsWith("\0")) {
    date = line.slice(1);
  } else if (line !== "" && date !== null && !(line in files)) {
    files[line] = date;
  }
}

if (Object.keys(files).length === 0) {
  throw new Error(`modified: no commit in ${site} touches ${SOURCES.join(" or ")}.`);
}

const commit = git("rev-parse", "--short", "HEAD").trim();

mkdirSync(out, { recursive: true });
writeFileSync(
  resolve(out, "modified.json"),
  `${JSON.stringify({ provenance: { generator: "scripts/modified.mjs", commit }, files }, null, 2)}\n`,
  "utf8",
);

console.log(`modified: ${Object.keys(files).length} page sources dated, at ${commit}`);
