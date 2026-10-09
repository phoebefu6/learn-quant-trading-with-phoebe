#!/usr/bin/env python3
"""qt_reference.py - Python reference for assets/qt-live.js.

Reproduces the same random stream (mulberry32 + Box-Muller, no caching), the
same strategies, splits, Sharpe, PSR and DSR arithmetic, and the same ladder
as materials/qt_ladder.js, then writes a JSON of the same shape.

    python3 materials/qt_reference.py out.json
    python3 materials/qt_reference.py --compare node.json py.json   # max abs diff per key

Agreement with the node run is 1e-6 absolute on every number (the only
differences are last-ulp log/cos/sqrt between V8 and libm). numpy only.
"""
import json
import math
import sys

import numpy as np

MASK = 0xFFFFFFFF
DAYS = 252
EULER_GAMMA = 0.5772156649015329


# ---------- the random stream, vectorised but bit-identical to mulberry32 ----------
def uniforms(seed, n):
    """First n outputs of mulberry32(seed), as the JS engine produces them."""
    i = np.arange(1, n + 1, dtype=np.uint64)
    t = ((np.uint64(seed & MASK) + i * np.uint64(0x6D2B79F5)) & np.uint64(MASK)).astype(np.uint32)
    a = (t ^ (t >> np.uint32(15))).astype(np.uint64)
    b = (np.uint32(1) | t).astype(np.uint64)
    r = ((a * b) & np.uint64(MASK)).astype(np.uint32)
    c = (r ^ (r >> np.uint32(7))).astype(np.uint64)
    d = (np.uint32(61) | r).astype(np.uint64)
    r2 = ((c * d) & np.uint64(MASK)).astype(np.uint32)
    r = r ^ ((r.astype(np.uint64) + r2.astype(np.uint64)) & np.uint64(MASK)).astype(np.uint32)
    return (r ^ (r >> np.uint32(14))).astype(np.float64) / 4294967296.0


class Stream:
    def __init__(self, seed, n_uniforms):
        self.u = uniforms(seed, n_uniforms)
        self.pos = 0

    def rnd(self):
        v = self.u[self.pos]
        self.pos += 1
        return float(v)

    def gauss(self, n):
        u = self.u[self.pos:self.pos + 2 * n]
        self.pos += 2 * n
        u1 = np.maximum(u[0::2], 1e-12)
        u2 = u[1::2]
        return np.sqrt(-2.0 * np.log(u1)) * np.cos(2.0 * np.pi * u2)


# ---------- normal helpers, the same approximations as the JS ----------
def erf(x):
    s = -1.0 if x < 0 else 1.0
    x = abs(x)
    t = 1.0 / (1.0 + 0.3275911 * x)
    y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * math.exp(-x * x)
    return s * y


def norm_cdf(x):
    return 0.5 * (1.0 + erf(x / math.sqrt(2.0)))


def norm_inv(p):
    if p <= 0:
        return -math.inf
    if p >= 1:
        return math.inf
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00]
    pl, ph = 0.02425, 1 - 0.02425
    if p < pl:
        q = math.sqrt(-2 * math.log(p))
        x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    elif p <= ph:
        q = p - 0.5
        r = q * q
        x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    else:
        q = math.sqrt(-2 * math.log(1 - p))
        x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    e = norm_cdf(x) - p
    u = e * math.sqrt(2 * math.pi) * math.exp(x * x / 2)
    return x - u / (1 + x * u / 2)


# ---------- moments and Sharpe ----------
def moments(y):
    y = np.asarray(y, dtype=np.float64)
    n = y.shape[0]
    m = y.sum() / n
    d = y - m
    v = (d * d).sum()
    var_s = v / (n - 1) if n > 1 else 0.0
    var_p = v / n
    sd = math.sqrt(var_s)
    skew = ((d ** 3).sum() / n) / var_p ** 1.5 if var_p > 0 else 0.0
    kurt = ((d ** 4).sum() / n) / (var_p * var_p) if var_p > 0 else 3.0
    return dict(n=n, mean=m, sd=sd, skew=skew, kurt=kurt, sr=(m / sd if sd > 0 else 0.0))


def annualise(sr, h=1):
    return sr * math.sqrt(DAYS / (h or 1))


