#!/usr/bin/env node
// Which tarballs a release publishes, and what they are called, read out of the
// script that downloads them.
//
// THE BUG THIS EXISTS TO PREVENT. `src/lib/release.ts` carried the published
// targets as a literal array of two pairs and built each asset URL by
// concatenating strings around the recorded version. Two failures were waiting
// in that. A third published tarball would appear nowhere on this site, because
// nothing in the build reads the set. A renamed asset - `iyi-$version-$target`
// becoming anything else - would make every download link on the site a 404,
// and the build would go on passing: `scripts/no-transcription.mjs` looks for a
// decimal against a time or size unit, and a target name, a file name and a URL
// carry none of the three.
//
// `install.sh` is the authority because it is the thing that downloads them. It
// refuses `$os-$arch` by name, so the set it accepts IS the set a release ships
// for; its `asset=` line is the name it asks the release for, and its `base=`
// line is where it asks. A page that builds the same URL from the same two
// strings cannot point somewhere the installer does not.
//
// FOUR READINGS, and the disagreement of any two is a build failure.
//
//   * the `case` arms, which are what the script accepts;
//   * the refusal the `*)` arm prints, which names the same targets in prose
//     for a person whose machine is neither. The arms and the message drifting
//     apart is the ordinary way this file goes wrong, and it is caught here;
//   * README.md's "Getting it" section, which states the pair a reader is
//     shown, so the site restates the repository rather than one file of it;
//   * README.md's own platform words under the one-liner ("Linux x86-64 and
//     macOS arm64"), which is where the prose name beside each target comes
//     from. They are found by the fenced block that holds the `install.sh`
//     one-liner rather than by the clause that used to follow them, because
//     what follows is prose about other platforms and moves: 48bc8d0b5 put a
//     PowerShell block between the sentence and the clause this once matched.
//     What does not move is that the sentence sits directly under the command
//     it qualifies. Each phrase is matched back to a target by scoring the
//     target's own `uname` components against the phrase's words, so the only
//     spellings this file knows are the two aliases below. An unmatched or
//     ambiguous phrase fails and names itself; it is never guessed;
//   * install.ps1, which is the same three questions for the one platform
//     install.sh refuses. 0.14.0 is the first release to publish a Windows
//     build, and it is a zip rather than a tarball with an installer of its
//     own, so it is recorded beside the tarballs instead of among them: one
//     target, read out of the `$Asset` line that names it, cross-checked
//     against the refusal that script prints for a 32-bit Windows and against
//     the file name README.md spells out under "Getting it". Its prose name
//     is README.md's own ("Windows x86-64"), found by the target's own
//     components rather than assembled from them.
//
// WHAT IT DOES NOT DO. It does not check that a release actually published the
// tarballs, or that a URL resolves. It checks that the site offers exactly what
// the installer would fetch. A release that shipped one asset short while
// install.sh still accepted both would pass here and fail in the installer,
// which is the same place it fails for everyone else.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, "..");
const repo = process.env.IYI_REPO ? resolve(process.env.IYI_REPO) : resolve(site, "..", "iyi");
const out = resolve(site, "src", "generated");

const SOURCE = "install.sh";
const WINDOWS = "install.ps1";
const CLAIM = "README.md";

/**
 * Spellings the repository uses for one platform. `uname -s` says `Darwin` and
 * the prose says `macOS`; the arch is `x86_64` and the prose is `x86-64`. Both
 * are names rather than figures, and this is the whole of what this file knows
 * about how they map.
 */
const ALIAS = new Map([
  ["darwin", "macos"],
  ["x86_64", "x86-64"],
]);

const read = (relative) => {
  try {
    return readFileSync(resolve(repo, relative), "utf8");
  } catch {
    throw new Error(
      `install-targets: cannot read ${relative} in ${repo}. The site states ` +
        `which tarballs a release publishes by reading it, so without it the ` +
        `download links would be invented.`,
    );
  }
};

const script = read(SOURCE);
/* README.md wraps at about 80 columns, so its sentences are matched against
 * one long line, the way bench/site_facts.py reads it. */
const readme = read(CLAIM).replace(/\s+/g, " ");

/* The `case` block on `$os-$arch`, and nothing else in the script: a `case` on
 * something else must not be mistaken for this one. */
const block = /case "\$os-\$arch" in\n([\s\S]*?)\nesac/.exec(script);
if (!block) {
  throw new Error(
    `install-targets: ${SOURCE} no longer has a \`case "$os-$arch"\` block, ` +
      `so this script cannot see which targets a release ships for and is ` +
      `checking nothing.`,
  );
}

