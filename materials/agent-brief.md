# Agent brief - shared by every fan-out page of learn-quant-trading-with-phoebe

You are writing ONE static HTML session page. No servers, no npm. **If your target file already
exists on disk, do not write it; report that and stop.** Write the file, return its path and one
line of coverage. No HTML in your reply.

## Read first, in this order

1. The template page for YOUR track. Copy its structure, classes, SVG grammar and quiz markup
   EXACTLY, including how many options each question has (three):
   - Leader: `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-quant-trading-with-phoebe/courses/a1-one-history-not-an-experiment.html`
   - Practitioner: `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-quant-trading-with-phoebe/courses/p1-the-honest-null.html`
   - The bench page, for any page that drives the engine: `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-quant-trading-with-phoebe/courses/p10-the-backtest-bench.html`
2. The source map: every verified number, its evidence tier, per-session coverage, the seams. Use
   ONLY its numbers; never invent a statistic; if a fact is missing, teach the uncertainty.
   `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-quant-trading-with-phoebe/materials/official-course-map.md`
3. The stylesheet `:root` block for the palette tokens:
   `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-quant-trading-with-phoebe/assets/style.css`
4. The engine, if your page has a widget: `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-quant-trading-with-phoebe/assets/qt-live.js`
   (exports `QT.makeWorld, makeStrategies, pnl, moments, annualise, psr, expectedMaxSR, sqrt2lnN,
   splits, trial, ladderRung, equity, sizingRung, survivorshipRung, lookaheadRung, selfTest`).

## Page skeleton (keep every component)

