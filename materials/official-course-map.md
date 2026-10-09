# Official course map - learn-quant-trading-with-phoebe

"Quant Trading: The Backtest That Lies". Bucket `emrg`, difficulty d4, audience builder,
16 sessions, Leader 6 + Practitioner 10. **Every session is 45 minutes, on both tracks.**

**Scope, set by Phoebe 2026-10-08: a data-science course about the one experiment that cannot
be rerun.** Strategy search is a multiple-testing problem; the market is adversarial, reflexive and
non-stationary, so a signal decays once it is found; signal-to-noise is near zero; leakage has
classes of its own; costs erase small edges; risk is the product. **Synthetic data only**: seeded
random walks with an optional planted signal. No market series, no ticker, no price, no date, no
named fund, venue, vendor or incident. **Nothing in the course is investment advice**, said on
the landing page, on a1 and on p10.

Running case: **Marlow Street**, a constructed four-person research desk whose head has been
handed a backtest with an annualised Sharpe ratio of 1.8 and asked whether to fund it. Fictional,
labelled constructed on every page that uses it.

---

## The seam

| Subject | Owner | This course |
|---|---|---|
| Rolling-origin cross-validation, MAPE, RMSE, MASE, forecast backtests | `learn-timeseries-forecasting-with-phoebe` b8 "Backtesting and metrics" (LIVE) | **Linked, not re-taught.** That page owns rolling-origin evaluation of a forecast. Here the object evaluated is a strategy, the statistic is a Sharpe ratio, and the new material is selection across many strategies, purging and the embargo. |
| "Assist, never advise" for AI in markets | `learn-ai-finance-with-phoebe` b9 "Markets and investing with AI" (LIVE) | Named. The no-advice rule here is the same rule. |
| Model validation, challenger models, the leak hunt on a single model | `learn-model-risk-with-phoebe` p3 "The leak hunt", p5 "Benchmarks and challengers" (LIVE) | Named. That course validates one model against a challenger. Here the leak classes are the ones specific to a time-ordered, adversarial series, and the challenger is a thousand random strategies. |
| A/B tests, power, peeking | `learn-experimentation-with-phoebe` (LIVE) | Named. An A/B test can be rerun; a backtest cannot. That difference is a1. |
| Feature leakage on a tabular model | `learn-feature-engineering-with-phoebe` a2 "The leakage disaster", b5 "Leakage: the session" (LIVE) | Named. Target leakage in general lives there. Lookahead, survivorship, restatement and shuffled-split leakage are taught here because each has a time-order mechanism of its own. |

**This course owns:** best-of-N selection, the expected maximum of N trials, the deflated Sharpe
ratio, purged and embargoed walk-forward, the leakage classes, costs and sizing.

**Estate vocabulary check (grep of `learn-*-with-phoebe/courses/*.html`, 2026-10-08).**
`deflated Sharpe` **0** · `multiple testing` **0** · `lookahead` / `look-ahead` **0** · `best-of`
**3** (none about strategies) · `walk-forward` **1** (timeseries b8, the seam above) · `Kelly` **3**
(prose mentions) · `t-statistic` **0** · `Sharpe ratio` exact phrase **0** (a looser grep for
`Sharpe` returns 191 pages, all of them "sharper" or "sharpen"). None of the 16 session titles
collides with any sibling h1.

---

## Frozen canon - Marlow Street

Computed in node from `assets/qt-live.js` by `materials/qt_ladder.js` before any page quoted a
number, and reproduced by `materials/qt_reference.py` (numpy, same random stream) to **3.3e-13
absolute on all 635 numbers** (stated precision 1e-6). The raw JSON is `materials/qt_canon.json`.
**Every figure below is a mean over the stated number of trials, never a single run.** Nothing
here describes a real market, and no page may imply otherwise.

### The world, in one paragraph