/* One arm per published tarball: the `uname` pair it accepts, and the target
 * name it then asks the release for. */
const ARM = /^\s*(\w+)-(\w+)\)\s*target=(\S+)\s*;;/gm;
const published = [...block[1].matchAll(ARM)].map(([, os, arch, target]) => ({
  target,
  os,
  arch,
}));

if (published.length === 0) {
  throw new Error(
    `install-targets: the \`case\` block in ${SOURCE} has no arm of the shape ` +
      `\`Os-arch) target=name ;;\`, so no target could be read. The arms were ` +
      `rewritten; follow them here rather than letting the site publish an ` +
      `empty download list.`,
  );
}

/* The refusal, which names the same targets for a person whose machine is
 * neither. A target-shaped token is `word-word`, which `README.md` is not. */
const refusal = /\*\)\s*die "([^"]*)"/.exec(block[1]);
if (!refusal) {
  throw new Error(
    `install-targets: the \`case\` block in ${SOURCE} no longer refuses an ` +
      `unknown machine with \`*) die "..."\`, so the second statement of the ` +
      `target list this script cross-checks against is gone.`,
  );
}
const named = new Set(refusal[1].match(/\b[a-z0-9]+-[a-z0-9_]+\b/g) ?? []);
const accepted = new Set(published.map((p) => p.target));
const disagree = [...accepted, ...named].filter((t) => !accepted.has(t) || !named.has(t));
if (disagree.length > 0) {
  throw new Error(
    `install-targets: ${SOURCE} accepts [${[...accepted].join(", ")}] and its ` +
      `refusal names [${[...named].join(", ")}]. One of the two was changed ` +
      `without the other, so the script and its own error message disagree ` +
      `about what a release ships. Fix ${SOURCE}; the site will not choose ` +
      `between them.`,
  );
}

/* README's "Getting it" section, which is where a reader of the repository is
 * told which tarball the installer picks. */
const documented = /picks the tarball for `uname` \(([^)]*)\)/.exec(readme);
if (!documented) {
  throw new Error(
    `install-targets: ${CLAIM} no longer says which tarball install.sh picks ` +
      `for \`uname\`, so the target list has only install.sh stating it and ` +
      `this script has nothing to cross-check.`,
  );
}
const listed = new Set(documented[1].split(/\s*(?:,|or|and)\s*/).filter(Boolean));
const undocumented = [...accepted, ...listed].filter(
  (t) => !accepted.has(t) || !listed.has(t),
);
if (undocumented.length > 0) {
  throw new Error(
    `install-targets: ${SOURCE} accepts [${[...accepted].join(", ")}] and ` +
      `${CLAIM} says it picks [${[...listed].join(", ")}]. The repository ` +
      `states the set twice and the two have drifted, which is the drift this ` +
      `whole publication is arranged to refuse.`,
  );
}

/* The platform words, out of the sentence under README's one-liner. Anchored
 * on the one-liner's own fenced block: the sentence a reader is shown is the
 * one directly under the command, and the first sentence after the fence is
 * it. Anchoring on what comes after instead put this at the mercy of a
 * paragraph about a platform this record does not carry. */
