/* Blue Mold: Containment – rules engine (pure logic, no DOM).
   Works in the browser (window.BMEngine) and in Node (module.exports) so levels can be verified by tools/solve.js.

   Map legend
     ' ' outside the hull      '#' wall             '.' deck floor
     '+' bulkhead door (can be sealed)               'v' air vent (can be sealed; all open vents are connected)
     '*' cold storage (mold needs two turns to grow into it)
     'M' blue mold (start)     'B' bridge, 'R' reactor, 'C' crew quarters (critical: if the mold touches one, the case is lost)

   A turn: the player does ONE action (seal a door/vent using 1 seal charge, burn one mold cell with the torch, or wait),
   then the mold grows into every open neighbouring cell (up/down/left/right) and through the vent network.
   Win: the mold has nowhere left to grow and no critical compartment is infected.
   Lose: the mold reaches a critical compartment. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BMEngine = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var WALL = "#", VOID = " ", FLOOR = ".", DOOR = "+", VENT = "v", COLD = "*", MOLD = "M";
  var CRIT = { B: "bridge", R: "reactor", C: "crew" };

  function parse(level) {
    var rows = level.map, h = rows.length, w = 0, i, x, y;
    for (i = 0; i < h; i++) w = Math.max(w, rows[i].length);
    var cells = new Array(w * h), mold = new Uint8Array(w * h);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var ch = rows[y].charAt(x) || VOID;
      if (ch === MOLD) { mold[y * w + x] = 1; ch = FLOOR; }
      cells[y * w + x] = ch;
    }
    var nb = [];
    for (i = 0; i < w * h; i++) {
      x = i % w; y = (i / w) | 0; var a = [];
      if (y > 0) a.push(i - w); if (x < w - 1) a.push(i + 1); if (y < h - 1) a.push(i + w); if (x > 0) a.push(i - 1);
      nb.push(a);
    }
    var vents = []; for (i = 0; i < w * h; i++) if (cells[i] === VENT) vents.push(i);
    return { w: w, h: h, cells: cells, nb: nb, vents: vents, mold0: mold };
  }

  function create(level) {
    var g = parse(level), n = g.w * g.h;
    return {
      g: g, level: level,
      mold: g.mold0.slice(), sealed: new Uint8Array(n), ash: new Uint8Array(n), cold: new Uint8Array(n),
      energy: level.energy | 0, torch: level.torch | 0, turn: 0, status: "play", breach: -1, grown: [], last: null
    };
  }
  function clone(s) {
    return { g: s.g, level: s.level, mold: s.mold.slice(), sealed: s.sealed.slice(), ash: s.ash.slice(), cold: s.cold.slice(),
      energy: s.energy, torch: s.torch, turn: s.turn, status: s.status, breach: s.breach, grown: [], last: null };
  }
  function isCritical(ch) { return !!CRIT[ch]; }
  function open(s, i) {
    var ch = s.g.cells[i];
    if (ch === WALL || ch === VOID) return false;
    if (s.ash[i]) return false;
    if ((ch === DOOR || ch === VENT) && s.sealed[i]) return false;
    return true;
  }
  /* cells the mold would grow into (or chill) on the next growth step */
  function targets(s) {
    var g = s.g, out = [], seen = {}, i, j, n = g.w * g.h, ventLive = false;
    for (i = 0; i < n; i++) {
      if (!s.mold[i]) continue;
      if (g.cells[i] === VENT && open(s, i)) ventLive = true;
      var a = g.nb[i];
      for (j = 0; j < a.length; j++) { var k = a[j]; if (!s.mold[k] && !seen[k] && open(s, k)) { seen[k] = 1; out.push(k); } }
    }
    if (ventLive) for (i = 0; i < g.vents.length; i++) { var v = g.vents[i]; if (!s.mold[v] && !seen[v] && open(s, v)) { seen[v] = 1; out.push(v); } }
    return out;
  }
  function canGrow(s) { return targets(s).length > 0; }
  function grow(s) {
    var t = targets(s), add = [], i;
    for (i = 0; i < t.length; i++) {
      var k = t[i];
      if (s.g.cells[k] === COLD) { s.cold[k]++; if (s.cold[k] >= 2) add.push(k); }
      else add.push(k);
    }
    for (i = 0; i < add.length; i++) s.mold[add[i]] = 1;
    s.grown = add;
    for (i = 0; i < add.length; i++) if (isCritical(s.g.cells[add[i]])) { s.breach = add[i]; return false; }
    return true;
  }
  function canSeal(s, i) { var ch = s.g.cells[i]; return s.status === "play" && s.energy > 0 && (ch === DOOR || ch === VENT) && !s.sealed[i] && !s.mold[i]; }
  function canBurn(s, i) { return s.status === "play" && s.torch > 0 && !!s.mold[i] && !isCritical(s.g.cells[i]); }
  function actions(s) {
    if (s.status !== "play") return [];
    var out = [{ t: "wait" }], n = s.g.w * s.g.h, i;
    for (i = 0; i < n; i++) {
      if (canSeal(s, i)) out.push({ t: "seal", i: i });
      if (canBurn(s, i)) out.push({ t: "burn", i: i });
    }
    return out;
  }
  /* returns a NEW state; the old one is untouched (used for undo and the solver) */
  function apply(s0, act) {
    if (s0.status !== "play") return s0;
    var s = clone(s0);
    if (act.t === "seal") { if (!canSeal(s, act.i)) return null; s.sealed[act.i] = 1; s.energy--; }
    else if (act.t === "burn") { if (!canBurn(s, act.i)) return null; s.mold[act.i] = 0; s.ash[act.i] = 1; s.torch--; }
    else if (act.t !== "wait") return null;
    s.last = act;
    if (!canGrow(s)) { s.status = "won"; return s; }
    s.turn++;
    if (!grow(s)) { s.status = "lost"; return s; }
    if (!canGrow(s)) s.status = "won";
    return s;
  }
  function infected(s) { var c = 0; for (var i = 0; i < s.mold.length; i++) c += s.mold[i]; return c; }
  function openCells(s) { var c = 0, n = s.g.w * s.g.h; for (var i = 0; i < n; i++) { var ch = s.g.cells[i]; if (ch !== WALL && ch !== VOID) c++; } return c; }
  /* 1..3 stars for a won case, by infected cells compared with the best known result */
  function stars(s) {
    if (s.status !== "won") return 0;
    var best = s.level.best || infected(s), inf = infected(s);
    return inf <= best ? 3 : inf <= best + 3 ? 2 : 1;
  }
  function key(s) {
    var parts = [s.energy, s.torch], i, n = s.mold.length, m = "", z = "", a = "", c = "";
    for (i = 0; i < n; i++) { m += s.mold[i]; z += s.sealed[i]; a += s.ash[i]; c += s.cold[i]; }
    return parts.join(",") + "|" + m + "|" + z + "|" + a + "|" + c;
  }
  return { create: create, apply: apply, actions: actions, canSeal: canSeal, canBurn: canBurn, canGrow: canGrow, targets: targets,
    infected: infected, openCells: openCells, stars: stars, key: key, isCritical: isCritical, CRIT: CRIT };
});