def psr(sr, T, skew, kurt, sr_star):
    inner = 1 - skew * sr + ((kurt - 1) / 4) * sr * sr
    if not inner > 0:
        return 0.0
    return norm_cdf((sr - sr_star) * math.sqrt(T - 1) / math.sqrt(inner))


def expected_max_sr(var_trials, N):
    if N < 2 or not var_trials > 0:
        return 0.0
    return math.sqrt(var_trials) * ((1 - EULER_GAMMA) * norm_inv(1 - 1 / N) + EULER_GAMMA * norm_inv(1 - 1 / (N * math.e)))


def sqrt2lnN(N):
    return 0.0 if N < 2 else math.sqrt(2 * math.log(N))


# ---------- the synthetic world ----------
def make_world(days=756, sigma=0.01, true_sr=0.0, phi=0.8, seed=1):
    st = Stream(seed, 4 * days)
    sq = math.sqrt(1 - phi * phi)
    e = st.gauss(days)
    s = np.empty(days)
    s[0] = e[0]
    for t in range(1, days):
        s[t] = phi * s[t - 1] + sq * e[t]
    s_per = true_sr / math.sqrt(DAYS)
    two_pi = 2 / math.pi
    c = 0.0 if s_per == 0 else s_per / math.sqrt(two_pi - s_per * s_per)
    norm = math.sqrt(1 + c * c)
    g = st.gauss(days)
    r = np.empty(days)
    r[0] = sigma * g[0]
    r[1:] = sigma * (c * s[:-1] + g[1:]) / norm
    return dict(days=days, sigma=sigma, trueSR=true_sr, phi=phi, seed=seed, signal=s, returns=r)


def make_strategies(world, N=10, plant=-1, seed=None):
    days, phi = world["days"], world["phi"]
    seed = world["seed"] + 1000 if seed is None else seed
    n_noise = N - (1 if 0 <= plant < N else 0)
    st = Stream(seed, 2 * n_noise * days)
    sq = math.sqrt(1 - phi * phi)
    e = st.gauss(n_noise * days).reshape(n_noise, days) if n_noise else np.zeros((0, days))
    x = np.empty((n_noise, days))
    if n_noise:
        x[:, 0] = e[:, 0]
        for t in range(1, days):
            x[:, t] = phi * x[:, t - 1] + sq * e[:, t]
    out = np.empty((N, days))
    j = 0
    for i in range(N):
        if i == plant:
            out[i] = world["signal"]
        else:
            out[i] = x[j]
            j += 1
    return out


def pnl(world, sigs, h=1, cost_bp=0.0, shift=0):
    """sigs: [N, days] -> y: [N, T] with T = days - h."""
    r = world["returns"]
    days = world["days"]
    T = days - h
    src = np.clip(np.arange(T) - shift, 0, days - 1)
    pos = np.where(sigs[:, src] >= 0, 1.0, -1.0)
    csum = np.concatenate([[0.0], np.cumsum(r)])
    fwd = csum[np.arange(T) + h + 1] - csum[np.arange(T) + 1]
    prev = np.concatenate([np.zeros((sigs.shape[0], 1)), pos[:, :-1]], axis=1)
    cost = cost_bp / 10000.0
    return pos * fwd - cost * np.abs(pos - prev)


# ---------- splits ----------
def splits(T, method="walkforward", h=1, purge=False, embargo=0, k=5, train_frac=2 / 3, seed=7):
    folds = []

    def build(mask):
        test = [i for i in range(T) if mask[i]]
        train = []
        for i in range(T):
            if mask[i]:
                continue
            if purge:
                clash = False
                for j in range(max(0, i - h + 1), min(T - 1, i + h - 1) + 1):
                    if mask[j]:
                        clash = True
                        break
                if not clash and embargo > 0:
                    for j in range(max(0, i - h + 1 - embargo), max(0, i - h + 1)):
                        if mask[j]:
                            clash = True
                            break
                if clash:
                    continue
            train.append(i)
        return dict(train=np.array(train, dtype=np.int64), test=np.array(test, dtype=np.int64))

    if method == "walkforward":
        cut = int(math.floor(T * train_frac))
        folds.append(build([i >= cut for i in range(T)]))
    elif method == "blocked":
        for f in range(k):
            lo, hi = int(math.floor(T * f / k)), int(math.floor(T * (f + 1) / k))
            folds.append(build([lo <= i < hi for i in range(T)]))
    elif method == "shuffled":
        st = Stream(seed, T)
        perm = list(range(T))
        for i in range(T - 1, 0, -1):
            j2 = int(math.floor(st.rnd() * (i + 1)))
            perm[i], perm[j2] = perm[j2], perm[i]
        for f in range(k):
            lo, hi = int(math.floor(T * f / k)), int(math.floor(T * (f + 1) / k))
            mask = [False] * T
            for i in range(lo, hi):
                mask[perm[i]] = True
            folds.append(build(mask))
    return folds