const prose = /install\.sh \| sh[^`]*``` ([A-Z][^.;]*)[.;]/.exec(readme);
if (!prose) {
  throw new Error(
    `install-targets: ${CLAIM} no longer states the platforms in a sentence ` +
      `under the fenced ${SOURCE} one-liner, so there is no sentence in the ` +
      `repository to take the prose name of each target from.`,
  );
}
const phrases = prose[1].split(/\s*(?:,|and)\s*/).filter(Boolean);

/** The words of a phrase, and the parts of any word that is itself hyphenated,
 * so `x86-64` is matched whole as well as by its halves. */
const words = (phrase) => {
  const set = new Set();
  for (const word of phrase.toLowerCase().split(/\s+/)) {
    if (!word) continue;
    set.add(word);
    for (const part of word.split("-")) if (part) set.add(part);
  }
  return set;
};

/** How many of a target's own `uname` components the phrase names. */
const score = (target, phrase) => {
  const said = words(phrase);
  return [target.os, target.arch].filter((component) => {
    const lower = component.toLowerCase();
    return said.has(ALIAS.get(lower) ?? lower);
  }).length;
};

/* One phrase per target, each phrase used once. A target with no single best
 * phrase left is a failure naming the target, never a guess: a prose name
 * attached to the wrong tarball is worse than none, because it would send a
 * reader to a download for a machine they do not have. */
if (phrases.length !== published.length) {
  throw new Error(
    `install-targets: ${CLAIM} names ${phrases.length} platform(s) ` +
      `(${phrases.join(" / ")}) under its one-liner and ${SOURCE} ships ` +
      `${published.length} tarball(s) (${[...accepted].join(", ")}). Every ` +
      `published target needs the name a reader is shown.`,
  );
}

const taken = new Set();
const targets = published.map((target) => {
  const ranked = phrases
    .filter((phrase) => !taken.has(phrase))
    .map((phrase) => ({ phrase, points: score(target, phrase) }))
    .sort((a, b) => b.points - a.points);
  const [best, next] = ranked;
  if (best.points === 0 || (next && next.points === best.points)) {
    throw new Error(
      `install-targets: no single platform name in ${CLAIM} matches ` +
        `${target.target} (${target.os} ${target.arch}). Candidates: ` +
        `${ranked.map((r) => `${r.phrase} = ${r.points}`).join("; ")}. Either ` +
        `the sentence was reworded or a spelling belongs in ALIAS.`,
    );
  }
  taken.add(best.phrase);
  return { target: target.target, machine: best.phrase };
});

/* What the installer asks the release for, and where. Kept as the shell wrote
 * them, `$version` and `$target` included, so the generated record holds the
 * very strings install.sh holds and `src/lib/release.ts` only fills them in. */
const slug = /^repo="([^"]+)"/m.exec(script);
const asset = /^asset="([^"]+)"/m.exec(script);
const base = /^base="\$\{IYI_RELEASE_URL:-([^}"]+)\}"/m.exec(script);
if (!slug || !asset || !base) {
  throw new Error(
    `install-targets: ${SOURCE} no longer states its \`repo=\`, \`asset=\` ` +
      `and \`base=\` lines in the shape this script reads, so the site cannot ` +
      `build the URL the installer builds and would be inventing one.`,
  );
}
for (const [name, value, needed] of [
  ["asset", asset[1], ["$version", "$target"]],
  ["base", base[1], ["$version"]],
]) {
  for (const placeholder of needed) {
    if (!value.includes(placeholder)) {
      throw new Error(
        `install-targets: ${SOURCE}'s \`${name}=\` is "${value}", which does ` +
          `not use ${placeholder}. The site fills that in from the recorded ` +
          `release, so a name that no longer varies with it would be a ` +
          `download link frozen at one version.`,
      );
    }
  }
}

/* The tag a release lives under. install.sh reads the version back out of
 * `.../tag/v<version>`, which is what makes the `v` prefix a fact about this
 * project rather than a convention the site assumes. */
if (!script.includes("releases/latest") || !script.includes("*/tag/v")) {
  throw new Error(
    `install-targets: ${SOURCE} no longer resolves the latest release through ` +
      `\`releases/latest\` and \`*/tag/v\`, so the site's link to a release ` +
      `tag is no longer the shape the installer reads.`,
  );
}

/* WINDOWS. install.sh refuses the platform by name, so nothing above this
 * line can see the zip 0.14.0 was the first release to publish. install.ps1
 * is where it is named, and it is asked the same three questions: what the
 * asset is called, where it is fetched from, and which repository both are
 * of. Its strings are carried across as PowerShell wrote them, `$Version`
 * included, the way install.sh's are. */
const ps = read(WINDOWS);

const psRepo = /^\$Repo = '([^']+)'/m.exec(ps);
const psAsset = /^\$Asset = "([^"]+)"/m.exec(ps);
const psBase = /\$ReleaseUrl = "([^"]+)"/.exec(ps);
if (!psRepo || !psAsset || !psBase) {
  throw new Error(
    `install-targets: ${WINDOWS} no longer states its \`$Repo\`, \`$Asset\` ` +
      `and \`$ReleaseUrl\` in the shape this script reads, so the site cannot ` +
      `build the URL the Windows installer builds and would be inventing one.`,
  );
}

if (psRepo[1] !== slug[1]) {
  throw new Error(
    `install-targets: ${SOURCE} downloads from ${slug[1]} and ${WINDOWS} from ` +
      `${psRepo[1]}. One release cannot live in two repositories, and the ` +
      `site would be linking a Windows reader somewhere else.`,
  );
}