toolbar (crumb EXACTLY `<a href="../index.html">learn-quant-trading-with-phoebe</a> / Leader session N of 6`
or `/ Practitioner session N of 10`, #toggle-all, #zoom-toggle) · masthead (eyebrow
"Learn Quant Trading with Phoebe · Leader session N of 6" / "· Practitioner session N of 10", h1
with one `<span class="accent">`, .sub, .chip-row with the level chip (leader pages: `🟠 Leader
track`; practitioner pages: `🟡 Foundations` for p2, `🟠 Working depth` for p3 to p5, `🔴 Advanced`
for p6 to p9), two audience chips, `.chip.time` "45 min"; .agenda a1-a4 with flex weights) ·
main.wrap · section#intro (Part 0: kicker with `.klabel` "Part 0" and an h2, .lede, .legend with
the three pills exactly as the template, `.callout.win` beginning "★ What you walk out with
tonight." (p10 says "today"), two or three `details.card`, the first `open`) · section#part-1 and
section#part-2 (each: section-kicker with klabel "Part N · covers ...", h2, `.tag.concept "N min
live"`; a `.lede`; ONE `figure.zoomable`; three or four `details.card` accordions with summary
`.mode.live` or `.mode.self`, title, `.mini "N min"`, `.caret ▶`; at least one `.callout.example`
with `span.ex-pill` "Real world" on the page; one `details.card` titled "Where serious people
disagree" somewhere on the page) · section#part-3 (klabel "Part 3 · build-along", h2, `.tag.build
"N min hands on"`, .lede, ONE figure, `.steps > .step > div > h4 + p` with 5 or 6 steps; practitioner
pages carry a `.prompt-box.good` with `span.label` "console" under most steps; leader pages carry
no code; close with a `.callout.tip` beginning "The habit to keep.") · section#quiz (klabel "Check
yourself", h2 "Three questions", 3 x `div.quiz-q data-answer="0-based"` each with `p.qtext`, three
`div.qopt` "A · ...", "B · ...", "C · ...", and `q.qwhy`; then ONE `div.quiz-score`) ·
section#homework (klabel "Before session N+1" or "After the course", h2 "Homework", .lede,
`.steps` with 2 or 3 steps) · section#official (klabel "Covered tonight", h2 EXACTLY "What this
session covers", `.covered > .covered-row` with `span.status.pill.solid` ✓ / `.pill.inkpill` ◐ /
`.pill.light` ○, `span.name`, `span.note`; 8 to 11 rows; the last two rows are always the seam
hand-off and the no-market line as in the template) · section#cheatsheet (klabel "Take this with
you", h2 "Cheat sheet", `.cheat > .cheat-item` x 8, each `<strong>Label.</strong> text`) ·
footer.pagefoot (`<p>Leader session N of 6 · learn-quant-trading-with-phoebe · by Phoebe Fu</p>`,
`nav.pagenav` with prev and next) · `<script src="../assets/qt-live.js?v=1">` then
`<script src="../assets/app.js?v=1">` then the page's own `<script>` and `<style>` as the template.

Head: the template's social meta block with this page's own title, description and url;
`<title>Leader session N · <Title> - learn quant with phoebe</title>` (or `Practitioner session
N · ...`); `<link rel="stylesheet" href="../assets/style.css?v=1">`. Nothing else external.

First `details.card` in the FIRST Part is `open`; no other except the one in Part 0. Sentence
case headings. Warm practitioner voice, concrete, never dry. Inside prompt-boxes escape `&`
`<` `>`. 500 to 700 lines is guidance about depth, never a target: never collapse whitespace,
dissolve a list into a paragraph, or drop a component to fit.

## Hard rules (a violation is rework)

- NEVER an em dash or en dash, anywhere (prose, code, aria-labels, comments). Hyphen only.
- No meta text: never "this course", "in this course", "the course teaches", "banned here". State
  the professional norm directly with its reason. "session 5" cross-references are fine.
- Attribution "by Phoebe Fu". Never "built with" a tool.
- Every number comes from the map or is labelled constructed. For console steps print "your
  numbers will match for the same seed" only where the step uses a canon seed; otherwise "your
  numbers will differ".
- Contested or missing evidence: teach the disagreement; never resolve what the literature has not
  (the four items under "Contested or moving" in the map).
- Citations in the exact form of the map's appendix; anything the map marks reported is "reported"
  on the page too. The AFML book is described, never quoted.
- NEVER "lottery" or "lotteries"; say the mechanism ("a random draw", "decided by seed").
- Default to the English word. No Chinese terms are expected on these pages.
- **No coins, tokens, tickers, prices, market data, exchange or vendor names, chain names, named
  funds, named incidents or named people other than the cited authors. No investment, trading or
  purchasing advice.** Every page's intro and its last covered row say nothing here is investment
  advice and synthetic data only.
- Running case is **Marlow Street**, constructed, labelled constructed on first use. Never
  Phoebe's own work.
- Every page number must be one the engine prints at the canon seeds: quote the map's tables
  with their trial counts ("200 worlds", "100 worlds"). Never a single run as if it were the mean.
- Titles, widget ids and class names must not collide with siblings: do not use ids `p10-a`,
  `p10-b`, `a1-bestof`, `p1-null`, or any `.dh-`, `.hb-`, `.tr-`, `.tick-`, `.sv-` class; prefix your
  widget id with your page id (`p3-`, `a4-`).

## Figure grammar (hand-drawn, every figure)

Palette, ONLY these hexes (no invented greys): `#7A1F3D` `#4A1024` `#BF8398` `#E4C6D1` `#FAF0F3`
`#2A1118` `#6B5159` `#DCC9CF` `#EBDDE2` `#3B6E8F` `#EAF1F6` `#2A5068` `#FDFAFB` · `#FFFFFF` ·
universal reds `#991B1B` `#FEF2F2` `#FCA5A5` only for a wrong-way panel.

- `<figure class="zoomable">` > `<svg viewBox="0 0 880 H" xmlns="http://www.w3.org/2000/svg"
  role="img" aria-label="the data, not the shape">` > `<defs>` + `<style>` + content, then
  `<figcaption>🔍 Click to zoom - takeaway</figcaption>`. Grow H, never W.
- Prefix unique per figure, used for every class and id: page id + figure letter, e.g. `p3a`,
  `p3b`, `p3c` (classes `.p3aH`, ids `p3aSk`, `p3aHc`, `p3aAr`).
