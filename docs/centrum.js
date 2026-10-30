/* Blue Mold · owner tools (dashboard + commands).
   - Dashboard: public publishing plan and brand accounts. Private sections (blockers, calendar, task flow, station status)
     appear only when the owner imports a status file on this device (stored in localStorage "bm-stan", never published).
   - Commands: form → owner's Google Apps Script web app. The web app URL and token are entered in "Link settings"
     and stored only in this browser (localStorage). Nothing private is shipped in the app files.
   - Without a link or on error: fallback copy to clipboard (UFO channel from app.js). */
(function () {
  "use strict";
  var B = window.__bm; if (!B) return;
  var esc = B.esc;
  function $(s) { return document.querySelector(s); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null || v === "") localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  // ---------- public constants (time zone Europe/Berlin) ----------
  var KONTA = [
    { id: "tt", n: "TikTok", h: "@roviheree", u: "https://www.tiktok.com/@roviheree" },
    { id: "yt", n: "YouTube", h: "@RoviHere", u: "https://www.youtube.com/@RoviHere" },
    { id: "x", n: "X", h: "@RoviHere", u: "https://x.com/RoviHere" },
    { id: "suno", n: "Suno", h: "@kkruk93", u: "https://suno.com/@kkruk93" }
  ];
  var CODZ = [0, 1, 2, 3, 4, 5, 6];
  var PLAN = [
    { pl: "tt", n: "TikTok · clip pack", g: "08:00", dni: CODZ },
    { pl: "yt", n: "YouTube · long video", g: "18:00", dni: [3, 0] },
    { pl: "tt", n: "TikTok · post", g: "19:00", dni: CODZ },
    { pl: "yt", n: "YouTube · Short", g: "21:00", dni: CODZ }
  ];
  var DNI = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DNI_PELNE = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // values are the backend's priority codes (kept as-is), labels are English
  var PRIO = [["niski", "Low"], ["normalny", "Normal"], ["wysoki", "High"], ["pilne", "Urgent"]];
  var PRIO_EN = { niski: "low", normalny: "normal", wysoki: "high", pilne: "urgent" };
  var STATUS_EN = { "nowe": "NEW", "w toku": "IN PROGRESS", "zrobione": "DONE", "odrzucone": "REJECTED" };
  var K_URL = "bm-api-url", K_TOK = "bm-api-token", K_CACHE = "bm-cmd-cache", K_REC = "bm-recipients", K_STAN = "bm-stan";
  var DEFAULT_TO = "Rovi Here";

  // One-time private setup link: index.html#link=<url-encoded web app URL>. Saved locally, then removed from the address bar.
  (function () {
    var m = /[#&]link=([^&]+)/.exec(location.hash || "");
    if (!m) return;
    try { var u = decodeURIComponent(m[1]); if (/^https:\/\//i.test(u)) lsSet(K_URL, u); } catch (e) {}
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; }
  })();

  // ---------- Berlin time ----------
  function berlinTeraz() {
    var o = {};
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
        .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    } catch (e) { var d = new Date(); o = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() }; }
    var y = +o.year, m = +o.month, d2 = +o.day, h = +o.hour % 24, mi = +o.minute;
    return { y: y, m: m, d: d2, min: h * 60 + mi, wd: new Date(Date.UTC(y, m - 1, d2)).getUTCDay() };
  }
  function dzien(t, plus) { var u = new Date(Date.UTC(t.y, t.m - 1, t.d + plus)); return { y: u.getUTCFullYear(), m: u.getUTCMonth() + 1, d: u.getUTCDate(), wd: u.getUTCDay() }; }
  function p2(n) { return ("0" + n).slice(-2); }
  function ddmm(x) { return p2(x.d) + "." + p2(x.m); }
  function minuty(g) { var a = g.split(":"); return +a[0] * 60 + +a[1]; }
  function za(m) { if (m < 60) return "in " + m + " min"; var h = Math.floor(m / 60), r = m % 60; return "in " + h + " h" + (r ? " " + r + " min" : ""); }
  function wpisyDnia(wd) { return PLAN.filter(function (p) { return p.dni.indexOf(wd) >= 0; }).sort(function (a, b) { return minuty(a.g) - minuty(b.g); }); }

  // ---------- private status (imported by the owner on this device) ----------
  function S() { return B.stan() || {}; }
  function hasPrivate() { return !!S().aktualizacja; }
  function KO() { return S().koordynacja || {}; }
  function sekcja(plik, start) { var f = KO()[plik]; if (!f || !f.sekcje) return null; for (var i = 0; i < f.sekcje.length; i++) if (f.sekcje[i].tytul.indexOf(start) === 0) return f.sekcje[i]; return null; }
  function md(s) {
    return esc(String(s)).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/~~([^~]+)~~/g, "<s>$1</s>").replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }
  function czyste(s) { return String(s).replace(/\*\*|~~|`/g, "").trim(); }
  function tabela(t, kl) {
    if (!t) return "";
    return '<div class="cc-tw"><table class="cc-t ' + (kl || "") + '"><thead><tr>' + t.naglowki.map(function (h) { return "<th>" + md(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      t.wiersze.map(function (r) { return "<tr>" + r.map(function (c, i) { return '<td data-h="' + esc(czyste(t.naglowki[i] || "")) + '">' + md(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
  }
  // section titles below are keys inside the owner's (Polish) status file
  function notatkiKalendarza(x) {
    var s = sekcja("kalendarz", "Najbliższe dni"), out = [];
    if (s && s.tabele[0]) s.tabele[0].wiersze.forEach(function (r) { if (r[0] && r[0].indexOf(ddmm(x)) >= 0) out.push(r); });
    return out;
  }

  // ---------- backend link ----------
  function cfg() { return { url: (lsGet(K_URL) || "").trim(), token: lsGet(K_TOK) || "" }; }
  function ok() { var c = cfg(); return !!(c.url && c.token); }
  function host(u) { try { return new URL(u).host; } catch (e) { return u; } }
  function zadanie(metoda, dane) {
    var c = cfg();
    if (!c.url || !c.token) return Promise.reject(new Error("link not configured"));
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    var url = c.url, opt = { method: metoda, redirect: "follow", cache: "no-store", credentials: "omit" };
    dane = dane || {};
    if (metoda === "GET") {
      var q = Object.keys(dane).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(dane[k]); });
      q.push("token=" + encodeURIComponent(c.token), "_=" + Date.now());
      url += (url.indexOf("?") < 0 ? "?" : "&") + q.join("&");
    } else {
      dane.token = c.token;
      opt.headers = { "Content-Type": "text/plain;charset=utf-8" };   // "simple" request – no CORS preflight
      opt.body = JSON.stringify(dane);
    }
    if (ctl) opt.signal = ctl.signal;
    return fetch(url, opt).then(function (r) { return r.text().then(function (t) { return { r: r, t: t }; }); }).then(function (x) {
      clearTimeout(tm);
      var j; try { j = JSON.parse(x.t); } catch (e) { throw new Error("response is not JSON (HTTP " + x.r.status + ") – check the /exec URL and that access is set to \u201cAnyone\u201d"); }
      if (!j || j.ok !== true) throw new Error((j && j.blad) || "unknown backend error");
      return j;
    }, function (e) {
      clearTimeout(tm);
      throw new Error(e && e.name === "AbortError" ? "timed out (20 s)" : "cannot reach the backend (" + (e && e.message || e) + ")");
    });
  }

  // ---------- recipients (never hard-coded: from this device and from the command log) ----------
  function recipients() {
    var out = [DEFAULT_TO], seen = {}; seen[DEFAULT_TO.toLowerCase()] = 1;
    function add(n) { n = String(n || "").trim(); if (!n || seen[n.toLowerCase()]) return; seen[n.toLowerCase()] = 1; out.push(n); }
    String(lsGet(K_REC) || "").split(/\n|,/).forEach(add);
    (lista || []).forEach(function (p) { add(p.dzial); });
    return out.slice(0, 40);
  }
  function rememberRecipient(n) {
    n = String(n || "").trim(); if (!n || n === DEFAULT_TO) return;
    var a = String(lsGet(K_REC) || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
    if (a.map(function (x) { return x.toLowerCase(); }).indexOf(n.toLowerCase()) < 0) { a.push(n); lsSet(K_REC, a.slice(-40).join("\n")); }
  }
  function stCls(s) { return { "nowe": "nowe", "w toku": "wtoku", "zrobione": "ok", "odrzucone": "odrz" }[String(s).toLowerCase()] || "nowe"; }
  var widok = null;

  // ---------- DASHBOARD ----------
  function planDzis(t) {
    var w = wpisyDnia(t.wd), nast = null, html = "";
    w.forEach(function (p) { if (!nast && minuty(p.g) > t.min) nast = p; });
    var jutro = dzien(t, 1), wj = wpisyDnia(jutro.wd);
    html += '<ol class="cc-plan">' + w.map(function (p) {
      var m = minuty(p.g) - t.min, st = m > 0 ? za(m) : (m > -30 ? "now" : "passed");
      return '<li class="' + p.pl + (p === nast ? " nx" : "") + (m <= -30 ? " past" : "") + '"><span class="g">' + p.g + '</span><span class="pl">' + esc(p.n) + '</span><span class="za">' + (p === nast ? '<b>NEXT</b> · ' : '') + st + '</span></li>';
    }).join("") + "</ol>";
    if (!nast && wj.length) html += '<p class="cc-nx">Next: <b>tomorrow ' + wj[0].g + '</b> · ' + esc(wj[0].n) + "</p>";
    return html;
  }
  function planTydzien(t) {
    var out = "";
    for (var i = 1; i <= 6; i++) {
      var x = dzien(t, i), w = wpisyDnia(x.wd), nk = hasPrivate() ? notatkiKalendarza(x) : [];
      out += '<li><div class="dh"><b>' + DNI[x.wd] + "</b> " + ddmm(x) + '</div><div class="dw">' + w.map(function (p) { return '<span class="ch ' + p.pl + '">' + p.g + " " + esc(p.n.replace("YouTube · ", "YT ").replace("TikTok · ", "TT ")) + "</span>"; }).join("") + "</div>" +
        (nk.length ? '<div class="dn">' + nk.map(function (r) { return '<span>Note: ' + md(r[2] || "") + "</span>"; }).join("") + "</div>" : "") + "</li>";
    }
    return '<ul class="cc-week">' + out + "</ul>";
  }
  function blokadyHtml() {
    var b = KO().blokady;
    if (!b) return '<p class="dim">No blocker data in the imported status file.</p>';
    var h = "";
    if (b.otwarte && b.otwarte.length) h += '<ul class="cc-blk">' + b.otwarte.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul>";
    else if (b.otwarte_brak) h += '<p class="cc-none"><span class="stamp ok">No open blockers</span></p>';
    var s = b.statusy && b.statusy[0];
    if (s) h += '<div class="cc-quote"><small>' + esc(s.tytul) + "</small>" + s.akapity.map(function (a) { return "<p>" + md(a) + "</p>"; }).join("") + "</div>";
    (b.decyzje || []).forEach(function (d) { if (d.punkty.length) h += '<details class="cc-det"><summary>' + esc(d.tytul) + "</summary><ul>" + d.punkty.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul></details>"; });
    return h + '<p class="cc-src">Source: ' + esc(b.plik || "-") + (b.zamkniete_liczba ? " · closed: " + b.zamkniete_liczba : "") + "</p>";
  }
  function kalendarzHtml() {
    var dz = null, f = KO().kalendarz;
    if (!f) return '<p class="dim">No calendar data in the imported status file.</p>';
    f.sekcje.forEach(function (s) { if (s.tytul.indexOf("Dziś") === 0) dz = s; });
    var h = "";
    if (dz) h += '<p class="cc-sub">' + esc(dz.tytul) + "</p>" + dz.akapity.map(function (a) { return '<p class="cc-p">' + md(a) + "</p>"; }).join("") + tabela(dz.tabele[0]);
    var nd = sekcja("kalendarz", "Najbliższe dni");
    if (nd) h += '<details class="cc-det"><summary>' + esc(nd.tytul) + "</summary>" + tabela(nd.tabele[0]) + "</details>";
    var zs = sekcja("kalendarz", "Zasady stałe");
    if (zs) h += '<details class="cc-det"><summary>' + esc(zs.tytul) + '</summary><ul>' + zs.punkty.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul></details>";
    var sr = sekcja("kalendarz", "Stały rytm");
    if (sr) h += '<details class="cc-det"><summary>' + esc(sr.tytul) + "</summary>" + tabela(sr.tabele[0]) + "</details>";
    return h + '<p class="cc-src">Source: ' + esc(f.plik || "-") + "</p>";
  }
  function przeplywHtml() {
    var f = KO().przeplyw; if (!f) return '<p class="dim">No task-flow data in the imported status file.</p>';
    var h = "";
    var tc = sekcja("przeplyw", "Treści cykliczne"); if (tc) h += '<p class="cc-sub">' + esc(tc.tytul) + "</p>" + tabela(tc.tabele[0], "flow");
    var pr = sekcja("przeplyw", "Projekty"); if (pr) h += '<details class="cc-det"><summary>' + md(pr.tytul) + "</summary>" + tabela(pr.tabele[0], "flow") + "</details>";
    var zp = sekcja("przeplyw", "Zasady przepływu"); if (zp) h += '<details class="cc-det"><summary>' + esc(zp.tytul) + '</summary><ul>' + zp.punkty.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul></details>";
    return h + '<p class="cc-src">Source: ' + esc(f.plik || "-") + "</p>";
  }
  function stacjeHtml() {
    var D = S().dzialy || {}, keys = Object.keys(D);
    if (!keys.length) return '<p class="dim">No station data in the imported status file.</p>';
    return '<ul class="cc-crew">' + keys.map(function (k) {
      var st = D[k] || {}, o = st.ostatnio, s = st.status || "-";
      return '<li><div class="cc-row"><span class="nm"><b>' + esc(k) + '</b><em>' +
        (o ? esc(o.data) + (o.niepewna ? " (copy date)" : "") + " · " + esc(String(o.plik).split("/").pop()) : "no trace") + '</em></span><span class="sm ' + B.stampCls(s) + '">' + B.stampTxt(s) + "</span></div>" +
        (st.notatka ? '<p class="cc-note">' + esc(st.notatka) + "</p>" : "") + "</li>";
    }).join("") + "</ul>";
  }
  function kontaHtml() {
    return '<div class="cc-acc">' + KONTA.map(function (k) { return '<a class="' + k.id + '" href="' + k.u + '" target="_blank" rel="noopener"><b>' + k.n + "</b><small>" + esc(k.h) + "</small></a>"; }).join("") + "</div>";
  }
  function pulpit() {
    widok = "pulpit";
    var t = berlinTeraz(), st = S(), f = st.firma || {}, priv = hasPrivate();
    var blk = KO().blokady, nBlk = blk && blk.otwarte ? blk.otwarte.length : null;
    B.open('<div class="cc">' +
      '<div class="banner" style="background-image:url(grafika/enceladus.webp)"><div><small>KX7-2189-0413 · OWNER TOOLS</small><h2>Dashboard</h2></div>' +
        (priv ? '<span class="stamp ' + (f.stop ? "" : "ok") + ' cc-bst">' + (f.stop ? "STOP" : "ON DUTY") + "</span>" : "") + "</div>" +
      '<p class="reg-sum cc-sum"><span>' + DNI_PELNE[t.wd].toUpperCase() + " " + ddmm(t) + "." + t.y + " · " + p2(Math.floor(t.min / 60)) + ":" + p2(t.min % 60) + ' BERLIN</span>' + (priv ? '<span>BLOCKERS: ' + (nBlk == null ? "?" : nBlk) + '</span>' : '') + '<span>LINK: ' + (ok() ? "YES" : "NONE") + "</span></p>" +
      '<div class="row cc-act"><button class="btn" id="ccNew" type="button"><svg><use href="#i-cmd"/></svg>New command</button><button class="btn g" id="ccImp" type="button"><svg><use href="#i-ref"/></svg>Import status file</button>' + (priv ? '<button class="btn g" id="ccClr" type="button">Remove status file</button>' : '') + '<input id="ccFile" type="file" accept="application/json,.json" hidden></div>' +
      '<div class="cc-grid">' +
        '<section class="panel cc-a"><h4><span class="n">01</span>Today · publishing plan</h4>' + planDzis(t) + '<p class="cc-src">Fixed plan: YouTube Shorts daily 21:00, long videos Wed and Sun 18:00; TikTok clip pack 08:00, post 19:00. Time zone Europe/Berlin.</p></section>' +
        '<section class="panel cc-b"><h4><span class="n">02</span>Accounts</h4>' + kontaHtml() + "</section>" +
        '<section class="panel cc-a"><h4><span class="n">03</span>Next days</h4>' + planTydzien(t) + "</section>" +
        (priv ?
          '<section class="panel cc-b"><h4><span class="n">04</span>Blockers</h4>' + blokadyHtml() + "</section>" +
          '<section class="panel cc-w"><h4><span class="n">05</span>Calendar</h4>' + kalendarzHtml() + "</section>" +
          '<section class="panel cc-w"><h4><span class="n">06</span>Task flow</h4>' + przeplywHtml() + "</section>" +
          '<section class="panel cc-w"><h4><span class="n">07</span>Stations · status</h4>' + stacjeHtml() + "</section>"
        : '<section class="panel cc-b"><h4><span class="n">04</span>Private status</h4><p class="cc-p">Private status data is not published with the app. Import your status file (JSON) to see blockers, calendar, task flow and station status. It stays in this browser only.</p></section>') +
      "</div>" +
      '<p class="reg-foot"><span>' + (priv ? "PRIVATE STATUS FILE · THIS DEVICE ONLY" : "PUBLIC DATA ONLY") + '</span><span>' + (priv ? "STATUS: " + esc(st.aktualizacja) : "") + "</span></p></div>", "wide cc-wide", ["OWNER TOOLS · DASHBOARD", "BLUE MOLD"]);
    $("#ccNew").onclick = function () { polecenia(); };
    var fi = $("#ccFile");
    $("#ccImp").onclick = function () { fi.click(); };
    fi.onchange = function () {
      var file = fi.files && fi.files[0]; if (!file) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var j = JSON.parse(String(rd.result));
          if (!j || typeof j !== "object" || !j.aktualizacja) throw new Error("not a status file");
          lsSet(K_STAN, JSON.stringify(j)); B.toast("Status file imported · reloading", 2500);
          setTimeout(function () { location.reload(); }, 900);
        } catch (e) { B.toast("Could not import: " + e.message, 4000); }
      };
      rd.readAsText(file);
    };
    var cl = $("#ccClr"); if (cl) cl.onclick = function () { lsSet(K_STAN, ""); B.toast("Status file removed · reloading", 2500); setTimeout(function () { location.reload(); }, 900); };
  }

  // ---------- COMMANDS ----------
  var cmdTo = DEFAULT_TO, cmdPrio = "normalny", lista = null, listaCzas = "", listaBlad = "", ladowanie = false;
  try { var cc = JSON.parse(lsGet(K_CACHE) || "null"); if (cc && cc.lista) { lista = cc.lista; listaCzas = cc.czas || ""; } } catch (e) {}
  function listaHtml() {
    if (!ok()) return '<p class="dim">Connect your sheet in Link settings to see commands and their status.</p>';
    var h = '<div class="cc-lh"><span>' + (ladowanie ? "RECEIVING…" : (listaCzas ? "FROM SHEET · " + esc(listaCzas) : "NOT FETCHED YET")) + '</span><button class="btn g small" id="cmdRef" type="button"' + (ladowanie ? " disabled" : "") + '><svg><use href="#i-ref"/></svg>Refresh</button></div>';
    if (listaBlad) h += '<p class="cc-err">Read error: ' + esc(listaBlad) + "</p>";
    if (lista && !lista.length) h += '<p class="dim">The sheet has no commands yet.</p>';
    if (lista && lista.length) h += '<ul class="cc-cmds">' + lista.map(function (p) {
      var stt = String(p.status || "nowe").toLowerCase();
      return '<li class="' + stCls(p.status) + '"><div class="h"><b>→ ' + esc(p.dzial) + '</b><span class="pr ' + esc(p.priorytet) + '">' + esc(PRIO_EN[p.priorytet] || p.priorytet) + '</span><span class="sm st-' + stCls(p.status) + '">' + esc(STATUS_EN[stt] || stt.toUpperCase()) + '</span></div>' +
        '<p class="tr">' + esc(p.tresc) + "</p>" + (p.odpowiedz ? '<p class="od"><small>REPLY</small>' + esc(p.odpowiedz) + "</p>" : "") +
        '<div class="f"><span>' + esc(p.id) + "</span><span>" + esc(p.czas) + (p.zrodlo ? " · " + esc(p.zrodlo) : "") + "</span></div></li>";
    }).join("") + "</ul>";
    return h;
  }
  function rysujListe() { var el = $("#cmdList"); if (el) { el.innerHTML = listaHtml(); var b = $("#cmdRef"); if (b) b.onclick = pobierzListe; } rysujOdbiorcow(); }
  function rysujOdbiorcow() {
    var dl = $("#cmdRecList"), q = $("#cmdRecQuick"); if (!dl || !q) return;
    var r = recipients();
    dl.innerHTML = r.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join("");
    q.innerHTML = r.slice(0, 12).map(function (n) { return '<button type="button" data-rec="' + esc(n) + '">' + esc(n) + "</button>"; }).join("");
    q.querySelectorAll("[data-rec]").forEach(function (b) { b.onclick = function () { var i = $("#cmdToIn"); i.value = b.getAttribute("data-rec"); cmdTo = i.value; B.blip(500, .04, "sine", .03); }; });
  }
  function pobierzListe() {
    if (!ok() || ladowanie) return Promise.resolve();
    ladowanie = true; listaBlad = ""; rysujListe();
    return zadanie("GET", { akcja: "lista", n: 50 }).then(function (j) {
      lista = j.polecenia || []; listaCzas = j.czas || B.berlinFull(); lsSet(K_CACHE, JSON.stringify({ lista: lista, czas: listaCzas }));
    }, function (e) { listaBlad = e.message; }).then(function () { ladowanie = false; rysujListe(); });
  }
  function kopiujDoCzatu(to, prio, txt) {
    B.transmit("rovi", "[COMMAND · to: " + to + " · priority: " + (PRIO_EN[prio] || prio) + "]\n" + String(txt).trim());
  }
  function polecenia(preset) {
    widok = "polecenia";
    if (preset && typeof preset === "string") cmdTo = preset;
    var c = cfg(), pol = ok();
    B.open('<div class="tx cc-cmd"><div class="tx-head"><div><small class="kicker">COMMAND FORM · KX7-CMD</small><h2 class="sh-title">New command</h2><p class="lead">' +
      (pol ? "The command is written to your private sheet." : "No link set up on this device – the command will be copied to your clipboard instead.") + '</p></div><span class="tx-ico" aria-hidden="true"><svg><use href="#i-cmd"/></svg></span></div>' +
      '<p class="cc-link ' + (pol ? "on" : "off") + '"><i></i><span>' + (pol ? "LINK: " + esc(host(c.url)) : "LINK: NONE") + '</span><button class="btn g small" id="cmdCfg" type="button"><svg><use href="#i-link"/></svg>Link settings</button></p>' +
      '<section class="tx-s"><h4><span class="n">01</span>Recipient</h4><input class="cc-in" id="cmdToIn" list="cmdRecList" maxlength="60" autocomplete="off" spellcheck="false" value="' + esc(cmdTo) + '"><datalist id="cmdRecList"></datalist><div class="tx-q" id="cmdRecQuick"></div></section>' +
      '<section class="tx-s"><h4><span class="n">02</span>Priority</h4><div class="cc-seg" id="cmdPrio">' + PRIO.map(function (p) { return '<button type="button" data-p="' + p[0] + '" class="' + p[0] + (p[0] === cmdPrio ? " on" : "") + '">' + p[1] + "</button>"; }).join("") + "</div></section>" +
      '<section class="tx-s"><h4><span class="n">03</span>Message</h4><div class="tx-area"><textarea id="cmdT" maxlength="2000" rows="4" placeholder="What should be done? Be specific: what, by when, where the result goes…"></textarea><span id="cmdN" class="cnt">0/2000</span></div></section>' +
      '<div class="row tx-go"><button class="btn big" id="cmdGo" type="button" disabled><svg><use href="#' + (pol ? "i-send" : "i-ufo") + '"/></svg>' + (pol ? "Send command" : "Copy to clipboard") + "</button>" +
        (pol ? '<button class="btn g" id="cmdCopy" type="button" disabled title="Fallback: copies the text to the clipboard"><svg><use href="#i-ufo"/></svg>Copy instead</button>' : "") + "</div>" +
      '<div id="cmdErr" class="cc-fail" hidden></div>' +
      '<section class="tx-s"><h4><span class="n">04</span>Command log <small>last 50 from the sheet</small></h4><div id="cmdList">' + listaHtml() + "</div></section></div>", "wide tx-sheet", ["OWNER TOOLS · COMMANDS", "KX7-CMD"]);
    var ta = $("#cmdT"), go = $("#cmdGo"), cp = $("#cmdCopy"), n = $("#cmdN"), toIn = $("#cmdToIn");
    function dest() { return (toIn.value || "").trim() || DEFAULT_TO; }
    function upd() { var v = ta.value.trim(); n.textContent = ta.value.length + "/2000"; go.disabled = !v; if (cp) cp.disabled = !v; }
    ta.oninput = upd;
    toIn.oninput = function () { cmdTo = toIn.value; };
    rysujOdbiorcow();
    B.body.querySelectorAll("#cmdPrio [data-p]").forEach(function (b) { b.onclick = function () { cmdPrio = b.getAttribute("data-p"); B.body.querySelectorAll("#cmdPrio [data-p]").forEach(function (o) { o.classList.toggle("on", o === b); }); }; });
    $("#cmdCfg").onclick = ustawienia;
    if (cp) cp.onclick = function () { if (ta.value.trim()) kopiujDoCzatu(dest(), cmdPrio, ta.value); };
    go.onclick = function () {
      var txt = ta.value.trim(), to = dest(); if (!txt) return;
      if (!ok()) { kopiujDoCzatu(to, cmdPrio, txt); return; }
      go.disabled = true; go.lastChild.textContent = "Sending…"; $("#cmdErr").hidden = true;
      zadanie("POST", { akcja: "dodaj", dzial: to, tresc: txt, priorytet: cmdPrio, zrodlo: "Blue Mold app" }).then(function (j) {
        var p = j.polecenie || {}; ta.value = ""; upd(); go.lastChild.textContent = "Send command";
        rememberRecipient(to);
        if (lista) lista.unshift(p); else lista = [p];
        rysujListe(); B.toast("Accepted: " + (p.id || "command") + " → " + to, 4500, "big");
        B.radio("rovi", null, "Command " + (p.id || "") + " written to the sheet → " + to + ".");
        B.bigStamp("ACCEPTED", "KX7 · CMD · " + (p.id || "") + " · → " + to.toUpperCase());
        setTimeout(pobierzListe, 800);
      }, function (e) {
        go.disabled = false; go.lastChild.textContent = "Send again";
        var el = $("#cmdErr"); el.hidden = false;
        el.innerHTML = '<span class="stamp">NOT SENT</span><p><b>The sheet did not accept the command:</b> ' + esc(e.message) + '</p><p class="dim">Your text is still in the form. You can copy it to the clipboard instead.</p><button class="btn" id="cmdFb" type="button"><svg><use href="#i-ufo"/></svg>Copy to clipboard</button>';
        $("#cmdFb").onclick = function () { kopiujDoCzatu(to, cmdPrio, txt); };
      });
    };
    upd();
    if (pol) pobierzListe();
  }

  // ---------- LINK SETTINGS ----------
  function ustawienia() {
    widok = "ustawienia";
    var c = cfg();
    B.open('<div class="proto cc-set"><div class="banner" style="background-image:url(grafika/schemat.webp)"><div><small>DOC. KX7-2189-0413 · LINK</small><h2>Link settings</h2></div></div>' +
      '<section class="panel"><h4>Web app URL (/exec)</h4><p class="cc-p">Paste the deployment URL of your Google Apps Script web app, e.g. <code>https://script.google.com/macros/s/…/exec</code>.</p>' +
        '<input class="cc-in" id="setUrl" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(c.url) + '"></section>' +
      '<section class="panel"><h4>Token</h4><p class="cc-p">The same token you stored with <code>ustawToken()</code> (Script Properties → TOKEN).</p>' +
        '<div class="cc-tok"><input class="cc-in" id="setTok" type="password" autocomplete="off" spellcheck="false" placeholder="token" value="' + esc(c.token) + '"><button class="btn g small" id="setShow" type="button">Show</button></div></section>' +
      '<section class="panel"><h4>Recipients</h4><p class="cc-p">Optional: one recipient name per line. Stored only on this device; names from your command log are suggested automatically.</p>' +
        '<textarea class="cc-in" id="setRec" rows="4" spellcheck="false" placeholder="One name per line">' + esc(lsGet(K_REC) || "") + '</textarea></section>' +
      '<div class="row cc-act"><button class="btn" id="setSave" type="button">Save</button><button class="btn g" id="setTest" type="button">Test connection</button><button class="btn g" id="setClr" type="button">Clear</button><button class="btn g" id="setBack" type="button">Commands</button></div>' +
      '<p id="setMsg" class="cc-msg" role="status"></p>' +
      '<section class="panel"><h4>How it works</h4><p class="cc-p">The URL, token and recipients are saved only in this browser (localStorage) – they are not in the app files or on GitHub. Set up each device once.</p>' +
        '<p class="cc-p small">The token protects your sheet from strangers. Never share it; if it leaks, run <code>ustawToken()</code> again with a new value.</p></section></div>', "wide", ["OWNER TOOLS · LINK", "KX7-LINK"]);
    var u = $("#setUrl"), tk = $("#setTok"), rc = $("#setRec"), msg = $("#setMsg");
    function pokaz(t, kl) { msg.textContent = t; msg.className = "cc-msg " + (kl || ""); }
    function zapisz() {
      var url = u.value.trim(), tok = tk.value.trim();
      if (url && !/^https?:\/\//i.test(url)) { pokaz("The URL must start with https://", "bad"); return false; }
      lsSet(K_URL, url); lsSet(K_TOK, tok); lsSet(K_REC, rc.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).join("\n"));
      lista = null; listaCzas = ""; lsSet(K_CACHE, "");
      if (url && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) pokaz("Saved. Note: the URL does not look like …/macros/s/…/exec – make sure you copied the deployment URL (not /dev).", "warn");
      else pokaz(url && tok ? "Saved." : "Saved (link incomplete – URL or token missing).", url && tok ? "good" : "warn");
      return true;
    }
    $("#setShow").onclick = function () { var s = tk.type === "password"; tk.type = s ? "text" : "password"; this.textContent = s ? "Hide" : "Show"; };
    $("#setSave").onclick = zapisz;
    $("#setClr").onclick = function () { u.value = ""; tk.value = ""; lsSet(K_URL, ""); lsSet(K_TOK, ""); lsSet(K_CACHE, ""); lista = null; pokaz("Cleared. Commands will be copied to the clipboard.", "warn"); };
    $("#setBack").onclick = function () { polecenia(); };
    $("#setTest").onclick = function () {
      if (!zapisz()) return;
      if (!ok()) { pokaz("Enter both the URL and the token.", "bad"); return; }
      pokaz("Connecting…");
      zadanie("GET", { akcja: "ping" }).then(function (j) { pokaz("Connected ✓ · server time: " + (j.czas || "?"), "good"); }, function (e) { pokaz("Error: " + e.message, "bad"); });
    };
  }

  var bp = $("#btnPulpit"), bc = $("#btnPolecenia");
  if (bp) bp.onclick = pulpit;
  if (bc) bc.onclick = function () { polecenia(); };
  window.__cc = { pulpit: pulpit, polecenia: polecenia, ustawienia: ustawienia, ok: ok, pobierzListe: pobierzListe, recipients: recipients, plan: function () { var t = berlinTeraz(); return wpisyDnia(t.wd).map(function (p) { return p.g + " " + p.n; }); } };
})();