if (!psAsset[1].includes("$Version")) {
  throw new Error(
    `install-targets: ${WINDOWS}'s \`$Asset\` is "${psAsset[1]}", which does ` +
      `not use $Version. The site fills that in from the recorded release, so ` +
      `a name that no longer varies with it would be a download link frozen ` +
      `at one version.`,
  );
}

/* The target the zip is for, read out of the name the script asks the release
 * for rather than typed here: one token, between the version and the
 * extension, the way `iyi-$version-$target.tar.gz` carries one. */
const zip = /\$Version-([a-z0-9]+-[a-z0-9_]+)\.zip$/.exec(psAsset[1]);
if (!zip) {
  throw new Error(
    `install-targets: ${WINDOWS} asks the release for "${psAsset[1]}", which ` +
      `is not \`...$Version-<os>-<arch>.zip\`. The target a Windows reader is ` +
      `offered is read out of that name, and this script will not guess it.`,
  );
}
const windowsTarget = zip[1];

/* The refusal, which is this installer's second statement of the same fact:
 * a machine with no build is told which one there is. install.sh's `*)` arm
 * and this are the same gate, in the two languages. */
const refused = [...ps.matchAll(/Die "([^"]+)"/g)].map(([, line]) => line);
if (!refused.some((line) => line.includes(windowsTarget))) {
  throw new Error(
    `install-targets: ${WINDOWS} fetches ${windowsTarget} and no refusal in ` +
      `it names that target, so the script and its own error messages no ` +
      `longer agree about what a release ships for Windows.`,
  );
}

/* And README.md's statement of it, under "Getting it", where the zip is
 * spelled with a version rather than a placeholder. The asset template is
 * turned into the pattern that file would have to match, so a renamed asset
 * fails here instead of becoming a 404 on the download page. */
const spelled = new RegExp(
  psAsset[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("\\$Version", "\\d+\\.\\d+\\.\\d+"),
);
if (!spelled.test(readme)) {
  throw new Error(
    `install-targets: ${CLAIM} no longer spells a file of the shape ` +
      `"${psAsset[1]}", so ${WINDOWS} is the only statement of what a release ` +
      `publishes for Windows and this script has nothing to cross-check.`,
  );
}

/* The prose name, in README.md's own words. The pattern is built from the
 * target's own components and the aliases above, and what is recorded is the
 * text README.md matched with, so the spelling a reader is shown is the
 * repository's and never this file's. */
const spell = (part) => ALIAS.get(part) ?? part;
const [windowsOs, windowsArch] = windowsTarget.split("-");
const spoken = new RegExp(
  `\\b${spell(windowsOs)}[ -]${spell(windowsArch).replace(/[-_]/g, "[-_]")}\\b`,
  "i",
).exec(readme);
if (!spoken) {
  throw new Error(
    `install-targets: ${CLAIM} never names ${windowsTarget} in prose, so ` +
      `there is no sentence in the repository to take the name beside the zip ` +
      `from. The other targets take theirs from the sentence under the ` +
      `one-liner; this one is named wherever the README names it.`,
  );
}

const commit = execFileSync("git", ["-C", repo, "rev-parse", "--short", "HEAD"], {
  encoding: "utf8",
}).trim();

const record = {
  provenance: {
    generator: "scripts/install-targets.mjs",
    source: `${SOURCE}, ${WINDOWS}`,
    claim: CLAIM,
    commit,
  },
  repo: slug[1],
  /* Templates, in install.sh's own spelling. `$version` comes from the
   * changelog through scripts/releases.mjs; `$target` from the arms above. */
  asset: asset[1],
  download: base[1].replace("$repo", slug[1]),
  targets,
  /* The zip, beside the tarballs rather than among them: another archive,
   * another installer, and one target. A page that offers a Windows reader
   * anything offers exactly this. */
  windows: {
    source: WINDOWS,
    target: windowsTarget,
    machine: spoken[0],
    asset: psAsset[1],
    download: psBase[1].replace("$Repo", slug[1]),
  },
};

mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, "install-targets.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");

console.log(
  `install-targets: ${targets.length} published by ${SOURCE} ` +
    `(${targets.map((t) => `${t.target} = ${t.machine}`).join(", ")}), ` +
    `asset ${record.asset} under ${record.download}; ${WINDOWS} publishes ` +
    `${record.windows.target} = ${record.windows.machine} as ` +
    `${record.windows.asset}, at ${commit}`,
);
