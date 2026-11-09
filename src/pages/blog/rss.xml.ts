/**
 * `/blog/rss.xml`: the posts as an RSS 2.0 feed.
 *
 * Written here rather than through a feed package for the reason llms.txt is:
 * it is a few lines of text built from the same list the index renders, and a
 * dependency would be a second opinion about that list. Each item carries the
 * post's title, link, description and date, and nothing a reader's client
 * would have to trust this site to have rendered: the post is the page.
 */
import type { APIRoute } from "astro";
import { posts } from "../../lib/posts";

const escape = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* RFC 822, which RSS 2.0 requires: `Mon, 09 Nov 2026 00:00:00 GMT`. A post
 * states a day and no time, so midnight UTC of that day. */
const rfc822 = (date: string): string => new Date(`${date}T00:00:00Z`).toUTCString();

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL("https://iyi.dev")).href.replace(/\/$/, "");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const home = `${origin}${base}/blog/`;
  const all = await posts();

  const items = all
    .map((post) => {
      const link = `${home}${post.id}/`;
      return [
        "    <item>",
        `      <title>${escape(post.data.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <pubDate>${rfc822(post.data.date)}</pubDate>`,
        `      <description>${escape(post.data.description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const latest = all[0]?.data.date;
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>iyi blog</title>
    <link>${home}</link>
    <atom:link href="${home}rss.xml" rel="self" type="application/rss+xml" />
    <description>News from the iyi programming language: what each release changes.</description>
    <language>en</language>
${latest ? `    <lastBuildDate>${rfc822(latest)}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