- `<defs>` holds three things with the prefix P: a wobble filter `id="PSk"` (`feTurbulence
  type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="<int>"` + `feDisplacementMap
  scale="2.4" xChannelSelector="R" yChannelSelector="G"`, `x="-3%" y="-3%" width="106%"
  height="106%"`), a hachure pattern `id="PHc"` (7x7 userSpaceOnUse, rotate(-38), one line in
  `#7A1F3D` or `#3B6E8F`, opacity .5), an open arrowhead `id="PAr"` (path `M1 1 L9 5 L1 9`, fill
  none, ink stroke 1.6). ALL shapes sit inside ONE `<g filter="url(#PSk)" fill="none"
  stroke="#2A1118" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`; rects carry
  a tiny rotation (-1.2 to 1.2 degrees). Fills: white, `#FAF0F3`, `#EAF1F6`, the hachure for "the
  pile" or "the data", and steel `#3B6E8F` ONLY for the one thing the figure is about. One doodle
  anchor per figure, simple strokes, never a mascot. A deliberate strike-through carries
  `data-strike="1"` on its path.
- Text classes: `.PH` 800 12px `#2A1118` heading · `.PL` 600 12px ink label · `.PS` 400 11px
  `#6B5159` · `.PB` 800 11px `#2A5068` · `.PV` 800 16-18px `#4A1024` value · `.PW` 800 12px white
  on a fill · `.PA` 700 11px `#7A1F3D` · `.PN` 400 12px `#6B5159` note.
- ALL `<text>` outside the filtered group, sans stack, never below 10.5px.
- Fit (owner: `diagram-kit.md`): max chars ≈ (box width - 20) / 7 at 12px, 6.4px/char at 11px;
  a full-width note under 110 characters per line, split into two lines at y + 18 when longer;
  40px between neighbouring point labels; bottom note 22px below the last row, H clears it by 8px.
  No path may cross a label; no label may extend past the box it sits in; no two filled rects may
  overlap unless one is wholly inside the other. When in doubt, shorten.
- Floor: one figure per Part plus one in the build-along (three per page). Draw the MECHANISM
  (where the selection loop runs backwards, which days a shuffled split shares, where the signal
  shift lets tomorrow in, how the survivors were chosen after the fact, where a cost is charged
  on the position change), never a metaphor literally, never decoration.

## Voice and honesty

Every Part gets a real-world story from the map's case: Marlow Street, constructed, said so. The
generator has no memory, so overfit rules earn zero here, not less than zero; say so wherever the
AMS paper's compensation effect is near. The embargo's effect cannot be shown on this world; say
so. sqrt(2 ln N) is an upper bound; quote the measured column beside it. McLean and Pontiff's
figures moved between drafts; quote the published ones with the journal and year.

## Cross-links (absolute URLs)

- Rolling-origin forecast evaluation: https://phoebefu6.github.io/learn-timeseries-forecasting-with-phoebe/courses/b8-backtesting-metrics.html
- "Assist, never advise": https://phoebefu6.github.io/learn-ai-finance-with-phoebe/courses/b9-markets-investing.html
- The leak hunt on one model: https://phoebefu6.github.io/learn-model-risk-with-phoebe/courses/p3-the-leak-hunt.html
- Challenger models: https://phoebefu6.github.io/learn-model-risk-with-phoebe/courses/p5-benchmarks-and-challengers.html
- A/B tests: https://phoebefu6.github.io/learn-experimentation-with-phoebe/
- Feature leakage: https://phoebefu6.github.io/learn-feature-engineering-with-phoebe/courses/b5-leakage.html
- Hub: https://phoebefu6.github.io/learn-with-phoebe/

## Footer chains and session titles

