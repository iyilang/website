#!/usr/bin/env node
// Records the standard library's exported surface, as the compiler prints it.
//
// The reference under /reference/ is this record. Every module under
// src/std/ and every type the prelude declares is put through `iyi doc`, the
// verb that prints a module's exported surface with its doc comments, and
// what it printed is kept byte for byte with the digest of the source it was
// printed from.
//
// WHY THE COMPILER AND NOT A PARSER HERE. What a module exports is the
// compiler's answer: `pub`, a reopened prelude type whose methods export
// without it, a macro, a `forall`. A second reading of iyi's grammar in this
// repository would be a second answer, and the first time the two disagreed
// the reference would document a function nobody can call. `iyi doc` is also
// the surface an agent is given over MCP, so the page and the tool say the
// same thing.
//
// WHY `iyi doc` AND NOT `iyi mod dump --json`. The JSON leaves out a reopened
// type's methods and a module's constants, and most of std/int, std/text and
// std/set is exactly that. The text surface is the complete one.
//
// Regenerate with: npm run record:stdlib

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { arch, cpus, release as osRelease, type as osType } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  blobAt,
  releaseRef,
  requireReleaseCompiler,
  requireReleaseTree,
  treeAt,
} from "./release-ref.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, "..");
const repo = process.env.IYI_REPO ? resolve(process.env.IYI_REPO) : resolve(site, "..", "iyi");
const out = resolve(site, "records", "stdlib.json");

// ---------------------------------------------------------------------------
// Toolchain and provenance
// ---------------------------------------------------------------------------

/* The binary is `iyi` on a Unix build and `iyi.exe` on Windows, where the
 * release ships a zip; IYI_BUILD may name either a build directory or the
 * `bin/` of an unpacked release. */
const buildDir = process.env.IYI_BUILD ? resolve(process.env.IYI_BUILD) : resolve(repo, ".build");
const iyi = ["iyi", "iyi.exe"].map((name) => join(buildDir, name)).find(existsSync);
if (iyi === undefined) {
  throw new Error(
    `no iyi compiler in ${buildDir}. Build it, or set IYI_BUILD to the ` +
      `directory holding the iyi binary.`,
  );
}

// Evidence about a release, taken from the release: the tree is the tag and
// the compiler was built there. scripts/release-ref.mjs says why.
const release = releaseRef(repo);
requireReleaseTree(repo, release, "record:stdlib");
const version = requireReleaseCompiler(iyi, release, "record:stdlib");

const recorded = {
  compiler: version,
  commit: release.commit,
  machine: `${osType()} ${osRelease()} ${arch()}, ${cpus()[0]?.model.trim() ?? "unknown cpu"}`,
  command: "npm run record:stdlib",
  when: new Date().toISOString(),
};
for (const [key, value] of Object.entries(recorded)) {
  if (!value) throw new Error(`provenance field "${key}" came out empty`);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/* One `iyi doc` call. The std imports resolve through the tree being
 * recorded, not whatever library sits beside the binary. */
const env = { ...process.env, IYI_PATH: resolve(repo, "src") };
function doc(target) {
  const run = spawnSync(iyi, ["doc", target], { cwd: repo, env, encoding: "utf8" });
  if (run.status !== 0) {
    throw new Error(
      `iyi doc ${target} exited ${run.status}:\n${run.stderr || run.stdout}`,
    );
  }
  return run.stdout.replace(/\r\n/g, "\n");
}

// ---------------------------------------------------------------------------
// The modules: every file directly under src/std, as the release ships it
// ---------------------------------------------------------------------------

/* A file one directory down (src/std/eiy/process.iyi) is a module's private
 * helper, declared under a name of its own and not imported as std/anything,
 * so the modules are the files directly under src/std. Each one declares
 * `module std/<file name>`, and one that does not is refused rather than
 * filed under a name it does not answer to. */
const paths = treeAt(repo, release.tag, "src/std").filter((path) =>
  /^src\/std\/[^/]+\.iyi$/.test(path),
);
if (paths.length === 0) {
  throw new Error(`${release.tag} has no src/std/*.iyi, so there is no library to record`);
}

const modules = paths.map((path) => {
  const bytes = blobAt(repo, release.tag, path);
  const name = `std/${path.slice("src/std/".length, -".iyi".length)}`;
  const declared = /^module\s+(\S+)/m.exec(bytes.toString("utf8"))?.[1];
  if (declared !== name) {
    throw new Error(`${path} declares module ${declared ?? "nothing"}, not ${name}`);
  }
  const surface = doc(path);
  if (!surface.startsWith(`module ${name}\n`)) {
    throw new Error(`iyi doc ${path} did not open with "module ${name}":\n${surface.slice(0, 200)}`);
  }
  return { name, path, sourceSha256: sha256(bytes), surface };
});

// ---------------------------------------------------------------------------
// The prelude: every type `iyi doc prelude` lists, one surface each
// ---------------------------------------------------------------------------

/* `iyi doc prelude` prints one line per type, `class String   # Text ...`,
 * and `iyi doc String` prints that type's surface. The list is the
 * compiler's, so a type the prelude gains reaches the reference without an
 * edit here. */
const index = doc("prelude");
const typeNames = [
  ...new Set(
    index
      .split("\n")
      .map((line) => /^[a-z]+\s+([A-Z]\w*)/.exec(line)?.[1])
      .filter((name) => name !== undefined),
  ),
];
if (typeNames.length === 0) {
  throw new Error(`iyi doc prelude listed no types:\n${index.slice(0, 400)}`);
}
const types = typeNames.map((name) => ({ name, surface: doc(name) }));

/* What the prelude was printed from, so the build can tell a record of an
 * older prelude from this one. */
const preludeSources = treeAt(repo, release.tag, "src/iyi")
  .filter((path) => path.endsWith(".iyi"))
  .map((path) => ({ path, sha256: sha256(blobAt(repo, release.tag, path)) }));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  `${JSON.stringify({ recorded, modules, prelude: { sources: preludeSources, types } }, null, 2)}\n`,
  "utf8",
);

console.log(
  `stdlib: ${modules.length} modules and ${types.length} prelude types, ` +
    `at ${release.commit.slice(0, 9)}`,
);
