# iyi website: art direction

These are decisions, not options. Where a decision could reasonably have gone
the other way, the reason it did not is written down. Rendered proof is in
`doc/screenshots/`, produced from the running site rather than drawn.

## The concept

**A plain, friendly site with a mascot, and every number on it checkable.**
The one line above the fold says what iyi is for: a friendly, fast language for
people and their agents. Beside it stands the mascot, a red heart with an `i`
on each cheek, waving. Under it a real program, read out of the repository at
build time, and the bytes the compiler printed when it ran that program. The
site's job is to be readable in one pass by someone who has never heard of iyi,
and to stay honest under the reader who checks: every figure on a page is
either counted from the tree or stamped with the machine that measured it, and
`scripts/no-transcription.mjs` fails the build if one is typed by hand.

The look is a dark page with warm greys, a wide sans for the author, a mono
for anything a machine printed, one red accent and a green and an amber that
report how a run ended. Rounded cards on hairlines carry the evidence. The
mascot supplies the character, and the type does the rest: the headings are
set a little wide and tight, so they carry weight without going to black.

## The mascot

`src/assets/mascot.png`, cut out of its background so it sits on the page
ground in either scheme. It appears beside the wordmark in the header and at
the foot of every page, small in front of the eyebrow that opens each section
page, and as the favicon, cropped to the face. It is never used as a bullet in
a list, a spinner or a reaction. The `i` on each
cheek is the tittle, the dot that in Turkish orthography separates `i` from
dotless `ı`; the same dot terminates every section rule on the site.

It is a source asset rather than a public file, and that is a decision. The
drawing is 1200px across; the header mark is 28px. Served out of `public/` it
was the same file every time, so a reader paid the hero's weight to draw a mark
the width of a word, four times a page. Through `astro:assets` each call site
asks for the size it draws at, `densities={[1, 2]}` covers a retina screen, and
the build emits exactly those. The header mark and the eyebrow are eager,
because they are above the fold; the footer's is lazy.

## Palette

Committed values, in `src/styles/tokens.css`. The contrast of every pair they
are used in is computed by `scripts/contrast.mjs` on each build and the build
fails under the floor the pair's role requires, so no ratio is written down
here or there: the file that once recorded five of them had four wrong.

The values are the redesign's, and where one of them fell under its floor it
was moved the least distance that clears it, by the gate's own arithmetic:
`--mute` in both schemes, `--boundary` in both, and `--brand-dark`, whose white
button label sat under 4.5. Separators and soft grounds were alphas in the
redesign; here they are the solid colour each composites to over the page,
because an alpha is invisible to the gate.

**Dark is the default on a screen.** It is the scheme the page is designed in,
and the light one is the reader's choice, remembered.

| Token | Value | Where it is used |
|---|---|---|
| `--paper` | `#ffffff` | Page ground. |
| `--raise` | `#f6f5f3` | The footer, a console's ground, inline code, a hovered row. |
| `--card` | `#ffffff` | Cards, steps, the tour's groups. |
| `--code` | `#f8f7f5` | A listing's ground. |
| `--ink` | `#0e0c0b` | Text and headings. |
| `--graphite` | `#4a4540` | Secondary prose, leads, captions. |
| `--mute` | `#746d67` | Labels, line numbers, the bars of code frames. |
| `--hairline` | `#e8e7e6` | Every separator between two areas of the page. |
| `--boundary` | `#8d8c8b` | The edge of a control, and nothing else. |
| `--brand` | `#e5203a` | The mascot's red. The primary button, a selected step's mark. |
| `--brand-deep` | `#c8102e` | Links, eyebrows, keywords, and any red set as text. |
| `--brand-soft` | `#fdeff1` | The ground of a red chip or an errored line. |
| `--on-brand` | `#ffffff` | The label on a red button. |
| `--ok` | `#167d3b` | A run that came back clean, strings in a listing, iyi's bar. |
| `--warn` | `#9a5b00` | A run with something to read, a recorded-only step, an edit notice. |

And the dark scheme, declared under `-dark` names beside the light one and
switched on by aliasing. `--on-brand` is white in both and has no dark name.

| Token | Value |
|---|---|
| `--paper-dark` | `#0a0908` |
| `--raise-dark` | `#100e0c` |
| `--card-dark` | `#14110f` |
| `--code-dark` | `#0e0c0b` |
| `--ink-dark` | `#f4f1ee` |
| `--graphite-dark` | `#a49d96` |
| `--mute-dark` | `#837d76` |
| `--hairline-dark` | `#1e1b19` |
| `--boundary-dark` | `#66625f` |
| `--brand-dark` | `#df3228` |
| `--brand-deep-dark` | `#ff6157` |
| `--brand-soft-dark` | `#210e0c` |
| `--ok-dark` | `#5fd98a` |
| `--warn-dark` | `#f5b451` |

