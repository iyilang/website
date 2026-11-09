#!/usr/bin/env node
// The release notes a blog post quotes, read out of CHANGELOG.md at the
// release's own tag.
//
// WHY AT THE TAG. Every other page on this site is regenerated against the
// current release, and that is right for a page that describes the language
// as it is. A post is the opposite: it is dated, and it says what one release
// changed. Quoting the working tree's CHANGELOG.md would let a later edit to
// that release's entry move a sentence inside a post that was published
// before the edit, and quoting `facts.json` would turn the figures in an old
// announcement into this week's. A tag does not move, so a post that quotes
// its release through this file says the same thing for as long as it is up.
//
// WHICH RELEASES. The ones the posts name. Each post under src/content/blog
// that carries `release:` in its frontmatter asks for that release's section,
// and nothing else is read; a post that names a release with no tag fails
// here, by name, because the post would otherwise be quoting a changelog
// nobody published.
//
// WHAT IT WRITES. Per release: its tag, the commit the tag names, the date
// its heading states, and the section cut into blocks - a paragraph, a list
// item or a `###` heading - each with the lines it spans in the file at that
// tag. `src/components/ReleaseNote.astro` finds a block by a substring and
// prints it with those lines, so the citation under a quotation is the
// generator's and not the author's.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { blobAt } from "./release-ref.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, "..");
const repo = process.env.IYI_REPO ? resolve(process.env.IYI_REPO) : resolve(site, "..", "iyi");
const posts = resolve(site, "src", "content", "blog");
const out = resolve(site, "src", "generated");

const SOURCE = "CHANGELOG.md";

/* The heading shape scripts/releases.mjs and scripts/release-ref.mjs read. */
const HEADING = /^##\s+(\d+\.\d+\.\d+)\s+[—-]+\s+(\d{4}-\d{2}-\d{2})\s*$/;

/* `release:` in a post's frontmatter, quoted or not. The collection schema in
 * src/content.config.ts holds the field's shape; this only has to find it. */
const RELEASE = /^release:\s*["']?(\d+\.\d+\.\d+)["']?\s*$/m;

const asked = new Map();
for (const name of readdirSync(posts).filter((n) => /\.mdx?$/.test(n)).sort()) {
  const text = readFileSync(resolve(posts, name), "utf8");
  const match = RELEASE.exec(/^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "");
  if (!match) continue;
  const list = asked.get(match[1]) ?? [];
  list.push(`src/content/blog/${name}`);
  asked.set(match[1], list);
}

/** The release's section of CHANGELOG.md at its tag, cut into blocks. */
function section(version, askedBy) {
  const tag = `v${version}`;
  const commit = spawnSync("git", ["-C", repo, "rev-parse", "--verify", `${tag}^{commit}`], {
    encoding: "utf8",
  });
  if (commit.status !== 0) {
    throw new Error(
      `notes: ${askedBy.join(", ")} quotes ${version} and ${repo} has no ${tag}. ` +
        `Fetch the tags ("git -C ${repo} fetch --tags"), or the post names a ` +
        `release that was never published.`,
    );
  }

  const bytes = blobAt(repo, tag, SOURCE);
  if (bytes === null) {
    throw new Error(`notes: ${tag} has no ${SOURCE}, so ${askedBy.join(", ")} has nothing to quote.`);
  }
  const lines = bytes.toString("utf8").split("\n");

  const start = lines.findIndex((line) => HEADING.exec(line)?.[1] === version);
  if (start === -1) {
    throw new Error(
      `notes: ${SOURCE} at ${tag} has no heading for ${version} that reads as ` +
        `"## ${version} — date", so the section ${askedBy.join(", ")} quotes ` +
        `cannot be found. The heading shape moved.`,
    );
  }
  const date = HEADING.exec(lines[start])[2];
  const next = lines.findIndex((line, i) => i > start && /^## /.test(line));
  const end = next === -1 ? lines.length : next;

  /* A block is a run of non-blank lines, except that a list item's own
   * continuation paragraphs, indented under it after a blank line, stay with
   * it: the item is one entry in the changelog and is quoted as one. */
  const blocks = [];
  let current = null;
  const close = () => {
    if (current === null) return;
    blocks.push(current);
    current = null;
  };
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    const number = i + 1;
    if (line.trim() === "") {
      if (current?.kind === "item") {
        const following = lines.slice(i + 1, end).find((l) => l.trim() !== "");
        if (following !== undefined && /^\s{2,}\S/.test(following)) {
          current.paragraphs.push([]);
          continue;
        }
      }
      close();
      continue;
    }
    const heading = /^###\s+(.*)$/.exec(line);
    const item = /^- (.*)$/.exec(line);
    if (heading) {
      close();
      blocks.push({ kind: "heading", from: number, to: number, paragraphs: [[heading[1]]] });
    } else if (item) {
      close();
      current = { kind: "item", from: number, to: number, paragraphs: [[item[1]]] };
    } else {
      current ??= { kind: "paragraph", from: number, to: number, paragraphs: [[]] };
      current.paragraphs.at(-1).push(line.trim());
      current.to = number;
    }
  }
  close();

  return {
    version,
    date,
    tag,
    commit: commit.stdout.trim(),
    source: SOURCE,
    blocks: blocks.map(({ kind, from, to, paragraphs }) => ({
      kind,
      from,
      to,
      paragraphs: paragraphs.filter((p) => p.length > 0).map((p) => p.join(" ")),
    })),
  };
}

const releases = {};
for (const [version, askedBy] of asked) releases[version] = section(version, askedBy);

mkdirSync(out, { recursive: true });
writeFileSync(
  resolve(out, "notes.json"),
  `${JSON.stringify({ provenance: { generator: "scripts/notes.mjs", source: SOURCE }, releases }, null, 2)}\n`,
  "utf8",
);

const summary = Object.values(releases)
  .map((r) => `${r.version} (${r.blocks.length} blocks at ${r.tag})`)
  .join(", ");
console.log(`notes: ${summary || "no post quotes a release"}`);
