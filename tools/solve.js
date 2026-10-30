#!/usr/bin/env node
/* Verifies every Containment level: solvable, not won by just waiting, and records the best (fewest infected cells) result.
   Usage: node tools/solve.js [--json] [levelNumber]
   Exit code 1 if any level is unsolvable, trivially won by waiting, or its "best" value disagrees with the solver. */
"use strict";
var path = require("path");
var E = require(path.join(__dirname, "../docs/game/js/engine.js"));
function loadLevels() { return require(path.join(__dirname, "../docs/game/js/levels.js")); }

function solve(level, limit) {
  var memo = new Map(), nodes = 0;
  function best(s) {
    if (s.status === "won") return { inf: E.infected(s), line: [] };
    if (s.status === "lost") return null;
    var k = E.key(s);
    if (memo.has(k)) return memo.get(k);
    if (++nodes > limit) throw new Error("search limit reached");
    var acts = E.actions(s), res = null;
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      if (a.t === "burn") { // burning a cell with no open non-mold neighbour never helps (vents excepted)
        var useful = s.g.cells[a.i] === "v" || s.g.nb[a.i].some(function (n) { return !s.mold[n] && s.g.cells[n] !== "#" && s.g.cells[n] !== " " && !s.ash[n] && !((s.g.cells[n] === "+" || s.g.cells[n] === "v") && s.sealed[n]); });
        if (!useful) continue;
      }
      var r = best(E.apply(s, a));
      if (r && (!res || r.inf < res.inf)) res = { inf: r.inf, line: [a].concat(r.line) };
    }
    memo.set(k, res);
    return res;
  }
  var s0 = E.create(level), r = best(s0);
  // how many first moves still allow a win?
  var firsts = E.actions(s0).filter(function (a) { var s1 = E.apply(s0, a); return s1.status === "won" || (s1.status === "play" && best(s1)); }).length;
  // waiting only
  var w = s0; while (w.status === "play") w = E.apply(w, { t: "wait" });
  return { result: r, nodes: nodes, winningFirstMoves: firsts, totalFirstMoves: E.actions(s0).length, waitOnly: w.status, open: E.openCells(s0) };
}
function fmt(level, a) {
  var g = E.create(level).g;
  if (a.t === "wait") return "wait";
  return a.t + "(" + (a.i % g.w) + "," + ((a.i / g.w) | 0) + ")";
}
if (require.main === module) {
  var only = process.argv.filter(function (x) { return /^\d+$/.test(x); }).map(Number)[0];
  var bad = 0, out = [];
  loadLevels().levels.forEach(function (lv, ix) {
    if (only && only !== ix + 1) return;
    var t0 = Date.now(), r;
    try { r = solve(lv, 3e6); } catch (e) { console.log(lv.code, "ERROR", e.message); bad++; return; }
    var ok = !!r.result && r.waitOnly !== "won" && (lv.best == null || lv.best === r.result.inf);
    if (!ok) bad++;
    out.push({ code: lv.code, ok: ok, best: r.result && r.result.inf, levelBest: lv.best, solution: r.result && r.result.line.map(function (a) { return fmt(lv, a); }).join(" "), firstMoves: r.winningFirstMoves + "/" + r.totalFirstMoves, waitOnly: r.waitOnly, nodes: r.nodes, ms: Date.now() - t0 });
  });
  if (process.argv.indexOf("--json") >= 0) console.log(JSON.stringify(out, null, 1));
  else out.forEach(function (o) { console.log((o.ok ? "OK  " : "BAD ") + o.code + "  best=" + o.best + " (level says " + o.levelBest + ")  winning first moves " + o.firstMoves + "  wait-only: " + o.waitOnly + "  nodes " + o.nodes + "  " + o.ms + "ms\n      " + o.solution); });
  process.exit(bad ? 1 : 0);
}
module.exports = { solve: solve };