`--signal` is an alias of `--brand-deep`, because the measurement components
address the accent by that name: a loss and a link get the same colour.

`--hairline` and `--boundary` are not interchangeable and the split is the
point. A hairline separates two areas of the page, which WCAG 1.4.11 exempts,
and it is drawn faint on purpose. A boundary is the edge of a thing you can
press, which 1.4.11 does not exempt, and every control on the site draws with
it.

### The two schemes

Three rules hold them together. Every colour is a literal declared once in the
base `:root`, light under its own name and dark under a `-dark` name, and the
scheme switch only aliases them, so no component knows which scheme it is in
and the gate can see both palettes. The switch is `@media screen`, and the
`screen` is load bearing: a print is always the light palette, so printing a
lesson does not empty a toner cartridge into the page.

And the reader can turn it off. The masthead carries one control that writes
`data-theme="light"` onto `<html>` and remembers it; an inline script in the
head restores that choice before the first paint, so a reader who chose light
never sees a flash of the dark page. With scripts blocked the page is dark,
which is what the stylesheet draws with nothing set.

The mark is geometry in the markup and not a character, inline SVG in
`currentColor`, and it names what the press will do: a dark page offers the
sun.

## Type

Two families. **The sans is the author, the mono is the machine.** Anything a
command printed is set in mono, without exception.

**Mona Sans** (OFL, variable in weight and width) for prose and display. The
headings and the large figures are set at 106% to 108% of its width with
negative tracking, which is what gives them their weight without going to
black. That is why the width-axis file ships rather than the lighter
weight-only one: without it those headings would render at 100%, and quietly
be a different typeface. It ships `latin-ext`, which is a requirement rather
than a nicety: the project's name is Turkish and `ı İ ş ğ ç ö ü` must render.

**JetBrains Mono** (OFL, variable) for code, commands, output, labels and the
bars of code frames. Ligatures are disabled (`font-variant-ligatures: none`),
because a site about a language's syntax must not silently redraw that syntax.
Comments are set in a muted colour rather than in italic, so no italic face
ships.

Both are vendored through `@fontsource`, never fetched from a CDN. A site
arguing that a program should link only what it uses does not pull webfonts
off a third party.

**And it links only what it uses.** `scripts/fonts.mjs` reads the installed
packages and writes `src/generated/fonts.css`, which is the only font import in
`src/layouts/Page.astro`. It keeps `woff2` and drops the legacy `woff` that sits
beside every `@fontsource` face, and it keeps `latin` and `latin-ext` and drops
every other alphabet. The `unicode-range` of each face is read out of the
package and never authored, because typing it here would be a transcription of
a machine value that goes stale silently.

Two faces are preloaded, the latin sans and the latin mono, because every page
needs both before it can draw a word. The `latin-ext` files are left to be
discovered: a page with no Turkish letter on it never asks for them.

Numerals are tabular everywhere so figures in a column compare by eye. Body
copy is fixed at 16px; the headings are fluid between a phone and the page
width, `--step-1` through `--step-4`.

## Layout

Two containers, declared once in `src/styles/base.css`.

`.wrap` is the page: `min(70rem, 100% - 2 * edge)`, centred, with a 20px edge.
The header and the footer line up with it.

`.spread` is the reading page: a `68ch` measure with a `21ch` rail beside it,
as named grid lines, so a component can opt into `main`, `rail`, `wide` or
`full` without knowing the page. Below 62rem the rail collapses under the
measure. The rail is where provenance lives on a lesson, at a fixed position,
never behind a hover.

A section page is a hero and then sections, each a heading block beside its
evidence in a two-column `.split` that stacks on a phone. The shared pieces
are in `src/styles/site.css`: the type classes, `.sec`, `.split`, `.grid4`,
`.card`, `.code`, `.tabs`, `.chip`, `.tbl`. Anything one page draws stays in
that page's scoped style.

Cards have a 16px radius, code frames 14px. Hairlines separate. There are two
kinds of lift and no more: a selected tab sits on a one-pixel shadow, and the
two replay panels, the rebuild and the agent race, are lit instruments with a
gradient edge and a drop shadow. A hatch, drawn as a repeating gradient, marks
what a figure leaves out: the part of Crystal's square iyi's hello does not
need, and a module whose body a build skipped.
The masthead is translucent and blurs what scrolls under it.

