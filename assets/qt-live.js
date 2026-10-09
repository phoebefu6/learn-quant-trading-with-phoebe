/* qt-live.js - the backtest bench for learn-quant-trading-with-phoebe.

   Everything here is synthetic. Returns are seeded random walks with an
   optional planted signal; strategies are random signals turned into long
   or short positions. No market series, no ticker, no price, no date.
   The algorithms run over the synthetic data are the ordinary ones:
   Sharpe ratio (Sharpe 1966, 1994), the probabilistic and deflated Sharpe
   ratio (Bailey and Lopez de Prado 2014), walk-forward and k-fold splits
   with purging and an embargo (Lopez de Prado 2018).

   The same file runs in node (materials/qt_ladder.js) and in the browser.
   materials/qt_reference.py reproduces every number to the stated precision.
*/
(function (root) {
  "use strict";

  /* ---------- deterministic randomness ---------- */
  function mulberry(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r ^ (r + Math.imul(r ^ (r >>> 7), 61 | r))) >>> 0;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* Box-Muller, no caching, so the stream is the same in Python. */
  function gauss(rnd) {
    var u1 = rnd(), u2 = rnd();
    if (u1 < 1e-12) u1 = 1e-12;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /* ---------- normal distribution helpers (shared with the Python) ---------- */
  function erf(x) {
    /* Abramowitz and Stegun 7.1.26, absolute error below 1.5e-7 */
    var s = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function normCdf(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }
  function normInv(p) {
    /* Acklam's rational approximation, then one Newton step on normCdf */
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, ph = 1 - pl, q, r, x;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p <= ph) { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    var e = normCdf(x) - p;
    var u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  }
  var EULER_GAMMA = 0.5772156649015329;

  /* ---------- moments and the Sharpe ratio ---------- */
  function moments(y) {
    var n = y.length, i, m = 0;
    for (i = 0; i < n; i++) m += y[i];
    m /= n;
    var v = 0, s3 = 0, s4 = 0, d;
    for (i = 0; i < n; i++) { d = y[i] - m; v += d * d; s3 += d * d * d; s4 += d * d * d * d; }
    var varS = n > 1 ? v / (n - 1) : 0;         // sample variance
    var varP = v / n;                            // population variance for the shape moments
    var sd = Math.sqrt(varS);
    var skew = varP > 0 ? (s3 / n) / Math.pow(varP, 1.5) : 0;
    var kurt = varP > 0 ? (s4 / n) / (varP * varP) : 3;  // not excess
    return { n: n, mean: m, sd: sd, skew: skew, kurt: kurt, sr: sd > 0 ? m / sd : 0 };
  }
  var DAYS = 252;
  function annualise(srPerObs, h) { return srPerObs * Math.sqrt(DAYS / (h || 1)); }

  /* Probabilistic Sharpe ratio: the probability that the true SR exceeds
     srStar, given the estimate sr over T observations with the given skew
     and kurtosis. Bailey and Lopez de Prado 2012, used inside DSR 2014. */
  function psr(sr, T, skew, kurt, srStar) {
    var denom = Math.sqrt(1 - skew * sr + ((kurt - 1) / 4) * sr * sr);
    if (!(denom > 0)) return 0;
    return normCdf((sr - srStar) * Math.sqrt(T - 1) / denom);
  }
  /* The expected maximum Sharpe ratio of N trials whose true SR is zero,
     given the variance of the N estimates. Equation 1 of Bailey and
     Lopez de Prado 2014, with the trial mean set to the null. */
  function expectedMaxSR(varianceOfTrials, N) {
    if (N < 2 || !(varianceOfTrials > 0)) return 0;
    return Math.sqrt(varianceOfTrials) * ((1 - EULER_GAMMA) * normInv(1 - 1 / N) + EULER_GAMMA * normInv(1 - 1 / (N * Math.E)));
  }
  function sqrt2lnN(N) { return N < 2 ? 0 : Math.sqrt(2 * Math.log(N)); }

  /* ---------- the synthetic world ---------- */
  /* One return series of `days` daily returns with volatility `sigma`.
     If `trueSR` is non-zero, a hidden signal s is generated first and the
     returns lean on it just enough that a strategy trading sign(s) has
     that annualised Sharpe ratio in expectation. Everything else is noise. */
  function makeWorld(opts) {
    opts = opts || {};
    var days = opts.days == null ? 756 : opts.days;
    var sigma = opts.sigma == null ? 0.01 : opts.sigma;
    var trueSR = opts.trueSR == null ? 0 : opts.trueSR;
    var phi = opts.phi == null ? 0.8 : opts.phi;
    var rnd = mulberry(opts.seed == null ? 1 : opts.seed);
    var s = new Array(days), r = new Array(days), t;
    // the hidden signal, AR(1) so positions persist for a few days
    var sq = Math.sqrt(1 - phi * phi);
    s[0] = gauss(rnd);
    for (t = 1; t < days; t++) s[t] = phi * s[t - 1] + sq * gauss(rnd);
    // c solves  c*sqrt(2/pi)/sqrt(1+c^2) = trueSR/sqrt(252)
    var sPer = trueSR / Math.sqrt(DAYS), twoPi = 2 / Math.PI;
    var c = sPer === 0 ? 0 : sPer / Math.sqrt(twoPi - sPer * sPer);
    var norm = Math.sqrt(1 + c * c);
    r[0] = sigma * gauss(rnd);
    for (t = 1; t < days; t++) r[t] = sigma * (c * s[t - 1] + gauss(rnd)) / norm;
    return { days: days, sigma: sigma, trueSR: trueSR, phi: phi, seed: opts.seed == null ? 1 : opts.seed, signal: s, returns: r };
  }

  /* N random signals (AR(1), same phi), one per strategy, that know nothing
     about the returns. If `plantIndex` is set, that strategy's signal is
     the world's hidden signal, so it is the one strategy with real alpha. */
  function makeStrategies(world, opts) {
    opts = opts || {};
    var N = opts.N == null ? 10 : opts.N;
    var rnd = mulberry(opts.seed == null ? world.seed + 1000 : opts.seed);
    var phi = world.phi, sq = Math.sqrt(1 - phi * phi), days = world.days;
    var plant = opts.plantIndex == null ? -1 : opts.plantIndex;
    var out = [], i, t;
    for (i = 0; i < N; i++) {
      var x = new Array(days);
      if (i === plant) { for (t = 0; t < days; t++) x[t] = world.signal[t]; }
      else { x[0] = gauss(rnd); for (t = 1; t < days; t++) x[t] = phi * x[t - 1] + sq * gauss(rnd); }
      out.push(x);
    }
    return out;
  }

  /* A strategy as a function. Position at t is the sign of the signal at
     t, held for the next `h` days. Observation t earns position[t] times
     the h-day forward return, minus a cost per unit of position change.
     With h = 1 this is a plain daily strategy; with h > 1 the observations
     overlap, which is exactly the situation a shuffled split leaks on.
     `shift` is the lookahead fault: shift 0 is honest (signal at t trades
     days t+1..t+h); shift -1 lets the signal see day t+1 before trading it. */
  function pnl(world, signal, opts) {
    opts = opts || {};
    var h = opts.h == null ? 1 : opts.h;
    var costBp = opts.costBp == null ? 0 : opts.costBp;
    var shift = opts.shift == null ? 0 : opts.shift;
    var r = world.returns, days = world.days, T = days - h, y = new Array(T), t, k, prev = 0;
    var cost = costBp / 10000;
    for (t = 0; t < T; t++) {
      var src = t - shift; if (src >= days) src = days - 1;
      var pos = signal[src] >= 0 ? 1 : -1;
      var fwd = 0;
      for (k = 1; k <= h; k++) fwd += r[t + k];
      y[t] = pos * fwd - cost * Math.abs(pos - prev);
      prev = pos;
    }
    return y;
  }

  /* ---------- splits ---------- */
  /* Which observations train and which test. Returns an array of folds,
     each { train: [idx], test: [idx] }. The purge removes any training
     observation whose h-day span touches a test observation's span; the
     embargo additionally drops `embargo` training observations after each
     test block (Lopez de Prado 2018, chapter 7, described not reproduced). */
  function splits(T, opts) {
    opts = opts || {};
    var method = opts.method || "walkforward";
    var h = opts.h == null ? 1 : opts.h;
    var purge = !!opts.purge, embargo = opts.embargo == null ? 0 : opts.embargo;
    var k = opts.k == null ? 5 : opts.k;
    var frac = opts.trainFrac == null ? 2 / 3 : opts.trainFrac;
    var folds = [], i, f;
    var isTest = new Array(T);
    function build(testMask) {
      var train = [], test = [];
      for (i = 0; i < T; i++) if (testMask[i]) test.push(i);
      for (i = 0; i < T; i++) {
        if (testMask[i]) continue;
        if (purge) {
          /* observation i spans days i+1..i+h; a test observation j spans j+1..j+h.
             They touch when |i - j| < h. */
          var clash = false, j;
          for (j = Math.max(0, i - h + 1); j <= Math.min(T - 1, i + h - 1); j++) if (testMask[j]) { clash = true; break; }
          if (!clash && embargo > 0) {
            for (j = Math.max(0, i - h + 1 - embargo); j < Math.max(0, i - h + 1); j++) if (testMask[j]) { clash = true; break; }
          }
          if (clash) continue;
        }
        train.push(i);
      }
      return { train: train, test: test };
    }
    if (method === "walkforward") {
      var cut = Math.floor(T * frac);
      for (i = 0; i < T; i++) isTest[i] = i >= cut;
      folds.push(build(isTest));
    } else if (method === "blocked") {
      for (f = 0; f < k; f++) {
        var lo = Math.floor(T * f / k), hi = Math.floor(T * (f + 1) / k);
        for (i = 0; i < T; i++) isTest[i] = i >= lo && i < hi;
        folds.push(build(isTest.slice()));
      }
    } else if (method === "shuffled") {
      var rnd = mulberry(opts.seed == null ? 7 : opts.seed), perm = new Array(T);
      for (i = 0; i < T; i++) perm[i] = i;
      for (i = T - 1; i > 0; i--) { var j2 = Math.floor(rnd() * (i + 1)); var tmp = perm[i]; perm[i] = perm[j2]; perm[j2] = tmp; }
      for (f = 0; f < k; f++) {
        var lo2 = Math.floor(T * f / k), hi2 = Math.floor(T * (f + 1) / k);
        for (i = 0; i < T; i++) isTest[i] = false;
        for (i = lo2; i < hi2; i++) isTest[perm[i]] = true;
        folds.push(build(isTest.slice()));
      }
    }
    return folds;
  }

  function pick(y, idx) { var out = new Array(idx.length); for (var i = 0; i < idx.length; i++) out[i] = y[idx[i]]; return out; }

  /* ---------- the selection experiment ---------- */
  /* One trial: a world, N strategies, select the best by in-sample Sharpe
     on the training part of each fold, evaluate it on the test part.
     Reports the selected strategy's in-sample and out-of-sample Sharpe,
     the naive and deflated verdicts, and whether the planted one was picked. */
  function trial(opts) {
    opts = opts || {};
    var N = opts.N == null ? 10 : opts.N;
    var world = makeWorld({ days: opts.days, sigma: opts.sigma, trueSR: opts.trueSR, phi: opts.phi, seed: opts.seed });
    var plant = opts.trueSR ? 0 : -1;
    var strategies = makeStrategies(world, { N: N, plantIndex: plant, seed: world.seed + 1000 });
    var h = opts.h == null ? 1 : opts.h;
    var ys = strategies.map(function (sig) { return pnl(world, sig, { h: h, costBp: opts.costBp, shift: opts.shift }); });
    var T = ys[0].length;
    var folds = splits(T, { method: opts.method, h: h, purge: opts.purge, embargo: opts.embargo, k: opts.k, trainFrac: opts.trainFrac, seed: world.seed + 2000 });
    var isAll = [], oosAll = [], pickedPlant = 0, chosen = [];
    var naive = 0, deflated = 0, srStarSum = 0, isPerObs = [];
    folds.forEach(function (fold) {
      var best = -1, bestSr = -Infinity, srs = new Array(N), i;
      for (i = 0; i < N; i++) {
        srs[i] = moments(pick(ys[i], fold.train)).sr;
        if (srs[i] > bestSr) { bestSr = srs[i]; best = i; }
      }
      chosen.push(best);
      if (best === plant) pickedPlant++;
      var mIS = moments(pick(ys[best], fold.train));
      var mOOS = moments(pick(ys[best], fold.test));
      isAll.push(mIS.sr); oosAll.push(mOOS.sr); isPerObs.push(mIS);
      // deflation: the expected maximum of N trials with this spread of estimates
      var vTrials = N > 1 ? moments(srs).sd * moments(srs).sd : 0;
      var srStar = expectedMaxSR(vTrials, N);
      srStarSum += srStar;
      if (psr(mIS.sr, mIS.n, mIS.skew, mIS.kurt, 0) >= 0.95) naive++;
      if (psr(mIS.sr, mIS.n, mIS.skew, mIS.kurt, srStar) >= 0.95) deflated++;
    });
    var nf = folds.length;
    var meanIS = isAll.reduce(function (a, b) { return a + b; }, 0) / nf;
    var meanOOS = oosAll.reduce(function (a, b) { return a + b; }, 0) / nf;
    return {
      N: N, folds: nf, h: h,
      isSR: annualise(meanIS, h), oosSR: annualise(meanOOS, h),
      isPerObs: meanIS, srStar: annualise(srStarSum / nf, h),
      naiveDiscovery: naive / nf, deflatedDiscovery: deflated / nf,
      pickedPlant: pickedPlant / nf,
      trainSize: folds[0].train.length, testSize: folds[0].test.length
    };
  }

  /* Many trials, means with the trial count. Seeds are 1..trials offset by
     `seed0` so two ladders never share a world. */
  function ladderRung(opts, trials, seed0) {
    var acc = { isSR: 0, oosSR: 0, isPerObs: 0, srStar: 0, naiveDiscovery: 0, deflatedDiscovery: 0, pickedPlant: 0, deflatedAndPlant: 0, deflatedNotPlant: 0 }, i, last;
    for (i = 0; i < trials; i++) {
      var o = {}; for (var k in opts) o[k] = opts[k];
      o.seed = (seed0 || 0) + i + 1;
      last = trial(o);
      acc.isSR += last.isSR; acc.oosSR += last.oosSR; acc.isPerObs += last.isPerObs; acc.srStar += last.srStar;
      acc.naiveDiscovery += last.naiveDiscovery; acc.deflatedDiscovery += last.deflatedDiscovery; acc.pickedPlant += last.pickedPlant;
      /* with one fold these are 0/1 flags; with k folds they are shares */
      acc.deflatedAndPlant += Math.min(last.deflatedDiscovery, last.pickedPlant);
      acc.deflatedNotPlant += Math.max(0, last.deflatedDiscovery - last.pickedPlant);
    }
    var out = { trials: trials, N: last.N, h: last.h, trainSize: last.trainSize, testSize: last.testSize };
    for (var key in acc) out[key] = acc[key] / trials;
    out.predictedMaxPerObs = sqrt2lnN(last.N) * Math.sqrt(1 / last.trainSize);
    out.predictedMaxSR = annualise(out.predictedMaxPerObs, last.h);
    out.fdrAfterDeflation = out.deflatedDiscovery > 0 ? out.deflatedNotPlant / out.deflatedDiscovery : 0;
    return out;
  }

  /* ---------- sizing: risk is the product ---------- */
  /* Compound a daily pnl series at a given leverage. Reports terminal
     wealth, maximum drawdown and the growth rate per year. */
  function equity(y, leverage) {
    var w = 1, peak = 1, maxDD = 0, i, n = y.length;
    for (i = 0; i < n; i++) {
      w *= 1 + leverage * y[i];
      if (w <= 0) { w = 0; maxDD = 1; break; }
      if (w > peak) peak = w;
      var dd = 1 - w / peak; if (dd > maxDD) maxDD = dd;
    }
    var growth = w > 0 ? Math.log(w) * DAYS / n : -Infinity;
    return { terminal: w, maxDrawdown: maxDD, growthPerYear: growth };
  }
  function sizingRung(leverage, trials, trueSR, seed0) {
    var sumT = 0, sumDD = 0, ruined = 0, halved = 0, sumG = 0, i, terms = [];
    for (i = 0; i < trials; i++) {
      var world = makeWorld({ trueSR: trueSR, seed: (seed0 || 0) + i + 1 });
      var y = pnl(world, world.signal, { h: 1 });
      var e = equity(y, leverage);
      sumT += e.terminal; sumDD += e.maxDrawdown; terms.push(e.terminal);
      if (e.terminal === 0) ruined++;
      if (e.maxDrawdown >= 0.5) halved++;
      sumG += e.growthPerYear === -Infinity ? -10 : e.growthPerYear;
    }
    terms.sort(function (a, b) { return a - b; });
    return { leverage: leverage, trials: trials, meanTerminal: sumT / trials, medianTerminal: terms[Math.floor(trials / 2)],
      meanMaxDrawdown: sumDD / trials, shareHalved: halved / trials, shareRuined: ruined / trials, meanGrowthPerYear: sumG / trials };
  }

  /* ---------- survivorship, planted and caught ---------- */
  /* M zero-alpha series. The universe "as it exists today" keeps only the
     series whose total return stayed above `floor`. Buy-and-hold on the
     survivors looks like alpha; the same rule on the point-in-time universe
     does not. */
  function survivorshipRung(opts, trials, seed0) {
    opts = opts || {};
    var M = opts.M == null ? 50 : opts.M, floor = opts.floor == null ? -0.2 : opts.floor;
    var days = opts.days == null ? 504 : opts.days;
    var sumSurv = 0, sumPIT = 0, sumDropped = 0, i, m, t;
    for (i = 0; i < trials; i++) {
      var survivors = [], all = [];
      for (m = 0; m < M; m++) {
        var w = makeWorld({ days: days, trueSR: 0, seed: (seed0 || 0) + i * 1000 + m + 1 });
        var tot = 0; for (t = 0; t < days; t++) tot += w.returns[t];
        all.push(w.returns);
        if (tot > floor) survivors.push(w.returns);
      }
      sumDropped += M - survivors.length;
      sumSurv += annualise(moments(avgRows(survivors, days)).sr, 1);
      sumPIT += annualise(moments(avgRows(all, days)).sr, 1);
    }
    return { trials: trials, M: M, floor: floor, meanDropped: sumDropped / trials, survivorsSR: sumSurv / trials, pointInTimeSR: sumPIT / trials };
  }
  function avgRows(rows, days) {
    var y = new Array(days), t, i;
    for (t = 0; t < days; t++) { var s = 0; for (i = 0; i < rows.length; i++) s += rows[i][t]; y[t] = rows.length ? s / rows.length : 0; }
    return y;
  }

  /* ---------- lookahead, planted and caught ---------- */
  /* The same random strategy with the signal shifted so it sees the day it
     trades. The catch is the correlation of the position with the same-day
     return, which an honest signal cannot have. */
  function lookaheadRung(shift, trials, seed0) {
    var sumSR = 0, sumCorr0 = 0, sumCorr1 = 0, i, t;
    for (i = 0; i < trials; i++) {
      var world = makeWorld({ trueSR: 0, seed: (seed0 || 0) + i + 1 });
      /* a momentum style signal: the mean of the last 5 returns, computed at
         day t. shift -1 includes day t+1, the day the position will earn. */
      var days = world.days, sig = new Array(days), k;
      for (t = 0; t < days; t++) {
        var s = 0, n = 0;
        for (k = 0; k < 5; k++) { var idx = t - k - shift; if (idx >= 0 && idx < days) { s += world.returns[idx]; n++; } }
        sig[t] = n ? s / n : 0;
      }
      var y = pnl(world, sig, { h: 1 });
      sumSR += annualise(moments(y).sr, 1);
      /* position at t earns r[t+1]; an honest signal built from days <= t
         has zero correlation with r[t+1] in a zero-alpha world. */
      var p0 = [], r1 = [], r0 = [];
      for (t = 1; t < days - 1; t++) { p0.push(sig[t] >= 0 ? 1 : -1); r1.push(world.returns[t + 1]); r0.push(world.returns[t]); }
      sumCorr1 += corr(p0, r1); sumCorr0 += corr(p0, r0);
    }
    return { shift: shift, trials: trials, meanSR: sumSR / trials, corrWithTradedDay: sumCorr1 / trials, corrWithPastDay: sumCorr0 / trials };
  }
  function corr(a, b) {
    var n = a.length, ma = 0, mb = 0, i; for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
    var sab = 0, saa = 0, sbb = 0; for (i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) * (a[i] - ma); sbb += (b[i] - mb) * (b[i] - mb); }
    return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
  }

  /* ---------- self test ----------
     Properties that must hold or nothing above means anything. Property 5
     is the one that fails if the purge is quietly a no-op: it was run
     against a reintroduced fault (purge returning every index) and failed,
     while 1 to 4 still passed. */
  function selfTest() {
    var out = [];
    // 1. the normal helpers invert each other
    var x = 1.2345, back = normInv(normCdf(x));
    out.push({ name: "normInv inverts normCdf", expected: x, got: back, ok: Math.abs(back - x) < 1e-5 });
    // 2. a zero-alpha world has no alpha: N = 1, no selection, mean IS Sharpe near zero over 40 worlds
    var r1 = ladderRung({ N: 1, trueSR: 0, method: "walkforward" }, 40, 90000);
    out.push({ name: "with one strategy and no alpha the mean Sharpe is near zero", expected: "|x| < 0.35", got: r1.isSR, ok: Math.abs(r1.isSR) < 0.35 });
    // 3. a planted Sharpe of 3 with no competition is measured near 3
    var r2 = ladderRung({ N: 1, trueSR: 3, method: "walkforward" }, 40, 91000);
    out.push({ name: "a planted Sharpe of 3 is measured near 3", expected: "2.2 to 3.8", got: r2.isSR, ok: r2.isSR > 2.2 && r2.isSR < 3.8 });
    // 4. the expected maximum grows with N
    var m10 = expectedMaxSR(1, 10), m1000 = expectedMaxSR(1, 1000);
    out.push({ name: "the expected maximum of N trials grows with N", expected: "max(1000) > max(10) > 0", got: m10.toFixed(3) + " then " + m1000.toFixed(3), ok: m1000 > m10 && m10 > 0 });
    // 5. a shuffled split on overlapping observations inflates the selected OOS Sharpe, and purging removes it
    var sh = ladderRung({ N: 50, trueSR: 0, h: 5, method: "shuffled", purge: false, k: 5 }, 12, 92000);
    var pu = ladderRung({ N: 50, trueSR: 0, h: 5, method: "shuffled", purge: true, k: 5 }, 12, 92000);
    out.push({ name: "purging a shuffled split removes the leak it creates", expected: "shuffled OOS > 0.6 and purged OOS < 0.4", got: sh.oosSR.toFixed(2) + " then " + pu.oosSR.toFixed(2), ok: sh.oosSR > 0.6 && pu.oosSR < 0.4 });
    // 6. costs can only lower a strategy's Sharpe
    var free = ladderRung({ N: 1, trueSR: 1.5, method: "walkforward", costBp: 0 }, 10, 93000);
    var paid = ladderRung({ N: 1, trueSR: 1.5, method: "walkforward", costBp: 10 }, 10, 93000);
    out.push({ name: "a cost per trade lowers the Sharpe ratio", expected: "paid < free", got: paid.isSR.toFixed(2) + " < " + free.isSR.toFixed(2), ok: paid.isSR < free.isSR });
    return { ok: out.every(function (o) { return o.ok; }), results: out };
  }

  root.QT = {
    mulberry: mulberry, gauss: gauss, erf: erf, normCdf: normCdf, normInv: normInv,
    moments: moments, annualise: annualise, psr: psr, expectedMaxSR: expectedMaxSR, sqrt2lnN: sqrt2lnN,
    makeWorld: makeWorld, makeStrategies: makeStrategies, pnl: pnl, splits: splits,
    trial: trial, ladderRung: ladderRung, equity: equity, sizingRung: sizingRung,
    survivorshipRung: survivorshipRung, lookaheadRung: lookaheadRung, corr: corr,
    selfTest: selfTest, EULER_GAMMA: EULER_GAMMA, DAYS: DAYS
  };
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = (typeof window !== "undefined" ? window : globalThis).QT;
}