Leader chain: a1-one-history-not-an-experiment.html → a2-the-market-is-not-a-customer.html →
a3-try-a-thousand-publish-the-best.html → a4-the-leakage-classes.html →
a5-why-the-playbook-breaks-here.html → a6-from-churn-model-to-trading-desk.html (last page: "←
Prev" and "Course home" to ../index.html).

Practitioner chain: p1-the-honest-null.html → p2-a-strategy-as-a-function.html → p3-the-max-of-n.html
→ p4-the-deflated-sharpe-haircut.html → p5-time-ordered-splits.html → p6-planting-a-true-signal.html
→ p7-costs-against-a-small-edge.html → p8-survivorship-and-lookahead-planted.html →
p9-sizing-and-drawdown.html → p10-the-backtest-bench.html.

Footer left: `<p>Leader session N of 6 · learn-quant-trading-with-phoebe · by Phoebe Fu</p>`.
Footer right: `<a href="prev">← Leader session N-1 · <Title></a>` and `<a href="next">Leader
session N+1 · <Title> →</a>` (session 1 of a track: "← All sessions" to ../index.html).

Session titles (exact, sentence case, one accent span in h1):

- a1 A backtest is one history, not an experiment (exists)
- a2 The market is not a customer
- a3 Try a thousand things, publish the best
- a4 The leakage classes
- a5 Why the data-science playbook breaks here
- a6 From churn model to trading desk: the transfer map
- p1 Generating the honest null (exists)
- p2 A strategy as a function
- p3 The max of N
- p4 The deflated Sharpe haircut
- p5 Time-ordered splits
- p6 Planting a true signal
- p7 Costs against a small edge
- p8 Survivorship and lookahead, planted and caught
- p9 Sizing and drawdown: risk is the product
- p10 The backtest bench (exists)

## Widgets (practitioner pages p2 to p9 carry one; leader pages a2 to a6 carry one small one)

Copy the `.wk` block from p1 or p10: `div.wk#<pageid>-<name>` > `.wk-head` (b "Live" +
`.wk-hint`) > `.wk-body` (`label.sql-label` + `select.sql-code` or `input.sql-code[type=range]`,
a `div#<id>-out`, a `p.sql-note#<id>-verdict`) > `.wk-foot#<id>-self` that prints the selfTest
sentence exactly as the template. Call the engine's canon seeds so that at the canon trial count
the widget prints the map's numbers (seed rules are in the map's "The world" paragraph and in
p10's "canon seeds" card). Never hard-code a number the widget does not print.

## Lead additions, 2026-10-09 (win over anything above)

- **No meta or internal wording in visible text, aria-labels or meta tags:** never "the course",
  "the whole course", "this course", "course map", "source map", "materials/". Say "every
  session", "the leader track", "the canon figures", "the canon seeds". (JS comments are fine.)
- **"Almost never", not "never", for a real 1.5 among 100 on three years:** it passes the deflated
  test in 0 of 200 worlds in ladder B, 1.5 percent in B2 (N = 100) and 3 percent of 100 in B3.
  Quote the ladder and its trial count with any of these figures.
- **Null tail counts** (ladder A, N = 1, 200 worlds): above 0.9 in 17, above 1.0 in 15, above 1.17
  in 12. No other "one in ten" style figure.
- **Widget compute budget:** the default render must finish in about a second in a browser. A
  rung at N = 1,000 or 200 worlds of the history ladder is behind a "Run" button with a "running"
  note, never on load. Use `setTimeout(render, 0)` after the button sets the note.
- **a5 is the family's "why the playbook breaks here" session:** mechanism by mechanism, five
  contrasts (the source, the identity, the ground truth, the feedback loop, the cost of being
  wrong), each contrast drawn as a figure (two figures may each hold several contrasts as
  side-by-side panels), never a slogan.
- **a6 is the transfer map:** three columns CARRIES OVER / MUST LEARN / MUST UNLEARN, each item
  naming the skill, method, tool class or reading concretely (no vendor or product names), then a
  90-day self-study ladder using free sources only, each marked "official" (the author's or
  publisher's own copy) or not. The landing page's "If you come from a data team" block summarises
  a6 and must stay consistent with it: read `index.html` before writing a6.
- **The ruler:** 0.71 is the formula (sqrt(252/503)); the spread measured over 200 null worlds and
  printed by p1's widget is 0.70. Say which one you quote.