A world is `days` daily returns, `r[t] = sigma * (c * s[t-1] + e[t]) / sqrt(1 + c^2)`, with
`sigma = 0.01`, `e` standard normal, and `s` a hidden AR(1) signal with `phi = 0.8`. The
constant `c` is chosen so that a strategy trading `sign(s)` has the requested annualised Sharpe
ratio in expectation (`trueSR = 0` means `c = 0`: a pure random walk). A strategy is a signal
turned into a position of +1 or -1, held for `h` days; observation `t` earns `position[t]` times
the h-day forward return minus `cost` per unit of position change. N strategies are N independent
AR(1) signals that know nothing about the returns; when a signal is planted, strategy 0 is given
the world's hidden signal. Sharpe ratios are per observation, annualised by `sqrt(252 / h)`.
Default `days = 756` (three years), walk-forward train 2/3 (503 observations) and test 1/3 (252).
Seeds: world seed `s`, strategies `s + 1000`, shuffle `s + 2000`; a rung uses seeds
`seed0 + 1 .. seed0 + trials`, with `seed0` listed in `qt_ladder.js`.

### The engine is checked, not assumed

`selfTest()` runs **six** properties on load. Property 5 was run against a reintroduced fault
(the purge made a no-op) and **failed**, 0.62 then 0.62, while the other five still passed.

| Property | Result on the real engine |
|---|---|
| normInv inverts normCdf | 1.2345 returns 1.2345 |
| With one strategy and no alpha, the mean Sharpe over 40 worlds is near zero | 0.027 |
| A planted Sharpe of 3 with no competition is measured near 3 | 3.056 |
| The expected maximum of N trials grows with N | 1.575 at N = 10, 3.255 at N = 1,000 (units of one estimate's standard deviation) |
| **Purging a shuffled split removes the leak it creates** | **0.62 then -0.14** (no-op purge: 0.62 then 0.62) |
| A cost per trade lowers the Sharpe ratio | 0.71 against 1.38 |

Any page stating a count of these properties must say **six**.

### Ladder A - best of N on nothing (zero alpha, walk-forward 503/252, h = 1, 200 trials each)

| N | Best in-sample Sharpe | Its out-of-sample Sharpe | Expected max from the DSR formula, SR* | Naive discovery rate | Deflated discovery rate |
|---|---|---|---|---|---|
| 1 | -0.01 | -0.07 | 0.00 | 0.060 | 0.060 |
| 10 | **1.04** | 0.14 | 1.07 | 0.325 | **0.000** |
| 100 | **1.80** | -0.06 | 1.80 | 0.995 | **0.000** |
| 1,000 | **2.33** | 0.02 | 2.31 | 1.000 | **0.000** |

"Naive discovery" is the share of trials where the selected strategy's probabilistic Sharpe ratio
against a benchmark of zero reaches 0.95. "Deflated discovery" is the same test against SR*, the
expected maximum of N null trials (Bailey and Lopez de Prado 2014, equation 1, with the variance
of the N estimates measured in the trial). Under zero alpha every discovery is false, so these two
columns are false-positive rates. **The anti-lever "deploy the best in-sample strategy" prints
the first two columns side by side: the out-of-sample figure is lower on every rung above N = 1,
by 0.9 at N = 10, 1.9 at N = 100 and 2.3 at N = 1,000.** Tail counts on the same 200 N = 1 worlds (in-sample, annualised): above 0.9 in **17**, above 1.0 in
**15**, above 1.17 (the one-sided 95 percent line) in **12** (p1 quotes these). At N = 1 the two tests coincide (no
deflation is possible) and the 6 percent is the ordinary 5 percent false-positive rate of a one-sided
95 percent test, within trial noise.

### Ladder H - the sqrt(2 ln N) check (from ladder A, per-observation units divided by 1/sqrt(503))

| N | Measured mean maximum, in units of one estimate's standard deviation | DSR formula, equation 1 | sqrt(2 ln N) |
|---|---|---|---|
| 10 | 1.475 | 1.575 | 2.146 |
| 100 | 2.539 | 2.531 | 3.035 |
| 1,000 | 3.291 | 3.255 | 3.717 |

**Two honest readings.** The expected maximum grows with N at roughly the pace of sqrt(2 ln N),
which the AMS paper gives as an **upper bound** to its formula, not as the estimate. The DSR
formula itself lands within 0.1 of the measured maximum at N = 10 and within 0.04 at N = 100 and
1,000, in line with the paper's own Exhibit 3.1 (an overestimate of less than 0.05 below 50
trials, 0.006 by 1,000). Pages must call sqrt(2 ln N) a bound and quote the measured column.
Annualised, one estimate's standard deviation on 503 daily observations is 0.71 by formula
(sqrt(252/503)); the spread measured over ladder A's 200 N = 1 worlds is **0.70** (0.704), which is
what the p1 widget prints. Quote 0.71 as the formula, 0.70 as the measurement.

