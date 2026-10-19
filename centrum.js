/* Blue Mold · Centrum dowodzenia RoviHere (od 18.10.2026)
   Pulpit (plan publikacji, kalendarz/przepływ/blokady Mostka, stan działów, konta),
   formularz „Nowe polecenie” → Google Apps Script (arkusz „RoviHere Polecenia”) i ustawienia łącza.
   Bez łącza albo przy błędzie: zapasowo kopiowanie do czatu (kanał UFO z app.js). */
(function () {
  "use strict";
  var B = window.__bm; if (!B) return;
  var esc = B.esc;
  function $(s) { return document.querySelector(s); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null || v === "") localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  // ---------- stałe ustalone przez użytkownika (18.10.2026), czas Europe/Berlin ----------
  var KONTA = [
    { id: "tt", n: "TikTok", h: "@roviheree", u: "https://www.tiktok.com/@roviheree" },
    { id: "yt", n: "YouTube", h: "@RoviHere", u: "https://www.youtube.com/@RoviHere" },
    { id: "x", n: "X", h: "@RoviHere", u: "https://x.com/RoviHere" },
    { id: "suno", n: "Suno", h: "@kkruk93", u: "https://suno.com/@kkruk93" }
  ];
  var CODZ = [0, 1, 2, 3, 4, 5, 6];
  var PLAN = [
    { pl: "tt", n: "TikTok · pakiet", g: "08:00", dni: CODZ },
    { pl: "yt", n: "YouTube · długi film", g: "18:00", dni: [3, 0] },
    { pl: "tt", n: "TikTok · post", g: "19:00", dni: CODZ },
    { pl: "yt", n: "YouTube · Short", g: "21:00", dni: CODZ }
  ];
  var DNI = ["nd", "pon", "wt", "śr", "czw", "pt", "sob"];
  var DNI_PELNE = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  var PRIO = [["niski", "Niski"], ["normalny", "Normalny"], ["wysoki", "Wysoki"], ["pilne", "Pilne"]];
  var K_URL = "bm-api-url", K_TOK = "bm-api-token", K_CACHE = "bm-cmd-cache";
  var DOMYSLNY_URL = "https://script.google.com/macros/s/AKfycbw3UCB26CXzg4vAuljzxGTMDmvqGsCr7SfVGqYayBhcTX7o1IIeQzFw_HHIH9s_7YTi/exec";

  // ---------- czas w Berlinie ----------
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
  function za(m) { if (m < 60) return "za " + m + " min"; var h = Math.floor(m / 60), r = m % 60; return "za " + h + " h" + (r ? " " + r + " min" : ""); }
  function wpisyDnia(wd) { return PLAN.filter(function (p) { return p.dni.indexOf(wd) >= 0; }).sort(function (a, b) { return minuty(a.g) - minuty(b.g); }); }

  // ---------- dane koordynacji (z data/stan.json – tylko to, co jest w plikach Mostka) ----------
  function KO() { return (B.stan() || {}).koordynacja || {}; }
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
  function notatkiKalendarza(x) {
    var s = sekcja("kalendarz", "Najbliższe dni"), out = [];
    if (s && s.tabele[0]) s.tabele[0].wiersze.forEach(function (r) { if (r[0] && r[0].indexOf(ddmm(x)) >= 0) out.push(r); });
    return out;
  }

  // ---------- łącze z backendem ----------
  function cfg() { return { url: (lsGet(K_URL) || DOMYSLNY_URL).trim(), token: lsGet(K_TOK) || "" }; }
  function ok() { var c = cfg(); return !!(c.url && c.token); }
  function host(u) { try { return new URL(u).host; } catch (e) { return u; } }
  function zadanie(metoda, dane) {
    var c = cfg();
    if (!c.url || !c.token) return Promise.reject(new Error("łącze nieskonfigurowane"));
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    var url = c.url, opt = { method: metoda, redirect: "follow", cache: "no-store", credentials: "omit" };
    dane = dane || {};
    if (metoda === "GET") {
      var q = Object.keys(dane).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(dane[k]); });
      q.push("token=" + encodeURIComponent(c.token), "_=" + Date.now());
      url += (url.indexOf("?") < 0 ? "?" : "&") + q.join("&");
    } else {
      dane.token = c.token;
      opt.headers = { "Content-Type": "text/plain;charset=utf-8" };   // żądanie „proste” – bez preflight CORS
      opt.body = JSON.stringify(dane);
    }
    if (ctl) opt.signal = ctl.signal;
    return fetch(url, opt).then(function (r) { return r.text().then(function (t) { return { r: r, t: t }; }); }).then(function (x) {
      clearTimeout(tm);
      var j; try { j = JSON.parse(x.t); } catch (e) { throw new Error("odpowiedź nie jest JSON (HTTP " + x.r.status + ") – sprawdź adres /exec i dostęp „Każdy”"); }
      if (!j || j.ok !== true) throw new Error((j && j.blad) || "nieznany błąd backendu");
      return j;
    }, function (e) {
      clearTimeout(tm);
      throw new Error(e && e.name === "AbortError" ? "przekroczony czas (20 s)" : "brak połączenia z backendem (" + (e && e.message || e) + ")");
    });
  }

  // ---------- wspólne ----------
  var chars = window.ZALOGA.map(function (d) { return d; });
  var poNazwie = {}; chars.forEach(function (d) { poNazwie[d.imie.toLowerCase()] = d.id; poNazwie[(d.krotko || d.imie).toLowerCase()] = d.id; });
  function idDzialu(n) { return poNazwie[String(n || "").toLowerCase()] || null; }
  function nazwa(id) { var d = chars.filter(function (c) { return c.id === id; })[0]; return d ? d.imie : id; }
  function krotko(d) { return d.id === "rovi" ? "Rovi" : (d.krotko || d.imie); }
  function stCls(s) { return { "nowe": "nowe", "w toku": "wtoku", "zrobione": "ok", "odrzucone": "odrz" }[String(s).toLowerCase()] || "nowe"; }
  var widok = null;

  // ---------- PULPIT ----------
  function planDzis(t) {
    var w = wpisyDnia(t.wd), nast = null, html = "";
    w.forEach(function (p) { if (!nast && minuty(p.g) > t.min) nast = p; });
    var jutro = dzien(t, 1), wj = wpisyDnia(jutro.wd);
    html += '<ol class="cc-plan">' + w.map(function (p) {
      var m = minuty(p.g) - t.min, st = m > 0 ? za(m) : (m > -30 ? "teraz" : "godzina minęła");
      return '<li class="' + p.pl + (p === nast ? " nx" : "") + (m <= -30 ? " past" : "") + '"><span class="g">' + p.g + '</span><span class="pl">' + esc(p.n) + '</span><span class="za">' + (p === nast ? '<b>NASTĘPNE</b> · ' : '') + st + '</span></li>';
    }).join("") + "</ol>";
    if (!nast && wj.length) html += '<p class="cc-nx">Następne: <b>jutro ' + wj[0].g + '</b> · ' + esc(wj[0].n) + "</p>";
    return html;
  }
  function planTydzien(t) {
    var out = "";
    for (var i = 1; i <= 6; i++) {
      var x = dzien(t, i), w = wpisyDnia(x.wd), nk = notatkiKalendarza(x);
      out += '<li><div class="dh"><b>' + DNI[x.wd] + "</b> " + ddmm(x) + '</div><div class="dw">' + w.map(function (p) { return '<span class="ch ' + p.pl + '">' + p.g + " " + esc(p.n.replace("YouTube · ", "YT ").replace("TikTok · ", "TT ")) + "</span>"; }).join("") + "</div>" +
        (nk.length ? '<div class="dn">' + nk.map(function (r) { return '<span>Mostek: ' + md(r[2] || "") + "</span>"; }).join("") + "</div>" : "") + "</li>";
    }
    return '<ul class="cc-week">' + out + "</ul>";
  }
  function blokadyHtml() {
    var b = KO().blokady;
    if (!b) return '<p class="dim">Brak danych z koordynacja/BLOKADY.md – uruchom aktualizuj_stan.py.</p>';
    var h = "";
    if (b.otwarte && b.otwarte.length) h += '<ul class="cc-blk">' + b.otwarte.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul>";
    else if (b.otwarte_brak) h += '<p class="cc-none"><span class="stamp ok">Brak otwartych blokad</span></p>';
    var s = b.statusy && b.statusy[0];
    if (s) h += '<div class="cc-quote"><small>' + esc(s.tytul) + "</small>" + s.akapity.map(function (a) { return "<p>" + md(a) + "</p>"; }).join("") + "</div>";
    (b.decyzje || []).forEach(function (d) { if (d.punkty.length) h += '<details class="cc-det"><summary>' + esc(d.tytul) + "</summary><ul>" + d.punkty.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul></details>"; });
    return h + '<p class="cc-src">Źródło: ' + esc(b.plik) + (b.zamkniete_liczba ? " · zamknięte: " + b.zamkniete_liczba : "") + "</p>";
  }
  function kalendarzHtml() {
    var dz = null, f = KO().kalendarz;
    if (!f) return '<p class="dim">Brak danych z koordynacja/KALENDARZ.md.</p>';
    f.sekcje.forEach(function (s) { if (s.tytul.indexOf("Dziś") === 0) dz = s; });
    var h = "";
    if (dz) h += '<p class="cc-sub">' + esc(dz.tytul) + "</p>" + dz.akapity.map(function (a) { return '<p class="cc-p">' + md(a) + "</p>"; }).join("") + tabela(dz.tabele[0]);
    var nd = sekcja("kalendarz", "Najbliższe dni");
    if (nd) h += '<details class="cc-det"><summary>' + esc(nd.tytul) + "</summary>" + tabela(nd.tabele[0]) + "</details>";
    var zs = sekcja("kalendarz", "Zasady stałe");
    if (zs) h += '<details class="cc-det"><summary>Zasady stałe</summary><ul>' + zs.punkty.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul></details>";
    var sr = sekcja("kalendarz", "Stały rytm");
    if (sr) h += '<details class="cc-det"><summary>' + esc(sr.tytul) + "</summary>" + tabela(sr.tabele[0]) + "</details>";
    return h + '<p class="cc-src">Źródło: ' + esc(f.plik) + "</p>";
  }
  function przeplywHtml() {
    var f = KO().przeplyw; if (!f) return '<p class="dim">Brak danych z koordynacja/PRZEPLYW.md.</p>';
    var h = f.wstep && f.wstep.length ? f.wstep.filter(function (w) { return /^Etapy|^Kto/.test(w); }).map(function (w) { return '<p class="cc-p small">' + md(w) + "</p>"; }).join("") : "";
    var tc = sekcja("przeplyw", "Treści cykliczne"); if (tc) h += '<p class="cc-sub">' + esc(tc.tytul) + "</p>" + tabela(tc.tabele[0], "flow");
    var pr = sekcja("przeplyw", "Projekty"); if (pr) h += '<details class="cc-det"><summary>' + md(pr.tytul) + "</summary>" + tabela(pr.tabele[0], "flow") + "</details>";
    var zp = sekcja("przeplyw", "Zasady przepływu"); if (zp) h += '<details class="cc-det"><summary>Zasady przepływu i ostatnie wpisy</summary><ul>' + zp.punkty.map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul></details>";
    return h + '<p class="cc-src">Źródło: ' + esc(f.plik) + "</p>";
  }
  function dzialyHtml() {
    var S = B.stan() || {}, D = S.dzialy || {};
    return '<ul class="cc-crew">' + chars.map(function (d) {
      var s = B.status(d.id), st = D[d.id] || {}, o = st.ostatnio;
      return '<li><button type="button" data-dos="' + d.id + '"><img alt="" src="' + (B.av[d.id] || "") + '"><span class="nm"><b>' + esc(d.imie) + '</b><em>' +
        (o ? esc(o.data) + (o.niepewna ? " (data kopii)" : "") + " · " + esc(o.plik.split("/").pop()) : "brak śladu w plikach") + '</em></span><span class="sm ' + B.stampCls(s) + '">' + B.stampTxt(s) + "</span></button>" +
        (st.notatka ? '<p class="cc-note">' + esc(st.notatka) + "</p>" : "") + "</li>";
    }).join("") + '</ul><p class="cc-src">Status z dat plików w ostatnich 36 h (aktualizuj_stan.py). „Data kopii” = plik skopiowany 18.10 ok. 12:07 – data nie świadczy o pracy.</p>';
  }
  function kontaHtml() {
    return '<div class="cc-acc">' + KONTA.map(function (k) { return '<a class="' + k.id + '" href="' + k.u + '" target="_blank" rel="noopener"><b>' + k.n + "</b><small>" + esc(k.h) + "</small></a>"; }).join("") + "</div>";
  }
  function pulpit() {
    widok = "pulpit";
    var t = berlinTeraz(), S = B.stan() || {}, f = S.firma || {};
    var blk = KO().blokady, nBlk = blk && blk.otwarte ? blk.otwarte.length : null;
    B.open('<div class="cc">' +
      '<div class="banner" style="background-image:url(grafika/enceladus.webp)"><div><small>KX7-2189-0413 · CENTRUM DOWODZENIA · ROVI HERE</small><h2>Pulpit</h2></div>' +
        '<span class="stamp ' + (f.stop ? "" : "ok") + ' cc-bst">' + (f.stop ? "STOP" : "W PRACY") + "</span></div>" +
      '<p class="reg-sum cc-sum"><span>' + DNI_PELNE[t.wd].toUpperCase() + " " + ddmm(t) + "." + t.y + " · " + p2(Math.floor(t.min / 60)) + ":" + p2(t.min % 60) + ' BERLIN</span><span>BLOKADY: ' + (nBlk == null ? "?" : nBlk) + '</span><span>ŁĄCZE: ' + (ok() ? "TAK" : "BRAK") + "</span></p>" +
      '<div class="row cc-act"><button class="btn" id="ccNew" type="button"><svg><use href="#i-cmd"/></svg>Nowe polecenie</button><button class="btn g" id="ccRef" type="button"><svg><use href="#i-ref"/></svg>Odśwież stan</button></div>' +
      '<div class="cc-grid">' +
        '<section class="panel cc-a"><h4><span class="n">01</span>Dziś · plan publikacji</h4>' + planDzis(t) + '<p class="cc-src">Plan stały (ustalony 18.10.2026): YT Shorty codziennie 21:00, długie filmy śr i nd 18:00; TikTok pakiet 8:00, post 19:00. Czas Europe/Berlin.</p></section>' +
        '<section class="panel cc-b"><h4><span class="n">02</span>Blokady</h4>' + blokadyHtml() + "</section>" +
        '<section class="panel cc-a"><h4><span class="n">03</span>Najbliższe dni</h4>' + planTydzien(t) + "</section>" +
        '<section class="panel cc-b"><h4><span class="n">04</span>Konta RoviHere</h4>' + kontaHtml() + "</section>" +
        '<section class="panel cc-w"><h4><span class="n">05</span>Kalendarz Mostka</h4>' + kalendarzHtml() + "</section>" +
        '<section class="panel cc-w"><h4><span class="n">06</span>Przepływ zadań</h4>' + przeplywHtml() + "</section>" +
        '<section class="panel cc-w"><h4><span class="n">07</span>Działy · status</h4>' + dzialyHtml() + "</section>" +
      "</div>" +
      '<p class="reg-foot"><span>DANE: data/stan.json</span><span>STAN: ' + esc(S.aktualizacja || "-") + "</span></p></div>", "wide cc-wide", ["CENTRUM DOWODZENIA · PULPIT", "ROVI HERE"]);
    $("#ccNew").onclick = function () { polecenia(); };
    $("#ccRef").onclick = odswiezStan;
    B.body.querySelectorAll("[data-dos]").forEach(function (b) { b.onclick = function () { window.__bm.dossier(b.getAttribute("data-dos")); }; });
  }
  function odswiezStan() {
    if (location.protocol.indexOf("http") !== 0) { B.toast("Odświeżanie działa na stronie http(s)"); return; }
    fetch("data/stan.json?_=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j) { window.STAN = j; var S = B.stan(); for (var k in S) delete S[k]; for (k in j) S[k] = j[k]; B.toast("Stan: " + (j.aktualizacja || "-")); if (widok === "pulpit") pulpit(); }
    }).catch(function () { B.toast("Brak sieci – zostaje zapisany stan"); });
  }

  // ---------- POLECENIA ----------
  var cmdTo = "rovi", cmdPrio = "normalny", lista = null, listaCzas = "", listaBlad = "", ladowanie = false;
  try { var cc = JSON.parse(lsGet(K_CACHE) || "null"); if (cc && cc.lista) { lista = cc.lista; listaCzas = cc.czas || ""; } } catch (e) {}
  function listaHtml() {
    if (!ok()) return '<p class="dim">Podłącz arkusz w Ustawieniach łącza, aby widzieć polecenia i ich status.</p>';
    var h = '<div class="cc-lh"><span>' + (ladowanie ? "ODBIÓR…" : (listaCzas ? "STAN Z ARKUSZA · " + esc(listaCzas) : "JESZCZE NIE POBRANO")) + '</span><button class="btn g small" id="cmdRef" type="button"' + (ladowanie ? " disabled" : "") + '><svg><use href="#i-ref"/></svg>Odśwież</button></div>';
    if (listaBlad) h += '<p class="cc-err">Błąd odczytu: ' + esc(listaBlad) + "</p>";
    if (lista && !lista.length) h += '<p class="dim">Arkusz nie ma jeszcze poleceń.</p>';
    if (lista && lista.length) h += '<ul class="cc-cmds">' + lista.map(function (p) {
      var id = idDzialu(p.dzial);
      return '<li class="' + stCls(p.status) + '"><div class="h">' + (id && B.av[id] ? '<img alt="" src="' + B.av[id] + '">' : "") + '<b>→ ' + esc(p.dzial) + '</b><span class="pr ' + esc(p.priorytet) + '">' + esc(p.priorytet) + '</span><span class="sm st-' + stCls(p.status) + '">' + esc(String(p.status || "nowe").toUpperCase()) + '</span></div>' +
        '<p class="tr">' + esc(p.tresc) + "</p>" + (p.odpowiedz ? '<p class="od"><small>ODPOWIEDŹ</small>' + esc(p.odpowiedz) + "</p>" : "") +
        '<div class="f"><span>' + esc(p.id) + "</span><span>" + esc(p.czas) + (p.zrodlo ? " · " + esc(p.zrodlo) : "") + "</span></div></li>";
    }).join("") + "</ul>";
    return h;
  }
  function rysujListe() { var el = $("#cmdList"); if (el) { el.innerHTML = listaHtml(); var b = $("#cmdRef"); if (b) b.onclick = pobierzListe; } }
  function pobierzListe() {
    if (!ok() || ladowanie) return Promise.resolve();
    ladowanie = true; listaBlad = ""; rysujListe();
    return zadanie("GET", { akcja: "lista", n: 50 }).then(function (j) {
      lista = j.polecenia || []; listaCzas = j.czas || B.berlinFull(); lsSet(K_CACHE, JSON.stringify({ lista: lista, czas: listaCzas }));
    }, function (e) { listaBlad = e.message; }).then(function () { ladowanie = false; rysujListe(); });
  }
  function kopiujDoCzatu(to, prio, txt) {
    B.transmit(to, "[POLECENIE · priorytet: " + prio + "]\n" + String(txt).trim());
  }
  function polecenia(preset) {
    widok = "polecenia";
    if (preset && chars.some(function (c) { return c.id === preset; })) cmdTo = preset;
    var c = cfg(), pol = ok();
    B.open('<div class="tx cc-cmd"><div class="tx-head"><div><small class="kicker">FORMULARZ POLECENIA · KX7-CMD</small><h2 class="sh-title">Nowe polecenie</h2><p class="lead">' +
      (pol ? "Polecenie trafi do arkusza „RoviHere Polecenia”, skąd odbierają je agenci." : "Łącze z arkuszem nie jest ustawione – polecenie skopiujesz do czatu z Rovi Here.") + '</p></div><span class="tx-ico" aria-hidden="true"><svg><use href="#i-cmd"/></svg></span></div>' +
      '<p class="cc-link ' + (pol ? "on" : "off") + '"><i></i><span>' + (pol ? "ŁĄCZE: " + esc(host(c.url)) : "ŁĄCZE: BRAK") + '</span><button class="btn g small" id="cmdCfg" type="button"><svg><use href="#i-link"/></svg>Ustawienia łącza</button></p>' +
      '<section class="tx-s"><h4><span class="n">01</span>Dział</h4><div class="tx-to" id="cmdTo">' + chars.map(function (d) { return '<button type="button" data-to="' + d.id + '"' + (d.id === cmdTo ? ' class="on"' : "") + '><img alt="" src="' + (B.av[d.id] || "") + '"><span>' + esc(krotko(d)) + "</span></button>"; }).join("") + "</div></section>" +
      '<section class="tx-s"><h4><span class="n">02</span>Priorytet</h4><div class="cc-seg" id="cmdPrio">' + PRIO.map(function (p) { return '<button type="button" data-p="' + p[0] + '" class="' + p[0] + (p[0] === cmdPrio ? " on" : "") + '">' + p[1] + "</button>"; }).join("") + "</div></section>" +
      '<section class="tx-s"><h4><span class="n">03</span>Treść</h4><div class="tx-area"><textarea id="cmdT" maxlength="2000" rows="4" placeholder="Co dział ma zrobić? Konkretnie: co, do kiedy, gdzie wynik…"></textarea><span id="cmdN" class="cnt">0/2000</span></div></section>' +
      '<div class="row tx-go"><button class="btn big" id="cmdGo" type="button" disabled><svg><use href="#' + (pol ? "i-send" : "i-ufo") + '"/></svg>' + (pol ? "Wyślij polecenie" : "Kopiuj do czatu") + "</button>" +
        (pol ? '<button class="btn g" id="cmdCopy" type="button" disabled title="Zapasowo: kopiuje treść do schowka"><svg><use href="#i-ufo"/></svg>Kopiuj do czatu</button>' : "") + "</div>" +
      '<div id="cmdErr" class="cc-fail" hidden></div>' +
      '<section class="tx-s"><h4><span class="n">04</span>Rejestr poleceń <small>ostatnie 50 z arkusza</small></h4><div id="cmdList">' + listaHtml() + "</div></section></div>", "wide tx-sheet", ["CENTRUM DOWODZENIA · POLECENIA", "KX7-CMD"]);
    var ta = $("#cmdT"), go = $("#cmdGo"), cp = $("#cmdCopy"), n = $("#cmdN");
    function upd() { var v = ta.value.trim(); n.textContent = ta.value.length + "/2000"; go.disabled = !v; if (cp) cp.disabled = !v; }
    ta.oninput = upd;
    B.body.querySelectorAll("#cmdTo [data-to]").forEach(function (b) { b.onclick = function () { cmdTo = b.getAttribute("data-to"); B.body.querySelectorAll("#cmdTo [data-to]").forEach(function (o) { o.classList.toggle("on", o === b); }); B.blip(500, .04, "sine", .03); }; });
    B.body.querySelectorAll("#cmdPrio [data-p]").forEach(function (b) { b.onclick = function () { cmdPrio = b.getAttribute("data-p"); B.body.querySelectorAll("#cmdPrio [data-p]").forEach(function (o) { o.classList.toggle("on", o === b); }); }; });
    $("#cmdCfg").onclick = ustawienia;
    if (cp) cp.onclick = function () { if (ta.value.trim()) kopiujDoCzatu(cmdTo, cmdPrio, ta.value); };
    go.onclick = function () {
      var txt = ta.value.trim(); if (!txt) return;
      if (!ok()) { kopiujDoCzatu(cmdTo, cmdPrio, txt); return; }
      go.disabled = true; go.lastChild.textContent = "Nadawanie…"; $("#cmdErr").hidden = true;
      zadanie("POST", { akcja: "dodaj", dzial: nazwa(cmdTo), tresc: txt, priorytet: cmdPrio, zrodlo: "aplikacja Blue Mold" }).then(function (j) {
        var p = j.polecenie || {}; ta.value = ""; upd(); go.lastChild.textContent = "Wyślij polecenie";
        if (lista) lista.unshift(p); else lista = [p];
        rysujListe(); B.toast("Przyjęto: " + (p.id || "polecenie") + " → " + nazwa(cmdTo), 4500, "big");
        B.radio("rovi", null, "Polecenie " + (p.id || "") + " zapisane w arkuszu → " + nazwa(cmdTo) + ".");
        B.bigStamp("PRZYJĘTO", "KX7 · CMD · " + (p.id || "") + " · → " + nazwa(cmdTo).toUpperCase());
        setTimeout(pobierzListe, 800);
      }, function (e) {
        go.disabled = false; go.lastChild.textContent = "Wyślij ponownie";
        var el = $("#cmdErr"); el.hidden = false;
        el.innerHTML = '<span class="stamp">NIE NADANO</span><p><b>Arkusz nie przyjął polecenia:</b> ' + esc(e.message) + '</p><p class="dim">Treść jest nadal w formularzu. Możesz skopiować ją do czatu z Rovi Here.</p><button class="btn" id="cmdFb" type="button"><svg><use href="#i-ufo"/></svg>Kopiuj do czatu</button>';
        $("#cmdFb").onclick = function () { kopiujDoCzatu(cmdTo, cmdPrio, txt); };
      });
    };
    upd();
    if (pol) pobierzListe();
  }

  // ---------- USTAWIENIA ŁĄCZA ----------
  function ustawienia() {
    widok = "ustawienia";
    var c = cfg();
    B.open('<div class="proto cc-set"><div class="banner" style="background-image:url(grafika/schemat.webp)"><div><small>DOK. KX7-2189-0413 · ŁĄCZE</small><h2>Ustawienia łącza</h2></div></div>' +
      '<section class="panel"><h4>Adres web app (/exec)</h4><p class="cc-p">Wklej adres wdrożenia Google Apps Script, np. <code>https://script.google.com/macros/s/…/exec</code>.</p>' +
        '<input class="cc-in" id="setUrl" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(c.url) + '"></section>' +
      '<section class="panel"><h4>Token</h4><p class="cc-p">Ten sam, który zapisała funkcja <code>ustawToken()</code> (Script Properties → TOKEN).</p>' +
        '<div class="cc-tok"><input class="cc-in" id="setTok" type="password" autocomplete="off" spellcheck="false" placeholder="token" value="' + esc(c.token) + '"><button class="btn g small" id="setShow" type="button">Pokaż</button></div></section>' +
      '<div class="row cc-act"><button class="btn" id="setSave" type="button">Zapisz</button><button class="btn g" id="setTest" type="button">Testuj połączenie</button><button class="btn g" id="setClr" type="button">Wyczyść</button><button class="btn g" id="setBack" type="button">Polecenia</button></div>' +
      '<p id="setMsg" class="cc-msg" role="status"></p>' +
      '<section class="panel"><h4>Jak to działa</h4><p class="cc-p">Adres i token są zapisane tylko w tej przeglądarce (localStorage) – nie ma ich w plikach aplikacji ani na GitHubie. Każde urządzenie ustawiasz raz. Instrukcja krok po kroku: <code>backend/INSTRUKCJA.md</code>.</p>' +
        '<p class="cc-p small">Token chroni arkusz przed obcymi wpisami. Nie wysyłaj go nikomu; jeśli wycieknie – uruchom ponownie <code>ustawToken()</code> z nowym hasłem.</p></section></div>', "wide", ["CENTRUM DOWODZENIA · ŁĄCZE", "KX7-LINK"]);
    var u = $("#setUrl"), tk = $("#setTok"), msg = $("#setMsg");
    function pokaz(t, kl) { msg.textContent = t; msg.className = "cc-msg " + (kl || ""); }
    function zapisz() {
      var url = u.value.trim(), tok = tk.value.trim();
      if (url && !/^https?:\/\//i.test(url)) { pokaz("Adres musi zaczynać się od https://", "bad"); return false; }
      lsSet(K_URL, url); lsSet(K_TOK, tok); lista = null; listaCzas = ""; lsSet(K_CACHE, "");
      if (url && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) pokaz("Zapisano. Uwaga: adres nie wygląda jak …/macros/s/…/exec – sprawdź, czy kopiujesz URL wdrożenia (nie /dev).", "warn");
      else pokaz(url && tok ? "Zapisano." : "Zapisano (łącze niepełne – brak adresu lub tokenu).", url && tok ? "good" : "warn");
      return true;
    }
    $("#setShow").onclick = function () { var s = tk.type === "password"; tk.type = s ? "text" : "password"; this.textContent = s ? "Ukryj" : "Pokaż"; };
    $("#setSave").onclick = zapisz;
    $("#setClr").onclick = function () { u.value = ""; tk.value = ""; lsSet(K_URL, ""); lsSet(K_TOK, ""); lsSet(K_CACHE, ""); lista = null; pokaz("Wyczyszczono. Polecenia będą kopiowane do czatu.", "warn"); };
    $("#setBack").onclick = function () { polecenia(); };
    $("#setTest").onclick = function () {
      if (!zapisz()) return;
      if (!ok()) { pokaz("Uzupełnij adres i token.", "bad"); return; }
      pokaz("Łączenie…");
      zadanie("GET", { akcja: "ping" }).then(function (j) { pokaz("Połączono ✓ · czas serwera: " + (j.czas || "?"), "good"); }, function (e) { pokaz("Błąd: " + e.message, "bad"); });
    };
  }

  document.addEventListener("bm-stan", function () { if (widok === "pulpit" && B.isOpen()) pulpit(); });
  var bp = $("#btnPulpit"), bc = $("#btnPolecenia");
  if (bp) bp.onclick = pulpit;
  if (bc) bc.onclick = function () { polecenia(); };
  window.__cc = { pulpit: pulpit, polecenia: polecenia, ustawienia: ustawienia, ok: ok, pobierzListe: pobierzListe, plan: function () { var t = berlinTeraz(); return wpisyDnia(t.wd).map(function (p) { return p.g + " " + p.n; }); } };
})();
