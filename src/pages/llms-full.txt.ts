/**
 * `/llms-full.txt`: the site's teaching text in one file, for an agent that
 * would rather read once than crawl. `/llms.txt` is the map; this is what the
 * map points at, in plain text: every lesson with its listings and its
 * recorded rejections, every tour program whole, and the prelude as
 * `iyi doc` printed it.
 *
 * Built, not authored, out of the records the pages are built from. A lesson's
 * listings are resolved by `src/lib/sample-select.ts`, the function the
 * `Sample` component uses, so a listing here is the lines the page shows. A
 * lesson that uses a component this file does not know how to write as text
 * fails the build: passing the tag through would hand an agent JSX where the
 * page has a program.
 *
 * The std modules are listed and not printed. Their surfaces are most of a
 * megabyte, and each is one page on the site and one `iyi doc` of the
 * module's file (or the `doc` MCP tool) away for an agent that needs it.
 */
import type { APIRoute } from "astro";
import readme from "../generated/readme.json";
import stdlib from "../../records/stdlib.json";
import { sequence, rulesOf, breakCases, runOf, lessonHref } from "../lib/lessons";
import { selectSample, type Selection } from "../lib/sample-select";
import { latestRelease } from "../lib/release";
import { reference, moduleHref, typeHref } from "../lib/reference";
import { tourSections, blurbOf, playgroundHref } from "../playground/samples";
import { recordedText } from "../lib/highlight";

/** A fenced block, with a fence longer than any backtick run inside it. */
const fence = (text: string, lang = ""): string => {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(longest + 1);
  return `${ticks}${lang}\n${text.replace(/\n$/, "")}\n${ticks}`;
};

/** A component tag's attributes: `name="value"` or `name='value'`, or a bare
 * `name` for true. */
const attributes = (source: string): Record<string, string | true> =>
  Object.fromEntries(
    [...source.matchAll(/([A-Za-z]+)(?:=(?:"([^"]*)"|'([^']*)'))?/g)].map((m) => [
      m[1],
      m[2] ?? m[3] ?? true,
    ]),
  );

type ReadmeBlock = { text: string };

/** A lesson's MDX body as markdown an agent can read. */
function lessonText(id: string, body: string): string {
  const text = body
    .replace(/^import .+ from ".+";\s*$/gm, "")
    .replace(/<Sample\s([\s\S]*?)\/>/g, (_, attrs: string) => {
      const props = attributes(attrs) as unknown as Selection;
      const { sample, start, end, whole, text } = selectSample(props);
      const where = whole ? sample.path : `${sample.path}, lines ${start} to ${end}`;
      return `${where}:\n\n${fence(text, "iyi")}`;
    })
    .replace(/<Quote\s([\s\S]*?)\/>/g, (_, attrs: string) => {
      const { id: quoted } = attributes(attrs);
      const block = (readme as Record<string, ReadmeBlock>)[quoted as string];
      if (!block) throw new Error(`llms-full: ${id} quotes "${quoted}", which README.md does not carry.`);
      return fence(block.text);
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const left = /<[A-Z][A-Za-z]*\b/.exec(text);
  if (left) {
    throw new Error(
      `llms-full: lesson ${id} uses ${left[0]}>, which this file cannot write ` +
        `as text. Teach src/pages/llms-full.txt.ts that component.`,
    );
  }
  return text;
}

export const GET: APIRoute = async ({ site }) => {
  const at = (path: string) => new URL(path, site ?? "https://iyi.dev").href;
  const base = import.meta.env.BASE_URL;
  const release = latestRelease();

  const lessons = (await sequence()).map((lesson) => {
    const run = runOf(lesson);
    const rules = rulesOf(lesson)
      .map((rule) => `> ${rule.id}: ${rule.premise} (${rule.cite})`)
      .join("\n");
    const broken = breakCases(lesson)
      .map(
        (entry) =>
          `### Break the rule: ${entry.title}\n\n` +
          `${entry.path}:\n\n${fence(recordedText(entry.path), "iyi")}\n\n` +
          `\`${entry.command}\` exits ${entry.exitCode}:\n\n${fence(entry.stderr)}`,
      )
      .join("\n\n");
    return [
      `## ${lesson.data.order}. ${lesson.data.title}`,
      at(lessonHref(base, lesson)),
      lesson.data.summary,
      rules,
      `Grounded in ${run.path}${run.href ? `, which runs at ${at(run.href)}` : ""}.`,
      lessonText(lesson.id, lesson.body ?? ""),
      broken,
      `### What the rule bought\n\n${lesson.data.bought}`,
    ].join("\n\n");
  });

  const tour = tourSections.map((section) =>
    [
      `## Tour: ${section.title}`,
      ...section.steps.map((step) => {
        const href = playgroundHref(step.path);
        return [
          `### ${step.id}`,
          `${blurbOf(step.path)}. ${href ? at(href) : step.path}`,
          fence(selectSample({ path: step.path }).text, "iyi"),
        ].join("\n\n");
      }),
    ].join("\n\n"),
  );

  const surfaces = new Map(stdlib.prelude.types.map((type) => [type.name, type.surface]));
  const prelude = reference.prelude.map((page) => {
    const surface = surfaces.get(page.name);
    if (surface === undefined) {
      throw new Error(`llms-full: records/stdlib.json has no surface for prelude type ${page.name}.`);
    }
    return `### ${page.name}\n\n${at(typeHref(page))}\n\n${fence(surface, "iyi")}`;
  });

  const modules = reference.modules.map(
    (page) => `- [${page.name}](${at(moduleHref(page))})${page.summary ? `: ${page.summary}` : ""}`,
  );

  const text = `# iyi: the full text

> Every lesson, every tour program and the prelude of the iyi programming
> language, as ${at(base)} publishes them at release ${release.version} (${release.date}).
> The map of the site is ${at(`${base}llms.txt`)}.

Listings are the programs in the iyi repository, quoted with their paths;
compiler output is what a real compiler printed, recorded. Nothing below is
retyped.

# Learn

${lessons.join("\n\n")}

# The tour

${tour.join("\n\n")}

# Reference

## Prelude

Every iyi program has these types with no import. Each is what \`iyi doc <Type>\`
printed at the release.

${prelude.join("\n\n")}

## Standard library modules

Each is imported by the name listed, \`import <name>\`, and its page is what
\`iyi doc\` prints for the module's file.

${modules.join("\n")}
`;

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