### Ladder B - one planted signal among 100 (walk-forward 503/252, 200 trials each)

| True Sharpe of the planted strategy | Best in-sample Sharpe | Its out-of-sample Sharpe | Share of trials where the planted one was selected | Naive discovery | Deflated discovery | Deflated and it was the planted one | FDR after deflation |
|---|---|---|---|---|---|---|---|
| 0.5 | 1.77 | -0.03 | 0.020 | 0.990 | 0.000 | 0.000 | 0.000 |
| 1.0 | 1.81 | 0.12 | 0.140 | 0.990 | 0.000 | 0.000 | 0.000 |
| 1.5 | 1.93 | 0.46 | 0.325 | 0.995 | 0.000 | 0.000 | 0.000 |
| 2.0 | 2.15 | 1.09 | 0.570 | 1.000 | 0.030 | 0.030 | 0.000 |
| 3.0 | 2.94 | 2.71 | 0.905 | 1.000 | 0.345 | 0.345 | 0.000 |

**The haircut is brutal on two years of training data.** With 99 random competitors a real
Sharpe of 1.5 is selected only a third of the time and survives deflation in none of these 200
trials (1.5 percent in B2 at N = 100, 3 percent in B3 at 3 years: "almost never", not "never"); a real Sharpe of
3 survives it a third of the time. **FDR after deflation is 0.000 on every rung**: every strategy
that passed the deflated test was the planted one. Deflation keeps its promise on false
positives and pays for it in power.

### Ladder B2 - a real Sharpe of 1.5 against a growing crowd (200 trials each)

| N | Best in-sample | Its out-of-sample | Planted one selected | Naive | Deflated (all were the planted one) |
|---|---|---|---|---|---|
| 1 | 1.51 | 1.48 | 1.000 | 0.655 | 0.655 |
| 10 | 1.69 | 1.03 | 0.680 | 0.810 | 0.030 |
| 100 | 1.99 | 0.72 | 0.405 | 0.995 | 0.015 |
| 1,000 | 2.42 | 0.20 | 0.130 | 1.000 | 0.015 |

The crowd drowns the real one: at N = 1,000 the best in-sample strategy is the planted one 13
percent of the time, and the out-of-sample Sharpe of whatever was picked is 0.20 against a real
1.5 that was in the pile all along.

### Ladder B3 - the same real 1.5 among 100, with more history (100 trials each)

| Years (train / test observations) | Best in-sample | Its out-of-sample | SR* | Planted one selected | Deflated discovery (all planted) |
|---|---|---|---|---|---|
| 3 (503 / 252) | 2.03 | 0.68 | 1.86 | 0.390 | 0.030 |
| 6 (1,007 / 504) | 1.61 | 0.93 | 1.35 | 0.560 | 0.060 |
| 12 (2,015 / 1,008) | 1.53 | 1.42 | 0.99 | 0.950 | 0.450 |
| 24 (4,031 / 2,016) | 1.50 | 1.51 | 0.74 | 1.000 | 0.940 |

The only cure for the haircut is independent history, which cannot be manufactured. This is the
course's version of the AMS paper's minimum backtest length.

### Ladder C - costs against a small edge (the planted strategy alone, real Sharpe 1.0, 200 trials)

| Cost, basis points per unit of position change | In-sample Sharpe | Out-of-sample Sharpe |
|---|---|---|
| 0 | 1.01 | 1.05 |
| 1 | 0.95 | 0.98 |
| 2 | 0.88 | 0.93 |
| 5 | 0.69 | 0.74 |
| 10 | 0.37 | 0.43 |
| 20 | **-0.30** | **-0.23** |

With `phi = 0.8` the position flips on about 20 percent of days (the sign-change probability of
an AR(1) is arccos(phi)/pi = 0.205), so turnover is about 0.41 units a day. Each 5 basis points
costs about 0.32 of annualised Sharpe at `sigma = 0.01`. A real edge of 1.0 is gone by 15 basis
points and negative at 20.

### Ladder D - splits on zero alpha, 100 strategies, 5 folds where folded (100 trials each)

