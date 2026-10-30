/* Blue Mold: Containment – pencil/graphite renderer for the deck plan (canvas 2D).
   Paper is the page background; everything is drawn in graphite strokes with a seeded jitter so the sketch
   stays stable between frames. The glowing blue of the mold is the only colour. */
(function (root) {
  "use strict";
  var INK = "42,44,48", BLUE = "23,194,227", GLOW = "92,230,242";
  var LABEL = { B: "BRIDGE", R: "REACTOR", C: "CREW" };

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; }

  /* a hand-drawn line: two slightly different passes, low alpha */
  function pline(c, r, x1, y1, x2, y2, w, a, passes) {
    passes = passes || 2;
    for (var p = 0; p < passes; p++) {
      var j = w * 0.9, mx = (x1 + x2) / 2 + (r() - .5) * j * 2, my = (y1 + y2) / 2 + (r() - .5) * j * 2;
      c.beginPath(); c.lineWidth = w * (0.7 + r() * 0.5); c.strokeStyle = "rgba(" + INK + "," + (a * (0.75 + r() * 0.35)).toFixed(3) + ")";
      c.moveTo(x1 + (r() - .5) * j, y1 + (r() - .5) * j); c.quadraticCurveTo(mx, my, x2 + (r() - .5) * j, y2 + (r() - .5) * j); c.stroke();
    }
  }
  function pcircle(c, r, x, y, rad, w, a) {
    for (var p = 0; p < 2; p++) {
      c.beginPath(); c.lineWidth = w; c.strokeStyle = "rgba(" + INK + "," + a + ")";
      var st = r() * 6.28, n = Math.max(18, Math.min(64, Math.round(rad / 2)));
      for (var k = 0; k <= n + 1; k++) { var t = st + k / n * 6.6, rr = rad * (0.94 + r() * 0.12); var px = x + Math.cos(t) * rr, py = y + Math.sin(t) * rr; if (k) c.lineTo(px, py); else c.moveTo(px, py); }
      c.stroke();
    }
  }
  function hatch(c, r, x, y, s, gap, a, w, dir) {
    c.save(); c.beginPath(); c.rect(x, y, s, s); c.clip();
    for (var d = -s; d < s * 2; d += gap) {
      if (dir > 0) pline(c, r, x + d, y + s + 1, x + d + s + 2, y - 1, w, a, 1);
      else pline(c, r, x + d, y - 1, x + d + s + 2, y + s + 1, w, a, 1);
    }
    c.restore();
  }

  function Renderer(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext("2d");
    this.st = null; this.prev = null; this.stat = null; this.mode = "seal";
    this.anim = {}; this.flash = null; this.t0 = performance.now(); this.raf = 0; this.dirty = true;
    this.reduce = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var self = this; this._loop = function (t) { self.frame(t); };
  }
  Renderer.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 3);
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height); this.dpr = dpr;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.layout(); this.stat = null; this.dirty = true;
  };
  Renderer.prototype.layout = function () {
    if (!this.st) return;
    var g = this.st.g, cs = Math.floor(Math.min((this.W - 8) / g.w, (this.H - 8) / g.h));
    this.cs = Math.max(8, cs); this.ox = Math.round((this.W - this.cs * g.w) / 2); this.oy = Math.round((this.H - this.cs * g.h) / 2);
  };
  Renderer.prototype.setState = function (st, fresh) {
    var old = this.st; this.st = st; var now = performance.now();
    if (fresh || !old || old.g !== st.g) { this.anim = {}; this.stat = null; this.layout(); this.seed = hash(st.g.w * 31 + st.g.h, (st.level.code || "x").charCodeAt(5) || 7); }
    else if (st.grown) for (var i = 0; i < st.grown.length; i++) this.anim[st.grown[i]] = now;
    if (st.last && st.last.t === "burn") this.anim["a" + st.last.i] = now;
    if (st.last && st.last.t === "seal") this.anim["s" + st.last.i] = now;
    this.dirty = true; this.start();
  };
  Renderer.prototype.setMode = function (m) { this.mode = m; this.dirty = true; };
  Renderer.prototype.ping = function (i) { this.flash = { i: i, t: performance.now() }; this.dirty = true; this.start(); };
  Renderer.prototype.cellAt = function (cx, cy) {
    if (!this.st) return -1; var r = this.cv.getBoundingClientRect(), g = this.st.g;
    var x = Math.floor((cx - r.left - this.ox) / this.cs), y = Math.floor((cy - r.top - this.oy) / this.cs);
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return -1; return y * g.w + x;
  };
  Renderer.prototype.cellCenter = function (i) {
    var g = this.st.g, r = this.cv.getBoundingClientRect();
    return { x: r.left + this.ox + (i % g.w + .5) * this.cs, y: r.top + this.oy + (((i / g.w) | 0) + .5) * this.cs };
  };
  Renderer.prototype.start = function () { if (!this.raf) this.raf = requestAnimationFrame(this._loop); };
  Renderer.prototype.stop = function () { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; };

  /* static layer: hull, walls, floor, labels (cached until resize/level change) */
  Renderer.prototype.buildStatic = function () {
    var g = this.st.g, cs = this.cs, dpr = this.dpr, off = document.createElement("canvas");
    off.width = this.cv.width; off.height = this.cv.height;
    var c = off.getContext("2d"); c.scale(dpr, dpr); c.lineCap = "round"; c.lineJoin = "round";
    var r = rng(this.seed), ox = this.ox, oy = this.oy, x, y, i, ch;
    function cell(xx, yy) { return xx < 0 || yy < 0 || xx >= g.w || yy >= g.h ? " " : g.cells[yy * g.w + xx]; }
    function solid(ch) { return ch === "#" || ch === " "; }
    var lw = Math.max(0.8, cs / 26);
    for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) {
      ch = cell(x, y); var px = ox + x * cs, py = oy + y * cs;
      if (ch === "#") {
        hatch(c, r, px, py, cs, Math.max(3, cs / 5), 0.42, lw * .8, 1);
      } else if (ch !== " ") {
        if (LABEL[ch]) { hatch(c, r, px, py, cs, Math.max(4, cs / 3.2), 0.13, lw * .7, -1); }
        else { c.fillStyle = "rgba(" + INK + ",.28)"; c.beginPath(); c.arc(px + cs / 2 + (r() - .5) * 2, py + cs / 2 + (r() - .5) * 2, Math.max(.7, cs / 34), 0, 7); c.fill(); }
      }
    }
    /* outlines between solid and open cells, plus hull outline between wall and outside */
    for (y = 0; y <= g.h; y++) for (x = 0; x <= g.w; x++) {
      var a = cell(x, y), up = cell(x, y - 1), lf = cell(x - 1, y), px2 = ox + x * cs, py2 = oy + y * cs;
      if (x < g.w && solid(a) !== solid(up)) pline(c, r, px2, py2, px2 + cs, py2, lw * 1.5, .8, 2);
      else if (x < g.w && ((a === "#") !== (up === "#")) && (a === " " || up === " ")) pline(c, r, px2, py2, px2 + cs, py2, lw * 1.2, .55, 1);
      if (y < g.h && solid(a) !== solid(lf)) pline(c, r, px2, py2, px2, py2 + cs, lw * 1.5, .8, 2);
      else if (y < g.h && ((a === "#") !== (lf === "#")) && (a === " " || lf === " ")) pline(c, r, px2, py2, px2, py2 + cs, lw * 1.2, .55, 1);
      /* room borders between critical compartments and corridor */
      if (x < g.w && !solid(a) && !solid(up) && (!!LABEL[a]) !== (!!LABEL[up])) pline(c, r, px2 + 2, py2, px2 + cs - 2, py2, lw, .35, 1);
      if (y < g.h && !solid(a) && !solid(lf) && (!!LABEL[a]) !== (!!LABEL[lf])) pline(c, r, px2, py2 + 2, px2, py2 + cs - 2, lw, .35, 1);
    }
    /* labels for critical compartments */
    var seen = {};
    for (i = 0; i < g.cells.length; i++) {
      ch = g.cells[i]; if (!LABEL[ch] || seen[i]) continue;
      var stack = [i], cells = []; seen[i] = 1;
      while (stack.length) { var k = stack.pop(); cells.push(k); var nb = g.nb[k]; for (var j = 0; j < nb.length; j++) if (!seen[nb[j]] && g.cells[nb[j]] === ch) { seen[nb[j]] = 1; stack.push(nb[j]); } }
      var x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      cells.forEach(function (k) { var xx = k % g.w, yy = (k / g.w) | 0; x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); });
      var bw = (x1 - x0 + 1) * cs, bh = (y1 - y0 + 1) * cs, fs = Math.min(cs * .55, bw / (LABEL[ch].length * .72));
      c.save(); c.font = "600 " + Math.max(8, fs) + "px Plex, ui-monospace, monospace"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = "rgba(238,234,223,.85)"; var tw = c.measureText(LABEL[ch]).width;
      var lx = ox + x0 * cs + bw / 2, ly = oy + y0 * cs + bh / 2;
      c.fillRect(lx - tw / 2 - 4, ly - fs * .6, tw + 8, fs * 1.2);
      c.fillStyle = "rgba(" + INK + ",.85)"; c.fillText(LABEL[ch], lx, ly); c.restore();
    }
    this.stat = off;
  };

  Renderer.prototype.frame = function (t) {
    this.raf = 0;
    if (!this.st || !this.W) return;
    if (!this.stat) this.buildStatic();
    var c = this.ctx, g = this.st.g, st = this.st, cs = this.cs, ox = this.ox, oy = this.oy, dpr = this.dpr, i, x, y, px, py, k;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height); c.drawImage(this.stat, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.lineCap = "round"; c.lineJoin = "round";
    var r = rng(this.seed + 99), lw = Math.max(0.8, cs / 26), animating = false;
    /* heartbeat: three beats and a pause */
    var ph = ((t - this.t0) / 1000) % 2.4, beat = 0;
    if (!this.reduce) for (k = 0; k < 3; k++) { var d = ph - k * 0.32; if (d > 0 && d < 0.3) beat = Math.max(beat, Math.sin(d / 0.3 * Math.PI)); }
    var targets = st.status === "play" ? root.BMEngine.targets(st) : [];
    var tset = {}; targets.forEach(function (q) { tset[q] = 1; });

    for (i = 0; i < g.cells.length; i++) {
      var ch = g.cells[i]; if (ch === "#" || ch === " ") continue;
      x = i % g.w; y = (i / g.w) | 0; px = ox + x * cs; py = oy + y * cs; var rr = rng(hash(i, this.seed));
      if (ch === "+") {
        var vert = (g.cells[i - 1] === "#" || g.cells[i + 1] === "#") && !(g.cells[i - g.w] === "#" && g.cells[i + g.w] === "#") ? false : true;
        /* door leaf drawn across the passage */
        if (!vert) { pline(c, rr, px + 2, py + cs * .38, px + cs - 2, py + cs * .38, lw, .75, 1); pline(c, rr, px + 2, py + cs * .62, px + cs - 2, py + cs * .62, lw, .75, 1); }
        else { pline(c, rr, px + cs * .38, py + 2, px + cs * .38, py + cs - 2, lw, .75, 1); pline(c, rr, px + cs * .62, py + 2, px + cs * .62, py + cs - 2, lw, .75, 1); }
        if (st.sealed[i]) this.drawSeal(c, rr, px, py, cs, lw, t - (this.anim["s" + i] || 0));
        else if (st.status === "play" && this.mode === "seal" && root.BMEngine.canSeal(st, i)) { c.setLineDash([3, 3]); pcircle(c, rr, px + cs / 2, py + cs / 2, cs * .46, lw * .9, .45); c.setLineDash([]); }
      } else if (ch === "v") {
        pcircle(c, rr, px + cs / 2, py + cs / 2, cs * .34, lw * 1.2, .8);
        for (k = -1; k <= 1; k++) pline(c, rr, px + cs * .3, py + cs / 2 + k * cs * .12, px + cs * .7, py + cs / 2 + k * cs * .12, lw * .8, .6, 1);
        if (st.sealed[i]) this.drawSeal(c, rr, px, py, cs, lw, t - (this.anim["s" + i] || 0));
        else if (st.status === "play" && this.mode === "seal" && root.BMEngine.canSeal(st, i)) { c.setLineDash([3, 3]); pcircle(c, rr, px + cs / 2, py + cs / 2, cs * .48, lw * .9, .45); c.setLineDash([]); }
      } else if (ch === "*") {
        c.save(); c.font = (cs * .42) + "px Garamond, serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillStyle = "rgba(" + INK + ",.55)"; c.fillText("*", px + cs * .3, py + cs * .4); c.fillText("*", px + cs * .7, py + cs * .7); c.restore();
        if (st.cold[i] && !st.mold[i]) { c.strokeStyle = "rgba(" + BLUE + ",.7)"; c.lineWidth = lw; c.setLineDash([2, 3]); c.strokeRect(px + 3, py + 3, cs - 6, cs - 6); c.setLineDash([]); }
      }
      if (st.ash[i]) {
        var at = t - (this.anim["a" + i] || 0), aa = Math.min(1, at / 400); if (aa < 1) animating = true;
        c.fillStyle = "rgba(" + INK + "," + (0.28 * aa) + ")"; c.beginPath(); c.arc(px + cs / 2, py + cs / 2, cs * .42, 0, 7); c.fill();
        for (k = 0; k < 5; k++) pline(c, rr, px + cs * (.2 + rr() * .2), py + cs * (.2 + rr() * .6), px + cs * (.6 + rr() * .2), py + cs * (.2 + rr() * .6), lw * .8, .5 * aa, 1);
      }
    }
    /* predicted growth */
    if (targets.length) {
      for (k = 0; k < targets.length; k++) {
        i = targets[k]; px = ox + (i % g.w + .5) * cs; py = oy + (((i / g.w) | 0) + .5) * cs;
        c.fillStyle = "rgba(" + BLUE + "," + (0.35 + beat * 0.25) + ")"; c.beginPath(); c.arc(px, py, Math.max(1.5, cs * .09), 0, 7); c.fill();
      }
    }
    /* the mold: glowing blobs + tendrils */
    c.save(); c.globalCompositeOperation = "multiply";
    for (i = 0; i < g.cells.length; i++) if (st.mold[i]) {
      px = ox + (i % g.w + .5) * cs; py = oy + (((i / g.w) | 0) + .5) * cs;
      c.fillStyle = "rgba(" + INK + ",.10)"; c.beginPath(); c.arc(px, py, cs * .47, 0, 7); c.fill();
    }
    c.restore();
    c.save(); c.globalCompositeOperation = "source-over";
    for (i = 0; i < g.cells.length; i++) {
      if (!st.mold[i]) continue;
      x = i % g.w; y = (i / g.w) | 0; px = ox + (x + .5) * cs; py = oy + (y + .5) * cs;
      var age = t - (this.anim[i] || 0), grow = this.reduce ? 1 : Math.min(1, age / 450); if (grow < 1) animating = true;
      var rad = cs * (.42 + beat * .06) * (.35 + .65 * grow), rq = rng(hash(i, 7));
      var gr = c.createRadialGradient(px, py, 0, px, py, rad * 1.5);
      gr.addColorStop(0, "rgba(" + GLOW + "," + (0.95 * grow) + ")"); gr.addColorStop(.45, "rgba(" + BLUE + "," + (0.65 * grow) + ")"); gr.addColorStop(1, "rgba(" + BLUE + ",0)");
      c.fillStyle = gr; c.beginPath();
      for (k = 0; k <= 10; k++) { var a2 = k / 10 * 6.283, q = rad * (0.85 + rq() * 0.35); if (k) c.lineTo(px + Math.cos(a2) * q, py + Math.sin(a2) * q); else c.moveTo(px + Math.cos(a2) * q, py + Math.sin(a2) * q); }
      c.fill();
      /* tendrils to infected neighbours */
      var nb = g.nb[i];
      for (k = 0; k < nb.length; k++) if (nb[k] > i && st.mold[nb[k]]) {
        var qx = ox + (nb[k] % g.w + .5) * cs, qy = oy + (((nb[k] / g.w) | 0) + .5) * cs;
        c.strokeStyle = "rgba(" + BLUE + "," + (0.55 * grow) + ")"; c.lineWidth = cs * .22; c.beginPath(); c.moveTo(px, py); c.lineTo(qx, qy); c.stroke();
      }
      /* graphite speckles on top: spores */
      c.fillStyle = "rgba(8,60,75," + (0.55 * grow) + ")";
      for (k = 0; k < 3; k++) { c.beginPath(); c.arc(px + (rq() - .5) * cs * .6, py + (rq() - .5) * cs * .6, Math.max(.6, cs * .035), 0, 7); c.fill(); }
    }
    c.restore();
    /* torch mode: rings around burnable mold */
    if (this.mode === "burn" && st.status === "play" && st.torch > 0) {
      c.setLineDash([4, 3]);
      for (i = 0; i < g.cells.length; i++) if (st.mold[i]) pcircle(c, rng(i + 3), ox + (i % g.w + .5) * cs, oy + (((i / g.w) | 0) + .5) * cs, cs * .48, lw, .7);
      c.setLineDash([]);
    }
    /* breach marker */
    if (st.breach >= 0) {
      i = st.breach; px = ox + (i % g.w + .5) * cs; py = oy + (((i / g.w) | 0) + .5) * cs;
      pcircle(c, rng(5), px, py, cs * .9, lw * 2, .9); pcircle(c, rng(6), px, py, cs * 1.05, lw * 1.2, .6);
    }
    if (this.flash) {
      var ft = t - this.flash.t; if (ft < 500) { i = this.flash.i; animating = true;
        c.strokeStyle = "rgba(" + INK + "," + (1 - ft / 500) + ")"; c.lineWidth = lw * 2; c.beginPath();
        c.arc(ox + (i % g.w + .5) * cs, oy + (((i / g.w) | 0) + .5) * cs, cs * (.3 + ft / 900), 0, 7); c.stroke(); } else this.flash = null;
    }
    if (!this.reduce || animating) this.raf = requestAnimationFrame(this._loop);
  };
  Renderer.prototype.drawSeal = function (c, rr, px, py, cs, lw, age) {
    var a = Math.min(1, Math.max(0, age) / 300);
    c.fillStyle = "rgba(238,234,223," + a + ")"; c.fillRect(px + 2, py + 2, cs - 4, cs - 4);
    hatch(c, rr, px + 2, py + 2, cs - 4, Math.max(2.5, cs / 7), .7 * a, lw * .9, 1);
    hatch(c, rr, px + 2, py + 2, cs - 4, Math.max(2.5, cs / 7), .45 * a, lw * .8, -1);
    c.strokeStyle = "rgba(" + INK + "," + (.95 * a) + ")"; c.lineWidth = lw * 1.8; c.strokeRect(px + 2, py + 2, cs - 4, cs - 4);
  };

  /* title illustration: Saturn, its rings and a small freighter with a blue glow in the hold */
  function drawTitle(cv) {
    var c = cv.getContext("2d"), W = cv.width, H = cv.height, r = rng(42); c.clearRect(0, 0, W, H); c.lineCap = "round";
    var cx = W * .5, cy = H * .42, R = W * .26;
    c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.clip();
    for (var d = -R * 2; d < R * 2; d += 5) pline(c, r, cx + d - R, cy + R, cx + d + R, cy - R, .8, .32, 1);
    for (var b = -3; b <= 3; b++) pline(c, r, cx - R, cy + b * R * .22, cx + R, cy + b * R * .22 + 6, 1.2, .25, 1);
    c.restore();
    pcircle(c, r, cx, cy, R, 1.6, .85);
    for (var k = 0; k < 4; k++) { c.beginPath(); c.lineWidth = 1 + (k === 1 ? .8 : 0); c.strokeStyle = "rgba(" + INK + "," + (.7 - k * .12) + ")";
      c.ellipse(cx, cy + 4, R * (1.55 + k * .12), R * (.32 + k * .03), -.22, 0.15 * Math.PI, 1.95 * Math.PI, false); c.stroke(); }
    /* freighter */
    var sx = W * .5, sy = H * .82;
    c.save(); c.translate(sx, sy); c.rotate(-.08);
    var hull = [[-90, 0], [-70, -16], [40, -16], [78, -6], [86, 0], [78, 6], [40, 16], [-70, 16]];
    for (var p = 0; p < 2; p++) { c.beginPath(); c.lineWidth = 1.6; c.strokeStyle = "rgba(" + INK + ",.85)";
      hull.forEach(function (q, i) { var x = q[0] + (r() - .5) * 2, y = q[1] + (r() - .5) * 2; if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); c.stroke(); }
    for (var x2 = -60; x2 < 40; x2 += 20) pline(c, r, x2, -16, x2, 16, 1, .45, 1);
    hatch(c, r, -98, -8, 10, 3, .6, .8, 1);
    var gr = c.createRadialGradient(-10, 0, 0, -10, 0, 34); gr.addColorStop(0, "rgba(" + GLOW + ",.95)"); gr.addColorStop(.5, "rgba(" + BLUE + ",.5)"); gr.addColorStop(1, "rgba(" + BLUE + ",0)");
    c.fillStyle = gr; c.beginPath(); c.arc(-10, 0, 34, 0, 7); c.fill();
    c.restore();
    c.fillStyle = "rgba(" + INK + ",.5)"; for (var s = 0; s < 40; s++) { c.beginPath(); c.arc(r() * W, r() * H * .95, r() * 1.2 + .3, 0, 7); c.fill(); }
  }

  root.BMRender = { Renderer: Renderer, drawTitle: drawTitle };
})(typeof self !== "undefined" ? self : this);