## Code display

**The token stream is the compiler's.** Every listing is highlighted at record
time by `src/crystal/syntax_highlighter/html.cr`, the compiler's own
highlighter, into `records/highlight.json`, so what counts as a token is
answered by the lexer and never by a grammar this site maintains. The site adds
one class after the fact: `.tok-rule`, weight 600, on the keywords that are
iyi's and not Crystal's (`module`, `import`, `using`, `pub`, `trait`, `impl`,
`type`, `abstract`). Three hues and no more: keywords in `--brand-deep`,
strings in `--ok`, comments in `--mute`, and the rest is ink. The rules keep
their extra weight on top of the hue, so the delta still reads in a printout
or to a reader who cannot tell red from green. `forall` and `derive`
are contextual in iyi's parser and reach the page as bare text; emphasising
them is a change to the compiler's highlighter, not to this site.

**The filename is load-bearing.** A module's path is its file's path, so a
source block shows its path in a header.

**Three block types, because they are three kinds of evidence.** A `.source`
block is code you could write. A `.console` block is a recording of a real
run: a caption bar, a mute `$` prompt, and output that is never highlighted
because nothing highlighted it in the terminal. A `.diagnostic` block is a
compiler error, caret line preserved exactly, with the rule it cites pulled
into a footer that names the SPEC.md section and line the premise is stated
at. It names them rather than linking them: the site does not publish SPEC.md,
and a citation to a file is checkable by anyone holding the repository.

## Measurements

**Two classes of number, and they must not look alike.**

A **structural** number is a line count, a target count, a sample count. It is
counted from the tree, identical on every machine, and rendered flat and inline
by `Measure`, which throws if the key is absent from `facts.json`.

A **recorded** number is a second, a byte, a millisecond: a machine, not a
language. It is rendered only by `Stamped`, a card whose bar reads
`measured · ` and what it is a measurement of, so the eye reads "this came off
an instrument" before it reads the figure. The headline of the card is the
ratio, set at display size, because a ratio survives the machine; the
absolute sits in the body beside its spread.

The card does not print the box it came off. It did, as a labelled `MACHINE`
and `PRINTS IT` rail under every claim, and with six recorded facts on the
site that was four rows of near-identical furniture per card: evidence that
had started reading as decoration. The gate moved rather than went.
`scripts/facts.mjs` refuses to write `facts.json` when a recorded group names
no command or no machine, so a figure with no box still cannot reach a page,
because it cannot reach the record. The colophon on every page names the
generator and the commit, and `facts.json` is in the tree for anyone checking.

`DurationChart` draws duration at real speed, once, when scrolled to, with a
run-again control. Size comparisons are drawn at true area, not true width,
because bar length would flatter the smaller number.

**The settled figure is the default and the animation is the addition.** The
bars carry their finished widths in the built HTML and the stylesheet draws
them; the script only ever takes the figure away and gives it back at real
speed. It used to be the other way round, and the flagship measurement on the
home page and the why page rendered as an empty frame for anyone with scripting
off. A site whose rule is that a figure must be visible to be checkable does
not get to make its evidence conditional on a script. The run-again control is
hidden until a script claims the chart, for the same reason the menu button is:
a control that cannot do anything is not offered.

## Motion

Every transition and animation on the site is switched off under
`@media (prefers-reduced-motion: reduce)`, in CSS, by one rule in
`src/styles/base.css`. Not in a script: a preference that only a running
script respects is not respected.

Nothing is hidden to satisfy the preference. Reduced motion shows the settled
state rather than a faster animation, because a shortened animation would be a
false reading, and the settled state is what the page draws anyway. The /agents
race, under the preference, is drawn finished and does not loop.

## Reachability

Three decisions, each of them a defect that was on the page.

**A link inside running text is underlined.** Colour alone does not mark it:
`--brand-deep` against `--ink` body copy is nowhere near the separation a
colour-only distinction needs, and hover is not a cue, because it does not
exist on a touch screen and it is not there when the eye first crosses the
sentence. The rule is drawn by element context, `p a`, `dd a`, `td a`,
`figcaption a`, `blockquote a`, `.prose a`, `.evidence a`, so a nav row, a
card, a step and a CTA opt out by being what they are rather than by carrying a
class.