# ---------- the selection experiment ----------
def trial(N=10, days=756, sigma=0.01, true_sr=0.0, phi=0.8, seed=1, h=1, cost_bp=0.0, shift=0,
          method="walkforward", purge=False, embargo=0, k=5, train_frac=2 / 3):
    world = make_world(days, sigma, true_sr, phi, seed)
    plant = 0 if true_sr else -1
    sigs = make_strategies(world, N, plant, world["seed"] + 1000)
    ys = pnl(world, sigs, h, cost_bp, shift)
    T = ys.shape[1]
    folds = splits(T, method, h, purge, embargo, k, train_frac, world["seed"] + 2000)
    is_all, oos_all, picked, naive, deflated, sr_star_sum = [], [], 0, 0, 0, 0.0
    for fold in folds:
        tr = ys[:, fold["train"]]
        m = tr.mean(axis=1)
        sd = tr.std(axis=1, ddof=1)
        srs = np.where(sd > 0, m / np.where(sd > 0, sd, 1), 0.0)
        best = int(np.argmax(srs))
        if best == plant:
            picked += 1
        mIS = moments(ys[best, fold["train"]])
        mOOS = moments(ys[best, fold["test"]])
        is_all.append(mIS["sr"])
        oos_all.append(mOOS["sr"])
        v_trials = moments(srs)["sd"] ** 2 if N > 1 else 0.0
        sr_star = expected_max_sr(v_trials, N)
        sr_star_sum += sr_star
        if psr(mIS["sr"], mIS["n"], mIS["skew"], mIS["kurt"], 0.0) >= 0.95:
            naive += 1
        if psr(mIS["sr"], mIS["n"], mIS["skew"], mIS["kurt"], sr_star) >= 0.95:
            deflated += 1
    nf = len(folds)
    mean_is = sum(is_all) / nf
    mean_oos = sum(oos_all) / nf
    return dict(N=N, folds=nf, h=h, isSR=annualise(mean_is, h), oosSR=annualise(mean_oos, h),
                isPerObs=mean_is, srStar=annualise(sr_star_sum / nf, h),
                naiveDiscovery=naive / nf, deflatedDiscovery=deflated / nf, pickedPlant=picked / nf,
                trainSize=int(folds[0]["train"].shape[0]), testSize=int(folds[0]["test"].shape[0]))


def ladder_rung(opts, trials, seed0):
    acc = dict(isSR=0.0, oosSR=0.0, isPerObs=0.0, srStar=0.0, naiveDiscovery=0.0, deflatedDiscovery=0.0,
               pickedPlant=0.0, deflatedAndPlant=0.0, deflatedNotPlant=0.0)
    last = None
    for i in range(trials):
        o = dict(opts)
        o["seed"] = seed0 + i + 1
        last = trial(**o)
        for key in ("isSR", "oosSR", "isPerObs", "srStar", "naiveDiscovery", "deflatedDiscovery", "pickedPlant"):
            acc[key] += last[key]
        acc["deflatedAndPlant"] += min(last["deflatedDiscovery"], last["pickedPlant"])
        acc["deflatedNotPlant"] += max(0.0, last["deflatedDiscovery"] - last["pickedPlant"])
    out = dict(trials=trials, N=last["N"], h=last["h"], trainSize=last["trainSize"], testSize=last["testSize"])
    for key in acc:
        out[key] = acc[key] / trials
    out["predictedMaxPerObs"] = sqrt2lnN(last["N"]) * math.sqrt(1 / last["trainSize"])
    out["predictedMaxSR"] = annualise(out["predictedMaxPerObs"], last["h"])
    out["fdrAfterDeflation"] = out["deflatedNotPlant"] / out["deflatedDiscovery"] if out["deflatedDiscovery"] > 0 else 0.0
    return out


