/* Blue Mold: Containment – screens, input, progress (localStorage only, nothing leaves the device). */
(function () {
  "use strict";
  var E = window.BMEngine, L = window.BMLevels, R = window.BMRender;
  var KEY = "bmc-progress";
  var $ = function (id) { return document.getElementById(id); };
  var progress = load();
  var entitlement = false;           // future one-time "full case files" unlock; no billing code in this version
  var cur = 0, st = null, hist = [], mode = "seal", screen = "title", backTo = "title";
  var rend = new R.Renderer($("cv"));

  function load() { try { var p = JSON.parse(localStorage.getItem(KEY) || "{}"); p.solved = p.solved || {}; return p; } catch (e) { return { solved: {} }; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) {} }
  function starsHtml(n) { var s = ""; for (var i = 0; i < 3; i++) s += i < n ? "<b>\u2605</b>" : "\u2606"; return s; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- screens ---------- */
  function show(name) {
    if (name !== "how" && name !== "about") backTo = name;
    ["title", "cases", "game", "how", "about"].forEach(function (s) {
      $("scr" + s.charAt(0).toUpperCase() + s.slice(1)).classList.toggle("on", s === name);
    });
    screen = name;
    if (name === "game") { requestAnimationFrame(function () { rend.resize(); rend.start(); }); } else rend.stop();
    if (name === "cases") renderCases();
    if (name === "title") R.drawTitle($("titleArt"));
  }
  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { var g = b.getAttribute("data-go"); show(g === "back" ? backTo : g); });
  });
  $("btnCases").onclick = function () { show("cases"); };
  $("btnHow").onclick = function () { show("how"); };
  $("btnAbout").onclick = function () { show("about"); };
  $("btnPlay").onclick = function () { startLevel(nextOpen()); };
  $("gBack").onclick = function () { closeModal(); show("cases"); };
  $("ver").textContent = L.CONFIG.version;
  $("btnReset").onclick = function () {
    if (confirm("Erase all saved progress on this device?")) { progress = { solved: {} }; save(); toast("Progress erased."); }
  };

  function nextOpen() {
    for (var n = 1; n <= L.levels.length; n++) if (!progress.solved[n] && L.isAvailable(n, progress, entitlement)) return n;
    return progress.last || 1;
  }

  function renderCases() {
    var ol = $("caseList"), html = "", total = 0, nx = nextOpen(), gated = false;
    L.levels.forEach(function (lv, idx) {
      var n = idx + 1, ok = L.isAvailable(n, progress, entitlement), s = progress.solved[n] || 0, cls = [];
      total += s; if (s) cls.push("done"); if (!ok) cls.push("lock"); if (ok && n === nx && !s) cls.push("next");
      var locked = L.needsUnlock(n, entitlement); if (locked) gated = true;
      html += '<li><button type="button" class="' + cls.join(" ") + '" data-n="' + n + '"' + (ok ? "" : ' aria-disabled="true"') +
        ' aria-label="Case ' + n + ", " + esc(lv.title) + (ok ? (s ? ", " + s + " stars" : "") : ", locked") + '">' +
        '<span class="no">' + (n < 10 ? "0" : "") + n + '</span><span class="tt">' + (ok ? esc(lv.title) : (locked ? "Full case files" : "Classified")) +
        '</span><span class="st">' + (ok ? starsHtml(s) : "\u2014") + "</span></button></li>";
    });
    ol.innerHTML = html;
    $("casesSum").textContent = total + " / " + L.levels.length * 3 + " \u2605";
    var note = $("caseLockNote"); note.hidden = !gated;
    if (gated) note.textContent = "Case files " + (L.CONFIG.freeLevels + 1) + "\u2013" + L.levels.length + " are part of the full case files.";
    ol.querySelectorAll("button").forEach(function (b) {
      b.onclick = function () {
        var n = +b.getAttribute("data-n");
        if (L.isAvailable(n, progress, entitlement)) startLevel(n); else toastCases("Close case " + (n - 1) + " first.");
      };
    });
  }
  function toastCases(t) { var n = $("caseLockNote"); n.hidden = false; n.textContent = t; }

  /* ---------- game ---------- */
  function startLevel(n, skipBrief) {
    closeModal(); cur = n; progress.last = n; save();
    var lv = L.levels[n - 1];
    st = E.create(lv); hist = []; setMode("seal");
    $("gCode").textContent = lv.code + " \u00b7 CASE " + n + "/" + L.levels.length; $("gTitle").textContent = lv.title;
    show("game"); rend.setState(st, true); hud();
    if (!skipBrief) briefing();
    announce("Case " + n + ", " + lv.title + ". " + lv.energy + " seals, " + lv.torch + " torch charges.");
  }
  function hud() {
    $("gTurn").textContent = "Turn " + st.turn;
    $("gSeals").querySelector("b").textContent = st.energy;
    $("gTorch").querySelector("b").textContent = st.torch;
    $("gTorch").style.display = st.level.torch ? "" : "none";
    $("aTorch").disabled = st.torch <= 0 || st.status !== "play";
    $("aTorch").hidden = !st.level.torch; $("scrGame").classList.toggle("notorch", !st.level.torch);
    if (st.torch <= 0 && mode === "burn") setMode("seal");
    var open = E.openCells(st), clean = Math.round(100 * (1 - E.infected(st) / open));
    $("gClean").querySelector("b").textContent = clean + "%";
    $("gClean").classList.toggle("low", clean < 60);
    $("aUndo").disabled = !hist.length;
    $("aWait").disabled = st.status !== "play";
  }
  function setMode(m) { mode = m; $("aTorch").setAttribute("aria-pressed", m === "burn" ? "true" : "false"); rend.setMode(m); }

  function act(a) {
    if (!st || st.status !== "play") return false;
    var ns = E.apply(st, a); if (!ns) return false;
    hist.push(st); st = ns; if (a.t === "burn") setMode("seal");
    rend.setState(st); hud();
    var msg = a.t === "seal" ? "Sealed." : a.t === "burn" ? "Burned to ash." : "Waited.";
    if (st.grown.length) msg += " The mold grew into " + st.grown.length + (st.grown.length === 1 ? " cell." : " cells.");
    announce(msg);
    if (st.status !== "play") setTimeout(result, 650);
    return true;
  }
  function onTap(ev) {
    if (screen !== "game" || !st || st.status !== "play" || !$("modal").hidden) return;
    var i = rend.cellAt(ev.clientX, ev.clientY); if (i < 0) return;
    var ch = st.g.cells[i];
    if (mode === "burn") {
      if (E.canBurn(st, i)) { act({ t: "burn", i: i }); return; }
      toast(st.mold[i] ? "Can't burn that." : "Torch: tap a glowing mold cell."); rend.ping(i); return;
    }
    if (E.canSeal(st, i)) { act({ t: "seal", i: i }); return; }
    rend.ping(i);
    if ((ch === "+" || ch === "v") && st.sealed[i]) toast("Already sealed.");
    else if ((ch === "+" || ch === "v") && st.mold[i]) toast(st.torch ? "Too late \u2013 it's overgrown. Burn it?" : "Too late \u2013 it's overgrown.");
    else if ((ch === "+" || ch === "v") && st.energy <= 0) toast("No seals left. Wait or use the torch.");
    else if (st.mold[i]) toast(st.torch > 0 ? "Switch on the torch to burn the mold." : "No torch on this case.");
    else toast("Only doors and vents can be sealed.");
  }
  $("cv").addEventListener("pointerup", onTap);
  $("aWait").onclick = function () { act({ t: "wait" }); };
  $("aTorch").onclick = function () { if (st && st.torch > 0) setMode(mode === "burn" ? "seal" : "burn"); if (mode === "burn") toast("Tap a mold cell to burn it."); };
  $("aUndo").onclick = undo;
  $("aRestart").onclick = function () { closeModal(); startLevel(cur, true); };
  function undo() { if (!hist.length) return; closeModal(); st = hist.pop(); rend.setState(st, true); setMode("seal"); hud(); announce("Undone. Turn " + st.turn + "."); }
  window.addEventListener("resize", function () { if (screen === "game") rend.resize(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) rend.stop(); else if (screen === "game") rend.start(); });
  document.addEventListener("keydown", function (e) {
    if (screen !== "game") return;
    if (e.key === "w" || e.key === " ") { e.preventDefault(); act({ t: "wait" }); }
    else if (e.key === "z" || (e.key === "Backspace")) undo();
    else if (e.key === "r") $("aRestart").click();
    else if (e.key === "t") $("aTorch").click();
    else if (e.key === "Escape") { if (!$("modal").hidden && st.status === "play") closeModal(); }
  });

  var toastT = 0;
  function toast(t) { var el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("on"); }, 1800); }
  function announce(t) { $("srStatus").textContent = t; }

  /* ---------- modal ---------- */
  function modal(o) {
    $("mKicker").textContent = o.kicker; $("mCode").textContent = o.code; $("mTitle").textContent = o.title; $("mTime").textContent = o.time || "";
    $("mBody").innerHTML = o.body; var sp = $("mStamp");
    sp.hidden = !o.stamp; sp.textContent = o.stamp || ""; sp.className = "stamp " + (o.stampCls || "");
    var row = $("mBtns"); row.innerHTML = "";
    o.btns.forEach(function (b) {
      var el = document.createElement("button"); el.type = "button"; el.className = "btn " + (b.cls || ""); el.textContent = b.t;
      el.onclick = b.f; row.appendChild(el);
    });
    $("modal").hidden = false; var f = row.querySelector(".big") || row.lastChild; if (f) f.focus();
  }
  function closeModal() { $("modal").hidden = true; }
  function briefing() {
    var lv = st.level, tools = lv.energy + (lv.energy === 1 ? " seal" : " seals") + (lv.torch ? " \u00b7 " + lv.torch + " torch " + (lv.torch === 1 ? "charge" : "charges") : "");
    modal({ kicker: "CASE FILE \u00b7 KALLICHORE-7", code: lv.code, title: lv.title, time: lv.time,
      body: "<p>" + esc(lv.brief) + "</p><p class=\"note\">Equipment: " + tools + "</p>",
      btns: [{ t: "Begin", cls: "big", f: closeModal }] });
  }
  function result() {
    var lv = st.level, n = cur, inf = E.infected(st), open = E.openCells(st);
    if (st.status === "won") {
      var s = E.stars(st), prev = progress.solved[n] || 0; if (s > prev) progress.solved[n] = s; save();
      var last = n >= L.levels.length, nextOk = !last && L.isAvailable(n + 1, progress, entitlement);
      modal({ kicker: "RECOVERED REPORT", code: lv.code, title: lv.title, time: "Contained on turn " + st.turn, stamp: "CONTAINED", stampCls: "win",
        body: '<p class="stars" aria-label="' + s + ' of 3 stars">' + starsHtml(s) + "</p>" +
          "<p class=\"note\">Infected: " + inf + " of " + open + " cells" + (s < 3 ? " \u00b7 the best containment keeps it to " + lv.best : " \u00b7 textbook containment") + "</p>" +
          '<p class="report">' + esc(lv.report) + "</p>" + (last ? "<p><i>End of the KALLICHORE-7 files. The rest of the story is in the book <b>Blue Mold</b> by Cal Rennick \u2013 coming soon.</i></p>" : ""),
        btns: [{ t: "Case files", cls: "ghost", f: function () { closeModal(); show("cases"); } },
          { t: "Replay", f: function () { closeModal(); startLevel(n, true); } }]
          .concat(nextOk ? [{ t: "Next case", cls: "big", f: function () { closeModal(); startLevel(n + 1); } }] : []) });
      announce("Contained. " + s + " stars.");
    } else {
      var what = E.CRIT[st.g.cells[st.breach]] || "bridge";
      var line = what === "bridge" ? "The mold reached the bridge. Old Girl went dark at 03:12." : what === "reactor" ? "The mold reached the reactor shielding. Braking thrust: zero." : "The mold reached the crew quarters. The heartbeat in the walls got louder.";
      modal({ kicker: "INCIDENT LOG", code: lv.code, title: "Breach", time: "Turn " + st.turn, stamp: "BREACH", stampCls: "lose",
        body: "<p>" + line + "</p><p class=\"note\">Tip: watch the faint blue dots \u2013 that is where it grows next.</p>",
        btns: [{ t: "Case files", cls: "ghost", f: function () { closeModal(); show("cases"); } },
          { t: "Undo", f: undo }, { t: "Restart", cls: "big", f: function () { closeModal(); startLevel(n, true); } }] });
      announce("Breach. The case is lost.");
    }
  }

  /* test / debugging hook (no network, no data) */
  window.BMC = { start: startLevel, act: act, state: function () { return st; }, show: show, progress: function () { return progress; } };

  show("title");
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(function () {});
})();