**A pane that scrolls sideways is focusable and named.** A listing, a compiler
diagnostic and the comparison table all scroll horizontally, and a scrolling
box with nothing focusable inside it cannot be reached with a keyboard at all:
the content is on the page and unreadable without a mouse. Each is a
`role="region"` with `tabindex="0"` and a name built from what the component
already knows, the sample path or the caption, because a region announced as
"region" tells nobody where they landed. The class is `.scroll-x`, declared
once in `base.css`. A pane whose content is already focusable, the playground's
editable listing, is exempt: it is a tab stop in its own right and wrapping it
would make two.

**A control's answer is spoken.** Copy buttons take their name from an
`aria-label`, which wins over their text, so swapping the text to "Copied"
changed what a sighted reader sees and nothing whatever in the accessibility
tree. One polite live region is emitted by the layout on every page and
`src/lib/copy.ts` writes into it, naming what was copied, because "Copied"
alone is useless on a page holding several of them.

## Print

The five lessons are a printed surface, and there was no `@media print`.
`src/styles/print.css` is it.

What the default printout did wrong, worst first. It truncated the code:
`.source` and `.diagnostic` clip a long line and offer a scrollbar, and paper
has no scrollbar, so every listing wider than the measure lost its right-hand
end with no mark to say so. They wrap on paper instead. It printed the
furniture: a masthead, a hamburger that cannot be tapped, a footer nav of links
that cannot be clicked. Those are gone, along with every control. And it
dropped the links, so prose links print their href.

The provenance stays. The evidence rails, the citation footers and the
measurement cards print exactly as they are, and the chart's bars are the one
thing on the site allowed to insist on printing their background colour,
because the bars are the measurement.

## Imagery

The mascot, and the artifact. There is no photography, no stock and no
decorative abstraction. Beyond the mascot, every visual is generated from
something the repository produces: duration figures from the measurement
record, mass figures at true area, a recorded session rendered line by line.

Two visuals are illustrative, and each page that shows one says so under it.
The home page's rebuild names its modules and its edit for the sake of the
picture; the two durations it runs for, the module count and the ratio are the
measured ones. The agent race, on /agents and in the home page's agents
section, generates its scrolling module bodies from a fixed seed in the
browser; the figures it lands on are read out of `facts.json`, and so is the
line naming the samples they were measured on. Both are in the built HTML
finished, and the script replays them.

## Rendered proof

Captured from the running site in a browser.

| File | What it shows |
|---|---|
| `screenshots/40-home.png` | The home page: the one line, the mascot, the listing that runs, the Crystal section with the README's Kemal server, the four cards, the measurement card, and the ways in. |
| `screenshots/41-why.png` | The argument in named axes, with the true-area mass figure. |
| `screenshots/42-learn.png` | The path's entrance and one step of it. |
| `screenshots/43-sample-run.png` | A sample route after Run: the program on the left, its output on the right, the module and exit status on one line under it. |
| `screenshots/45-tour.png` | The playground's table of contents: the tour in sections, each step a page. |

## Prohibitions

Recorded because each is a way this specific site could fail.

- No gradient and no shadow beyond the ones named under Layout. No floating
  orbs, no icon strip.
- No emoji used as an icon, and no mascot used as one.
- No em-dash in authored copy, and an en-dash only between the two ends of a
  numeric range set as a figure, `31–43%`. A verbatim record, compiler
  output, README quotation or sample source, is reproduced exactly, dashes
  included, because editing a recording to satisfy a house style turns it into
  a paraphrase.
- No hue in syntax highlighting beyond the three named under Code display.
- No recorded number outside a measurement card.
- No hand-transcribed number anywhere. See `doc/STACK.md`.
- No time estimate in any copy, including anything implying how long learning
  or building takes.
- No claim about the playground beyond what it does today. It runs recorded
  modules; it does not compile what a visitor types, and the page says so.
- No figure that only exists once a script has run. Every measurement is drawn
  by the stylesheet from data in the built HTML, and a script may animate it,
  never reveal it. The rebuild, the agent race and the recorded loop are all
  in the built HTML, finished; the script replays the first two and folds the
  third into tabs.
- No control offered where it cannot act. The menu button, the scheme switch,
  every replay button, the loop's tabs and its reader switch appear only once
  a script has claimed them.
- No colour outside `src/styles/tokens.css`. Both schemes are literals in the
  base `:root`; the dark scheme only aliases them. A `<meta name="theme-color">`
  and the web manifest take a literal and no variable, so they read the token
  file at build time rather than repeating it.
- No control edge drawn with `--hairline`. That token separates areas; a
  control's edge is `--boundary`.
- No font subset or format the site cannot use. `scripts/fonts.mjs` decides
  what ships, and its `unicode-range` values are read from the package.