| Split | Train / test observations | Best in-sample | Its out-of-sample |
|---|---|---|---|
| Walk-forward, h = 1 | 503 / 252 | 1.78 | -0.05 |
| Shuffled k-fold, h = 1, no purge | 604 / 151 | 1.65 | 0.10 |
| Walk-forward, h = 5 | 500 / 251 | 1.34 | -0.07 |
| Blocked k-fold, h = 5, no purge | 601 / 150 | 1.23 | -0.05 |
| **Shuffled k-fold, h = 5, no purge** | 601 / 150 | 1.11 | **0.65** |
| Shuffled k-fold, h = 5, purged | **141** / 150 | 2.77 | -0.02 |
| Blocked k-fold, h = 5, purged | 597 / 150 | 1.26 | 0.06 |
| Blocked k-fold, h = 5, purged, embargo 5 | 592 / 150 | 1.24 | -0.10 |

**The break button is the fifth row.** Shuffling time order inside the split raises the
out-of-sample Sharpe of a strategy with no alpha from about zero to **0.65**, but only when
observations overlap (h = 5): with h = 1 the shuffled split leaks nothing visible (0.10, within
trial noise of the walk-forward's -0.05). Purging removes the leak either way. Purging a
**shuffled** split throws away three quarters of the training data (141 observations left) and
the best-in-sample figure rises to 2.77 because the maximum of 100 estimates on a tiny sample is
large; purging a **blocked** split costs 4 observations. The embargo changes nothing measurable
here (the signal's serial correlation is already handled by the purge at the span level); pages
teach it as Lopez de Prado describes it and say the bench cannot show it on this world. Trial
noise on an out-of-sample mean at 100 trials is about 0.07.

### Ladder E - sizing a real Sharpe of 1.0 over three years (200 trials each)

| Leverage | Mean terminal wealth | Median terminal wealth | Mean maximum drawdown | Share of paths that lost half at some point | Growth rate per year |
|---|---|---|---|---|---|
| 1 | 1.61 | 1.57 | 0.18 | 0.000 | 0.147 |
| 2 | 2.56 | 2.28 | 0.34 | 0.080 | 0.268 |
| 4 | 6.31 | 3.85 | 0.58 | 0.725 | 0.436 |
| **6** | 14.57 | **4.80** | 0.75 | 0.985 | **0.502** |
| 8 | 29.91 | 4.40 | 0.85 | 1.000 | 0.466 |
| 12 | **71.48** | **1.45** | 0.96 | 1.000 | 0.080 |
| 16 | 62.27 | 0.12 | 0.99 | 1.000 | -0.750 |
| 24 | 1.04 | 0.00 | 1.00 | 1.000 | -4.030 |

**Risk is the product.** The mean keeps rising to leverage 12 while the median collapses to 1.45
and 98 percent of paths have already lost half at leverage 6. Growth peaks at leverage 6, which
is the full-Kelly fraction for this world (daily mean 0.00063 over daily variance 0.0001 gives
6.3). No page may quote the mean column without the median beside it. The growth rate at
leverage 24 is a mean that includes paths floored at -10 per year when wealth hit zero; quote it
as "below -4", not as a measured return.

### Ladder F - survivorship, planted and caught (50 zero-alpha series, 504 days, 100 trials)

| Quantity | Value |
|---|---|
| Series dropped by the rule "remove anything that ended below -20 percent" | 9.5 of 50 on average |
| Equal-weight buy-and-hold Sharpe on the survivors only | **1.51** |
| The same rule on the point-in-time universe (all 50) | **-0.01** |

### Ladder G - lookahead, planted and caught (five-day momentum rule, 200 trials)

| Signal | Annualised Sharpe | Correlation of the position with the day it trades | Correlation with the previous day |
|---|---|---|---|
| Honest, built from days up to t | 0.02 | -0.001 | 0.358 |
| Shifted one day, includes the day it trades | **6.11** | **0.358** | 0.355 |

The catch is the third column: a position built honestly cannot be correlated with the return it
is about to earn in a zero-alpha world. The fourth column is the same for both and is simply the
rule reading its own inputs, so it is not a test.

## Verified facts and their tiers

**Read at source** means the text was fetched and read in this build (PDF text extracted and
grepped). **Reported** means the fact comes from a catalogue, abstract page or search summary and
the primary text was not read. A fact that could not be read at source is reported or cut.

| # | Fact | Tier | Source |
|---|---|---|---|
| 1 | The ratio was introduced in 1966 as the "reward-to-variability ratio"; the 1994 paper adopts the name Sharpe Ratio from common usage; ex ante is expected differential return over its predicted standard deviation, ex post is the historic average over the historic standard deviation | read at source | Sharpe 1994 (Stanford copy) |
| 2 | "The Sharpe Ratio is not independent of the time period over which it is measured"; "The t-statistic will equal the Sharpe Ratio times the square root of T" | read at source, verbatim | Sharpe 1994 |
| 3 | DSR abstract: analysts "can backtest millions (if not billions) of alternative investment strategies"; DSR "corrects for two leading sources of performance inflation: Selection bias under multiple testing and non-Normally distributed returns" | read at source, verbatim | Bailey and Lopez de Prado 2014, SSRN 2460551 text |
| 4 | Equation 1: the expected maximum of N independent null trials is sqrt(V) times ((1 - gamma) Z^-1[1 - 1/N] + gamma Z^-1[1 - 1/(N e)]), gamma the Euler-Mascheroni constant approx. 0.5772, V the variance of the trials' estimated Sharpe ratios; confirmed against the paper's own Python snippet `getExpMaxSR` | read at source | Bailey and Lopez de Prado 2014 |
| 5 | DSR is "a PSR where the rejection threshold is adjusted to reflect the multiplicity of trials"; it uses five additional variables: skewness, kurtosis, sample length, the variance of the Sharpe ratios tested, and the number of independent trials | read at source, verbatim fragment | Bailey and Lopez de Prado 2014 |
| 6 | The analytical formula overestimates the empirical maximum by "less than 0.05 for an underlying process with variance 1" below about 50 trials and "by 1000 trials it is as small as 0.006" | read at source, verbatim | Bailey and Lopez de Prado 2014, Exhibit 3.1 note |
| 7 | HL's Benjamini-Hochberg threshold and the DSR threshold are "complementary", and readers are encouraged to compute DSR on both | read at source | Bailey and Lopez de Prado 2014 |
| 8 | "After only twenty trials, the researcher is expected to find one specification that passes the AIC criterion" at a 5 percent false-positive rate | read at source, verbatim | Bailey, Borwein, Lopez de Prado, Zhu 2014 (ams.org PDF) |
| 9 | "if only five years of data are available, no more than forty-five independent model configurations should be tried"; "After trying only seven independent strategy configurations, the expected maximum SR IS is 1 for a two-year long backtest, while the expected SR OOS is 0" | read at source, verbatim | AMS 2014 |
| 10 | "An upper bound to (4) is sqrt(2 ln[N])"; MinBTL < 2 ln[N] / E[max_N]^2 (Theorem 2) | read at source | AMS 2014 |
| 11 | "seven binomial independent parameters offers N = 2^7 = 128 trials, with an expected maximum Sharpe ratio above 2.6" | read at source, verbatim | AMS 2014 |
| 12 | "in the absence of memory, there is no reason to expect overfitting to induce negative performance"; with memory, "a compensation effect, which increases the chances for that strategy to be selected IS, only to underperform the rest OOS" | read at source, verbatim | AMS 2014 |
| 13 | Notices of the AMS, vol. 61, no. 5, May 2014, pp. 458-471, DOI 10.1090/noti1105 | read at source (DOI on page 1; pages from the repository citation) | AMS 2014; WMU ScholarWorks listing |
| 14 | 313 papers, 316 factors; "A new factor needs to clear a much higher hurdle, with a t-statistic greater than 3.0"; "most claimed research findings in financial economics are likely false"; 3.0 corresponds to a p-value of 0.27 percent; the authors "argue that there are good reasons to expect that 3.0 is too low" | read at source, verbatim | Harvey, Liu, Zhu 2016, RFS v29 n1 (Duke PDF) |
| 15 | 97 variables; "Portfolio returns are 26% lower out-of-sample and 58% lower post-publication"; "We estimate a 32% (58%-26%) lower return from publication-informed trading"; "investors learn about mispricing from academic publications" | read at source, verbatim | McLean and Pontiff 2016, JF vol. LXXI no. 1 (published PDF) |
| 16 | Earlier drafts of the same paper reported different figures (82 characteristics; 25 and 56 percent in a later draft) | reported | search summary of working-paper abstracts |
| 17 | Advances in Financial Machine Learning, Wiley 2018, ISBN 978-1-119-48208-6; chapter 7 "Cross-Validation in Finance" with "Why K-Fold CV Fails in Finance" and "A Solution: Purged K-Fold CV"; chapter 12 walk-forward, cross-validation, combinatorial purged cross-validation; chapter 14 Sharpe, probabilistic and deflated Sharpe ratio | title, publisher, ISBN read at source (Wiley page); chapter structure reported (catalogue listings). The book's text was not read and is not reproduced. | Lopez de Prado 2018 |
| 18 | Purging drops training observations whose label span overlaps a test observation's span; the embargo drops training observations immediately after a test block to absorb serial correlation | reported, from the book's own description as summarised in catalogue and secondary pages | Lopez de Prado 2018, chapter 7 |
| 19 | For the maximum of n standard normals, the normalising constant satisfies c_n approx. sqrt(2 ln n) and the limit is the Gumbel distribution; the Gumbel mean is mu + beta gamma with gamma approx. 0.5772 | read at source | Wikipedia, Fisher-Tippett-Gnedenko theorem and Gumbel distribution pages |
| 20 | The AMS paper points to Embrechts et al., Example 3.5.4 for the derivation of bounds on the maximum of a normal | read at source (the footnote), the cited example not read | AMS 2014 footnote 3 |

**Contested or moving, taught as disagreement, never resolved:**

- **Does overfitting make out-of-sample performance negative or merely zero?** The AMS paper says
  zero without memory and negative with memory (fact 12). This bench has independent returns and
  reports out-of-sample means within noise of zero on every zero-alpha rung, so it is the
  no-memory case and must say so. Pages may not claim "overfit strategies lose money"; they say
  "earn nothing, or worse if the series has memory, which this bench does not model".
- **What hurdle?** Harvey, Liu and Zhu argue for t above 3.0 and say even that may be too low;
  Bailey and Lopez de Prado deflate against the expected maximum and call the two complementary.
  Teach both, never pick.
- **How much decay?** McLean and Pontiff's headline is 26 and 58 percent in the published paper;
  the same study reported other figures in earlier drafts (fact 16). Quote the published figures
  with the journal and year, and say the estimate moved as the sample grew.
- **sqrt(2 ln N)** is an upper bound in the paper and the growth rate in loose speech. The bench
  measures 2.54 against 3.04 at N = 100. Say "grows like", quote both.

## Coverage per session

`✓` taught to working depth. `◐` named and handed on.

### Leader track

| Session | Covers | Depth |
|---|---|---|
| a1 A backtest is one history, not an experiment | One realised path, no rerun, no control group, selection on the same data; not investment advice | ✓ |
| a2 The market is not a customer | Adversarial, reflexive, non-stationary; post-publication decay (McLean and Pontiff); signal-to-noise near zero (Sharpe estimate standard deviation 0.71 on two years) | ✓ |
| a3 Try a thousand things, publish the best | Ladder A and H; the expected maximum; the t above 3 argument; the deflated Sharpe idea without the formula | ✓ |
| a4 The leakage classes | Lookahead, survivorship, restatement, shuffled splits; ladders F, G and D as pictures | ✓ |
| a5 Why the data-science playbook breaks here | Source, identity, ground truth, feedback loop, cost of being wrong; costs (C), capacity, paper against live, sizing (E) | ✓ |
| a6 From churn model to trading desk: the transfer map | Carries over, must learn, must unlearn; 90-day self-study ladder on official sources | ✓ |
| Rolling-origin forecast evaluation | Handed to `learn-timeseries-forecasting` b8 | ◐ |
| Model validation and challengers | Handed to `learn-model-risk` | ◐ |

### Practitioner track

| Session | Covers | Depth |
|---|---|---|
| p1 Generating the honest null: a zero-alpha random walk | The generator, the seed, what a Sharpe estimate's noise looks like (N = 1 row of ladder A, 6 percent false positives) | ✓ |
| p2 A strategy as a function: signal, position, PnL, Sharpe from scratch | `pnl()`, `moments()`, annualisation, Sharpe 1966 and 1994 | ✓ |
| p3 The max of N: best-of-N Sharpe on pure noise | Ladder A and H; measured against sqrt(2 ln N) and equation 1 | ✓ |
| p4 The deflated Sharpe haircut, implemented | PSR, SR*, DSR; ladders B, B2, B3; the power cost | ✓ |
| p5 Time-ordered splits: walk-forward, purging, embargo | Ladder D; what shuffled k-fold leaks and when | ✓ |
| p6 Planting a true signal: does the correction keep it? | Ladders B, B2, B3 driven live; FDR 0 and the price in power | ✓ |
| p7 Costs: turnover, spread and slippage against a small edge | Ladder C; turnover arithmetic | ✓ |
| p8 Survivorship and lookahead planted in the generator and caught | Ladders F and G; the two catches | ✓ |
| p9 Sizing and drawdown: risk is the product | Ladder E; mean against median; Kelly as the growth peak | ✓ |
| p10 The backtest bench | Every ladder live, the anti-lever and the break button | ✓ |
| Forecast error metrics (MAPE, RMSE, MASE) | Pointed at `learn-timeseries-forecasting` b8 | ◐ |
| Feature leakage on tabular models | Pointed at `learn-feature-engineering` | ◐ |

## Not covered, by design

- **Any market, instrument, price, venue, vendor, fund, named strategy or named incident.** None
  can be verified from here and all of them move faster than a course. Every figure comes from
  the generator in `assets/qt-live.js`.
- **Investment, trading or purchasing advice of any kind.**
- **Execution, order books, market microstructure, portfolio optimisation, options.** Costs are
  taught as a per-trade number with a slider, nothing finer.
- **Reinforcement learning, deep learning for prediction, alternative data.** The multiple-testing
  problem is the same whatever the model; the course teaches the problem, not the models.
- **The text of Advances in Financial Machine Learning.** Its methods are described from the
  book's own chapter descriptions and implemented from first principles; no passage is reproduced.
- **Memory in the strategy's performance series** (the AMS compensation effect). The bench's
  returns are independent, so out-of-sample is zero rather than negative; said on every page
  that touches it.

## Re-verify before delivery

The engine is seeded and deterministic. If `qt-live.js` is edited, run `selfTest()` first (and
the no-op purge fault, which must fail property 5), then
`node materials/qt_ladder.js out.json`, `python3 materials/qt_reference.py py.json` and
`python3 materials/qt_reference.py --compare out.json py.json`, and update every number here
before touching a page. The Python reference is the one that catches a V8-only assumption.

## Citation appendix (exact form for every page)

1. Sharpe, W. F. (1994). "The Sharpe Ratio." The Journal of Portfolio Management, Fall 1994.
   Read at source: https://web.stanford.edu/~wfsharpe/art/sr/sr.htm
2. Bailey, D. H., and Lopez de Prado, M. (2014). "The Deflated Sharpe Ratio: Correcting for
   Selection Bias, Backtest Overfitting and Non-Normality." The Journal of Portfolio Management
   40(5). Read at source from the SSRN text, abstract id 2460551 (version of July 31, 2014).
3. Bailey, D. H., Borwein, J. M., Lopez de Prado, M., and Zhu, Q. J. (2014). "Pseudo-Mathematics
   and Financial Charlatanism: The Effects of Backtest Overfitting on Out-of-Sample Performance."
   Notices of the American Mathematical Society 61(5), 458-471. DOI 10.1090/noti1105. Read at
   source: https://www.ams.org/notices/201405/rnoti-p458.pdf
4. Harvey, C. R., Liu, Y., and Zhu, H. (2016). "... and the Cross-Section of Expected Returns."
   The Review of Financial Studies 29(1), 5-68. DOI 10.1093/rfs/hhv059. Read at source from the
   author's copy: https://people.duke.edu/~charvey/Research/Published_Papers/P118_and_the_cross.pdf
5. McLean, R. D., and Pontiff, J. (2016). "Does Academic Research Destroy Stock Return
   Predictability?" The Journal of Finance 71(1), 5-32. DOI 10.1111/jofi.12365. Read at source
   from a mirrored copy of the published PDF.
6. Lopez de Prado, M. (2018). Advances in Financial Machine Learning. Wiley. ISBN
   978-1-119-48208-6. Reported: title and ISBN from the publisher's page; chapter structure from
   catalogue listings; text not read.
7. Fisher-Tippett-Gnedenko theorem and Gumbel distribution, Wikipedia, read 2026-10-08, for the
   normal-maximum normalisation and the Gumbel mean.
