/* Blue Mold v3 – akta załogi Rovi Here w stylu książki „Blue Mold” (Cal Rennick). Canvas 2D, bez bibliotek, działa z file:// */
(function () {
  "use strict";
  var W = 360, H = 792, SPX = 180, CORR = [130, 230, 330, 432, 550, 652];
  var BX0 = -30, BX1 = 390, BY0 = -16, BY1 = 812;
  var STAN = window.STAN || { firma: { stop: false }, dzialy: {} };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var SET = { snd: lsGet("bm-snd") === "1", crt: lsGet("bm-crt") === "1" };
  var SIM = false;
  function $(s) { return document.querySelector(s); }

  // ---------- pokoje ----------
  var R = {
    most:    { n: "MOSTEK", own: "rovi", lc: "#8ff4fa", x: 108, y: 40, w: 144, h: 82, door: [180, 130], poly: [[142, 40], [218, 40], [252, 122], [108, 122]] },
    novi:    { n: "PIECZA · NOVI", own: "novi", lc: "#b7c4ff", x: 34, y: 140, w: 126, h: 82, door: [97, 230] },
    kambuz:  { n: "KAMBUZ · JEDZENIE", own: "jedzenie", lc: "#ffd29a", x: 200, y: 140, w: 126, h: 82, door: [263, 230] },
    pomysly: { n: "LAB POMYSŁÓW", own: "pomysly", lc: "#7df0c8", x: 16, y: 240, w: 116, h: 82, door: [74, 330] },
    wezel:   { n: "WĘZEŁ", own: "mostek", lc: "#5CE6F2", x: 140, y: 240, w: 80, h: 82, door: [180, 330] },
    prof:    { n: "LAB PROFESORA", own: "prof", lc: "#8fd3ff", x: 228, y: 240, w: 116, h: 82, door: [286, 330] },
    tiktok:  { n: "TIKTOK", own: "tiktok", lc: "#ff7f9e", x: 16, y: 340, w: 104, h: 84, door: [68, 432] },
    x:       { n: "X", own: "x", lc: "#d6eef4", x: 128, y: 340, w: 104, h: 84, door: [180, 432] },
    yt:      { n: "YOUTUBE", own: "yt", lc: "#ff6b5c", x: 240, y: 340, w: 104, h: 84, door: [292, 432] },
    ksiazka: { n: "ARCHIWUM · KSIĄŻKA", own: "ksiazka", lc: "#a9bcff", x: 16, y: 442, w: 140, h: 100, door: [86, 550] },
    mesa:    { n: "MESA · ODPOCZYNEK", own: null, lc: "#ffd9a6", x: 164, y: 442, w: 180, h: 100, door: [254, 550] },
    suno:    { n: "STUDIO SUNO", own: "suno", lc: "#ffb27a", x: 16, y: 560, w: 130, h: 84, door: [81, 652] },
    studio:  { n: "WARSZTAT · STUDIO", own: "studio", lc: "#5CE6F2", x: 154, y: 560, w: 190, h: 84, door: [249, 652] },
    reaktor: { n: "REAKTOR · RDZEŃ", own: "mostek", lc: "#7ff3ff", x: 110, y: 662, w: 140, h: 88, door: [180, 652] }
  };
  var MESA_SEATS = [[204, 474], [236, 474], [268, 474], [300, 474], [204, 526], [236, 526], [268, 526], [300, 526], [331, 482], [331, 518], [184, 500]];
  var ERRANDS = { prof: ["ksiazka", "yt", "pomysly", "wezel"], pomysly: ["most", "wezel", "prof", "kambuz"], mostek: ["reaktor", "wezel", "mesa", "studio", "novi"], novi: ["most", "wezel", "mesa", "studio", "pomysly"] };
  var STROLL = [[322, 456], [206, 738], [60, 462], [180, 285], [300, 456], [250, 612]];
  var ROOM_TXT = { most: "Mostek dowodzenia", novi: "Piecza – stanowisko nadzoru", kambuz: "Kambuz – kuchnia pokładowa", pomysly: "Laboratorium pomysłów", wezel: "Węzeł łączności", prof: "Laboratorium Profesora", tiktok: "Stacja TikTok", x: "Stacja X", yt: "Stacja YouTube", ksiazka: "Archiwum „Błękitnej Pleśni”", mesa: "Mesa i odpoczynek", suno: "Studio Suno", studio: "Warsztat i studio", reaktor: "Reaktor" };

  function inRoom(p) {
    for (var k in R) { var r = R[k]; if (p.x >= r.x - 1 && p.x <= r.x + r.w + 1 && p.y >= r.y - 1 && p.y <= r.y + r.h + 1) return r; }
    return null;
  }
  function roomKey(p) { for (var k in R) { var r = R[k]; if (p.x >= r.x - 1 && p.x <= r.x + r.w + 1 && p.y >= r.y - 1 && p.y <= r.y + r.h + 1) return k; } return null; }
  function station(id) { if (id === "most") return { x: 180, y: 104 }; if (id === "reaktor") return { x: 214, y: 736 }; var r = R[id]; return { x: r.x + r.w * 0.5, y: r.y + r.h * 0.7 }; }
  function stationFor(c) { return c.id === "mostek" ? { x: 124, y: 116 } : station(c.d.pokoj); }

  // ---------- postacie ----------
  var byId = {}, chars = window.ZALOGA.map(function (d, i) {
    var c = { id: d.id, d: d, n: i + 1, x: 0, y: 0, path: [], face: 1, walkT: 0, sleeping: false, bubble: null, scene: null, task: null, hl: 0, nextSleepCheck: 0, ph: Math.random() * 6, blinkAt: Math.random() * 4, emote: null };
    byId[d.id] = c; return c;
  });
  function status(id) { if (SIM) return "aktywny"; var s = STAN.dzialy && STAN.dzialy[id]; return s ? s.status : (STAN.firma && STAN.firma.stop ? "pauza" : "aktywny"); }
  function active(id) { var s = status(id); return s === "aktywny" || s === "na prośbę"; }
  function stopped() { return !SIM && STAN.firma && STAN.firma.stop; }
  function assignHomes() {
    var seat = 0;
    chars.forEach(function (c) {
      if (active(c.id)) c.home = stationFor(c);
      else if (c.d.pauzaPokoj) c.home = station(c.d.pauzaPokoj);
      else { var s = MESA_SEATS[seat++ % MESA_SEATS.length]; c.home = { x: s[0], y: s[1] }; }
    });
  }
  assignHomes();
  chars.forEach(function (c) { c.x = c.home.x; c.y = c.home.y; });
  function atHome(c) { return Math.abs(c.x - c.home.x) < 2 && Math.abs(c.y - c.home.y) < 2; }

  function nearestCorr(y) { var b = CORR[0]; CORR.forEach(function (cy) { if (Math.abs(cy - y) < Math.abs(b - y)) b = cy; }); return b; }
  function route(c, to) {
    var from = { x: c.x, y: c.y }, rf = inRoom(from), rt = inRoom(to), pts = [];
    if (rf && rf === rt) { c.path = [to]; return; }
    var d2 = rt ? rt.door : [to.x, nearestCorr(to.y)], y1;
    if (rf) { pts.push([rf.door[0], rf.door[1]]); y1 = rf.door[1]; }
    else { y1 = Math.abs(from.x - SPX) < 3 ? from.y : nearestCorr(from.y); pts.push([from.x, y1]); }
    if (Math.abs(y1 - d2[1]) > 1) { pts.push([SPX, y1]); pts.push([SPX, d2[1]]); }
    pts.push([d2[0], d2[1]]); pts.push([to.x, to.y]);
    c.path = pts.map(function (p) { return { x: p[0], y: p[1] }; });
  }
  function goHome(c) { c.task = null; route(c, c.home); }

  // ---------- czas ----------
  function berlin() {
    try { return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Berlin" }).format(new Date()); }
    catch (e) { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  }
  function isNight() { var h = parseInt(berlin().slice(0, 2), 10); return h >= 22 || h < 6; }
  var night = isNight();

  // ---------- narzędzia rysunku ----------
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function box(c, x, y, w, h, r, f, s, lw) { rr(c, x, y, w, h, r); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw || .6; c.stroke(); } }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }
  function shade(h, f) { var n = parseInt(h.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; function m(v) { return Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); } return "rgb(" + m(r) + "," + m(g) + "," + m(b) + ")"; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; }
  function mk(w, h) { var o = document.createElement("canvas"); o.width = Math.max(1, Math.round(w)); o.height = Math.max(1, Math.round(h)); return o; }
  var glowCache = {};
  function glow(col) {
    if (glowCache[col]) return glowCache[col];
    var o = mk(64, 64), g = o.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, hexA(col, 1)); gr.addColorStop(.25, hexA(col, .45)); gr.addColorStop(.6, hexA(col, .12)); gr.addColorStop(1, hexA(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (glowCache[col] = o);
  }
  var shadowS = (function () { var o = mk(64, 24), g = o.getContext("2d"), gr = g.createRadialGradient(32, 12, 0, 32, 12, 30); gr.addColorStop(0, "rgba(0,0,0,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.setTransform(1, 0, 0, .4, 0, 7.2); g.fillStyle = gr; g.beginPath(); g.arc(32, 12, 30, 0, 7); g.fill(); return o; })();
  function lightLevel(k) {
    if (k === "mesa") return 1;
    var r = R[k]; if (!r) return 1;
    if (k === "most") return active("rovi") || active("mostek") ? 1 : .6;
    if (k === "reaktor") return active("mostek") ? 1 : .7;
    return active(r.own) ? 1 : .12;
  }
  function flick(k, t) {
    var h = hash(k), v = .93 + .07 * Math.sin(t * 2.3 + h);
    if (Math.sin(t * 1.7 + h) * Math.sin(t * 2.9 + h * 2) > .9) v *= .55;
    if (k === "tiktok" && Math.sin(t * 13) > .6 && Math.sin(t * .7) > .2) v *= .4; // stara świetlówka
    return v;
  }

  // ---------- canvas + kamera ----------
  var cv = $("#cv"), ctx = cv.getContext("2d"), stage = $("#stage");
  var dpr = 1, sw = 1, sh = 1, S0 = 1, bs = 0;
  var cam = { x: (BX0 + BX1) / 2, y: (BY0 + BY1) / 2, zoom: 1 }, camT = { x: cam.x, y: cam.y, zoom: 1 }, follow = null;
  var ZMAX = 3.6, ZMIN = 1;
  var base = null, veinsC = null, nebula = null, earthC = null;
  var LIGHTS = [], SCREENS = [], PLANTS = [], DOORS = [];
  function K() { return S0 * cam.zoom; }
  function toScreen(x, y) { var k = K(); return [(x - cam.x) * k + sw / 2, (y - cam.y) * k + sh / 2]; }
  function toWorld(sx, sy) { var k = K(); return [(sx - sw / 2) / k + cam.x, (sy - sh / 2) / k + cam.y]; }
  function clampCam(c) {
    c.zoom = Math.max(ZMIN, Math.min(ZMAX, c.zoom));
    var k = S0 * c.zoom, hw = sw / (2 * k), hh = sh / (2 * k), cx = (BX0 + BX1) / 2, cy = (BY0 + BY1) / 2;
    c.x = hw * 2 >= BX1 - BX0 ? cx : Math.max(BX0 + hw, Math.min(BX1 - hw, c.x));
    c.y = hh * 2 >= BY1 - BY0 ? cy : Math.max(BY0 + hh, Math.min(BY1 - hh, c.y));
  }
  function resize() {
    var r = stage.getBoundingClientRect(); sw = Math.max(1, r.width); sh = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
    S0 = Math.min(sw / (BX1 - BX0), sh / (BY1 - BY0));
    var nb = Math.max(2, Math.min(4.5, Math.round(S0 * dpr * 3.2 * 2) / 2));
    if (nb !== bs || !base) { bs = nb; buildStatic(); }
    buildNebula(); clampCam(camT); clampCam(cam);
  }

  // ---------- kosmos: mgławica, gwiazdy, Ziemia ----------
  var STARS = [[], [], []];
  (function () { var rnd = mulberry(11); for (var l = 0; l < 3; l++) for (var i = 0; i < [120, 70, 34][l]; i++) STARS[l].push([rnd(), rnd(), (l * .5 + .5) * (rnd() * .7 + .5), rnd() * 6, rnd() < .12]); })();
  var ART = new Image(), artOk = false;
  ART.onload = function () { artOk = true; if (sw > 1) buildNebula(); };
  ART.src = "grafika/enceladus.webp";
  function buildNebula() {
    var w = sw * 1.3, h = sh * 1.3, sc = .5; nebula = mk(w * sc * dpr, h * sc * dpr);
    var g = nebula.getContext("2d"), rnd = mulberry(5); g.scale(sc * dpr, sc * dpr);
    g.fillStyle = "#030e16"; g.fillRect(0, 0, w, h);
    if (artOk) {
      // okładkowa grafika z książki (Saturn, Enceladus, pleśń) – przy dole kadru
      var ar = ART.width / ART.height, dh = h * (sw > 700 ? .8 : .62), dw = Math.max(w, dh * ar); dh = dw / ar;
      g.globalAlpha = sw > 700 ? .78 : .62; g.drawImage(ART, (w - dw) / 2, h - dh, dw, dh); g.globalAlpha = 1;
      var fade = g.createLinearGradient(0, h - dh, 0, h - dh * .45); fade.addColorStop(0, "rgba(3,14,22,1)"); fade.addColorStop(1, "rgba(3,14,22,0)");
      g.fillStyle = fade; g.fillRect(0, h - dh - 2, w, dh * .56);
    }
    g.globalCompositeOperation = "lighter";
    var cols = ["#0b3a4a", "#0e5566", "#0b2a3a", "#0a4452"];
    for (var i = 0; i < 9; i++) {
      var x = rnd() * w, y = rnd() * h * .7, r = (.15 + rnd() * .35) * Math.max(w, h), gr = g.createRadialGradient(x, y, 0, x, y, r), col = cols[i % cols.length];
      gr.addColorStop(0, hexA(col, .16 + rnd() * .12)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    for (i = 0; i < 400; i++) { g.fillStyle = "rgba(170,230,240," + (rnd() * .25) + ")"; g.fillRect(rnd() * w, rnd() * h, 1, 1); }
    g.globalCompositeOperation = "source-over";
    // siatka raportu
    g.strokeStyle = "rgba(92,230,242,.035)"; g.lineWidth = 1;
    for (var gx = 0; gx < w; gx += 48) { g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, h); g.stroke(); }
    for (var gy = 0; gy < h; gy += 48) { g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke(); }
  }
  function drawSpace(t) {
    var k = K(), cx = (BX0 + BX1) / 2, cy = (BY0 + BY1) / 2, ox = (cam.x - cx) * k, oy = (cam.y - cy) * k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (nebula) ctx.drawImage(nebula, -sw * .15 - ox * .03, -sh * .15 - oy * .03, sw * 1.3, sh * 1.3);
    var f = [.04, .09, .18];
    for (var l = 0; l < 3; l++) {
      var L = STARS[l];
      for (var i = 0; i < L.length; i++) {
        var s = L[i], x = ((s[0] * sw - ox * f[l]) % sw + sw) % sw, y = ((s[1] * sh - oy * f[l]) % sh + sh) % sh;
        var a = .35 + .55 * Math.abs(Math.sin(t * (.4 + l * .2) + s[3]));
        ctx.fillStyle = s[4] ? "rgba(140,230,255," + a + ")" : "rgba(220,240,255," + a + ")";
        ctx.fillRect(x, y, s[2], s[2]);
      }
    }
  }

  // ---------- statek: warstwa statyczna ----------
  function hullPath(c) { c.beginPath(); c.moveTo(180, 4); c.bezierCurveTo(268, 12, 322, 52, 342, 132); c.lineTo(352, 240); c.lineTo(354, 640); c.bezierCurveTo(354, 704, 332, 752, 282, 770); c.lineTo(78, 770); c.bezierCurveTo(28, 752, 6, 704, 6, 640); c.lineTo(8, 240); c.lineTo(18, 132); c.bezierCurveTo(38, 52, 92, 12, 180, 4); c.closePath(); }
  function roomPath(c, r) { if (r.poly) { c.beginPath(); r.poly.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); } else rr(c, r.x, r.y, r.w, r.h, 2); }
  // ujednolicenie palety do stylu książki (granat + lodowy turkus)
  function grade(c) {
    c.save(); c.globalCompositeOperation = "saturation"; c.fillStyle = "rgba(128,128,128,.5)"; c.fillRect(BX0, BY0, BX1 - BX0, BY1 - BY0);
    c.globalCompositeOperation = "color"; c.fillStyle = "rgba(36,190,210,.16)"; c.fillRect(BX0, BY0, BX1 - BX0, BY1 - BY0); c.restore();
  }
  function roomFrame(c, k, r) {
    var lit = lightLevel(k) > .5, lc = r.lc;
    roomPath(c, r); c.lineWidth = 2.6; c.strokeStyle = "#030a10"; c.stroke(); c.lineWidth = .9; c.strokeStyle = hexA(lc, lit ? .8 : .28); c.stroke();
    if (lit) { c.save(); c.shadowColor = lc; c.shadowBlur = 4 * bs; c.lineWidth = .5; c.strokeStyle = hexA(lc, .45); roomPath(c, r); c.stroke(); c.restore(); }
    if (!r.poly) {
      var L = 5, o = 1.6, x0 = r.x - o, y0 = r.y - o, x1 = r.x + r.w + o, y1 = r.y + r.h + o;
      c.strokeStyle = lit ? "rgba(214,250,252,.75)" : "rgba(143,244,250,.25)"; c.lineWidth = .6; c.beginPath();
      c.moveTo(x0, y0 + L); c.lineTo(x0, y0); c.lineTo(x0 + L, y0); c.moveTo(x1 - L, y0); c.lineTo(x1, y0); c.lineTo(x1, y0 + L);
      c.moveTo(x0, y1 - L); c.lineTo(x0, y1); c.lineTo(x0 + L, y1); c.moveTo(x1 - L, y1); c.lineTo(x1, y1); c.lineTo(x1, y1 - L); c.stroke();
    }
    c.font = "600 5px Plex, monospace"; var tw = c.measureText(r.n).width, lx = r.poly ? 146 : r.x + 4, ly = r.poly ? 31 : r.y + 3;
    box(c, lx, ly, tw + 7.5, 7.4, .5, "rgba(3,14,22,.92)", hexA(lc, lit ? .55 : .22), .4);
    c.fillStyle = hexA(lc, lit ? 1 : .4); c.fillRect(lx, ly, 1.4, 7.4);
    c.fillStyle = lit ? "#d6fafc" : "rgba(143,180,190,.55)"; c.textBaseline = "middle"; c.fillText(r.n, lx + 4.2, ly + 3.9); c.textBaseline = "alphabetic";
  }
  function lamp(x, y, r, col, room, kind) { LIGHTS.push({ x: x, y: y, r: r, col: col, room: room, kind: kind || "", ph: Math.random() * 9 }); }
  function scr(c, x, y, w, h, col, kind, room) { box(c, x - .9, y - .9, w + 1.8, h + 1.8, 1.2, "#0c1622", "rgba(150,200,230,.35)", .5); c.fillStyle = "#01040a"; c.fillRect(x, y, w, h); SCREENS.push({ x: x, y: y, w: w, h: h, col: col, kind: kind, room: room, ph: Math.random() * 10 }); }
  function desk(c, x, y, w, h) { box(c, x, y, w, h, 1.4, "#1a2b3d", "rgba(140,190,220,.28)", .5); c.fillStyle = "rgba(255,255,255,.07)"; c.fillRect(x + 1, y + .5, w - 2, .7); c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(x + .5, y + h, w - 1, 1.2); }
  function chair(c, x, y, col, rot) { c.save(); c.translate(x, y); c.rotate(rot || 0); c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(0, 1.5, 4, 1.6, 0, 0, 7); c.fill(); c.fillStyle = "#1d3145"; c.beginPath(); c.arc(0, 0, 3.3, 0, 7); c.fill(); c.fillStyle = col || "#2d4a63"; c.beginPath(); c.arc(0, -2.6, 3.8, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(2.6, -1.4); c.lineTo(-2.6, -1.4); c.fill(); c.restore(); }
  function plant(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = "#2b3644"; c.beginPath(); c.moveTo(-3.4, -4); c.lineTo(3.4, -4); c.lineTo(2.4, 0); c.lineTo(-2.4, 0); c.closePath(); c.fill();
    c.fillStyle = "#3d4c5e"; c.fillRect(-3.8, -4.6, 7.6, 1.2);
    var lv = [[-4, -10, -.6], [3.5, -11, .6], [0, -13, 0], [-2, -8, -1.2], [2.5, -7.5, 1.1]];
    lv.forEach(function (l, i) { c.fillStyle = i % 2 ? "#1d5a48" : "#23705a"; c.beginPath(); c.ellipse(l[0], l[1], 1.8, 4.2, l[2], 0, 7); c.fill(); });
    c.fillStyle = "#5CE6F2"; [[-3, -11], [2.6, -12], [0, -14.5], [-1.5, -7], [3, -8]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], .7, 0, 7); c.fill(); });
    c.restore(); PLANTS.push({ x: x, y: y - 9 * s, s: s });
  }
  function crate(c, x, y, w, h, col) { box(c, x, y, w, h, 1, col || "#243546", "rgba(0,0,0,.5)", .6); c.strokeStyle = "rgba(255,255,255,.1)"; c.lineWidth = .5; c.beginPath(); c.moveTo(x + 1, y + 1); c.lineTo(x + w - 1, y + h - 1); c.moveTo(x + w - 1, y + 1); c.lineTo(x + 1, y + h - 1); c.stroke(); c.fillStyle = "rgba(255,177,74,.6)"; c.fillRect(x + 1, y + 1, 2, 1); }
  function vein(c, x, y, dir, depth, rnd) {
    if (depth <= 0) return;
    var n = 3 + Math.floor(rnd() * 3), px = x, py = y; c.lineWidth = depth * .32;
    c.beginPath(); c.moveTo(px, py);
    for (var i = 0; i < n; i++) { px += dir * (1.5 + rnd() * 3.5); py += (rnd() - .5) * 14; c.lineTo(px, py); }
    c.stroke(); c.beginPath(); c.arc(px, py, depth * .35, 0, 7); c.fill();
    if (rnd() < .8) vein(c, px, py, dir, depth - 1, rnd);
    if (rnd() < .5) vein(c, x + dir * 3, y + (rnd() - .5) * 10, dir, depth - 2, rnd);
  }

  function buildStatic() {
    LIGHTS = []; SCREENS = []; PLANTS = []; DOORS = [];
    base = mk((BX1 - BX0) * bs, (BY1 - BY0) * bs);
    var c = base.getContext("2d"); c.setTransform(bs, 0, 0, bs, -BX0 * bs, -BY0 * bs);
    drawExterior(c);
    hullPath(c); var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0b2a3a"); g.addColorStop(.5, "#081e2b"); g.addColorStop(1, "#05131d"); c.fillStyle = g; c.fill();
    c.save(); hullPath(c); c.clip();
    drawPlating(c); drawCorridors(c);
    for (var k in R) drawRoom(c, k, R[k]);
    grade(c);
    for (k in R) roomFrame(c, k, R[k]);
    if (night) { c.fillStyle = "rgba(2,6,22,.2)"; c.fillRect(BX0, BY0, BX1 - BX0, BY1 - BY0); }
    c.font = "600 4.2px Plex, monospace"; c.fillStyle = "rgba(143,244,250,.45)";
    CORR.forEach(function (y, i) { c.fillText("P-" + (i + 1), 15, y + 1.5); });
    c.restore();
    // obręcz kadłuba
    hullPath(c); c.lineWidth = 5; c.strokeStyle = "#030a10"; c.stroke(); c.lineWidth = 1.8; c.strokeStyle = "rgba(63,224,230,.9)"; c.stroke(); c.lineWidth = .6; c.strokeStyle = "rgba(214,250,252,.6)"; c.stroke();
    c.save(); c.translate(180, 396); c.scale(1.045, 1.016); c.translate(-180, -396); hullPath(c); c.setLineDash([1.5, 2.5]); c.lineWidth = .5; c.strokeStyle = "rgba(92,230,242,.32)"; c.stroke(); c.restore();
    c.font = "600 6px Plex, monospace"; c.fillStyle = "rgba(143,244,250,.7)"; c.textAlign = "center"; c.fillText("B L U E   M O L D", 180, 762);
    c.font = "500 3.6px Plex, monospace"; c.fillStyle = "rgba(143,244,250,.45)"; c.fillText("KX7-2189 · SCHEMAT POKŁADÓW", 180, 767.5); c.textAlign = "left";
    // drzwi
    for (k in R) { var r = R[k]; DOORS.push({ k: k, x: r.door[0], y: k === "reaktor" ? r.y : (r.poly ? 122 : r.y + r.h), o: 0, col: r.lc }); }
    // pleśń
    veinsC = mk((BX1 - BX0) * bs * .5, (BY1 - BY0) * bs * .5);
    var v = veinsC.getContext("2d"), vs = bs * .5; v.setTransform(vs, 0, 0, vs, -BX0 * vs, -BY0 * vs);
    v.save(); hullPath(v); v.clip();
    v.strokeStyle = "#5CE6F2"; v.fillStyle = "#BFF6FA"; v.shadowColor = "#5CE6F2"; v.shadowBlur = 5 * vs; v.lineCap = "round";
    var rnd = mulberry(7);
    [[10, 250, 1], [10, 420, 1], [8, 610, 1], [350, 300, -1], [352, 500, -1], [352, 690, -1], [60, 764, 1], [300, 766, -1], [36, 100, 1], [324, 92, -1], [160, 444, -1], [342, 560, -1]].forEach(function (s) { vein(v, s[0], s[1], s[2], 4, rnd); });
    v.restore();
  }
  function drawExterior(c) {
    for (var s = 0; s < 2; s++) {
      c.save(); if (s) { c.translate(360, 0); c.scale(-1, 1); }
      c.beginPath(); c.moveTo(10, 470); c.lineTo(-16, 540); c.lineTo(-26, 690); c.lineTo(-12, 728); c.lineTo(8, 706); c.closePath();
      var g = c.createLinearGradient(-26, 0, 10, 0); g.addColorStop(0, "#07111b"); g.addColorStop(1, "#11263a"); c.fillStyle = g; c.fill();
      c.strokeStyle = "rgba(43,179,196,.6)"; c.lineWidth = 1; c.stroke();
      c.strokeStyle = "rgba(92,230,242,.14)"; c.lineWidth = .5; for (var i = 0; i < 6; i++) { c.beginPath(); c.moveTo(8, 500 + i * 34); c.lineTo(-18, 545 + i * 30); c.stroke(); }
      box(c, -28, 600, 13, 92, 6, "#13283c", "rgba(92,230,242,.5)", .8);
      c.fillStyle = "rgba(92,230,242,.5)"; for (i = 0; i < 5; i++) c.fillRect(-25, 612 + i * 14, 7, 1.2);
      box(c, -26, 690, 9, 8, 2, "#0a1520", "rgba(191,246,250,.4)", .6);
      c.restore();
    }
    c.strokeStyle = "#6c8aa6"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(180, 6); c.lineTo(180, -10); c.moveTo(172, -3); c.lineTo(188, -3); c.moveTo(175, -7); c.lineTo(185, -7); c.stroke();
    [120, 180, 240].forEach(function (x) { var g = c.createLinearGradient(x - 12, 0, x + 12, 0); g.addColorStop(0, "#0b1622"); g.addColorStop(.5, "#2a4258"); g.addColorStop(1, "#0b1622"); box(c, x - 12, 764, 24, 14, 3, null, null); c.fillStyle = g; c.fill(); c.strokeStyle = "rgba(92,230,242,.5)"; c.lineWidth = .7; c.stroke(); });
  }
  function drawPlating(c) {
    var rnd = mulberry(21);
    for (var i = 0; i < 70; i++) { c.fillStyle = rnd() < .5 ? "rgba(255,255,255,.018)" : "rgba(0,0,0,.12)"; c.fillRect(Math.floor(rnd() * 18) * 20, Math.floor(rnd() * 40) * 20, 20 + rnd() * 20, 20); }
    c.strokeStyle = "rgba(30,127,148,.12)"; c.lineWidth = .5;
    for (var y = 0; y < H; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (var x = 0; x < W; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    c.fillStyle = "rgba(160,210,235,.12)"; for (y = 10; y < H; y += 20) for (x = 10; x < W; x += 40) c.fillRect(x + (y % 40 ? 20 : 0), y, .8, .8);
    // rury wzdłuż burt
    [[11, 140, 11, 700], [349, 140, 349, 700]].forEach(function (p) { c.strokeStyle = "#1a2e42"; c.lineWidth = 3; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.stroke(); c.strokeStyle = "rgba(92,230,242,.25)"; c.lineWidth = .6; c.stroke(); });
  }
  function drawCorridors(c) {
    c.fillStyle = "#091521";
    CORR.forEach(function (y) { c.fillRect(12, y - 5.5, W - 24, 11); });
    c.fillRect(SPX - 6.5, 122, 13, 538);
    c.strokeStyle = "rgba(92,230,242,.28)"; c.lineWidth = .6;
    CORR.forEach(function (y) { c.beginPath(); c.moveTo(12, y - 5.5); c.lineTo(W - 12, y - 5.5); c.moveTo(12, y + 5.5); c.lineTo(W - 12, y + 5.5); c.stroke(); });
    c.beginPath(); c.moveTo(SPX - 6.5, 122); c.lineTo(SPX - 6.5, 660); c.moveTo(SPX + 6.5, 122); c.lineTo(SPX + 6.5, 660); c.stroke();
    c.fillStyle = "rgba(92,230,242,.35)";
    CORR.forEach(function (y) { for (var x = 16; x < W - 12; x += 8) c.fillRect(x, y - .4, 3, .8); });
    for (var y = 126; y < 658; y += 8) c.fillRect(SPX - .4, y, .8, 3);
    c.fillStyle = "rgba(235,125,105,.45)"; CORR.forEach(function (y) { for (var x = 20; x < W - 12; x += 24) { c.fillRect(x, y - 5, 1, 1); c.fillRect(x, y + 4, 1, 1); } });
  }

  function drawRoom(c, k, r) {
    var lvl = lightLevel(k), lit = lvl > .5, lc = r.lc;
    c.save(); roomPath(c, r);
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    var fg = c.createRadialGradient(cx, cy, 2, cx, cy, Math.max(r.w, r.h) * .75);
    fg.addColorStop(0, lit ? shade("#12283a", .05) : "#0b1723"); fg.addColorStop(1, lit ? "#0c1b29" : "#08121c");
    c.fillStyle = fg; c.fill(); c.clip();
    c.fillStyle = hexA(lc, lit ? .07 : .02); c.fillRect(r.x, r.y, r.w, r.h);
    c.strokeStyle = hexA(lc, lit ? .07 : .035); c.lineWidth = .4;
    for (var gx = r.x; gx < r.x + r.w; gx += 8) { c.beginPath(); c.moveTo(gx, r.y); c.lineTo(gx, r.y + r.h); c.stroke(); }
    for (var gy = r.y; gy < r.y + r.h; gy += 8) { c.beginPath(); c.moveTo(r.x, gy); c.lineTo(r.x + r.w, gy); c.stroke(); }
    var rnd = mulberry(hash(k));
    switch (k) {
      case "most":
        box(c, 144, 43, 72, 20, 4, "#010309", "rgba(127,216,255,.6)", .8);
        c.fillStyle = "#fff"; for (var i = 0; i < 26; i++) c.fillRect(146 + rnd() * 68, 45 + rnd() * 16, rnd() < .2 ? 1 : .6, rnd() < .2 ? 1 : .6);
        var eg = c.createRadialGradient(196, 58, 1, 200, 64, 13); eg.addColorStop(0, "#8fdcff"); eg.addColorStop(.7, "#1d5ea0"); eg.addColorStop(1, "#0a2244"); c.fillStyle = eg; c.beginPath(); c.arc(200, 66, 12, Math.PI, 0); c.fill();
        c.strokeStyle = "rgba(120,200,255,.6)"; c.lineWidth = .8; c.beginPath(); c.arc(200, 66, 12.6, Math.PI, 0); c.stroke();
        c.strokeStyle = "#1a2a3a"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(168, 43); c.lineTo(168, 63); c.moveTo(192, 43); c.lineTo(192, 63); c.stroke();
        desk(c, 128, 68, 104, 8); [134, 154, 192, 212].forEach(function (x) { scr(c, x, 69.2, 14, 4.6, lc, "bars", k); });
        desk(c, 112, 98, 18, 12); scr(c, 114, 100, 14, 6, lc, "graph", k); chair(c, 121, 116, "#2d4a63", 0);
        desk(c, 230, 98, 18, 12); scr(c, 232, 100, 14, 6, lc, "text", k); chair(c, 239, 116, "#2d4a63", 0);
        c.fillStyle = "#1d3145"; c.beginPath(); c.arc(180, 92, 9, 0, 7); c.fill(); c.strokeStyle = hexA(lc, .5); c.lineWidth = .6; c.stroke();
        chair(c, 180, 106, "#3a2a2a", 0);
        lamp(180, 80, 70, lc, k); lamp(200, 56, 30, "#5fb6ff", k, "window");
        break;
      case "novi":
        scr(c, 42, 147, 28, 11, lc, "graph", k); scr(c, 76, 145, 42, 14, lc, "eye", k); scr(c, 124, 147, 28, 11, lc, "text", k);
        desk(c, 44, 165, 106, 6); chair(c, 97, 194, "#3b2d5a"); plant(c, 150, 216, 1); plant(c, 44, 216, .8);
        box(c, 132, 192, 18, 12, 2, "#1a2b3d", "rgba(177,140,255,.35)"); c.fillStyle = hexA(lc, .6); c.fillRect(135, 195, 12, 1); c.fillRect(135, 198, 8, 1);
        lamp(97, 178, 60, lc, k); break;
      case "kambuz":
        box(c, 206, 145, 112, 14, 1.5, "#1a2b3d", "rgba(255,210,154,.35)", .5);
        for (i = 0; i < 6; i++) { box(c, 208 + i * 18.4, 146.5, 16, 5, .8, "#22384d", "rgba(255,255,255,.08)", .4); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(214 + i * 18.4, 149, 4, .6); }
        [[230, 155.5], [244, 155.5]].forEach(function (p) { c.strokeStyle = "rgba(255,120,90,.55)"; c.lineWidth = .7; c.beginPath(); c.arc(p[0], p[1], 3.2, 0, 7); c.stroke(); });
        box(c, 226.5, 150.5, 7, 4, 1, "#9fb2c4", null); box(c, 240.5, 150, 8, 4.6, 1.4, "#c7d3de", null); c.fillStyle = "#6c7f92"; c.fillRect(239.5, 151, 1.2, .8); c.fillRect(248, 151, 1.2, .8);
        box(c, 296, 163, 24, 32, 2, "#d7e2ea", "rgba(0,0,0,.4)", .5); c.fillStyle = "#9fb2c4"; c.fillRect(298, 177, 20, .6); c.fillRect(316, 167, .8, 6); c.fillRect(316, 181, .8, 8);
        desk(c, 250, 184, 30, 14); chair(c, 245, 190, "#3b4f63", -1.57); chair(c, 285, 190, "#3b4f63", 1.57);
        c.fillStyle = "#e8eef3"; c.beginPath(); c.arc(260, 190, 2.4, 0, 7); c.arc(271, 192, 2.2, 0, 7); c.fill(); c.fillStyle = "#e9b872"; c.beginPath(); c.arc(260, 190, 1.3, 0, 7); c.fill(); c.fillStyle = "#7df0c8"; c.beginPath(); c.arc(271, 192, 1.1, 0, 7); c.fill();
        plant(c, 208, 216, .9); crate(c, 212, 196, 14, 11, "#2c3e30");
        lamp(258, 176, 56, lc, k); break;
      case "pomysly":
        box(c, 21, 245, 54, 18, 1.5, "#2a2416", "rgba(125,255,176,.4)");
        for (i = 0; i < 9; i++) { c.fillStyle = ["#ffe066", "#7dffb0", "#ff8fb1", "#8fd3ff"][i % 4]; c.save(); c.translate(25 + (i % 5) * 9.5, 248 + Math.floor(i / 5) * 7); c.rotate((rnd() - .5) * .3); c.fillRect(0, 0, 6, 5); c.restore(); }
        c.strokeStyle = "rgba(255,90,90,.6)"; c.lineWidth = .4; c.beginPath(); c.moveTo(28, 250); c.lineTo(47, 257); c.lineTo(66, 250); c.stroke();
        desk(c, 80, 249, 46, 9); scr(c, 84, 250.5, 14, 5, lc, "bars", k);
        [[104, 252, "#ffe066"], [110, 253, "#7dffb0"], [117, 252, "#ff8a3d"]].forEach(function (p) { c.fillStyle = p[2]; c.beginPath(); c.arc(p[0], p[1], 1.6, 0, 7); c.fill(); });
        box(c, 94, 284, 12, 4, 2, "#1d3145", hexA(lc, .5)); plant(c, 24, 318, .9); crate(c, 110, 302, 16, 12); crate(c, 114, 292, 10, 9, "#2c3e30");
        lamp(74, 284, 60, lc, k); break;
      case "wezel":
        c.fillStyle = "#0f2638"; c.beginPath(); c.arc(180, 274, 16, 0, 7); c.fill(); c.strokeStyle = hexA(lc, .7); c.lineWidth = 1; c.stroke();
        c.strokeStyle = hexA(lc, .25); c.beginPath(); c.arc(180, 274, 11, 0, 7); c.stroke();
        scr(c, 145, 246, 22, 8, lc, "text", k); scr(c, 193, 246, 22, 8, lc, "bars", k);
        chair(c, 160, 300, "#1d4a55", -.4); chair(c, 200, 300, "#1d4a55", .4);
        lamp(180, 274, 50, lc, k); break;
      case "prof":
        box(c, 233, 245, 58, 18, 1.5, "#12261e", "rgba(143,211,255,.4)");
        c.font = "500 4.4px Plex, monospace"; c.fillStyle = "rgba(230,240,235,.8)"; c.fillText("E = mc²", 237, 252); c.fillText("Słońce: 8,3 kpc", 237, 259);
        c.strokeStyle = "rgba(230,240,235,.6)"; c.lineWidth = .4; c.beginPath(); c.moveTo(268, 258); c.quadraticCurveTo(276, 248, 286, 256); c.stroke();
        box(c, 296, 246, 26, 7, 1, "#1a2b3d", "rgba(140,190,220,.3)"); ["#4fd18b", "#ff8a3d", "#8fd3ff", "#b18cff"].forEach(function (cc, j) { c.fillStyle = cc; c.beginPath(); c.moveTo(299 + j * 6, 246); c.lineTo(302 + j * 6, 246); c.lineTo(303.5 + j * 6, 251); c.lineTo(297.5 + j * 6, 251); c.fill(); });
        c.strokeStyle = "#7f8fa3"; c.lineWidth = .7; c.beginPath(); c.moveTo(332, 286); c.lineTo(328, 296); c.moveTo(332, 286); c.lineTo(336, 296); c.moveTo(332, 286); c.lineTo(332, 297); c.stroke();
        c.save(); c.translate(332, 284); c.rotate(-.8); box(c, -2, -9, 4, 14, 1.5, "#cfd8e3", null); c.fillStyle = "#8fd3ff"; c.fillRect(-2, -9, 4, 1.5); c.restore();
        desk(c, 238, 288, 30, 6); box(c, 300, 304, 12, 4, 2, "#1d3145", hexA(lc, .5));
        lamp(286, 284, 60, lc, k); break;
      case "tiktok":
        c.strokeStyle = "#e6edf2"; c.lineWidth = 1.6; c.beginPath(); c.arc(32, 372, 8, 0, 7); c.stroke(); c.strokeStyle = "#555"; c.lineWidth = .7; c.beginPath(); c.moveTo(32, 380); c.lineTo(28, 392); c.moveTo(32, 380); c.lineTo(36, 392); c.stroke();
        scr(c, 60, 346, 9, 15, "#ff3d7f", "video", k); scr(c, 73, 346, 9, 15, "#25f4ee", "video", k); scr(c, 86, 346, 9, 15, "#ff3d7f", "video", k); scr(c, 99, 346, 9, 15, "#25f4ee", "video", k);
        desk(c, 58, 368, 54, 6); box(c, 22, 402, 32, 13, 4, "#5a1f3a", "rgba(255,61,127,.4)"); box(c, 24, 404, 28, 5, 2, "#7a2a50", null);
        lamp(68, 386, 55, lc, k, "flicker"); lamp(32, 372, 18, "#ffffff", k); break;
      case "x":
        scr(c, 138, 345, 84, 15, lc, "stream", k); desk(c, 146, 366, 68, 6); chair(c, 165, 380, "#2a2f38"); plant(c, 222, 418, .8); plant(c, 136, 418, .7);
        lamp(180, 386, 55, lc, k); break;
      case "yt":
        scr(c, 249, 350, 22, 12, lc, "timeline", k); scr(c, 275, 347, 26, 15, lc, "video", k); scr(c, 305, 350, 22, 12, lc, "timeline", k);
        desk(c, 247, 366, 84, 6); crate(c, 248, 404, 14, 11, "#3a1d1d"); c.strokeStyle = "#8a8a8a"; c.lineWidth = .6; c.beginPath(); c.arc(255, 403, 4, 0, 7); c.stroke();
        box(c, 314, 405, 24, 8, 1.5, "#1a0c0c", "rgba(255,77,66,.5)"); c.font = "700 4.2px Plex, monospace"; c.fillStyle = "rgba(255,120,110,.5)"; c.fillText("ON AIR", 317.5, 410.6);
        lamp(292, 386, 55, lc, k); break;
      case "ksiazka":
        var cols = ["#3b5bdb", "#a5b4fc", "#7c2d12", "#1E7F94", "#f2f4f7", "#4c1d95", "#14532d", "#92400e"];
        for (var s2 = 0; s2 < 3; s2++) {
          c.fillStyle = "#2a1f18"; c.fillRect(20, 458 + s2 * 13, 132, 1.6);
          for (var x = 21; x < 150;) { var bw = 2.6 + rnd() * 2.4, bh = 8 + rnd() * 3; c.fillStyle = cols[Math.floor(rnd() * cols.length)]; c.fillRect(x, 458 + s2 * 13 - bh, bw, bh); c.fillStyle = "rgba(255,255,255,.15)"; c.fillRect(x + .5, 458 + s2 * 13 - bh + 1.5, bw - 1, .5); x += bw + .4; }
        }
        desk(c, 46, 503, 44, 9); c.fillStyle = "#f5e6c8"; c.fillRect(56, 505, 10, 5); c.fillStyle = "#e9dcbc"; c.fillRect(66, 505, 10, 5);
        box(c, 118, 512, 22, 18, 5, "#3a2a5a", "rgba(142,162,255,.4)");
        c.fillStyle = "#1d2c3c"; c.fillRect(138, 494, 8, 10); c.fillStyle = "#0d1b2a"; c.fillRect(135, 491, 14, 4); c.fillStyle = "#BFF6FA"; c.fillRect(136, 489, 6, 2.6); c.fillRect(142.4, 489, 6, 2.6);
        plant(c, 24, 536, .9); lamp(68, 500, 60, lc, k); lamp(142, 490, 22, "#5CE6F2", k, "tome"); break;
      case "mesa":
        box(c, 300, 445, 40, 11, 3, "#010309", "rgba(255,191,115,.5)"); c.fillStyle = "#fff"; for (i = 0; i < 9; i++) c.fillRect(302 + rnd() * 36, 447 + rnd() * 7, .7, .7);
        MESA_SEATS.slice(0, 8).forEach(function (p, j) { chair(c, p[0], p[1] + (j < 4 ? -1 : 1), "#5a3d1a", j < 4 ? 0 : Math.PI); });
        box(c, 194, 484, 120, 30, 6, "#1d3348", "rgba(255,191,115,.45)", .8); box(c, 198, 488, 112, 22, 4, "#22405a", null);
        for (i = 0; i < 6; i++) { c.fillStyle = "#cfd8e3"; c.beginPath(); c.arc(206 + i * 19, 492 + (i % 2) * 14, 2.2, 0, 7); c.fill(); c.fillStyle = ["#ff8a3d", "#4fd18b", "#ffd84a"][i % 3]; c.beginPath(); c.arc(206 + i * 19, 492 + (i % 2) * 14, 1.2, 0, 7); c.fill(); }
        box(c, 322, 466, 18, 64, 5, "#4a3018", "rgba(255,191,115,.4)"); box(c, 324, 468, 6, 60, 3, "#5e3c1e", null);
        box(c, 168, 446, 22, 14, 2, "#1a2b3d", "rgba(255,191,115,.4)"); scr(c, 171, 448, 8, 5, lc, "bars", k); box(c, 194, 446, 10, 11, 2, "#2a3644", null); c.fillStyle = "#ff6b5c"; c.fillRect(197, 449, 1.4, 1.4);
        plant(c, 172, 538, 1); plant(c, 314, 538, .8); plant(c, 210, 456, .7);
        lamp(230, 499, 46, lc, k, "beam"); lamp(282, 499, 46, lc, k, "beam"); break;
      case "suno":
        for (i = 0; i < 14; i++) { c.fillStyle = i % 2 ? "#1a1420" : "#221a28"; c.beginPath(); c.moveTo(18 + i * 9, 644); c.lineTo(22.5 + i * 9, 638); c.lineTo(27 + i * 9, 644); c.fill(); }
        box(c, 19, 566, 17, 28, 2, "#141414", "rgba(255,138,61,.4)"); box(c, 126, 566, 17, 28, 2, "#141414", "rgba(255,138,61,.4)");
        [[27.5, 574], [27.5, 586], [134.5, 574], [134.5, 586]].forEach(function (p, j) { c.fillStyle = "#0a0a0a"; c.beginPath(); c.arc(p[0], p[1], j % 2 ? 4.8 : 3, 0, 7); c.fill(); c.strokeStyle = "#333"; c.lineWidth = .5; c.stroke(); });
        desk(c, 44, 578, 74, 11); for (i = 0; i < 14; i++) { c.fillStyle = "#0a0a0a"; c.fillRect(48 + i * 5, 580, 1, 7); c.fillStyle = i % 3 ? "#cfd8e3" : "#ff8a3d"; c.fillRect(47.4 + i * 5, 581 + rnd() * 4, 2.2, 1.2); }
        scr(c, 54, 566, 54, 9, lc, "wave", k);
        c.strokeStyle = "#888"; c.lineWidth = .7; c.beginPath(); c.moveTo(104, 618); c.lineTo(104, 604); c.lineTo(99, 600); c.stroke(); c.fillStyle = "#222"; c.beginPath(); c.arc(98.5, 599.5, 1.8, 0, 7); c.fill();
        lamp(81, 600, 60, lc, k); break;
      case "studio":
        scr(c, 162, 566, 26, 13, lc, "video", k); scr(c, 192, 566, 26, 13, "#ff3b30", "graph", k);
        desk(c, 158, 596, 44, 10); c.strokeStyle = "#cfd8e3"; c.lineWidth = .6; c.beginPath(); c.moveTo(164, 600); c.lineTo(172, 602); c.moveTo(178, 599); c.lineTo(180, 603); c.stroke();
        box(c, 288, 565, 32, 26, 2, "#121e2a", "rgba(92,230,242,.5)"); box(c, 291, 584, 26, 5, 1, "#1d3145", null);
        box(c, 322, 598, 18, 40, 2, "#1a2b3d", "rgba(140,190,220,.25)"); for (i = 0; i < 6; i++) { c.strokeStyle = ["#cfd8e3", "#ffb14a", "#ff6b5c"][i % 3]; c.lineWidth = .8; c.beginPath(); c.moveTo(326 + (i % 2) * 7, 603 + i * 5.5); c.lineTo(330 + (i % 2) * 7, 606 + i * 5.5); c.stroke(); }
        c.fillStyle = "#24384c"; c.beginPath(); c.arc(240, 584, 5, 0, 7); c.fill(); c.strokeStyle = "rgba(255,177,74,.6)"; c.lineWidth = .6; c.stroke();
        crate(c, 300, 624, 16, 13); crate(c, 284, 628, 13, 10, "#2c3e30"); crate(c, 160, 626, 14, 11);
        lamp(249, 606, 70, lc, k); break;
      case "reaktor":
        for (i = 0; i < 20; i++) { c.fillStyle = i % 2 ? "#3fe0e6" : "#06121b"; c.beginPath(); c.moveTo(112 + i * 7, 664); c.lineTo(119 + i * 7, 664); c.lineTo(116 + i * 7, 669); c.lineTo(109 + i * 7, 669); c.fill(); }
        c.strokeStyle = "#24384c"; c.lineWidth = 4; [[112, 700, 156, 700], [204, 700, 248, 700], [180, 724, 180, 748]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.stroke(); });
        c.strokeStyle = "rgba(92,230,242,.35)"; c.lineWidth = .8; [[112, 700, 156, 700], [204, 700, 248, 700]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.stroke(); });
        c.fillStyle = "#06121b"; c.beginPath(); c.arc(180, 700, 24, 0, 7); c.fill(); c.strokeStyle = "rgba(143,244,250,.6)"; c.lineWidth = 1.2; c.stroke();
        desk(c, 196, 722, 42, 9); scr(c, 200, 723.5, 16, 5.5, lc, "graph", k); scr(c, 219, 723.5, 15, 5.5, "#ff6b5c", "bars", k);
        lamp(180, 700, 80, lc, k, "reactor"); break;
    }
    c.restore();
  }

  // ---------- elementy dynamiczne ----------
  var PULSES = []; (function () { for (var i = 0; i < 12; i++) PULSES.push({ seg: i % 7, p: Math.random(), v: .05 + Math.random() * .08 }); })();
  function segPt(s, p) { if (s === 6) return [SPX, 124 + p * 534]; var y = CORR[s]; return [14 + p * (W - 28), y]; }
  function drawScreens(c, t) {
    for (var i = 0; i < SCREENS.length; i++) {
      var s = SCREENS[i], on = lightLevel(s.room) > .5, x = s.x, y = s.y, w = s.w, h = s.h, tt = t + s.ph;
      if (!on) { if (Math.sin(tt * 2) > 0) { c.fillStyle = "rgba(255,90,80,.7)"; c.fillRect(x + w - 2, y + 1, 1, 1); } c.fillStyle = hexA(s.col, .06); c.fillRect(x, y, w, h); continue; }
      c.fillStyle = hexA(s.col, .14); c.fillRect(x, y, w, h); c.fillStyle = hexA(s.col, .85);
      switch (s.kind) {
        case "bars": for (var j = 0; j < w - 2; j += 3) { var bh = (h - 2) * (.3 + .7 * Math.abs(Math.sin(tt * 2 + j))); c.fillRect(x + 1 + j, y + h - 1 - bh, 2, bh); } break;
        case "graph": case "eye": c.strokeStyle = hexA(s.col, .9); c.lineWidth = .5; c.beginPath(); for (j = 0; j <= w; j += 1) { var yy = y + h / 2 + Math.sin(j * .5 + tt * 3) * h * .3 * Math.sin(j * .13 + tt); j ? c.lineTo(x + j, yy) : c.moveTo(x, yy); } c.stroke(); break;
        case "text": case "stream": for (j = 0; j < Math.floor(h / 2.2); j++) { var lw = (w - 3) * (.3 + .7 * Math.abs(Math.sin(j * 7.3 + Math.floor(tt * 2)))); c.fillRect(x + 1.5, y + 1.2 + j * 2.2, lw, .9); } break;
        case "check": for (j = 0; j < 4; j++) { var done = ((Math.floor(tt / 2) % 5) > j); c.fillStyle = hexA(s.col, done ? .95 : .4); c.fillRect(x + 3, y + 2.5 + j * 3.6, 2, 2); c.fillRect(x + 7, y + 3 + j * 3.6, 30 + (j * 17 % 40), 1); } break;
        case "video": var g2 = c.createLinearGradient(x, y, x, y + h); g2.addColorStop(0, hexA(s.col, .6)); g2.addColorStop(1, "rgba(10,20,40,.6)"); c.fillStyle = g2; c.fillRect(x, y, w, h); c.fillStyle = "rgba(255,255,255,.8)"; c.fillRect(x + 1, y + h - 1.6, (w - 2) * ((tt * .1) % 1), .6); break;
        case "timeline": for (j = 0; j < 3; j++) { c.fillStyle = hexA(["#ff4d42", "#5CE6F2", "#ffd84a"][j], .8); c.fillRect(x + 1 + j * 2, y + 2 + j * 3, w - 4 - j * 3, 2); } c.fillStyle = "#fff"; c.fillRect(x + 1 + ((tt * .15) % 1) * (w - 2), y + 1, .5, h - 2); break;
        case "wave": c.strokeStyle = hexA(s.col, .95); c.lineWidth = .6; c.beginPath(); for (j = 0; j <= w; j++) { var a = Math.sin(j * .9 + tt * 8) * Math.sin(j * .07 + tt * 2) * h * .4; j ? c.lineTo(x + j, y + h / 2 + a) : c.moveTo(x, y + h / 2); } c.stroke(); break;
      }
    }
  }
  function drawHolo(c, t) {
    var a;
    // Węzeł: pierścienie + węzły załogi
    if (lightLevel("wezel") > .5 || true) {
      a = lightLevel("wezel") > .5 ? 1 : .35;
      c.save(); c.translate(180, 270); c.globalAlpha = a; c.strokeStyle = "rgba(92,230,242,.8)"; c.lineWidth = .6;
      for (var i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, -2, 12 - i * 3, 4 - i, t * (.6 + i * .3), 0, 7); c.stroke(); }
      for (i = 0; i < 8; i++) { var an = t * .5 + i * .785; c.fillStyle = i % 3 ? "#5CE6F2" : "#ffb14a"; c.fillRect(Math.cos(an) * 12 - .7, -2 + Math.sin(an) * 4 - .7, 1.4, 1.4); }
      c.restore();
    }
    // Novi: skanujące oko
    a = lightLevel("novi") > .5 ? 1 : .3; c.save(); c.globalAlpha = a; c.translate(97, 152); var sx = Math.sin(t * .9) * 6;
    c.strokeStyle = "rgba(177,140,255,.9)"; c.lineWidth = .6; c.beginPath(); c.ellipse(0, 0, 12, 4.5, 0, 0, 7); c.stroke(); c.fillStyle = "rgba(177,140,255,.9)"; c.beginPath(); c.arc(sx, 0, 2.2, 0, 7); c.fill(); c.fillStyle = "#fff"; c.fillRect(sx - .5, -.5, 1, 1); c.restore();
    // Profesor: galaktyka
    a = lightLevel("prof") > .5 ? 1 : .3; c.save(); c.globalAlpha = a; c.translate(306, 292); c.scale(1, .55); c.rotate(t * .4);
    for (i = 0; i < 70; i++) { var arm = i % 2, rr2 = 1 + i * .16, an2 = rr2 * .9 + arm * Math.PI; c.fillStyle = i % 5 ? "rgba(143,211,255,.8)" : "rgba(255,230,180,.9)"; c.fillRect(Math.cos(an2) * rr2, Math.sin(an2) * rr2, .9, .9); }
    c.fillStyle = "rgba(255,240,200,.95)"; c.beginPath(); c.arc(0, 0, 1.4, 0, 7); c.fill(); c.restore();
    c.save(); c.globalAlpha = .25 * a; c.fillStyle = "#8fd3ff"; c.beginPath(); c.moveTo(302, 304); c.lineTo(310, 304); c.lineTo(318, 288); c.lineTo(294, 288); c.fill(); c.restore();
    // Pomysły: żarówka-hologram
    a = lightLevel("pomysly") > .5 ? 1 : .3; c.save(); c.globalAlpha = a; c.translate(100, 276 + Math.sin(t * 1.6) * 1.2);
    c.strokeStyle = "rgba(125,255,176,.9)"; c.lineWidth = .6; c.beginPath(); c.arc(0, 0, 4, Math.PI * .8, Math.PI * 2.2); c.lineTo(1.6, 5); c.lineTo(-1.6, 5); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(-1.6, 6.4); c.lineTo(1.6, 6.4); c.stroke(); for (i = 0; i < 6; i++) { var aa = t + i * 1.05; c.fillStyle = "rgba(255,224,102,.8)"; c.fillRect(Math.cos(aa) * 7, Math.sin(aa) * 3 - 1, .9, .9); } c.restore();
    // Mostek: mapa orbity
    a = lightLevel("most") > .5 ? 1 : .5; c.save(); c.globalAlpha = a; c.translate(180, 90);
    c.strokeStyle = "rgba(127,216,255,.75)"; c.lineWidth = .5; c.beginPath(); c.arc(0, 0, 3, 0, 7); c.stroke(); c.beginPath(); c.ellipse(0, 0, 7.5, 3, 0, 0, 7); c.stroke();
    var oa = t * .8; c.fillStyle = "#BFF6FA"; c.fillRect(Math.cos(oa) * 7.5 - .7, Math.sin(oa) * 3 - .7, 1.4, 1.4); c.restore();
  }
  function drawMachines(c, t) {
    // reaktor
    var on = active("mostek") ? 1 : .75;
    var g = c.createRadialGradient(180, 700, 1, 180, 700, 17); g.addColorStop(0, "rgba(240,255,255," + on + ")"); g.addColorStop(.35, "rgba(143,244,250," + (.85 * on) + ")"); g.addColorStop(.7, "rgba(36,190,210," + ((.5 + .2 * Math.sin(t * 4)) * on) + ")"); g.addColorStop(1, "rgba(36,190,210,0)");
    c.fillStyle = g; c.beginPath(); c.arc(180, 700, 17, 0, 7); c.fill();
    c.lineWidth = 1; for (var i = 0; i < 3; i++) { c.strokeStyle = i === 1 ? "rgba(214,250,252,.85)" : "rgba(63,224,230,.7)"; var r = 19 + i * 3.2, a0 = t * (1.2 - i * .5) * (i % 2 ? -1 : 1); c.beginPath(); c.arc(180, 700, r, a0, a0 + 1.9); c.stroke(); c.beginPath(); c.arc(180, 700, r, a0 + 3.14, a0 + 4.4); c.stroke(); }
    if (Math.sin(t * 7) > .8) { c.strokeStyle = "rgba(191,246,250,.9)"; c.lineWidth = .5; c.beginPath(); var an = t * 3; c.moveTo(180 + Math.cos(an) * 8, 700 + Math.sin(an) * 8); for (i = 1; i < 5; i++) c.lineTo(180 + Math.cos(an + i * .2) * (8 + i * 4) + (Math.random() - .5) * 3, 700 + Math.sin(an + i * .2) * (8 + i * 4)); c.stroke(); }
    // głośniki Suno
    var sl = lightLevel("suno") > .5, beat = Math.pow(Math.max(0, Math.sin(t * (sl ? 8.4 : 2))), 6);
    [[27.5, 586], [134.5, 586]].forEach(function (p) { c.strokeStyle = "rgba(255,138,61," + (.3 + beat * .6) + ")"; c.lineWidth = .8; c.beginPath(); c.arc(p[0], p[1], 3 + beat * 1.4, 0, 7); c.stroke(); });
    // drukarka 3D + ramię robota
    var st = lightLevel("studio") > .5, hx = 296 + (Math.sin(t * (st ? 2.2 : .4)) * .5 + .5) * 16;
    c.fillStyle = "#cfd8e3"; c.fillRect(290, 573, 28, .8); c.fillStyle = "#ffb14a"; c.fillRect(hx, 572, 4, 3);
    c.fillStyle = hexA("#5CE6F2", .7); c.fillRect(298, 584 - (st ? (t * .6) % 6 : 2), 12, (st ? (t * .6) % 6 : 2));
    var a1 = -1.2 + Math.sin(t * (st ? 1.4 : .3)) * .5, a2 = a1 + 1.4 + Math.sin(t * (st ? 2.1 : .4)) * .5, ex = 240 + Math.cos(a1) * 9, ey = 584 + Math.sin(a1) * 9, tx = ex + Math.cos(a2) * 8, ty = ey + Math.sin(a2) * 8;
    c.strokeStyle = "#8aa0b6"; c.lineWidth = 2; c.lineCap = "round"; c.beginPath(); c.moveTo(240, 584); c.lineTo(ex, ey); c.lineTo(tx, ty); c.stroke(); c.lineCap = "butt";
    c.fillStyle = "#ffb14a"; c.beginPath(); c.arc(ex, ey, 1.2, 0, 7); c.fill();
    ARM.x = tx; ARM.y = ty;
    // ON AIR
    if (lightLevel("yt") > .5) { c.fillStyle = "rgba(255,77,66," + (.6 + .4 * Math.sin(t * 3)) + ")"; c.font = "700 4.2px Plex, monospace"; c.fillText("ON AIR", 317.5, 410.6); }
    // drzwi
    for (i = 0; i < DOORS.length; i++) {
      var d = DOORS[i], near = false;
      for (var j = 0; j < chars.length; j++) { var ch = chars[j]; if (Math.abs(ch.x - d.x) < 9 && Math.abs(ch.y - d.y) < 14) { near = true; break; } }
      d.o += ((near ? 1 : 0) - d.o) * .16;
      c.fillStyle = "#03070d"; c.fillRect(d.x - 7, d.y - 1.8, 14, 3.6);
      var pw = 6.5 * (1 - d.o);
      c.fillStyle = "#2a4560"; c.fillRect(d.x - 6.5, d.y - 1.4, pw, 2.8); c.fillRect(d.x + 6.5 - pw, d.y - 1.4, pw, 2.8);
      c.fillStyle = hexA(d.col, .9); c.fillRect(d.x - 6.5 + pw - .6, d.y - 1.4, .6, 2.8); c.fillRect(d.x + 6.5 - pw, d.y - 1.4, .6, 2.8);
      c.fillStyle = d.o > .5 ? "#7df0c8" : "rgba(235,125,105,.85)"; c.fillRect(d.x - 8.6, d.y - .6, 1.2, 1.2);
    }
  }
  var ARM = { x: 248, y: 580 };
  function drawShipLights(c, t) {
    // światła nawigacyjne
    var bl = (t % 1.6) < .12;
    [[-22, 694, "#ff4d4d"], [382, 694, "#4dff88"]].forEach(function (p) { c.globalAlpha = .4 + (bl ? .6 : 0); c.drawImage(glow(p[2]), p[0] - 10, p[1] - 10, 20, 20); });
    c.globalAlpha = (t % 2.4) < .08 ? 1 : .15; c.drawImage(glow("#ffffff"), 170, -20, 20, 20);
    // silniki
    [[120, 780, 1], [180, 780, 1.2], [240, 780, 1], [-21.5, 702, .7], [381.5, 702, .7]].forEach(function (p, k) {
      var f = (16 + Math.sin(t * 23 + k) * 3 + Math.sin(t * 7 + k * 2) * 2) * p[2];
      c.globalAlpha = .9; c.drawImage(glow("#5CE6F2"), p[0] - 10 * p[2], p[1] - 4, 20 * p[2], f * 1.6);
      c.globalAlpha = .9; c.drawImage(glow("#e8fdff"), p[0] - 5 * p[2], p[1] - 3, 10 * p[2], f * .7);
    });
    c.globalAlpha = 1;
  }
  function drawLights(c, t) {
    for (var i = 0; i < LIGHTS.length; i++) {
      var L = LIGHTS[i], lv = lightLevel(L.room) * flick(L.room, t + L.ph);
      if (L.kind === "reactor") lv = (active("mostek") ? 1 : .75) * (.85 + .15 * Math.sin(t * 4));
      if (L.kind === "tome") lv = .6 + .4 * Math.sin(t * 1.5);
      var a = L.kind === "window" ? .25 : .2;
      c.globalAlpha = Math.min(1, a * lv); c.drawImage(glow(L.col), L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      if (L.kind === "beam" && lv > .5) {
        var g = c.createLinearGradient(L.x, L.y - 40, L.x, L.y + 18); g.addColorStop(0, hexA(L.col, .0)); g.addColorStop(.6, hexA(L.col, .12)); g.addColorStop(1, hexA(L.col, 0));
        c.globalAlpha = lv; c.fillStyle = g; c.beginPath(); c.moveTo(L.x - 3, L.y - 44); c.lineTo(L.x + 3, L.y - 44); c.lineTo(L.x + 18, L.y + 16); c.lineTo(L.x - 18, L.y + 16); c.fill();
      }
    }
    // promień z okna mostka
    var gb = c.createLinearGradient(0, 60, 0, 125); gb.addColorStop(0, "rgba(120,200,255,.16)"); gb.addColorStop(1, "rgba(120,200,255,0)");
    c.globalAlpha = 1; c.fillStyle = gb; c.beginPath(); c.moveTo(146, 62); c.lineTo(214, 62); c.lineTo(236, 122); c.lineTo(124, 122); c.fill();
    // ekrany
    for (i = 0; i < SCREENS.length; i++) { var s = SCREENS[i]; if (lightLevel(s.room) > .5) { c.globalAlpha = .18; c.drawImage(glow(s.col), s.x - 4, s.y - 4, s.w + 8, s.h + 10); } }
    // pleśń w doniczkach
    for (i = 0; i < PLANTS.length; i++) { var p = PLANTS[i]; c.globalAlpha = .35 + .2 * Math.sin(t * 1.3 + i); c.drawImage(glow("#5CE6F2"), p.x - 9 * p.s, p.y - 9 * p.s, 18 * p.s, 18 * p.s); }
    // impulsy w podłodze korytarzy
    for (i = 0; i < PULSES.length; i++) {
      var P = PULSES[i]; P.p += P.v * DT; if (P.p > 1) { P.p = 0; P.seg = Math.floor(Math.random() * 7); }
      var q = segPt(P.seg, P.p); c.globalAlpha = .55 * Math.sin(P.p * Math.PI); c.drawImage(glow("#5CE6F2"), q[0] - 6, q[1] - 6, 12, 12);
    }
    c.globalAlpha = 1;
  }

  // ---------- cząsteczki ----------
  var PARTS = [], EMIT = {}, DT = .016;
  function spawn(p) { if (PARTS.length < 260) PARTS.push(p); }
  function emit(key, rate, fn) { EMIT[key] = (EMIT[key] || 0) + rate * DT; while (EMIT[key] >= 1) { EMIT[key] -= 1; fn(); } }
  function stepParticles(t) {
    var lvS = lightLevel("studio") > .5, lvU = lightLevel("suno") > .5, lvK = lightLevel("ksiazka") > .5;
    emit("spore", 7, function () { var e = Math.random() < .5 ? [12 + Math.random() * 20, 140 + Math.random() * 600] : [328 + Math.random() * 20, 140 + Math.random() * 600]; spawn({ t: "spore", x: e[0], y: e[1], vx: (Math.random() - .5) * 2, vy: -1 - Math.random() * 2, life: 0, max: 5 + Math.random() * 3 }); });
    emit("spark", lvS ? 14 : 1.2, function () { spawn({ t: "spark", x: ARM.x, y: ARM.y, vx: (Math.random() - .5) * 30, vy: -10 - Math.random() * 18, life: 0, max: .4 + Math.random() * .4 }); });
    emit("note", lvU ? 1.6 : .45, function () { var s = Math.random() < .5 ? 27 : 134; spawn({ t: "note", x: s, y: 572, vx: (Math.random() - .5) * 4, vy: -6 - Math.random() * 4, life: 0, max: 3, col: Math.random() < .5 ? "#ff8a3d" : "#5CE6F2" }); });
    emit("page", lvK ? 1 : .35, function () { spawn({ t: "page", x: 24 + Math.random() * 120, y: 450 + Math.random() * 24, vx: 3 + Math.random() * 4, vy: 2 + Math.random() * 3, life: 0, max: 4, r: Math.random() * 6 }); });
    ["tiktok", "x", "yt"].forEach(function (k) { var r = R[k]; emit("data" + k, lightLevel(k) > .5 ? 4 : .4, function () { spawn({ t: "data", x: r.x + 14 + Math.random() * (r.w - 28), y: r.y + 22, vx: 0, vy: -8 - Math.random() * 6, life: 0, max: 1.4, col: r.lc }); }); });
    emit("steam", .9, function () { spawn({ t: "steam", x: 199, y: 447, vx: (Math.random() - .5) * 2, vy: -4, life: 0, max: 1.6 }); });
    for (var i = PARTS.length - 1; i >= 0; i--) {
      var p = PARTS[i]; p.life += DT; if (p.life > p.max) { PARTS.splice(i, 1); continue; }
      if (p.t === "spark") p.vy += 60 * DT;
      if (p.t === "note") p.vx = Math.sin(p.life * 4) * 5;
      if (p.t === "page") { p.vy = 2 + Math.sin(p.life * 3 + p.r) * 4; p.r += DT * 3; }
      p.x += p.vx * DT; p.y += p.vy * DT;
    }
  }
  function drawParticles(c, t) {
    for (var i = 0; i < PARTS.length; i++) {
      var p = PARTS[i], k = p.life / p.max, a = Math.sin(k * Math.PI);
      switch (p.t) {
        case "spore": c.globalAlpha = a * .7; c.fillStyle = "#7ff0fa"; c.fillRect(p.x, p.y, .9, .9); break;
        case "spark": c.globalAlpha = 1 - k; c.fillStyle = k < .3 ? "#fff6c8" : "#ffb14a"; c.fillRect(p.x, p.y, .9, .9); break;
        case "note": c.globalAlpha = a; c.fillStyle = p.col; c.strokeStyle = p.col; c.lineWidth = .5; c.beginPath(); c.ellipse(p.x, p.y, 1.3, 1, -.4, 0, 7); c.fill(); c.beginPath(); c.moveTo(p.x + 1.1, p.y); c.lineTo(p.x + 1.1, p.y - 4); c.lineTo(p.x + 3, p.y - 3); c.stroke(); break;
        case "page": c.globalAlpha = a * .9; c.save(); c.translate(p.x, p.y); c.scale(Math.cos(p.r), 1); c.fillStyle = "#f5e6c8"; c.fillRect(-1.5, -1, 3, 2); c.restore(); break;
        case "data": c.globalAlpha = a * .8; c.fillStyle = p.col; c.fillRect(p.x, p.y, .7, 2.2); break;
        case "steam": c.globalAlpha = a * .25; c.fillStyle = "#cfe8f0"; c.beginPath(); c.arc(p.x, p.y, 1 + k * 3, 0, 7); c.fill(); break;
      }
    }
    c.globalAlpha = 1;
  }

  // ---------- postacie: sprite'y ----------
  function drawChar(c, ch, x, y, t, o) {
    o = o || {};
    var d = ch.d, id = ch.id, walking = ch.path && ch.path.length > 0, sl = ch.sleeping;
    var wp = (ch.walkT || 0) * 11, step = walking ? Math.sin(wp) : 0, bob = walking ? Math.abs(Math.cos(wp)) * 1.3 : 0;
    var br = Math.sin(t * (sl ? 1.1 : 2.1) + ch.ph);
    var working = !o.portrait && !walking && !sl && !ch.scene && !ch.task && active(id) && ch.home && atHome(ch);
    var talking = ch.bubble && !ch.bubble.think && (t - ch.bubble.start) * 48 < ch.bubble.text.length;
    var blink = !o.portrait && ((t + ch.ph * 3) % 4.2) < .13;
    c.save(); c.translate(x, y);
    if (!o.portrait) { c.drawImage(shadowS, -9, -3.4, 18, 6.8); if (ch.hl > t || o.sel) { c.strokeStyle = "rgba(191,246,250," + (.55 + .45 * Math.sin(t * 7)) + ")"; c.lineWidth = .9; c.beginPath(); c.ellipse(0, 0, 11, 4, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(0, 0, 13.5 + Math.sin(t * 4) * .8, 5, 0, 0, 7); c.globalAlpha = .4; c.stroke(); c.globalAlpha = 1; } }
    c.scale(ch.face || 1, 1); c.translate(0, -bob + (sl ? 1 : 0));
    if (sl) c.rotate(.08);
    var bc = id === "rovi" ? "#1a1d23" : (id === "prof" ? "#eef1f5" : d.kolor), dk = shade(bc, -.45), lt = shade(bc, .3), mid = shade(bc, -.15);
    // nogi
    c.lineCap = "round"; c.lineWidth = 3.1;
    c.strokeStyle = shade(bc, -.6); c.beginPath(); c.moveTo(-1.6, -7); c.lineTo(-1.6 - step * 2.8, -1); c.stroke();
    c.fillStyle = "#0b1118"; c.beginPath(); c.ellipse(-1.6 - step * 2.8 + .6, -.4, 2, 1.1, 0, 0, 7); c.fill();
    // tylne ramię
    var hb = working ? [-3 + Math.sin(t * 13) * .6, -11] : [-1.5 - step * 3.2, -9 + Math.abs(step)];
    c.strokeStyle = dk; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-2.5, -16); c.lineTo(hb[0], hb[1]); c.stroke();
    // tułów
    c.save(); c.translate(0, -6.5); c.scale(1, 1 + br * .025);
    var g = c.createLinearGradient(-6, -13, 6, 0); g.addColorStop(0, lt); g.addColorStop(.55, bc); g.addColorStop(1, mid);
    rr(c, -6, -13, 12, 13.2, 4.6); c.fillStyle = g; c.fill(); c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = .55; c.stroke();
    c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(-4.6, -12, 3, .7);
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(-6, -2.4, 12, 1.4);
    if (id === "rovi") { c.strokeStyle = "#2c323c"; c.lineWidth = .7; c.beginPath(); c.moveTo(0, -13); c.lineTo(0, 0); c.moveTo(-3.5, -13); c.lineTo(0, -8); c.lineTo(3.5, -13); c.stroke(); }
    if (id === "prof") { c.fillStyle = "#8fd3ff"; c.fillRect(-.9, -12.5, 1.8, 10); c.fillStyle = "#ff6b5c"; c.fillRect(2.4, -10, 1, 2.5); }
    c.restore();
    emblem(c, id, d);
    // przednia noga
    c.strokeStyle = shade(bc, -.5); c.lineWidth = 3.1; c.beginPath(); c.moveTo(1.6, -7); c.lineTo(1.6 + step * 2.8, -1); c.stroke();
    c.fillStyle = "#0b1118"; c.beginPath(); c.ellipse(1.6 + step * 2.8 + .6, -.4, 2, 1.1, 0, 0, 7); c.fill();
    // głowa
    c.save(); c.translate(0, sl ? 1.2 : br * .25);
    var hc = id === "rovi" ? "#a8b2bc" : (id === "prof" ? "#e9d6c2" : shade(d.kolor, .42));
    var hg = c.createRadialGradient(-2, -25, 1, 0, -22, 8); hg.addColorStop(0, shade(hc.charAt(0) === "#" ? hc : "#aab4be", .2)); hg.addColorStop(1, hc);
    c.fillStyle = id === "prof" ? "#e9d6c2" : (id === "rovi" ? hg : hg);
    c.beginPath(); c.ellipse(0, -22.4, id === "rovi" ? 5.8 : 6.4, id === "rovi" ? 7 : 6.2, 0, 0, 7); c.fill(); c.strokeStyle = "rgba(0,0,0,.55)"; c.lineWidth = .55; c.stroke();
    if (id === "rovi") {
      if (sl || blink) { c.strokeStyle = "#05070a"; c.lineWidth = .8; c.beginPath(); c.moveTo(-3.8, -22); c.lineTo(-1, -21.5); c.moveTo(1.2, -21.5); c.lineTo(4, -22); c.stroke(); }
      else { c.fillStyle = "#04060a"; c.beginPath(); c.ellipse(-2.3, -22.2, 1.9, 2.9, -.4, 0, 7); c.ellipse(2.5, -22.2, 1.9, 2.9, .4, 0, 7); c.fill(); c.fillStyle = "rgba(92,230,242,.9)"; c.fillRect(2.4, -23.6, .7, .7); c.fillRect(-2.6, -23.6, .6, .6); }
    } else if (id === "prof") {
      c.fillStyle = sl || blink ? "#6b5a4a" : "#1b2430"; if (sl || blink) { c.fillRect(-3, -22, 2, .5); c.fillRect(1.4, -22, 2, .5); } else { c.fillRect(-2.6, -22.8, 1.3, 1.3); c.fillRect(1.6, -22.8, 1.3, 1.3); }
      c.fillStyle = "#c9a88a"; c.fillRect(-1.5, -19.6, 3, .6);
    } else {
      var vg = c.createLinearGradient(0, -25, 0, -19.6); vg.addColorStop(0, "#0d1622"); vg.addColorStop(1, "#04070c");
      rr(c, -4.8, -24.8, 9.6, 4.8, 2.2); c.fillStyle = vg; c.fill();
      var vis = talking ? .6 + .4 * Math.abs(Math.sin(t * 18)) : 1;
      c.fillStyle = hexA(d.akcent.length === 7 ? d.akcent : "#5CE6F2", .25 * vis); c.fillRect(-4.4, -24.4, 8.8, 4);
      if (sl || blink) { c.fillStyle = hexA(d.akcent, .7); c.fillRect(-3.2, -22.4, 2, .5); c.fillRect(1.4, -22.4, 2, .5); }
      else { c.fillStyle = d.akcent; c.fillRect(-3.2, -23.6, 2, 2); c.fillRect(1.4, -23.6, 2, 2); c.fillStyle = "#fff"; c.fillRect(-2.6, -23.3, .6, .6); c.fillRect(2, -23.3, .6, .6); }
      c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(-4, -24.4, 3, .5);
    }
    accessory(c, id, t, sl);
    c.restore();
    // przednie ramię
    var hf = working ? [5 + Math.sin(t * 14 + 1) * .7, -11.5] : (talking ? [4.5, -13 + Math.sin(t * 6) * 1.5] : [1.5 + step * 3.2, -9 + Math.abs(step)]);
    c.strokeStyle = mid; c.lineWidth = 2.4; c.beginPath(); c.moveTo(2.5, -16); c.lineTo(hf[0], hf[1]); c.stroke();
    c.fillStyle = id === "rovi" ? "#a8b2bc" : shade(bc, .5); c.beginPath(); c.arc(hf[0], hf[1], 1.2, 0, 7); c.fill();
    c.lineCap = "butt";
    c.restore();
  }
  function emblem(c, id, d) {
    c.save(); c.translate(0, -12.5); c.fillStyle = d.akcent; c.strokeStyle = d.akcent; c.lineWidth = 1;
    switch (id) {
      case "jedzenie": c.strokeStyle = "#8a6a3a"; c.lineWidth = .8; c.beginPath(); c.moveTo(-1.6, -3); c.lineTo(-1.6, 3); c.moveTo(-2.6, -3); c.lineTo(-2.6, -.8); c.moveTo(-.6, -3); c.lineTo(-.6, -.8); c.moveTo(-2.6, -.8); c.lineTo(-.6, -.8); c.stroke(); c.fillStyle = "#8a6a3a"; c.beginPath(); c.ellipse(2, -1.6, 1.2, 1.6, 0, 0, 7); c.fill(); c.fillRect(1.6, -.4, .8, 3.4); break;
      case "x": c.beginPath(); c.moveTo(-2.6, -2.6); c.lineTo(2.6, 2.6); c.moveTo(2.6, -2.6); c.lineTo(-2.6, 2.6); c.stroke(); break;
      case "yt": c.fillStyle = "#fff"; rr(c, -3.4, -2.4, 6.8, 4.8, 1.4); c.fill(); c.fillStyle = "#ff3b30"; c.beginPath(); c.moveTo(-1.2, -1.4); c.lineTo(1.8, 0); c.lineTo(-1.2, 1.4); c.fill(); break;
      case "tiktok": noteG(c, -.6, .4, "#ff3d7f"); noteG(c, -1, 0, "#25f4ee"); break;
      case "ksiazka": c.fillStyle = "#7c2d12"; c.fillRect(-3.8, -2.8, 7.6, 5.6); c.fillStyle = "#f5e6c8"; c.fillRect(-3.2, -2.2, 2.9, 4.4); c.fillRect(.3, -2.2, 2.9, 4.4); break;
      case "mostek": c.fillStyle = "#f2f4f7"; c.fillRect(-2.5, -3.5, 5, 7); c.fillStyle = "#1E7F94"; c.fillRect(-1.6, -1.8, 3.2, .7); c.fillRect(-1.6, 0, 3.2, .7); c.fillRect(-1.6, 1.8, 2, .7); break;
      case "novi": c.beginPath(); c.ellipse(0, 0, 3.2, 1.9, 0, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill(); break;
      case "pomysly": c.fillStyle = "#ffe066"; c.beginPath(); c.arc(0, -.6, 2.1, 0, 7); c.fill(); c.fillStyle = "#555"; c.fillRect(-1, 1.4, 2, 1); break;
      case "suno": c.fillStyle = "#111"; c.beginPath(); c.arc(0, 0, 2.6, 0, 7); c.fill(); c.fillStyle = "#ff8a3d"; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill(); break;
      case "studio": c.strokeStyle = "#e6edf2"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-2.6, 2.6); c.lineTo(1.6, -1.6); c.stroke(); c.beginPath(); c.arc(2.2, -2.2, 1.3, 0, 7); c.stroke(); break;
    }
    c.restore();
  }
  function noteG(c, x, y, cl) { c.strokeStyle = cl; c.fillStyle = cl; c.lineWidth = .9; c.beginPath(); c.moveTo(x + 1.5, y + 2); c.lineTo(x + 1.5, y - 3); c.quadraticCurveTo(x + 3, y - 1.5, x + 4, y - 1.8); c.stroke(); c.beginPath(); c.arc(x, y + 2, 1.5, 0, 7); c.fill(); }
  function accessory(c, id, t, sl) {
    switch (id) {
      case "rovi":
        c.fillStyle = "#0a0c10"; c.beginPath(); c.ellipse(0, -27.8, 9.6, 2.3, 0, 0, 7); c.fill(); rr(c, -5.2, -34, 10.4, 6.8, 2.6); c.fill();
        c.fillStyle = "#1E7F94"; c.fillRect(-5.2, -29.3, 10.4, 1.1); c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(-4, -33.4, 3, .6);
        c.save(); c.translate(6.8, -17.5); var flap = Math.sin(t * 9) > .96 ? 1 : 0;
        c.fillStyle = "#07090c"; c.beginPath(); c.ellipse(0, 0, 3.2, 2.4, -.3, 0, 7); c.fill();
        if (flap) { c.beginPath(); c.moveTo(-1, -1); c.lineTo(-5, -5); c.lineTo(1, -2); c.fill(); }
        c.beginPath(); c.arc(1.9, -2.5, 1.7, 0, 7); c.fill(); c.fillStyle = "#3a3f46"; c.beginPath(); c.moveTo(3.3, -2.8); c.lineTo(5.4, -2.2); c.lineTo(3.3, -1.9); c.fill();
        c.fillStyle = sl ? "#123" : "#5CE6F2"; c.fillRect(2.1, -3.1, .9, .9); c.restore(); break;
      case "novi": c.strokeStyle = "rgba(177,140,255," + (.6 + .3 * Math.sin(t * 3)) + ")"; c.lineWidth = 1; c.beginPath(); c.ellipse(0, -31.5, 5.5, 1.6, 0, 0, 7); c.stroke(); break;
      case "mostek": c.strokeStyle = "#BFF6FA"; c.lineWidth = 1; c.beginPath(); c.arc(0, -23, 7, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.beginPath(); c.moveTo(6.6, -21); c.lineTo(3.6, -17.5); c.stroke(); c.fillStyle = "#5CE6F2"; c.fillRect(3, -18, 1.4, 1.2); break;
      case "jedzenie": c.fillStyle = "#f4f7fa"; rr(c, -4.6, -31.2, 9.2, 4.4, 1); c.fill(); c.beginPath(); c.arc(-3, -32, 2.6, 0, 7); c.arc(0, -33.4, 3, 0, 7); c.arc(3, -32, 2.6, 0, 7); c.fill(); c.fillStyle = "#c9d4de"; c.fillRect(-4.6, -27.6, 9.2, .7); break;
      case "pomysly": var on = !sl; c.fillStyle = on ? "rgba(255,224,102," + (.8 + .2 * Math.sin(t * 4)) + ")" : "#5a5a3a"; c.beginPath(); c.arc(0, -35.5, 3, 0, 7); c.fill(); c.fillStyle = "#9aa"; c.fillRect(-1.4, -32.6, 2.8, 1.8);
        if (on) { c.strokeStyle = "rgba(255,224,102,.5)"; c.lineWidth = .6; for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + (i - 2) * .55; c.beginPath(); c.moveTo(Math.cos(a) * 4.5, -35.5 + Math.sin(a) * 4.5); c.lineTo(Math.cos(a) * 6.5, -35.5 + Math.sin(a) * 6.5); c.stroke(); } } break;
      case "prof": c.fillStyle = "#e1e5ea"; c.beginPath(); c.arc(-4.6, -26, 2.7, 0, 7); c.arc(4.6, -26, 2.7, 0, 7); c.arc(0, -28.4, 2.8, 0, 7); c.arc(-2.6, -28, 2.4, 0, 7); c.arc(2.6, -28, 2.4, 0, 7); c.fill();
        c.strokeStyle = "#4d6a86"; c.lineWidth = .7; c.beginPath(); c.arc(-2, -22.2, 2, 0, 7); c.moveTo(4.2, -22.2); c.arc(2.2, -22.2, 2, 0, 7); c.moveTo(0, -22.2); c.lineTo(.2, -22.2); c.stroke(); c.fillStyle = "rgba(143,211,255,.25)"; c.beginPath(); c.arc(-2, -22.2, 1.8, 0, 7); c.arc(2.2, -22.2, 1.8, 0, 7); c.fill(); break;
      case "tiktok": c.fillStyle = "#25f4ee"; c.fillRect(-6.2, -27.6, 12.4, 1.6); c.fillStyle = "#ff3d7f"; c.fillRect(-6.2, -26, 12.4, 1); break;
      case "x": c.fillStyle = "#e6edf2"; c.beginPath(); c.moveTo(-1.4, -28.2); c.lineTo(0, -33); c.lineTo(1.4, -28.2); c.fill(); c.fillStyle = hexA("#5CE6F2", .6 + .4 * Math.sin(t * 5)); c.beginPath(); c.arc(0, -33.6, 1.2, 0, 7); c.fill(); break;
      case "yt": c.fillStyle = "#1b1f27"; rr(c, -6.2, -29, 12.4, 2.8, 1); c.fill(); c.fillStyle = "#fff"; c.fillRect(-3.6, -29, 1.2, 2.8); c.fillRect(-.6, -29, 1.2, 2.8); c.fillRect(2.4, -29, 1.2, 2.8); break;
      case "ksiazka": c.fillStyle = "#28326b"; c.beginPath(); c.ellipse(0, -27.6, 6.8, 2.4, 0, Math.PI, 0); c.fill(); c.strokeStyle = "#f5e6c8"; c.lineWidth = .8; c.beginPath(); c.moveTo(6.2, -13); c.quadraticCurveTo(10, -21, 11.6, -26); c.stroke(); c.fillStyle = "#a5b4fc"; c.beginPath(); c.ellipse(10.8, -23.6, 1.4, 3.4, .5, 0, 7); c.fill(); break;
      case "suno": c.fillStyle = "#151515"; c.beginPath(); c.ellipse(0, -27.2, 6.8, 3.3, 0, Math.PI, 0); c.fill(); c.fillRect(-1, -27.8, 9.4, 1.8);
        c.strokeStyle = "#ff8a3d"; c.lineWidth = 1.2; c.beginPath(); c.arc(0, -22, 7.3, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.fillStyle = "#ff8a3d"; rr(c, -8.2, -24.2, 3, 5.2, 1.2); c.fill(); rr(c, 5.2, -24.2, 3, 5.2, 1.2); c.fill(); break;
      case "studio": c.fillStyle = "#24384c"; rr(c, -6.6, -27.6, 13.2, 2.8, 1); c.fill(); var gg = sl ? "#123" : "#5CE6F2"; c.fillStyle = gg; c.beginPath(); c.arc(-2.6, -26.2, 1.9, 0, 7); c.arc(2.6, -26.2, 1.9, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(-3.2, -27, .7, .7); c.fillRect(2, -27, .7, .7); break;
    }
  }
  function drawEmote(c, ch, t) {
    var e = ch.emote; if (!e || t > e.until) { ch.emote = null; return; }
    var k = Math.min(1, (t - e.start) * 6), s = k < 1 ? k * 1.25 - Math.max(0, k - .8) * 1.25 : 1, fade = Math.min(1, (e.until - t) * 3);
    var x = ch.x + 7 * (ch.face || 1), y = ch.y - 40 - (t - e.start) * 1.5;
    c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = fade;
    c.fillStyle = "rgba(4,16,24,.94)"; c.strokeStyle = e.col || "#5CE6F2"; c.lineWidth = .7; c.beginPath(); c.arc(0, 0, 5.4, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-1.6, 4.6); c.lineTo(-3.4, 7.2); c.lineTo(.4, 5.2); c.fill();
    c.fillStyle = e.col || "#0a1420"; c.textAlign = "center"; c.textBaseline = "middle";
    if (e.type === "!") { c.font = "800 8px BSD, sans-serif"; c.fillStyle = "#ff8a3d"; c.fillText("!", 0, .4); }
    else if (e.type === "?") { c.font = "800 8px BSD, sans-serif"; c.fillStyle = "#8ff4fa"; c.fillText("?", 0, .4); }
    else if (e.type === "heart") { c.fillStyle = "#ff3d7f"; c.beginPath(); c.moveTo(0, 2.6); c.bezierCurveTo(-4.4, -.6, -2.2, -4, 0, -1.6); c.bezierCurveTo(2.2, -4, 4.4, -.6, 0, 2.6); c.fill(); }
    else if (e.type === "bulb") { c.fillStyle = "#ffd84a"; c.beginPath(); c.arc(0, -1, 2.6, 0, 7); c.fill(); c.fillStyle = "#7f8fa3"; c.fillRect(-1.2, 1.4, 2.4, 1.6); }
    else if (e.type === "warn") { c.fillStyle = "#ffd84a"; c.beginPath(); c.moveTo(0, -3.4); c.lineTo(3.4, 2.6); c.lineTo(-3.4, 2.6); c.closePath(); c.fill(); c.fillStyle = "#3a2a00"; c.fillRect(-.4, -1.4, .8, 2.4); c.fillRect(-.4, 1.5, .8, .7); }
    c.restore(); c.textBaseline = "alphabetic"; c.textAlign = "left";
  }
  function emote(ch, type, dur) { var col = { "!": "#eb7d69", "?": "#5CE6F2", heart: "#ff7f9e", bulb: "#ffe08a", warn: "#eb7d69" }[type]; ch.emote = { type: type, start: tNow, until: tNow + (dur || 2), col: col }; }

  // ---------- dymki (w przestrzeni ekranu) ----------
  function wrap(c, txt, max) {
    var w = txt.split(" "), lines = [], cur = "";
    w.forEach(function (x) { var t = cur ? cur + " " + x : x; if (c.measureText(t).width > max && cur) { lines.push(cur); cur = x; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function brackets(c, x, y, w, h, L, col, lw) {
    c.strokeStyle = col; c.lineWidth = lw || 1; c.beginPath();
    c.moveTo(x, y + L); c.lineTo(x, y); c.lineTo(x + L, y); c.moveTo(x + w - L, y); c.lineTo(x + w, y); c.lineTo(x + w, y + L);
    c.moveTo(x, y + h - L); c.lineTo(x, y + h); c.lineTo(x + L, y + h); c.moveTo(x + w - L, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w, y + h - L); c.stroke();
  }
  function drawBubbles(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var placed = [], fs = sw < 500 ? 14 : 15, lh = fs * 1.22, max = Math.min(240, sw * .6), list = [];
    chars.forEach(function (ch) { if (ch.bubble) list.push(ch); });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (ch) {
      var b = ch.bubble, p = toScreen(ch.x, ch.y - 36), think = !!b.think;
      if (p[0] < -50 || p[0] > sw + 50 || p[1] < -20 || p[1] > sh + 80) return;
      ctx.font = (think ? "italic 400 " : "400 ") + fs + "px BMSerif, Georgia, serif";
      if (!b.lines || b.fs !== fs || b.max !== max) { b.lines = wrap(ctx, b.text, max); b.fs = fs; b.max = max; b.tw = 0; b.lines.forEach(function (l) { b.tw = Math.max(b.tw, ctx.measureText(l).width); }); }
      var pad = 9, nf = 9, bw = Math.max(b.tw, 74) + pad * 2, bh = b.lines.length * lh + pad * 2 - (lh - fs) + (think ? 0 : nf + 6);
      var bx = Math.max(6, Math.min(sw - (sw < 700 ? 56 : 6) - bw, p[0] - bw / 2)), by = p[1] - bh - 10;
      for (var k = 0; k < placed.length; k++) { var q = placed[k]; if (bx < q[0] + q[2] && bx + bw > q[0] && by < q[1] + q[3] && by + bh > q[1]) by = q[1] - bh - 6; }
      by = Math.max(6, by); placed.push([bx, by, bw, bh]);
      var age = t - b.start, al = Math.max(0, Math.min(1, age * 6, (b.until - t) * 4)), sc = .9 + .1 * Math.min(1, age * 6);
      var col = ch.d.kolor === "#1b1f27" ? "#cfd8e3" : ch.d.kolor;
      ctx.save(); ctx.globalAlpha = al; ctx.translate(p[0], by + bh); ctx.scale(sc, sc); ctx.translate(-p[0], -(by + bh));
      ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
      if (think) {
        ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.fillStyle = "rgba(4,16,24,.82)"; ctx.fill(); ctx.shadowColor = "transparent";
        ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(92,230,242,.45)"; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "rgba(4,16,24,.82)"; ctx.beginPath(); ctx.arc(p[0] + 3, by + bh + 5, 2.6, 0, 7); ctx.arc(p[0] + 6, by + bh + 10.5, 1.6, 0, 7); ctx.fill();
        ctx.fillStyle = "#9fd8e0";
      } else {
        var tx = Math.max(bx + 10, Math.min(bx + bw - 16, p[0] - 5));
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(tx + 11, by + bh); ctx.lineTo(p[0], by + bh + 9); ctx.lineTo(tx, by + bh); ctx.lineTo(bx, by + bh); ctx.closePath();
        ctx.fillStyle = "rgba(4,16,24,.95)"; ctx.fill(); ctx.shadowColor = "transparent";
        ctx.strokeStyle = "rgba(92,230,242,.5)"; ctx.lineWidth = 1; ctx.stroke();
        brackets(ctx, bx - 2.5, by - 2.5, bw + 5, bh + 5, 6, "rgba(214,250,252,.9)", 1.1);
        ctx.fillStyle = col; ctx.fillRect(bx + pad, by + pad + 1, 5, 5);
        ctx.font = "600 " + nf + "px Plex, monospace"; ctx.fillStyle = "#8ff4fa"; ctx.textBaseline = "top";
        var nm = (ch.d.krotko || ch.d.imie).toUpperCase(); ctx.fillText(nm, bx + pad + 9, by + pad);
        if (b.to) { var nw = ctx.measureText(nm).width; ctx.fillStyle = "rgba(143,180,190,.75)"; ctx.fillText(" → " + b.to.toUpperCase(), bx + pad + 9 + nw, by + pad); }
        ctx.font = "400 " + fs + "px BMSerif, Georgia, serif"; ctx.fillStyle = "#e6f4f7";
      }
      var n = Math.floor(age * 48), off = think ? 0 : nf + 6;
      ctx.textBaseline = "top";
      for (var i = 0; i < b.lines.length && n > 0; i++) { var l = b.lines[i], part = l.slice(0, n); ctx.fillText(part, bx + pad, by + pad + off + i * lh); n -= l.length + 1; }
      ctx.textBaseline = "alphabetic"; ctx.restore();
    });
  }
  function drawNames(t) {
    var big = cam.zoom >= 1.45;
    if (!big) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = "600 10px Plex, monospace"; ctx.textBaseline = "middle";
    chars.forEach(function (ch) {
      var p = toScreen(ch.x, ch.y + 6); if (p[0] < -40 || p[0] > sw + 40 || p[1] < -10 || p[1] > sh + 20) return;
      var nm = ch.d.krotko || ch.d.imie, w = ctx.measureText(nm).width + 18, x = p[0] - w / 2, y = p[1];
      ctx.fillStyle = "rgba(3,14,22,.88)"; ctx.fillRect(x, y, w, 15); ctx.strokeStyle = "rgba(92,230,242,.4)"; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, 14);
      ctx.fillStyle = active(ch.id) ? "#7df0c8" : "#eb7d69"; ctx.fillRect(x, y, 3, 15);
      ctx.fillStyle = "#d6fafc"; ctx.fillText(nm.toUpperCase(), x + 9, y + 8);
    });
    ctx.textBaseline = "alphabetic";
  }
  function drawSmallNames(c) {
    if (cam.zoom >= 1.45) return;
    c.font = "600 6px Plex, monospace"; c.textAlign = "center"; c.lineWidth = 2.2; c.strokeStyle = "rgba(4,8,15,.92)";
    chars.forEach(function (ch) { var nm = ch.d.krotko || ch.d.imie; c.strokeText(nm, ch.x, ch.y + 9); c.fillStyle = active(ch.id) ? "#d6fafc" : "#86a3b0"; c.fillText(nm, ch.x, ch.y + 9); });
    c.textAlign = "left";
  }

  // ---------- awatary ----------
  var AV = {}, ROVI_IMG = "grafika/rovi-skan.webp";
  function scanBg(g, size) {
    var bg = g.createRadialGradient(size / 2, size * .42, 2, size / 2, size / 2, size * .75); bg.addColorStop(0, "#164a5c"); bg.addColorStop(1, "#030e16");
    g.fillStyle = bg; g.fillRect(0, 0, size, size);
    g.strokeStyle = "rgba(143,244,250,.09)"; g.lineWidth = Math.max(1, size / 160);
    for (var q = 0; q <= size; q += size / 8) { g.beginPath(); g.moveTo(q, 0); g.lineTo(q, size); g.stroke(); g.beginPath(); g.moveTo(0, q); g.lineTo(size, q); g.stroke(); }
  }
  // duoton jak w portretach książki: granat → turkus → lodowa biel
  function scanTone(g, size) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "saturation"; g.fillStyle = "#808080"; g.fillRect(0, 0, size, size);
    g.globalCompositeOperation = "color"; g.fillStyle = "#2fc4d4"; g.fillRect(0, 0, size, size);
    g.globalCompositeOperation = "source-over"; g.fillStyle = "rgba(0,0,0,.2)";
    var st = Math.max(2, Math.round(size / 80)); for (var y = 0; y < size; y += st * 2) g.fillRect(0, y, size, st * .6);
    g.restore();
  }
  function portrait(id, size, full) {
    var o = mk(size, size), g = o.getContext("2d"), ch = byId[id], k = full ? size / 40 : size / 22;
    scanBg(g, size);
    g.translate(size / 2, full ? size * .93 : size * 1.18); g.scale(k, k);
    drawChar(g, { id: id, d: ch.d, path: [], face: 1, walkT: 0, sleeping: false, ph: 0, hl: 0 }, 0, 0, 0.5, { portrait: true });
    scanTone(g, size);
    return o;
  }
  function buildAvatars() { chars.forEach(function (c) { if (c.id === "rovi") { AV.rovi = ROVI_IMG; return; } try { AV[c.id] = portrait(c.id, 112).toDataURL(); } catch (e) { AV[c.id] = ""; } }); }

  // ---------- radio ----------
  var feedEl = $("#feed"), lastEl = $("#radioLast"), lastAv = $("#radioAv");
  function radio(who, to, text, think) {
    var li = document.createElement("li"); if (think) li.className = "think";
    var w = who ? byId[who] : null;
    li.innerHTML = (w ? '<img alt="" src="' + AV[who] + '">' : '<span class="sys">!</span>') + '<div class="rb"><div class="meta"><b>' + esc(w ? (w.d.krotko || w.d.imie) : "POKŁAD") + '</b>' + (to ? ' <i>→ ' + esc(byId[to].d.krotko || byId[to].d.imie) + '</i>' : '') + (think ? ' <i class="tk">myśl</i>' : '') + '<span class="t">' + berlin() + '</span></div><div class="m">' + esc(text) + '</div></div>';
    feedEl.insertBefore(li, feedEl.firstChild);
    while (feedEl.children.length > 80) { var rm = null; for (var q = feedEl.children.length - 1; q >= 0; q--) if (!feedEl.children[q].classList.contains("ufo")) { rm = feedEl.children[q]; break; } if (!rm) break; feedEl.removeChild(rm); }
    if (!think) { lastEl.textContent = (w ? w.d.imie + ": " : "") + text; lastAv.src = w ? AV[who] : AV.rovi; }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }

  // ---------- dźwięk (WebAudio, domyślnie wyciszony) ----------
  var AU = { a: null, m: null };
  function auInit() {
    if (AU.a) return; var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    var a = AU.a = new A(), m = AU.m = a.createGain(); m.gain.value = 0; m.connect(a.destination);
    var lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 200; lp.connect(m);
    [55, 55.7, 110.2].forEach(function (f, i) { var o = a.createOscillator(); o.type = i < 2 ? "sawtooth" : "sine"; o.frequency.value = f; var g = a.createGain(); g.gain.value = i < 2 ? .045 : .03; o.connect(g); g.connect(lp); o.start(); });
    var lfo = a.createOscillator(); lfo.frequency.value = .07; var lg = a.createGain(); lg.gain.value = 70; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    var buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var n = a.createBufferSource(); n.buffer = buf; n.loop = true; var bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = .6; var ng = a.createGain(); ng.gain.value = .02; n.connect(bp); bp.connect(ng); ng.connect(m); n.start();
  }
  function setSound(v) {
    SET.snd = v; lsSet("bm-snd", v ? "1" : "0"); document.body.classList.toggle("snd-on", v);
    if (v) { auInit(); if (!AU.a) return; AU.a.resume(); AU.m.gain.setTargetAtTime(.55, AU.a.currentTime, .4); blip(880, .08, "sine", .05); }
    else if (AU.a) AU.m.gain.setTargetAtTime(0, AU.a.currentTime, .08);
  }
  function blip(f, dur, type, vol) {
    if (!SET.snd || !AU.a || document.hidden) return; var a = AU.a, o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime;
    o.type = type || "square"; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || .03, t0 + .005); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(AU.m); o.start(t0); o.stop(t0 + dur + .02);
  }
  function voice(id) { return 300 + (hash(id) % 9) * 55; }

  // ---------- reżyser ----------
  var scenes = [], recent = [], tNow = 0, nextScene = 3.2, nextThought = 3.8, nextErrand = 6;
  function free(c) { return !c.scene && !c.task; }
  function bubbleNear(x, y, ex) { return chars.some(function (o) { return o !== ex && o.bubble && Math.abs(o.x - x) < 80 && Math.abs(o.y - y) < 50; }); }
  function eligible(s) {
    var ps = s.k.map(function (id) { return byId[id]; });
    if (ps.some(function (p) { return !p || !free(p); })) return false;
    if (recent.indexOf(s) !== -1) return false;
    var allAct = s.k.every(active);
    if (s.tryb === "praca") return allAct;
    return stopped() && !allAct;
  }
  function startScene() {
    var pool = window.SCENY.filter(eligible); if (!pool.length) return;
    var s = pool[Math.floor(Math.random() * pool.length)], host = byId[s.k[1]];
    if (scenes.some(function (o) { var h = o.host; return Math.abs(h.home.x - host.home.x) < 100 && Math.abs(h.home.y - host.home.y) < 70; })) return;
    recent.push(s); if (recent.length > 12) recent.shift();
    var sc = { def: s, parts: s.k.map(function (id) { return byId[id]; }), host: host, li: 0, next: 0, phase: "walk", t0: tNow };
    sc.parts.forEach(function (p) { p.scene = sc; if (p.sleeping) { p.sleeping = false; emote(p, "!", 1.4); } p.bubble = null; });
    sc.parts.forEach(function (p) { if (p !== host) { var r = inRoom(host.home) || R.mesa, side = host.home.x + 20 > r.x + r.w - 6 ? -1 : 1; route(p, { x: host.home.x + side * 17, y: host.home.y + 2 }); } });
    if (s.k[0] === "pomysly") emote(sc.parts[0], "bulb", 2.2);
    if (s.k[0] === "mostek" && /limit|STOP/i.test(s.l[0][1])) emote(sc.parts[0], "warn", 2.2);
    scenes.push(sc);
  }
  function stepScene(sc) {
    if (sc.phase === "walk") {
      if (sc.parts.every(function (p) { return !p.path.length; }) || tNow - sc.t0 > 16) {
        sc.phase = "talk"; sc.next = tNow + .3;
        sc.parts.forEach(function (p) { if (p !== sc.host) p.face = sc.host.x >= p.x ? 1 : -1; }); sc.host.face = sc.parts[0].x >= sc.host.x ? 1 : -1;
      }
      return;
    }
    if (sc.phase === "talk" && tNow >= sc.next) {
      var l = sc.def.l[sc.li]; if (!l) { sc.phase = "end"; sc.next = tNow + .8; if (Math.random() < .35) emote(sc.parts[Math.floor(Math.random() * 2)], "heart", 1.8); return; }
      var sp = sc.parts[l[0]], to = sc.parts[l[0] === 0 ? 1 : 0];
      sc.parts.forEach(function (p) { p.bubble = null; });
      var dur = 1.6 + l[1].length / 48 + l[1].length * .03;
      sp.bubble = { text: l[1], start: tNow, until: tNow + dur, voice: voice(sp.id), to: to.d.krotko || to.d.imie };
      if (/\?$/.test(l[1]) && Math.random() < .6) emote(to, "?", 1.6);
      if (/!$/.test(l[1]) && Math.random() < .5) emote(sp, "!", 1.4);
      radio(sp.id, to.id, l[1]);
      sc.li++; sc.next = tNow + dur + .2; return;
    }
    if (sc.phase === "end" && tNow >= sc.next) {
      sc.parts.forEach(function (p) { p.scene = null; if (!atHome(p)) route(p, p.home); });
      scenes.splice(scenes.indexOf(sc), 1);
    }
  }
  function thought() {
    var cand = chars.filter(function (c) { return free(c) && !c.path.length && !c.bubble && !bubbleNear(c.x, c.y, c); });
    if (!cand.length) return;
    var c = cand[Math.floor(Math.random() * cand.length)];
    if (c.sleeping) return;
    var pool = window.MYSLI[c.id][active(c.id) ? 0 : 1], txt = pool[Math.floor(Math.random() * pool.length)];
    c.bubble = { text: txt, think: true, start: tNow, until: tNow + 2.6 + txt.length * .045 };
    if (c.id === "pomysly") emote(c, "bulb", 2);
    radio(c.id, null, txt, true);
  }
  function errand() {
    var cand = chars.filter(function (c) { return free(c) && !c.path.length && !c.bubble; });
    if (!cand.length) return;
    var c = cand[Math.floor(Math.random() * cand.length)], target, label;
    if (active(c.id)) {
      var list = ERRANDS[c.id] || ["wezel", "mesa", "studio", "reaktor", "kambuz", "most"].filter(function (k) { return k !== c.d.pokoj; });
      var k = list[Math.floor(Math.random() * list.length)], r = R[k];
      target = k === "most" ? { x: 160, y: 108 } : { x: r.x + r.w * (.25 + Math.random() * .5), y: r.y + r.h * .74 };
      label = { ksiazka: "sprawdza źródła w archiwum", yt: "zagląda do YouTube", wezel: "zgłasza się w Węźle", most: "zostawia notatkę na mostku", prof: "idzie do Profesora", pomysly: "zagląda do Lab Pomysłów", kambuz: "zagląda do kambuza", mesa: "idzie na kawę do mesy", studio: "odbiera render w Warsztacie", reaktor: "sprawdza reaktor", novi: "melduje się u Novi" }[k] || "idzie do: " + r.n;
    } else {
      if (c.id === "rovi" || Math.random() < .5) return;
      var s = STROLL[Math.floor(Math.random() * STROLL.length)]; target = { x: s[0], y: s[1] }; label = "rozprostowuje nogi";
    }
    c.sleeping = false; c.task = { stage: "go", until: 0, label: label }; route(c, target);
  }
  function stepTask(c) {
    if (!c.task || c.path.length) return;
    if (c.task.stage === "go") { c.task.stage = "stay"; c.task.until = tNow + 2.5 + Math.random() * 3; if (!bubbleNear(c.x, c.y, c)) c.bubble = { text: "…" + c.task.label, think: true, start: tNow, until: tNow + 2.6 }; }
    else if (c.task.stage === "stay" && tNow > c.task.until) goHome(c);
  }
  function doing(c) {
    if (c.scene) { var o = c.scene.parts.filter(function (p) { return p !== c; })[0]; return "Rozmawia: " + o.d.imie; }
    if (c.task) return c.task.label.charAt(0).toUpperCase() + c.task.label.slice(1);
    if (c.path.length) return "W drodze";
    if (c.sleeping) return "Śpi" + (roomKey(c.home) === "mesa" ? " w mesie" : "");
    if (active(c.id)) return "Pracuje: " + (ROOM_TXT[c.d.pokoj] || c.d.pokoj);
    return c.id === "rovi" ? "Czuwa na mostku" : "Odpoczywa w mesie";
  }

  // ---------- pętla ----------
  var last = performance.now(), running = true, rafId = 0, lastBlip = 0;
  function update(dt) {
    tNow += dt; DT = dt;
    chars.forEach(function (c) {
      if (c.path.length) {
        var p = c.path[0], dx = p.x - c.x, dy = p.y - c.y, dist = Math.hypot(dx, dy), sp = 38 * dt;
        if (Math.abs(dx) > .3) c.face = dx > 0 ? 1 : -1;
        if (dist <= sp) { c.x = p.x; c.y = p.y; c.path.shift(); } else { c.x += dx / dist * sp; c.y += dy / dist * sp; }
        c.walkT += dt;
      } else stepTask(c);
      if (c.bubble) {
        if (tNow > c.bubble.until) c.bubble = null;
        else if (!c.bubble.think && SET.snd && tNow - lastBlip > .07 && (tNow - c.bubble.start) * 48 < c.bubble.text.length) { lastBlip = tNow; blip(c.bubble.voice * (0.9 + Math.random() * .25), .045, "square", .018); }
      }
      if (!c.scene && !c.task && !c.path.length && !active(c.id) && tNow > c.nextSleepCheck) { c.nextSleepCheck = tNow + 8 + Math.random() * 10; c.sleeping = Math.random() < (night ? .55 : .18); }
    });
    scenes.slice().forEach(stepScene);
    if (tNow > nextScene) { if (scenes.length < 2) startScene(); nextScene = tNow + 2.5 + Math.random() * 4; }
    if (tNow > nextThought) { thought(); nextThought = tNow + 2.2 + Math.random() * 2.5; }
    if (tNow > nextErrand) { errand(); nextErrand = tNow + 5 + Math.random() * 5; }
    if (UFO) stepUfo(dt);
    stepParticles(tNow);
    // kamera
    if (follow) { camT.x = follow.x; camT.y = follow.y - 12; clampCam(camT); }
    var f = 1 - Math.exp(-dt * 7);
    cam.zoom += (camT.zoom - cam.zoom) * f; cam.x += (camT.x - cam.x) * f; cam.y += (camT.y - cam.y) * f; clampCam(cam);
  }
  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#03060c"; ctx.fillRect(0, 0, cv.width, cv.height);
    drawSpace(t);
    var k = K(); ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (sw / 2 - cam.x * k), dpr * (sh / 2 - cam.y * k));
    ctx.globalCompositeOperation = "lighter"; drawShipLights(ctx, t); ctx.globalCompositeOperation = "source-over";
    if (base) ctx.drawImage(base, BX0, BY0, BX1 - BX0, BY1 - BY0);
    if (veinsC) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .3 + .2 * Math.sin(t * 1.1); ctx.drawImage(veinsC, BX0, BY0, BX1 - BX0, BY1 - BY0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    drawScreens(ctx, t); drawMachines(ctx, t);
    ctx.globalCompositeOperation = "lighter"; drawHolo(ctx, t); ctx.globalCompositeOperation = "source-over";
    var order = chars.slice().sort(function (a, b) { return a.y - b.y; });
    order.forEach(function (c) { drawChar(ctx, c, c.x, c.y, t, { sel: follow === c }); });
    drawSmallNames(ctx);
    ctx.globalCompositeOperation = "lighter"; drawLights(ctx, t); drawParticles(ctx, t); ctx.globalCompositeOperation = "source-over";
    drawUfo(ctx, t);
    order.forEach(function (c) {
      if (c.sleeping) { ctx.font = "700 " + (6 + Math.sin(t * 2 + c.ph)) + "px BSD, sans-serif"; ctx.fillStyle = "rgba(191,246,250,.85)"; var zz = (t * 5 + c.ph * 5) % 9; ctx.fillText("z", c.x + 7, c.y - 30 - zz); ctx.font = "700 4.5px BSD, sans-serif"; ctx.fillText("z", c.x + 11, c.y - 36 - (zz + 4) % 9); }
      drawEmote(ctx, c, t);
    });
    drawNames(t); drawBubbles(t);
  }
  function frame(now) {
    if (!running) return;
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt); draw(tNow);
    rafId = requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { running = false; cancelAnimationFrame(rafId); if (AU.a) AU.a.suspend(); }
    else { running = true; last = performance.now(); if (AU.a && SET.snd) AU.a.resume(); rafId = requestAnimationFrame(frame); }
  });

  // ---------- kamera: dotyk, kółko, podwójne stuknięcie ----------
  var ptrs = {}, drag = null, pinch = null, lastTap = { t: 0, x: 0, y: 0 };
  function zoomAt(sx, sy, nz) {
    var w = toWorld(sx, sy); cam.zoom = camT.zoom = Math.max(ZMIN, Math.min(ZMAX, nz));
    var k = K(); cam.x = camT.x = w[0] - (sx - sw / 2) / k; cam.y = camT.y = w[1] - (sy - sh / 2) / k; clampCam(cam); clampCam(camT);
  }
  function local(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener("pointerdown", function (e) {
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    if (UFO) UFO.cam = false;
    var p = local(e); ptrs[e.pointerId] = p;
    var ids = Object.keys(ptrs);
    if (ids.length === 1) drag = { sx: p[0], sy: p[1], cx: cam.x, cy: cam.y, moved: false, t: performance.now() };
    else if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.zoom }; drag = null; }
  });
  cv.addEventListener("pointermove", function (e) {
    if (!ptrs[e.pointerId]) return; var p = local(e); ptrs[e.pointerId] = p; var ids = Object.keys(ptrs);
    if (pinch && ids.length >= 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]); follow = null; zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch.z * d / Math.max(10, pinch.d)); return; }
    if (drag) {
      var dx = p[0] - drag.sx, dy = p[1] - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 7) { drag.moved = true; follow = null; }
      if (drag.moved) { var k = K(); cam.x = camT.x = drag.cx - dx / k; cam.y = camT.y = drag.cy - dy / k; clampCam(cam); clampCam(camT); }
    }
  });
  function up(e) {
    var p = ptrs[e.pointerId]; delete ptrs[e.pointerId];
    if (pinch) { if (Object.keys(ptrs).length < 2) pinch = null; drag = null; return; }
    if (drag && !drag.moved && p) tap(p[0], p[1]);
    drag = null;
  }
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", function (e) { delete ptrs[e.pointerId]; drag = null; pinch = null; });
  cv.addEventListener("wheel", function (e) { e.preventDefault(); var p = local(e); follow = null; zoomAt(p[0], p[1], cam.zoom * Math.exp(-e.deltaY * .0015)); }, { passive: false });
  function tap(sx, sy) {
    var w = toWorld(sx, sy), best = null, bd = 20;
    chars.forEach(function (c) { var d = Math.hypot(c.x - w[0], c.y - 13 - w[1]); if (d < bd) { bd = d; best = c; } });
    if (best) { select(best); lastTap.t = 0; return; }
    var now = performance.now();
    if (now - lastTap.t < 340 && Math.hypot(sx - lastTap.x, sy - lastTap.y) < 30) { var k = roomKey({ x: w[0], y: w[1] }); if (k) focusRoom(k); else fitView(); lastTap.t = 0; return; }
    lastTap = { t: now, x: sx, y: sy };
    if (follow) unselect();
  }
  function focusRoom(k) {
    var r = R[k], z = Math.min(sw / (r.w * 1.35), sh / (r.h * 2.1)) / S0;
    follow = null; camT.zoom = Math.max(1.3, Math.min(ZMAX, z)); camT.x = r.x + r.w / 2; camT.y = r.y + r.h / 2 - 6; clampCam(camT);
    var n = chars.filter(function (c) { return roomKey(c) === k; }).length;
    toast(ROOM_TXT[k] + " · na pokładzie: " + n); blip(660, .06, "sine", .04);
  }
  function fitView() { follow = null; camT.zoom = 1; camT.x = (BX0 + BX1) / 2; camT.y = (BY0 + BY1) / 2; clampCam(camT); }
  var toastT = 0; function toast(s, ms, cls) { var el = $("#toast"); el.textContent = s; el.className = "toast on" + (cls ? " " + cls : ""); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("on"); }, ms || 2200); }
  $("#zIn").onclick = function () { follow = follow; camT.zoom = Math.min(ZMAX, camT.zoom * 1.4); clampCam(camT); blip(700, .04, "sine", .03); };
  $("#zOut").onclick = function () { camT.zoom = Math.max(ZMIN, camT.zoom / 1.4); clampCam(camT); blip(500, .04, "sine", .03); };
  $("#zFit").onclick = function () { fitView(); unselect(); blip(600, .05, "sine", .03); };

  // ---------- interfejs: pasek fokusu, akta, załoga, ustawienia ----------
  var focusEl = $("#focus"), focusT = 0;
  function select(c) {
    follow = c; camT.zoom = Math.max(camT.zoom, 2.3); c.hl = tNow + 1.5;
    focusEl.hidden = false; focusEl.classList.remove("on"); void focusEl.offsetWidth; focusEl.classList.add("on");
    $("#fAv").src = AV[c.id]; $("#fName").textContent = c.d.imie; $("#fRole").textContent = c.d.rola; $("#fRef").textContent = "AKTA NR " + pad2(c.n) + " · " + (c.d.sekcja || "ZAŁOGA");
    var s = status(c.id); $("#fSt").className = "light " + stClass(s); $("#fStT").textContent = stLabel(s);
    refreshFocus(); clearInterval(focusT); focusT = setInterval(refreshFocus, 500);
    blip(voice(c.id), .08, "sine", .05); markRoster();
  }
  function markRoster() { document.querySelectorAll("#rosterList [data-r]").forEach(function (b) { b.classList.toggle("on", !!follow && b.getAttribute("data-r") === follow.id); }); }
  function refreshFocus() { if (follow) $("#fNow").textContent = doing(follow); }
  function unselect() { follow = null; markRoster(); focusEl.classList.remove("on"); clearInterval(focusT); setTimeout(function () { if (!follow) focusEl.hidden = true; }, 250); }
  $("#fClose").onclick = unselect;
  $("#fDos").onclick = function () { if (follow) dossier(follow.id); };

  var sheet = $("#sheet"), body = $("#sheetBody");
  var sheetTimer = 0;
  function open(html, cls, strip) {
    strip = strip || ["KALLICHORE-7 · RAPORT INCYDENTU", "BLUE MOLD"];
    $("#sheetL").textContent = strip[0]; $("#sheetR").textContent = strip[1];
    clearInterval(sheetTimer); body.innerHTML = html; sheet.className = "sheet " + (cls || ""); sheet.hidden = false; sheet.querySelector(".sheet-in").scrollTop = 0; blip(520, .05, "triangle", .04);
  }
  function close() { sheet.hidden = true; clearInterval(sheetTimer); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) close(); });
  $("#sheetClose").onclick = close;
  sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
  $("#radioH").onclick = function () { $("#radio").classList.toggle("open"); blip(440, .05, "triangle", .03); };

  function stLabel(s) { return { "pauza": "PAUZA", "na prośbę": "NA PROŚBĘ", "aktywny": "AKTYWNY", "wolne": "WOLNE" }[s] || String(s).toUpperCase(); }
  function stClass(s) { return s === "na prośbę" ? "na" : s; }
  function pad2(n) { return ("0" + n).slice(-2); }
  function pad3(n) { return ("00" + n).slice(-3); }
  function barcode(seed) {
    var r = mulberry(hash(seed) + 17), x = 0, out = "";
    while (x < 96) { var w = r() < .35 ? 2 : 1, gap = r() < .3 ? 2 : 1; out += '<rect x="' + x + '" y="0" width="' + w + '" height="14"/>'; x += w + gap; }
    return '<svg class="bc" viewBox="0 0 96 14" preserveAspectRatio="none" aria-hidden="true">' + out + '</svg>';
  }
  function stampTxt(s) { return SIM ? "SYMULACJA" : stLabel(s); }
  function stampCls(s) { return SIM ? "sim" : stClass(s); }
  function dossier(id) {
    var c = byId[id], d = c.d, s = status(id), st = (STAN.dzialy || {})[id] || {}, o = st.ostatnio, num = pad2(c.n), tot = pad2(chars.length);
    var por = id === "rovi" ? '<img src="' + ROVI_IMG + '" alt="Skan: Rovi Here">' : '<canvas id="por" width="320" height="320" aria-label="Skan: ' + esc(d.imie) + '"></canvas>';
    var rel = (d.relacje || []).map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join("");
    var att = id === "ksiazka" ? '<section class="pf-s"><h4>Załącznik B · okładka Tomu 1</h4><figure class="att"><img src="grafika/okladka-pl.webp" alt="Okładka książki Błękitna Pleśń, Tom 1" loading="lazy"><figcaption>„Błękitna Pleśń”, Tom 1 · Cal Rennick<br><span>wydanie polskie · w przygotowaniu</span></figcaption></figure></section>' : '';
    open('<article class="pf">' +
      '<header class="pf-bar"><span>AKTA OSOBOWE · NR ' + num + '</span><span>' + esc(d.sekcja || "ZAŁOGA") + '</span></header>' +
      '<div class="pf-head">' +
        '<figure class="scanf"><div class="scan-top"><span>SKAN · KX7-P-' + pad3(c.n) + '</span><span>KX7/BM</span></div>' + por +
          '<figcaption><span><b>' + esc(d.imie.toUpperCase()) + '</b><small>' + esc(d.rola.toUpperCase()) + '</small></span>' + barcode(id) + '</figcaption>' +
          '<span class="stamp ' + stampCls(s) + '">' + stampTxt(s) + '</span></figure>' +
        '<div class="pf-id"><p class="ref">SYGN. AO-2189-' + pad3(c.n) + '</p><span class="seal">' + esc(d.inicjaly || d.imie.slice(0, 2).toUpperCase()) + '</span>' +
          '<h2>' + esc(d.imie) + '</h2><p class="role">' + esc(d.rola) + '</p>' +
          '<dl class="rows"><dt>Status</dt><dd><i class="light ' + stClass(s) + '"></i>' + stLabel(s) + (SIM ? ' · symulacja' : '') + '</dd>' +
          '<dt>Stanowisko</dt><dd>' + esc(id === "mostek" ? "Mostek dowodzenia · Węzeł · Reaktor" : (ROOM_TXT[d.pokoj] || d.pokoj)) + '</dd>' +
          '<dt>Tryb</dt><dd>' + esc(d.tryb || "-") + '</dd>' +
          '<dt>Teraz</dt><dd id="pfNow">' + esc(doing(c)) + '</dd></dl></div>' +
      '</div>' +
      '<section class="pf-s"><h4>Zakres obowiązków</h4><p>' + esc(d.opis) + '</p></section>' +
      '<section class="pf-s"><h4>Profil</h4><p>' + esc(d.persona) + '</p></section>' +
      (d.cechy && d.cechy.length ? '<section class="pf-s"><h4>Cechy</h4><ul class="traits">' + d.cechy.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul></section>' : '') +
      (rel ? '<section class="pf-s"><h4>Relacje</h4><table class="rel">' + rel + '</table></section>' : '') +
      '<section class="pf-s"><h4>Ostatni ślad w plikach</h4>' + (o || st.notatka ? '<table class="rel trace">' + (o ? '<tr><th>Plik</th><td class="path">' + esc(o.plik) + '</td></tr><tr><th>Zmieniono</th><td>' + esc(o.data) + '</td></tr>' : '') + (st.notatka ? '<tr><th>Notatka</th><td>' + esc(st.notatka) + '</td></tr>' : '') + '</table>' : '<p class="dim">brak danych w plikach</p>') + '</section>' +
      att +
      '<blockquote class="pf-q"><p>' + esc(d.tekst) + '</p><cite>Dziennik pokładowy · Blue Mold</cite></blockquote>' +
      '<footer class="pf-foot"><span>KARTA POSTACI · ' + num + '/' + tot + '</span><span>DOSTĘP: POZIOM 2 · JAWNE</span></footer>' +
      '<div class="row"><button class="btn" id="dFollow" type="button"><svg><use href="#i-scan"/></svg>Śledź kamerą</button><button class="btn g" id="dSend" type="button"><svg><use href="#i-ufo"/></svg>Nadaj do: ' + esc(d.krotko || d.imie) + '</button><button class="btn g" id="dClose" type="button">Zamknij</button></div>' +
      '</article>', "wide", ["KALLICHORE-7 · AKTA", "SYGN. AO-2189-" + pad3(c.n)]);
    var cvp = $("#por");
    if (cvp) { var pc = cvp.getContext("2d"); (function anim() { if (sheet.hidden || !document.body.contains(cvp)) return; pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, 320, 320); pc.drawImage(portraitLive(id, tNow), 0, 0); requestAnimationFrame(anim); })(); }
    sheetTimer = setInterval(function () { var n = $("#pfNow"); if (n) n.textContent = doing(c); }, 700);
    $("#dFollow").onclick = function () { close(); select(c); };
    $("#dSend").onclick = function () { composer(id); };
    $("#dClose").onclick = close;
  }
  var pl = mk(320, 320);
  function portraitLive(id, t) {
    var g = pl.getContext("2d"), ch = byId[id]; g.setTransform(1, 0, 0, 1, 0, 0);
    scanBg(g, 320);
    g.translate(160, 300); g.scale(7.4, 7.4);
    drawChar(g, { id: id, d: ch.d, path: [], face: 1, walkT: 0, sleeping: false, ph: 0, hl: 0, bubble: null }, 0, 0, t, { portrait: true });
    scanTone(pl.getContext("2d"), 320);
    g.setTransform(1, 0, 0, 1, 0, 0);
    var sy = (t * 60) % 380 - 30, sg = g.createLinearGradient(0, sy - 30, 0, sy + 4); sg.addColorStop(0, "rgba(143,244,250,0)"); sg.addColorStop(1, "rgba(214,250,252,.28)");
    g.fillStyle = sg; g.fillRect(0, sy - 30, 320, 34);
    return pl;
  }
  var SEKCJE = ["DOWÓDZTWO", "MEDIA", "ROZWÓJ I NAUKA", "TECHNIKA", "PRYWATNE · NA PROŚBĘ"];
  function crewList() {
    var groups = SEKCJE.slice(); chars.forEach(function (c) { if (groups.indexOf(c.d.sekcja) < 0) groups.push(c.d.sekcja); });
    var nAct = chars.filter(function (c) { return active(c.id); }).length;
    open('<div class="reg"><div class="banner" style="background-image:url(grafika/kallichore.webp)"><div><small>KX7-2189-0413 · ZAŁĄCZNIK A</small><h2>Rejestr załogi</h2></div></div>' +
      '<p class="lead">' + chars.length + ' działów Rovi Here na pokładzie Blue Mold. Dotknij akt, aby je otworzyć.</p>' +
      '<p class="reg-sum"><span>NA POKŁADZIE: ' + chars.length + '</span><span>W PRACY: ' + nAct + '</span><span>' + (SIM ? "SYMULACJA" : (stopped() ? "STOP" : "PRACA")) + '</span></p>' +
      groups.map(function (g) {
        var m = chars.filter(function (c) { return c.d.sekcja === g; }); if (!m.length) return "";
        return '<h4 class="grp">' + esc(g) + '</h4><ul class="reg-l">' + m.map(function (c) {
          var s = status(c.id);
          return '<li><button type="button" data-id="' + c.id + '"><span class="no">' + pad2(c.n) + '</span><img alt="" src="' + AV[c.id] + '"><span class="nm"><b>' + esc(c.d.imie) + '</b><em>' + esc(c.d.rola) + '</em></span><span class="sm ' + stampCls(s) + '">' + stampTxt(s) + '</span></button></li>';
        }).join("") + '</ul>';
      }).join("") +
      '<p class="reg-foot"><span>DOK. KX7-2189-0413</span><span>STAN: ' + esc(STAN.aktualizacja || "-") + '</span></p></div>', "wide", ["BLUE MOLD · ZAŁĄCZNIK A", "AKTA OSOBOWE"]);
    body.querySelectorAll("[data-id]").forEach(function (b) { b.onclick = function () { dossier(b.getAttribute("data-id")); }; });
  }
  function renderRoster() {
    var ol = $("#rosterList"); if (!ol) return;
    ol.innerHTML = chars.map(function (c) { var s = status(c.id); return '<li><button type="button" data-r="' + c.id + '"' + (follow === c ? ' class="on"' : '') + '><span class="no">' + pad2(c.n) + '</span><img alt="" src="' + AV[c.id] + '"><span class="nm"><b>' + esc(c.d.imie) + '</b><em>' + esc(c.d.rola) + '</em></span><span class="sm ' + stampCls(s) + '">' + stampTxt(s) + '</span></button></li>'; }).join("");
    ol.querySelectorAll("[data-r]").forEach(function (b) { b.onclick = function () { select(byId[b.getAttribute("data-r")]); }; });
    $("#rosterN").textContent = chars.length + " DZIAŁÓW";
  }
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; });
  function sw2(id, on, label, sub) { return '<label class="sw"><span><b>' + label + '</b><small>' + sub + '</small></span><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + '><i></i></label>'; }
  function info() {
    var f = STAN.firma || {};
    open('<div class="proto"><div class="banner" style="background-image:url(grafika/gejzer.webp)"><div><small>DOK. KX7-2189-0413 · PROTOKÓŁ</small><h2>Statek Blue Mold</h2></div></div>' +
      '<section class="panel"><h4>Stan firmy</h4><p>' + (f.stop ? "<b class='red'>STOP</b> – " + esc((f.opis || "").replace(/^STOP\s*/i, "")) + (f.od ? " (od " + esc(f.od) + ")" : "") : "Praca (bez STOP)." + (f.historia ? " " + esc(f.historia) : "")) + '</p><p class="dim">Dane: data/stan.json · aktualizacja: ' + esc(STAN.aktualizacja || "-") + '</p></section>' +
      '<section class="panel"><h4>Centrum dowodzenia</h4><p>Pulpit (kalendarz publikacji, blokady, stan działów) i formularz poleceń do arkusza „RoviHere Polecenia”.</p><div class="row"><button class="btn g" id="iPulpit" type="button">Pulpit</button><button class="btn g" id="iCmd" type="button">Polecenia</button><button class="btn g" id="iLink" type="button">Łącze z bazą poleceń</button></div></section>' +
      '<section class="panel"><h4>Struktura załogi · 09.10.2026</h4><p>Dwóch szefów: <b>Rovi Here</b> (X, Profesor, Pomysły, Weryfikator) i <b>Blue Mold</b> (Książka, Suno Rap, YouTube, Technika i Studio, TikTok, aplikacja). <b>Mostek</b> (od 08.10: Koordynacja + Odprawa + Energia) łączy oba zespoły, Novi pilnuje całości.</p></section>' +
      '<section class="panel"><h4>Ustawienia</h4>' + sw2("tSim", SIM, "Symulacja dnia pracy", "wszyscy aktywni – tylko podgląd, dane bez zmian") + sw2("tSnd", SET.snd, "Dźwięk", "szum statku i sygnały rozmów") + sw2("tCrt", SET.crt, "Filtr CRT", "linie skanowania monitora") + '</section>' +
      '<section class="panel"><h4>Sterowanie</h4><p>Przeciągnij, aby przesuwać. Szczypnij lub kółkiem – zoom. Dwa stuknięcia w pokój – przybliżenie. Stuknij postać – kamera ją śledzi, a pasek na dole otwiera akta.</p></section>' +
      '<section class="panel"><h4>Na zewnątrz</h4><p class="links"><a class="btn g" href="https://www.youtube.com/@RoviHere" target="_blank" rel="noopener">YouTube</a><a class="btn g" href="https://www.tiktok.com/@roviheree" target="_blank" rel="noopener">TikTok</a><a class="btn g" href="https://x.com/RoviHere" target="_blank" rel="noopener">X</a><a class="btn g" href="https://suno.com/@kkruk93" target="_blank" rel="noopener">Suno</a></p></section>' +
      '<section class="panel"><h4>Instalacja</h4><p>Android/Chrome: menu ⋮ → „Zainstaluj aplikację”. iPhone/Safari: Udostępnij → „Do ekranu początkowego”. Wymaga strony na https.</p>' + (deferred ? '<button class="btn" id="inst">Zainstaluj teraz</button>' : '') + '</section>' +
      '<p class="colophon">Oprawa wizualna według książki „Blue Mold” / „Błękitna Pleśń” (Cal Rennick). Grafiki: okładka i plansze z książki. Kroje: Big Shoulders Display, IBM Plex Mono, EB Garamond (OFL).</p></div>', "wide", ["PROTOKÓŁ STATKU", "DOK. KX7-2189-0413"]);
    $("#tSim").onchange = function () { setSim(this.checked); };
    $("#tSnd").onchange = function () { setSound(this.checked); };
    $("#tCrt").onchange = function () { setCrt(this.checked); };
    ["iPulpit", "iCmd", "iLink"].forEach(function (k) { var b = $("#" + k); if (b) b.onclick = function () { var C = window.__cc; if (!C) return; if (k === "iPulpit") C.pulpit(); else if (k === "iCmd") C.polecenia(); else C.ustawienia(); }; });
    var ib = $("#inst"); if (ib) ib.onclick = function () { deferred.prompt(); deferred = null; close(); };
  }
  function setCrt(v) { SET.crt = v; lsSet("bm-crt", v ? "1" : "0"); document.body.classList.toggle("crt-on", v); }
  function setSim(v) {
    SIM = v; scenes.slice().forEach(function (sc) { sc.parts.forEach(function (p) { p.scene = null; p.bubble = null; }); }); scenes = []; recent = [];
    assignHomes(); chars.forEach(function (c) { c.sleeping = false; c.task = null; route(c, c.home); });
    buildStatic(); chip(); renderRoster();
    radio(null, null, v ? "Symulacja: zwykły dzień pracy (podgląd, dane bez zmian)." : "Powrót do stanu rzeczywistego.");
  }
  $("#btnZaloga").onclick = crewList;
  $("#btnInfo").onclick = info;
  $("#btnSnd").onclick = function () { setSound(!SET.snd); };

  var chipS = $("#chipStan"), chipC = $("#chipCzas");
  function chip() {
    if (SIM) { chipS.innerHTML = "<i></i>SYMULACJA"; chipS.className = "st sim"; }
    else if (stopped()) { chipS.innerHTML = "<i></i>STOP"; chipS.className = "st stop"; }
    else { chipS.innerHTML = "<i></i>PRACA"; chipS.className = "st ok"; }
    var nA = chars.filter(function (c) { return active(c.id); }).length; $("#capCrew").textContent = "ZAŁOGA " + chars.length + " · W PRACY " + nA;
    var n = isNight(); chipC.textContent = (n ? "NOC · " : "DZIEŃ · ") + berlin();
    if (n !== night) { night = n; buildStatic(); }
  }
  setInterval(chip, 20000);

  // ---------- transmisja do Rovi (UFO) ----------
  var TXK = "bm-tx", UFO = null, COPY = { last: "" }, txTo = "rovi";
  var HOV = 28, CAPY = 100, CONSOLE = { x: 166, y: 100 };
  var UP = [[480, 330], [440, -80], [300, -46], [180, HOV]];
  function txLoad() { try { var a = JSON.parse(lsGet(TXK) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function txSave(a) { lsSet(TXK, JSON.stringify(a.slice(-40))); }
  function berlinFull() { try { return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Berlin" }).format(new Date()); } catch (e) { return new Date().toLocaleString(); } }
  function txName(id) { return id === "rovi" ? "Rovi" : (byId[id] ? byId[id].d.imie : String(id)); }
  function txFormat(to, txt, when) { return "\uD83D\uDEF8 TRANSMISJA DO ROVI (→ " + txName(to) + ")\n" + String(txt).trim() + "\n— z aplikacji Blue Mold, " + when; }
  var COPIED = "Skopiowano do schowka · wklej w czacie z Rovi Here";
  function copyExec(s) {
    var ta = document.createElement("textarea"), ok = false, act = document.activeElement;
    ta.value = s; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;-webkit-user-select:text;user-select:text";
    document.body.appendChild(ta);
    try { ta.select(); ta.setSelectionRange(0, s.length); ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta); if (act && act.focus) try { act.focus(); } catch (e) {}
    return !!ok;
  }
  function copyText(s, cb) {
    function done(m) { COPY.last = m; if (m === "box") copyBox(s); else { toast(COPIED, 4500, "big"); var b = $("#txBox"); if (b) b.hidden = true; } if (cb) cb(m); }
    var viaExec = function () { done(copyExec(s) ? "exec" : "box"); };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      var settled = false, p;
      try { p = navigator.clipboard.writeText(s); } catch (e) { p = null; }
      if (!p) return viaExec();
      p.then(function () { if (!settled) { settled = true; done("clipboard"); } }, function () { if (!settled) { settled = true; viaExec(); } });
      setTimeout(function () { if (!settled) { settled = true; viaExec(); } }, 1500);
    } else viaExec();
  }
  function copyBox(s) {
    var el = $("#txBox");
    if (!el) { el = document.createElement("div"); el.id = "txBox"; el.className = "txbox"; el.setAttribute("role", "dialog"); document.body.appendChild(el); }
    el.innerHTML = '<div class="p-strip"><span>KANAŁ UFO · RĘCZNE KOPIOWANIE</span><span>KX7-TX</span></div><h4>Skopiuj ręcznie</h4><p class="dim">Przeglądarka zablokowała schowek. Tekst jest zaznaczony – skopiuj go (Ctrl+C albo przytrzymaj palcem) i wklej w czacie z Rovi Here.</p><textarea readonly></textarea><div class="row"><button class="btn" id="txbCopy" type="button">Kopiuj</button><button class="btn g" id="txbClose" type="button">Gotowe</button></div>';
    var ta = el.querySelector("textarea"); ta.value = s; el.hidden = false;
    setTimeout(function () { try { ta.focus(); ta.select(); ta.setSelectionRange(0, s.length); } catch (e) {} }, 40);
    $("#txbCopy").onclick = function () {
      var ok = false; try { ta.focus(); ta.select(); ta.setSelectionRange(0, s.length); ok = document.execCommand("copy"); } catch (e) {}
      if (ok) { COPY.last = "exec"; toast(COPIED, 4500, "big"); el.hidden = true; return; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(function () { COPY.last = "clipboard"; toast(COPIED, 4500, "big"); el.hidden = true; }, function () { toast("Tekst zaznaczony – użyj Ctrl+C / Kopiuj z menu", 3500); });
      else toast("Tekst zaznaczony – użyj Ctrl+C / Kopiuj z menu", 3500);
    };
    $("#txbClose").onclick = function () { el.hidden = true; };
  }
  var QUICK = [
    ["Co dziś robimy?", function () { return "Co dziś robimy?"; }],
    ["Raport załogi", function () { return "Poproszę raport załogi: kto nad czym pracuje, co stoi i dlaczego."; }],
    ["Wznów dział", function (to) { return "Wznów dział: " + (to === "rovi" ? "[który?]" : txName(to)) + "."; }],
    ["Nowy pomysł", function () { return "Nowy pomysł: "; }]
  ];
  function txLogHtml(log) {
    if (!log.length) return "";
    var items = log.map(function (e, i) { return { e: e, i: i }; }).slice(-5).reverse();
    return '<section class="tx-s"><h4><span class="n">05</span>Dziennik transmisji <small>tylko na tym urządzeniu</small></h4><ul class="tx-log">' + items.map(function (o) {
      return '<li><div class="h"><b>→ ' + esc(txName(o.e.to)) + '</b><span>' + esc(o.e.w) + '</span></div><p>' + esc(o.e.txt) + '</p><button type="button" data-c="' + o.i + '">kopiuj ponownie</button></li>';
    }).join("") + '</ul><button class="btn g small" id="txClear" type="button">Wyczyść dziennik</button></section>';
  }
  function composer(preset) {
    if (preset && (preset === "rovi" || byId[preset])) txTo = preset;
    var log = txLoad();
    open('<div class="tx"><div class="tx-head"><div><small class="kicker">FORMULARZ TRANSMISJI · KX7-TX</small><h2 class="sh-title">Nadaj do Rovi</h2><p class="lead">Treść trafia do schowka, a Ty wklejasz ją w czacie z Rovi Here.</p></div><span class="tx-ico" aria-hidden="true"><svg><use href="#i-ufo"/></svg></span></div>' +
      '<section class="tx-s"><h4><span class="n">01</span>Odbiorca</h4><div class="tx-to" id="txTo">' + chars.map(function (c) { return '<button type="button" data-to="' + c.id + '"' + (c.id === txTo ? ' class="on"' : '') + '><img alt="" src="' + AV[c.id] + '"><span>' + esc(c.id === "rovi" ? "Rovi" : (c.d.krotko || c.d.imie)) + '</span></button>'; }).join("") + '</div></section>' +
      '<section class="tx-s"><h4><span class="n">02</span>Szybkie rozkazy</h4><div class="tx-q">' + QUICK.map(function (q, i) { return '<button type="button" data-q="' + i + '">' + esc(q[0]) + '</button>'; }).join("") + '</div></section>' +
      '<section class="tx-s"><h4><span class="n">03</span>Treść</h4><div class="tx-area"><textarea id="txT" maxlength="1200" rows="4" placeholder="Rozkaz albo wiadomość dla Rovi…"></textarea><span id="txN">0/1200</span></div></section>' +
      '<section class="tx-s"><h4><span class="n">04</span>Podgląd transmisji</h4><div class="tx-prev"><pre id="txP"></pre></div></section>' +
      '<div class="row tx-go"><button class="btn big" id="txGo" type="button" disabled><svg><use href="#i-ufo"/></svg>Nadaj transmisję</button><button class="btn g" id="txCancel" type="button">Anuluj</button></div>' +
      '<p class="dim note">Aplikacja nie łączy się z Rovi i niczego nie wysyła w sieć. Animacja na statku tylko potwierdza nadanie – prawdziwa odpowiedź przyjdzie w czacie.</p>' +
      txLogHtml(log) + '</div>', "wide tx-sheet", ["KANAŁ UFO · TRANSMISJA", "SZYFR KX7-TX"]);
    var ta = $("#txT"), go = $("#txGo"), pv = $("#txP"), n = $("#txN");
    function upd() { var v = ta.value; n.textContent = v.length + "/1200"; go.disabled = !v.trim(); pv.innerHTML = esc(txFormat(txTo, v.trim() || "…", berlinFull())).replace("\uD83D\uDEF8", '<svg><use href="#i-ufo"/></svg>'); }
    ta.oninput = upd;
    body.querySelectorAll("[data-to]").forEach(function (b) { b.onclick = function () { txTo = b.getAttribute("data-to"); body.querySelectorAll("[data-to]").forEach(function (o) { o.classList.toggle("on", o === b); }); blip(voice(txTo), .05, "sine", .04); upd(); }; });
    body.querySelectorAll("[data-q]").forEach(function (b) { b.onclick = function () { ta.value = QUICK[+b.getAttribute("data-q")][1](txTo); upd(); ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {} blip(600, .04, "triangle", .03); }; });
    body.querySelectorAll("[data-c]").forEach(function (b) { b.onclick = function () { var e = txLoad()[+b.getAttribute("data-c")]; if (e) copyText(txFormat(e.to, e.txt, e.w)); }; });
    var cl = $("#txClear"); if (cl) cl.onclick = function () { txSave([]); feedEl.querySelectorAll("li.ufo").forEach(function (li) { li.remove(); }); composer(); toast("Dziennik wyczyszczony"); };
    go.onclick = function () { if (ta.value.trim()) transmit(txTo, ta.value); };
    $("#txCancel").onclick = close;
    upd();
  }
  function radioTx(e, old) {
    var li = document.createElement("li"); li.className = "ufo";
    li.innerHTML = '<span class="sys ufo"><svg><use href="#i-ufo"/></svg></span><div class="rb"><div class="meta"><b>TRANSMISJA</b> <i>→ ' + esc(txName(e.to)) + '</i><span class="t">' + esc(e.w) + '</span></div><div class="m">' + esc(e.txt) + '</div><button class="recopy" type="button">kopiuj ponownie</button></div>';
    li.querySelector(".recopy").onclick = function (ev) { ev.stopPropagation(); copyText(txFormat(e.to, e.txt, e.w)); };
    feedEl.insertBefore(li, feedEl.firstChild);
    if (!old) { lastEl.textContent = "Transmisja → " + txName(e.to) + ": " + e.txt; lastAv.src = AV.rovi; }
  }
  function transmit(to, txt) {
    var when = berlinFull(), clean = String(txt).trim(), s = txFormat(to, clean, when);
    copyText(s);
    var e = { w: when, to: to, txt: clean }, log = txLoad(); log.push(e); txSave(log);
    radioTx(e); close(); launchUfo(to); bigStamp("NADANO", "KX7 · TX · " + when.slice(-5) + " · → " + txName(to).toUpperCase());
  }
  var stampT = 0;
  function bigStamp(txt, sub) {
    var el = $("#stamp"); el.querySelector("b").textContent = txt; $("#stampSub").textContent = sub;
    el.hidden = false; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
    clearTimeout(stampT); stampT = setTimeout(function () { el.classList.remove("on"); setTimeout(function () { el.hidden = true; }, 500); }, 2300);
  }
  function bez(p, u) { var a = 1 - u; return [a * a * a * p[0][0] + 3 * a * a * u * p[1][0] + 3 * a * u * u * p[2][0] + u * u * u * p[3][0], a * a * a * p[0][1] + 3 * a * a * u * p[1][1] + 3 * a * u * u * p[2][1] + u * u * u * p[3][1]]; }
  function easeIO(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function releaseUfo() { if (!UFO) return; [byId.rovi, UFO.tgt].forEach(function (c) { if (c && c.task && c.task.stage === "ufo") goHome(c); }); UFO = null; document.body.classList.remove("ufo-fly"); }
  function launchUfo(to) {
    releaseUfo();
    var rovi = byId.rovi, tgt = (to === "rovi" ? byId.mostek : byId[to]) || byId.mostek;
    [rovi, tgt].forEach(function (c) {
      if (c.scene) { var sc = c.scene; sc.parts.forEach(function (p) { p.scene = null; p.bubble = null; if (p !== rovi && p !== tgt && !atHome(p)) route(p, p.home); }); var ix = scenes.indexOf(sc); if (ix >= 0) scenes.splice(ix, 1); }
      c.bubble = null; c.sleeping = false; c.path = []; c.task = { stage: "ufo", label: c === rovi ? "odbiera transmisję" : "czeka na decyzję z czatu" };
    });
    if (follow) unselect();
    UFO = { t0: tNow, to: to, tgt: tgt, saved: { x: camT.x, y: camT.y, zoom: camT.zoom }, cam: true, x: UP[0][0], y: UP[0][1], tilt: 0, beam: 0, cap: null, flash: -9, trail: [], ev: {} };
    document.body.classList.add("ufo-fly");
    ufoSound();
  }
  function ufoSound() {
    if (!SET.snd || !AU.a || document.hidden) return;
    var a = AU.a, t0 = a.currentTime, o = a.createOscillator(), l = a.createOscillator(), lg = a.createGain(), g = a.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(950, t0); o.frequency.exponentialRampToValueAtTime(330, t0 + 3);
    l.frequency.value = 7; lg.gain.value = 45; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.045, t0 + .4); g.gain.setValueAtTime(.045, t0 + 2.6); g.gain.exponentialRampToValueAtTime(.0001, t0 + 3.4);
    o.connect(g); g.connect(AU.m); o.start(t0); l.start(t0); o.stop(t0 + 3.5); l.stop(t0 + 3.5);
  }
  function say(c, txt, dur) { c.bubble = { text: txt, start: tNow, until: tNow + (dur || 1.6 + txt.length / 48 + txt.length * .03), voice: voice(c.id) }; }
  function stepUfo(dt) {
    var u = UFO, T = tNow - u.t0, rovi = byId.rovi, px = u.x;
    if (T < 3) { var p = bez(UP, easeIO(T / 3)); u.x = p[0]; u.y = p[1]; }
    else if (T < 6.6) { u.x = 180 + Math.sin(T * 1.7) * 1.6; u.y = HOV + Math.sin(T * 2.3) * 1.3; }
    else { var q = Math.min(1, (T - 6.6) / 2.3), e = q * q * q; u.x = 180 - 340 * e + Math.sin(T * 2) * 1.2; u.y = HOV + (-230 - HOV) * e; }
    var vx = (u.x - px) / Math.max(dt, .001);
    u.tilt = Math.max(-.38, Math.min(.38, vx * .0045)) + Math.sin(T * 3.1) * .07;
    u.beam = T < 3.2 ? 0 : T < 3.6 ? (T - 3.2) / .4 : T < 6.2 ? 1 : T < 6.6 ? (6.6 - T) / .4 : 0;
    if ((T < 3.1 || T > 6.5) && T < 9.2) u.trail.push({ x: u.x, y: u.y + 1, life: 0 });
    u.trail.forEach(function (p) { p.life += dt; }); while (u.trail.length && u.trail[0].life > 1.1) u.trail.shift();
    u.cap = T >= 3.6 && T < 5 ? { x: 190 + Math.sin(T * 6) * .8, y: HOV + 6 + (CAPY - 3 - HOV - 6) * ((T - 3.6) / 1.4) } : null;
    function once(k, at, fn) { if (T >= at && !u.ev[k]) { u.ev[k] = 1; fn(); } }
    once("seen", 3.2, function () { emote(rovi, "!", 1.8); route(rovi, CONSOLE); blip(660, .08, "sine", .05); });
    once("land", 5, function () { u.flash = tNow; rovi.face = 1; blip(880, .14, "sine", .06); setTimeout(function () { blip(1320, .16, "sine", .05); }, 110); });
    once("ack", 5.25, function () { var t = "Odebrałem transmisję" + (u.to === "rovi" ? "" : " dla: " + txName(u.to)) + ". Odpowiedź przyjdzie w czacie Rovi Here."; say(rovi, t, 3.9); radio("rovi", null, t); });
    once("back", 6.8, function () { if (u.cam) { camT.x = u.saved.x; camT.y = u.saved.y; camT.zoom = u.saved.zoom; clampCam(camT); } u.cam = false; });
    once("relay", 9.3, function () { var t = "Przekazuję: " + u.tgt.d.imie + ". Decyzja zapadnie w czacie."; say(rovi, t, 3.2); radio("rovi", u.tgt.id, t); });
    once("tgt", 10.4, function () { emote(u.tgt, "!", 1.6); u.tgt.face = 1; });
    once("tgtSay", 11, function () { var t = "Przyjąłem. Czekam na decyzję z czatu."; say(u.tgt, t, 3.2); radio(u.tgt.id, "rovi", t); });
    once("end", 14.6, releaseUfo);
    if (UFO && u.cam && T < 6.8) {
      var zz = Math.min(ZMAX, Math.max(1.6, Math.min(2.3, (sw / S0) / 150)));
      camT.zoom = zz; camT.x = T < 3 ? u.x * .7 + 180 * .3 : 180; camT.y = T < 3 ? u.y + 14 : 66; clampCam(camT);
    }
  }
  function drawUfo(c, t) {
    if (!UFO) return; var u = UFO, x = u.x, y = u.y, i, a;
    c.globalCompositeOperation = "lighter";
    u.trail.forEach(function (p) { var k = 1 - p.life / 1.1; if (k <= 0) return; c.globalAlpha = k * .55; var r = 3 + 9 * k; c.drawImage(glow(p.life < .25 ? "#d6fafc" : "#5CE6F2"), p.x - r, p.y - r, r * 2, r * 2); });
    if (u.beam > 0) {
      var by = CAPY + 3, fl = .85 + .15 * Math.sin(t * 37), g = c.createLinearGradient(0, y, 0, by);
      g.addColorStop(0, "rgba(214,250,252," + (.62 * u.beam) + ")"); g.addColorStop(1, "rgba(63,224,230," + (.08 * u.beam) + ")");
      c.globalAlpha = fl; c.fillStyle = g; c.beginPath(); c.moveTo(x - 6, y + 4); c.lineTo(x + 6, y + 4); c.lineTo(x + 22, by); c.lineTo(x - 22, by); c.closePath(); c.fill();
      c.globalAlpha = u.beam * .5; c.fillStyle = "rgba(236,254,255,.5)"; c.beginPath(); c.moveTo(x - 1.5, y + 4); c.lineTo(x + 1.5, y + 4); c.lineTo(x + 5, by); c.lineTo(x - 5, by); c.closePath(); c.fill();
      for (i = 0; i < 4; i++) { var q = ((t * .9) + i / 4) % 1, ry = y + 6 + q * (by - y - 6), rw = 6 + q * 16; c.globalAlpha = u.beam * (1 - q) * .8; c.strokeStyle = "#bff6fa"; c.lineWidth = .6; c.beginPath(); c.ellipse(x, ry, rw, rw * .22, 0, 0, 7); c.stroke(); }
      c.globalAlpha = u.beam * .8; c.drawImage(glow("#8ff4fa"), x - 28, by - 9, 56, 18);
    }
    var fa = tNow - u.flash; if (fa >= 0 && fa < .9) { c.globalAlpha = 1 - fa / .9; c.strokeStyle = "#d6fafc"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(190, CAPY, 4 + fa * 30, (4 + fa * 30) * .35, 0, 0, 7); c.stroke(); c.drawImage(glow("#5CE6F2"), 190 - 20, CAPY - 20, 40, 40); }
    if (u.cap) { c.globalAlpha = 1; c.drawImage(glow("#8ff4fa"), u.cap.x - 10, u.cap.y - 10, 20, 20); }
    c.globalAlpha = .75 + .15 * Math.sin(t * 5); c.drawImage(glow("#5CE6F2"), x - 32, y - 20, 64, 40);
    c.globalAlpha = .6; c.drawImage(glow("#d6fafc"), x - 12, y - 2, 24, 14);
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
    if (u.cap) { c.save(); c.translate(u.cap.x, u.cap.y); c.rotate(t * 3); box(c, -1.7, -3.2, 3.4, 6.4, 1.7, "#eafcff", "#5CE6F2", .5); c.fillStyle = "#c43e34"; c.fillRect(-1.7, -.5, 3.4, 1); c.restore(); }
    c.save(); c.translate(x, y); c.rotate(u.tilt);
    c.fillStyle = "#162330"; c.beginPath(); c.ellipse(0, 2.4, 8, 2.8, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(191,246,250,.85)"; c.beginPath(); c.ellipse(0, 3.4, 4.5, 1.2, 0, 0, 7); c.fill();
    var bg = c.createLinearGradient(0, -4, 0, 4); bg.addColorStop(0, "#e4eef5"); bg.addColorStop(.45, "#8aa2b6"); bg.addColorStop(1, "#24364a");
    c.fillStyle = bg; c.beginPath(); c.ellipse(0, 0, 15.5, 4, 0, 0, 7); c.fill();
    c.strokeStyle = "rgba(10,20,30,.6)"; c.lineWidth = .35; c.stroke();
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = .4; c.beginPath(); c.ellipse(0, -.7, 13, 2.5, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.fillStyle = "#4fd18b"; c.beginPath(); c.arc(0, -4.4, 2, 0, 7); c.fill();
    c.fillStyle = "#03140a"; c.beginPath(); c.ellipse(-.8, -4.6, .55, .75, -.3, 0, 7); c.ellipse(.8, -4.6, .55, .75, .3, 0, 7); c.fill();
    var dg = c.createRadialGradient(-2, -6, .5, 0, -3.5, 7); dg.addColorStop(0, "rgba(230,255,255,.9)"); dg.addColorStop(.5, "rgba(92,230,242,.35)"); dg.addColorStop(1, "rgba(30,127,148,.45)");
    c.fillStyle = dg; c.beginPath(); c.ellipse(0, -2.2, 6.4, 5.2, 0, Math.PI, 2 * Math.PI); c.fill();
    c.strokeStyle = "rgba(191,246,250,.75)"; c.lineWidth = .4; c.stroke();
    c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.ellipse(-2.6, -5, 1.2, .6, -.5, 0, 7); c.fill();
    var cols = ["#eb7d69", "#5CE6F2", "#d6fafc", "#5CE6F2"], pts = [];
    for (i = 0; i < 10; i++) { a = t * 3.2 + i * Math.PI / 5; if (Math.sin(a) < -.15) continue; pts.push([Math.cos(a) * 12.4, Math.sin(a) * 2.6 + .5, cols[i % 4]]); }
    pts.forEach(function (p) { c.fillStyle = p[2]; c.beginPath(); c.arc(p[0], p[1], .85, 0, 7); c.fill(); });
    c.globalCompositeOperation = "lighter"; c.globalAlpha = .9;
    pts.forEach(function (p) { c.drawImage(glow(p[2]), p[0] - 3, p[1] - 3, 6, 6); });
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
    c.restore();
  }

  $("#btnUfo").onclick = composer;

  // ---------- ekran startowy ----------
  function boot() {
    var el = $("#boot"), log = $("#bootLog"), bar = $("#bootBar"), done = false;
    var lines = ["BLUE MOLD · SYSTEM POKŁADOWY", "rdzeń reaktora ............ OK", "kultura pleśni ............ stabilna, świeci", "akta załogi ............... " + chars.length + " teczek"];
    chars.forEach(function (c) { lines.push("  " + (active(c.id) ? "●" : "○") + " " + pad2(c.n) + " " + c.d.imie + " — " + stLabel(status(c.id)).toLowerCase()); });
    lines.push("kanał UFO · KX7-TX ......... gotowy", stopped() ? "STATUS: STOP (decyzja użytkownika)" : "STATUS: załoga na stanowiskach");
    var i = 0;
    el.classList.add("go");
    function next() { if (done) return; if (i < lines.length) { var d = document.createElement("div"); d.textContent = lines[i]; if (i === 0) d.className = "h"; if (/STATUS: STOP/.test(lines[i])) d.className = "r"; log.appendChild(d); while (log.children.length > 6) log.removeChild(log.firstChild); i++; bar.style.width = Math.round(i / lines.length * 100) + "%"; setTimeout(next, i < 4 ? 240 : 95); } else setTimeout(finish, 900); }
    function finish() { if (done) return; done = true; el.classList.add("out"); setTimeout(function () { el.hidden = true; }, 800); radio(null, null, stopped() ? "STOP: cała załoga ma pauzę (decyzja użytkownika). Pomysły i Profesor pracują na prośbę." : "Załoga na stanowiskach."); }
    el.addEventListener("click", finish); setTimeout(next, 500);
  }

  // świeższy stan z sieci (gdy strona jest hostowana; na file:// zostaje data/stan.js)
  if (location.protocol.indexOf("http") === 0) {
    fetch("data/stan.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.aktualizacja && j.aktualizacja !== STAN.aktualizacja) { STAN = j; assignHomes(); chars.forEach(function (c) { if (!c.scene) route(c, c.home); }); buildStatic(); chip(); renderRoster(); try { document.dispatchEvent(new CustomEvent("bm-stan")); } catch (e) {} }
    }).catch(function () {});
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  window.addEventListener("resize", resize);
  setCrt(SET.crt); document.body.classList.toggle("snd-on", SET.snd);
  if (SET.snd) { var once = function () { setSound(true); window.removeEventListener("pointerdown", once); }; window.addEventListener("pointerdown", once); }
  chip(); resize(); buildAvatars(); renderRoster(); lastAv.src = AV.rovi; txLoad().forEach(function (e) { radioTx(e, true); }); boot();
  if (document.fonts && document.fonts.load) { ["13px BMSerif", "italic 13px BMSerif", "600 12px BMSerif", "600 10px Plex", "800 10px BSD"].forEach(function (f) { document.fonts.load(f).catch(function () {}); }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { buildStatic(); buildAvatars(); renderRoster(); lastAv.src = AV.rovi; });
  rafId = requestAnimationFrame(frame);
  window.__bm = { open: open, close: close, toast: toast, esc: esc, av: AV, byId: byId, status: status, stLabel: stLabel, stClass: stClass, stampCls: stampCls, stampTxt: stampTxt,
    copyText: copyText, txFormat: txFormat, transmit: transmit, launchUfo: launchUfo, bigStamp: bigStamp, radio: radio, blip: blip, berlinFull: berlinFull, body: body, sheet: sheet,
    stan: function () { return STAN; }, isOpen: function () { return !sheet.hidden; }, setSim: setSim, chars: chars, focusRoom: focusRoom, select: function (id) { select(byId[id]); }, fit: fitView, composer: composer, dossier: dossier, crew: crewList, info: info, copyMode: function () { return COPY.last; }, ufo: function () { return UFO ? { x: UFO.x, y: UFO.y, t: tNow - UFO.t0 } : null; } };
})();
