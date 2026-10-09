#!/usr/bin/env node
/* qt_ladder.js - runs the whole bench ladder in node from assets/qt-live.js
   and writes one JSON file. materials/qt_reference.py must reproduce every
   number in that file to the stated precision before any page quotes one.

   Usage: node materials/qt_ladder.js <out.json>
*/
const QT = require(__dirname + "/../assets/qt-live.js");
const fs = require("fs");
const out = { selfTest: QT.selfTest(), generated: "node " + process.version };

/* A. best-of-N on zero alpha, walk-forward 2/3 train, h = 1 */
out.A = [1, 10, 100, 1000].map(N => QT.ladderRung({ N, trueSR: 0, method: "walkforward" }, 200, 10000 * N));

/* B. one planted signal among 100, varying its true Sharpe */
out.B = [0.5, 1, 1.5, 2, 3].map(s => QT.ladderRung({ N: 100, trueSR: s, method: "walkforward" }, 200, 50000 + Math.round(s * 10)));

/* B2. the same planted Sharpe of 1.5 against a growing crowd */
out.B2 = [1, 10, 100, 1000].map(N => QT.ladderRung({ N, trueSR: 1.5, method: "walkforward" }, 200, 60000 + N));

/* B3. the same planted Sharpe of 1.5 among 100, with more history (3, 6, 12, 24 years) */
out.B3 = [756, 1512, 3024, 6048].map(d => QT.ladderRung({ N: 100, trueSR: 1.5, method: "walkforward", days: d }, 100, 65000 + d));

/* C. costs against a small edge: the planted strategy alone, h = 1 */
out.C = [0, 1, 2, 5, 10, 20].map(c => QT.ladderRung({ N: 1, trueSR: 1, method: "walkforward", costBp: c }, 200, 70000 + c));

/* D. splits on zero alpha with overlapping 5-day observations, 100 strategies */
const D = [
  ["walkforward h=1", { method: "walkforward", h: 1 }],
  ["shuffled h=1 no purge", { method: "shuffled", h: 1, purge: false, k: 5 }],
  ["walkforward h=5", { method: "walkforward", h: 5 }],
  ["blocked h=5 no purge", { method: "blocked", h: 5, purge: false, k: 5 }],
  ["shuffled h=5 no purge", { method: "shuffled", h: 5, purge: false, k: 5 }],
  ["shuffled h=5 purged", { method: "shuffled", h: 5, purge: true, k: 5 }],
  ["blocked h=5 purged", { method: "blocked", h: 5, purge: true, k: 5 }],
  ["blocked h=5 purged embargo 5", { method: "blocked", h: 5, purge: true, embargo: 5, k: 5 }]
];
out.D = D.map(([name, o], i) => Object.assign({ name }, QT.ladderRung(Object.assign({ N: 100, trueSR: 0 }, o), 100, 80000 + i * 1000)));

/* E. sizing: a real Sharpe of 1, compounded at rising leverage over 3 years */
out.E = [1, 2, 4, 6, 8, 12, 16, 24].map(L => QT.sizingRung(L, 200, 1, 90000));

/* F. survivorship: 50 zero-alpha series, drop those that ended below -20 percent */
out.F = QT.survivorshipRung({ M: 50, floor: -0.2, days: 504 }, 100, 100000);

/* G. lookahead: the same momentum rule, honest and shifted one day */
out.G = [0, -1].map(s => QT.lookaheadRung(s, 200, 110000));

/* H. the sqrt(2 ln N) check, from ladder A: measured maximum against the two predictions */
out.H = out.A.map(r => ({ N: r.N, trainSize: r.trainSize, measuredPerObs: r.isPerObs,
  stdOfOneEstimate: Math.sqrt(1 / r.trainSize),
  measuredInUnitsOfStd: r.isPerObs * Math.sqrt(r.trainSize),
  sqrt2lnN: QT.sqrt2lnN(r.N),
  paperFormula: r.N > 1 ? (1 - QT.EULER_GAMMA) * QT.normInv(1 - 1 / r.N) + QT.EULER_GAMMA * QT.normInv(1 - 1 / (r.N * Math.E)) : 0 }));

fs.writeFileSync(process.argv[2] || "/dev/stdout", JSON.stringify(out, null, 1));
console.error("ladder done, selfTest " + (out.selfTest.ok ? "ok" : "FAILED"));
