import { getCollection, type CollectionEntry } from "astro:content";
import notes from "../generated/notes.json";
import install from "../generated/install-targets.json";
import { releases, type Release } from "./release";

export type Post = CollectionEntry<"blog">;

/**
 * Every post, newest first, with what its frontmatter claims checked.
 *
 * A post that names a release names one CHANGELOG.md states, and is dated on
 * or after that release's own date: an announcement written before the
 * release it announces is a draft, and a draft is not published. Two posts on
 * one URL cannot happen (the file name is the slug), but two on one day can,
 * so the order breaks a tie by slug rather than by whatever order the loader
 * found the files in.
 */
export async function posts(): Promise<Post[]> {
  const stated = new Map(releases().map((release) => [release.version, release]));
  const all = await getCollection("blog");
  for (const post of all) {
    const version = post.data.release;
    if (version === undefined) continue;
    const release = stated.get(version);
    if (release === undefined) {
      throw new Error(
        `posts: ${post.filePath} announces ${version}, and CHANGELOG.md states no ` +
          `such release. Either the iyi checkout is not at the release, or the ` +
          `post names one that was never published.`,
      );
    }
    if (post.data.date < release.date) {
      throw new Error(
        `posts: ${post.filePath} is dated ${post.data.date}, before ${version} ` +
          `was released on ${release.date}.`,
      );
    }
  }
  return all.sort((a, b) =>
    a.data.date === b.data.date ? a.id.localeCompare(b.id) : b.data.date.localeCompare(a.data.date),
  );
}

/** The release a post announces, as CHANGELOG.md states it. */
export function releaseOf(post: Post): Release | undefined {
  const version = post.data.release;
  return version === undefined ? undefined : releases().find((r) => r.version === version);
}

/** The post that announces a release, if one does. */
export async function announcementOf(release: Release): Promise<Post | undefined> {
  return (await posts()).find((post) => post.data.release === release.version);
}

/** Where a post lives, with the deployment's base honoured. */
export function postHref(base: string, post: Post): string {
  return `${base.replace(/\/$/, "")}/blog/${post.id}/`;
}

/** A date as a reader reads it: `9 November 2026`. */
export function longDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Block = { kind: string; from: number; to: number; paragraphs: string[] };
type Section = {
  version: string;
  date: string;
  tag: string;
  commit: string;
  source: string;
  blocks: Block[];
};

export type Note = Block & { tag: string; source: string; href: string };

/**
 * One block of a release's notes, found by a substring it contains, as
 * scripts/notes.mjs read it out of CHANGELOG.md at the release's tag.
 *
 * The substring has to pick out exactly one block. Two would mean the post
 * could be quoting either, and none means the notes do not say what the post
 * wanted them to, which in both cases is the post's mistake to fix, not
 * something to guess past.
 */
export function releaseNote(version: string, find: string): Note {
  const section = (notes.releases as Record<string, Section>)[version];
  if (section === undefined) {
    throw new Error(
      `ReleaseNote: no post's frontmatter names ${version}, so scripts/notes.mjs ` +
        `did not read its notes. Set \`release: ${version}\` on the post that quotes it.`,
    );
  }
  const found = section.blocks.filter((block) => block.paragraphs.some((p) => p.includes(find)));
  if (found.length !== 1) {
    throw new Error(
      `ReleaseNote: "${find}" is in ${found.length} blocks of ${version}'s notes at ` +
        `${section.tag}, and a quotation has to be one of them.` +
        (found.length > 1 ? ` Lines ${found.map((b) => b.from).join(", ")}.` : ""),
    );
  }
  const [block] = found;
  return {
    ...block,
    tag: section.tag,
    source: section.source,
    href: `https://github.com/${install.repo}/blob/${section.tag}/${section.source}?plain=1#L${block.from}-L${block.to}`,
  };
}
