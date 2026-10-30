/* Rule tests for docs/game/js/engine.js – run: node tools/test_engine.js */
"use strict";
var E = require("../docs/game/js/engine.js"), L = require("../docs/game/js/levels.js"), assert = require("assert");
function lv(map, energy, torch) { return { code: "T", title: "t", energy: energy || 0, torch: torch || 0, best: 1, map: map }; }
function run(s, acts) { acts.forEach(function (a) { s = E.apply(s, a) || s; }); return s; }
var n = 0; function t(name, f) { f(); n++; console.log("ok", name); }

t("waiting lets the mold reach the bridge", function () {
  var s = E.create(lv(["######", "#B..M#", "######"]));
  s = run(s, [{ t: "wait" }, { t: "wait" }]); assert.strictEqual(s.status, "play");
  s = run(s, [{ t: "wait" }]); assert.strictEqual(s.status, "lost"); assert.strictEqual(s.g.cells[s.breach], "B");
});
t("sealing the door wins", function () {
  var s = E.create(lv(["#######", "#B.+.M#", "#######"], 1)); var door = s.g.cells.indexOf("+");
  s = E.apply(s, { t: "seal", i: door }); s = run(s, [{ t: "wait" }]); assert.strictEqual(s.status, "won"); assert.strictEqual(E.infected(s), 2);
});
t("cannot seal an infected door / without charges", function () {
  var s = E.create(lv(["######", "#B.+M#", "######"], 1)); var door = s.g.cells.indexOf("+");
  s = E.apply(s, { t: "wait" }); assert.strictEqual(E.canSeal(s, door), false);
  var s2 = E.create(lv(["#######", "#B.+.M#", "#######"], 0)); assert.strictEqual(E.apply(s2, { t: "seal", i: s2.g.cells.indexOf("+") }), null);
});
t("vents are connected", function () {
  var s = E.create(lv(["#######", "#Mv#v.#", "#######"]));
  s = E.apply(s, { t: "wait" }); assert.ok(s.mold[s.g.cells.indexOf("v")]);
  s = E.apply(s, { t: "wait" }); assert.ok(s.mold[s.g.cells.lastIndexOf("v")], "mold should jump to the other vent");
});
t("cold cells take two growth steps", function () {
  var s = E.create(lv(["#####", "#M*.#", "#####"])); var c = s.g.cells.indexOf("*");
  s = E.apply(s, { t: "wait" }); assert.ok(!s.mold[c]); s = E.apply(s, { t: "wait" }); assert.ok(s.mold[c]);
});
t("torch burns mold into ash that blocks growth", function () {
  var s = E.create(lv(["#######", "#B..MM#", "#######"], 0, 1)); var i = s.g.w + 4;
  s = E.apply(s, { t: "burn", i: i }); assert.ok(s.ash[i]); assert.strictEqual(s.status, "won");
});
t("every shipped level: waiting alone loses", function () {
  L.levels.forEach(function (lv, k) { var s = E.create(lv); for (var j = 0; j < 200 && s.status === "play"; j++) s = E.apply(s, { t: "wait" }); assert.strictEqual(s.status, "lost", "level " + (k + 1)); });
});
t("access config: all case files free in v1, 6-12 prepared for a one-time unlock", function () {
  assert.strictEqual(L.CONFIG.fullUnlocked, true); assert.strictEqual(L.CONFIG.freeLevels, 5);
  for (var k = 1; k <= 12; k++) assert.strictEqual(L.needsUnlock(k, false), false);
});
console.log(n + " tests passed");
