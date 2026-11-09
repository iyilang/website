import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { existsSync, readFileSync } from "node:fs";

// GitHub Pages serves this repository at `iyi.dev` (the CNAME under public/,
// which the build copies into dist/ - so the domain is this file's and a
// deploy carries it), at the root. Override both to preview under another
// origin or path.
const site = process.env.SITE_ORIGIN ?? "https://iyi.dev";
const base = process.env.SITE_BASE ?? "/";

// The project documents scripts/project.mjs marks as not this project's to
// rank for. Their pages carry a robots noindex, and a sitemap that listed them
// would be asking a crawler to fetch a page in order to be told to drop it.
// Read from the generated record, which `npm run generate` writes before any
// build, so the list is the script's and is not typed a second time here.
const project = JSON.parse(
  readFileSync(new URL("./src/generated/project.json", import.meta.url), "utf8"),
);
const unlisted = new Set(
  project.documents
    .filter((document) => !document.indexed)
    .map((document) => new URL(`${base.replace(/\/$/, "")}/project/${document.id}/`, site).href),
);

// A sitemap entry's lastmod is the page's own `dateModified`, read back out of
// the page src/layouts/Page.astro wrote. The sitemap is written after every
// page is (the integration runs when the build is done), so the date a
// crawler is given here and the date the page states are one date, decided in
// one place. A page this cannot find or read gets no lastmod rather than a
// guessed one.
const outDir = new URL("./dist/", import.meta.url);
const pageDate = (url) => {
  const path = new URL(url).pathname.slice(base.replace(/\/*$/, "/").length);
  const file = new URL(`${path}index.html`, outDir);
  if (!existsSync(file)) return undefined;
  const html = readFileSync(file, "utf8");
  const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)?.[1];
  if (json === undefined) return undefined;
  const page = JSON.parse(json)["@graph"].find((node) => node["@id"]?.endsWith("#page"));
  return page?.dateModified;
};

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !unlisted.has(page),
      serialize: (item) => ({ ...item, lastmod: pageDate(item.url) ?? item.lastmod }),
    }),
  ],

  // A lesson's URL is its file name, and a published URL outlives a rename:
  // the old one answers with a page that sends the reader to the new one.
  // `/learn/import-and-using/` named `using`, which iyi 0.15.0 removed.
  redirects: {
    "/learn/import-and-using/": "/learn/import/",
  },

  // SmartyPants is on by default and it rewrites the text it renders: straight
  // quotes become curly, `...` becomes an ellipsis, and prose `--` becomes an
  // em dash. It is off because doc/ART-DIRECTION.md forbids an em dash and an
  // en dash in authored copy, and the lessons are markdown: a pass that
  // invented one on the way to the page would put it there in the one place
  // the prohibition cannot be seen in the source.
  //
  // Declared on the processor rather than as `markdown.smartypants`, which
  // Astro 7 deprecates and warns about on every build. A build that prints a
  // warning every time teaches people to read past its output, which is how a
  // real failure gets missed.
  markdown: { processor: unified({ smartypants: false }) },
  build: { format: "directory" },
  devToolbar: { enabled: false },
  vite: {
    build: {
      // The site argues for small binaries. Shipping a megabyte of JavaScript
      // to say so would be the same failure as transcribing a number.
      assetsInlineLimit: 0,
    },
  },
});