# ---------- sizing ----------
def equity(y, leverage):
    w, peak, max_dd = 1.0, 1.0, 0.0
    n = len(y)
    for v in y:
        w *= 1 + leverage * v
        if w <= 0:
            w = 0.0
            max_dd = 1.0
            break
        if w > peak:
            peak = w
        dd = 1 - w / peak
        if dd > max_dd:
            max_dd = dd
    growth = math.log(w) * DAYS / n if w > 0 else -math.inf
    return dict(terminal=w, maxDrawdown=max_dd, growthPerYear=growth)


def sizing_rung(leverage, trials, true_sr, seed0):
    sum_t = sum_dd = sum_g = 0.0
    ruined = halved = 0
    terms = []
    for i in range(trials):
        world = make_world(true_sr=true_sr, seed=seed0 + i + 1)
        y = pnl(world, world["signal"][None, :], 1)[0]
        e = equity(y, leverage)
        sum_t += e["terminal"]
        sum_dd += e["maxDrawdown"]
        terms.append(e["terminal"])
        if e["terminal"] == 0:
            ruined += 1
        if e["maxDrawdown"] >= 0.5:
            halved += 1
        sum_g += -10 if e["growthPerYear"] == -math.inf else e["growthPerYear"]
    terms.sort()
    return dict(leverage=leverage, trials=trials, meanTerminal=sum_t / trials, medianTerminal=terms[trials // 2],
                meanMaxDrawdown=sum_dd / trials, shareHalved=halved / trials, shareRuined=ruined / trials,
                meanGrowthPerYear=sum_g / trials)


# ---------- survivorship ----------
def survivorship_rung(M, floor, days, trials, seed0):
    sum_surv = sum_pit = sum_dropped = 0.0
    for i in range(trials):
        survivors, allrows = [], []
        for m in range(M):
            w = make_world(days=days, true_sr=0.0, seed=seed0 + i * 1000 + m + 1)
            tot = float(w["returns"].sum())
            allrows.append(w["returns"])
            if tot > floor:
                survivors.append(w["returns"])
        sum_dropped += M - len(survivors)
        surv = np.mean(np.array(survivors), axis=0) if survivors else np.zeros(days)
        sum_surv += annualise(moments(surv)["sr"], 1)
        sum_pit += annualise(moments(np.mean(np.array(allrows), axis=0))["sr"], 1)
    return dict(trials=trials, M=M, floor=floor, meanDropped=sum_dropped / trials,
                survivorsSR=sum_surv / trials, pointInTimeSR=sum_pit / trials)


# ---------- lookahead ----------
def corr(a, b):
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    da, db = a - a.mean(), b - b.mean()
    saa, sbb = (da * da).sum(), (db * db).sum()
    return float((da * db).sum() / math.sqrt(saa * sbb)) if saa > 0 and sbb > 0 else 0.0


def lookahead_rung(shift, trials, seed0):
    sum_sr = sum_c0 = sum_c1 = 0.0
    for i in range(trials):
        world = make_world(true_sr=0.0, seed=seed0 + i + 1)
        days, r = world["days"], world["returns"]
        sig = np.zeros(days)
        for t in range(days):
            s, n = 0.0, 0
            for kk in range(5):
                idx = t - kk - shift
                if 0 <= idx < days:
                    s += r[idx]
                    n += 1
            sig[t] = s / n if n else 0.0
        y = pnl(world, sig[None, :], 1)[0]
        sum_sr += annualise(moments(y)["sr"], 1)
        p0 = np.where(sig[1:days - 1] >= 0, 1.0, -1.0)
        sum_c1 += corr(p0, r[2:days])
        sum_c0 += corr(p0, r[1:days - 1])
    return dict(shift=shift, trials=trials, meanSR=sum_sr / trials, corrWithTradedDay=sum_c1 / trials, corrWithPastDay=sum_c0 / trials)


# ---------- the ladder, mirroring qt_ladder.js ----------
def ladder():
    out = {}
    out["A"] = [ladder_rung(dict(N=N, true_sr=0.0, method="walkforward"), 200, 10000 * N) for N in (1, 10, 100, 1000)]
    out["B"] = [ladder_rung(dict(N=100, true_sr=s, method="walkforward"), 200, 50000 + round(s * 10)) for s in (0.5, 1, 1.5, 2, 3)]
    out["B2"] = [ladder_rung(dict(N=N, true_sr=1.5, method="walkforward"), 200, 60000 + N) for N in (1, 10, 100, 1000)]
    out["B3"] = [ladder_rung(dict(N=100, true_sr=1.5, method="walkforward", days=d), 100, 65000 + d) for d in (756, 1512, 3024, 6048)]
    out["C"] = [ladder_rung(dict(N=1, true_sr=1.0, method="walkforward", cost_bp=c), 200, 70000 + c) for c in (0, 1, 2, 5, 10, 20)]
    D = [
        ("walkforward h=1", dict(method="walkforward", h=1)),
        ("shuffled h=1 no purge", dict(method="shuffled", h=1, purge=False, k=5)),
        ("walkforward h=5", dict(method="walkforward", h=5)),
        ("blocked h=5 no purge", dict(method="blocked", h=5, purge=False, k=5)),
        ("shuffled h=5 no purge", dict(method="shuffled", h=5, purge=False, k=5)),
        ("shuffled h=5 purged", dict(method="shuffled", h=5, purge=True, k=5)),
        ("blocked h=5 purged", dict(method="blocked", h=5, purge=True, k=5)),
        ("blocked h=5 purged embargo 5", dict(method="blocked", h=5, purge=True, embargo=5, k=5)),
    ]
    out["D"] = []
    for i, (name, o) in enumerate(D):
        r = ladder_rung(dict(N=100, true_sr=0.0, **o), 100, 80000 + i * 1000)
        r["name"] = name
        out["D"].append(r)
    out["E"] = [sizing_rung(L, 200, 1.0, 90000) for L in (1, 2, 4, 6, 8, 12, 16, 24)]
    out["F"] = survivorship_rung(50, -0.2, 504, 100, 100000)
    out["G"] = [lookahead_rung(s, 200, 110000) for s in (0, -1)]
    out["H"] = [dict(N=r["N"], trainSize=r["trainSize"], measuredPerObs=r["isPerObs"],
                     stdOfOneEstimate=math.sqrt(1 / r["trainSize"]),
                     measuredInUnitsOfStd=r["isPerObs"] * math.sqrt(r["trainSize"]),
                     sqrt2lnN=sqrt2lnN(r["N"]),
                     paperFormula=((1 - EULER_GAMMA) * norm_inv(1 - 1 / r["N"]) + EULER_GAMMA * norm_inv(1 - 1 / (r["N"] * math.e))) if r["N"] > 1 else 0.0)
                for r in out["A"]]
    return out


def flatten(o, prefix=""):
    if isinstance(o, dict):
        for k, v in o.items():
            yield from flatten(v, prefix + "." + str(k))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from flatten(v, prefix + "[" + str(i) + "]")
    elif isinstance(o, (int, float)) and not isinstance(o, bool):
        yield prefix, float(o)


def compare(a_path, b_path, tol=1e-6):
    a = dict(flatten(json.load(open(a_path))))
    b = dict(flatten(json.load(open(b_path))))
    worst, worst_key, n = 0.0, None, 0
    for k, v in a.items():
        if k.startswith(".selfTest") or k not in b:
            continue
        d = abs(v - b[k])
        n += 1
        if d > worst:
            worst, worst_key = d, k
    print(f"compared {n} numbers; max abs diff {worst:.3e} at {worst_key}; {'AGREE' if worst <= tol else 'DISAGREE'} at {tol}")
    return worst <= tol


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "--compare":
        sys.exit(0 if compare(sys.argv[2], sys.argv[3]) else 1)
    out = ladder()
    json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else "/dev/stdout", "w"), indent=1)
    print("reference done", file=sys.stderr)
