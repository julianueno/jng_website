/*
  Contours: a slowly shifting topographic map drawn on a canvas.
  A noise field is drawn as contour lines (marching squares); one level is traced in the accent colour.
  The cursor raises the terrain so lines gather around it; an optional "focus" point can do the same.

  Used by the About panel: light lines on ink (dark lines on cream on phones, set in CSS), with a survey crosshair + coordinate readout at the cursor.

  window.Contours.create(canvas, options) -> { start, stop, focus(x, y), unfocus() }
*/
(function () {
  'use strict';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- value noise (shared) ---------- */
  var P = new Uint8Array(256);
  for (var i = 0; i < 256; i++) P[i] = i;
  for (i = 255; i > 0; i--) { var r = Math.floor(Math.random() * (i + 1)), s = P[i]; P[i] = P[r]; P[r] = s; }
  function h(x, y, z) { return P[(P[(P[x & 255] + y) & 255] + z) & 255] / 255; }
  function fade(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function noise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
    return lerp(
      lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
      w);
  }

  var DEFAULTS = {
    cell: 14,
    minor: 'rgba(251,250,248,0.11)', major: 'rgba(251,250,248,0.26)',
    trace: 'rgba(184,64,31,0.95)', traceWidth: 1.6,
    cursorLift: 0.32, cursorRadius: 110,
    focusLift: 0.3, focusRadius: 90,
    probe: false, probeText: 'rgba(251,250,248,0.75)',
    seed: 0, speed: 1
  };

  function create(cv, opts) {
    if (!cv || !cv.getContext) return null;
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in (opts || {})) o[k] = opts[k];
    var base = { minor: o.minor, major: o.major, probeText: o.probeText };
    var ctx = cv.getContext('2d');
    var CELL = o.cell, W = 0, H = 0, cols = 0, rows = 0, field = null;
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, in: false, a: 0 };
    var foc = { x: 0, y: 0, tx: 0, ty: 0, on: false, a: 0, set: false };

    function resize() {
      var rect = cv.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = rect.width; H = rect.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
      field = new Float32Array(cols * rows);
      // CSS can override the line colours (e.g. dark lines on the white About on phones)
      var cs = getComputedStyle(cv);
      o.minor = cs.getPropertyValue('--contour-minor').trim() || base.minor;
      o.major = cs.getPropertyValue('--contour-major').trim() || base.major;
      o.probeText = cs.getPropertyValue('--contour-probe').trim() || base.probeText;
    }

    function compute(t) {
      var R2 = 2 * o.cursorRadius * o.cursorRadius, F2 = 2 * o.focusRadius * o.focusRadius;
      var tz = t * o.speed, sx = o.seed * 37.1;
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var x = i * CELL, y = j * CELL, dx, dy;
          var v = noise(x * 0.0035 + sx, y * 0.0035, tz * 0.06) * 0.72 + noise(x * 0.012 + 40 + sx, y * 0.012, tz * 0.1) * 0.28;
          if (mouse.a > 0.001) { dx = x - mouse.x; dy = y - mouse.y; v += o.cursorLift * mouse.a * Math.exp(-(dx * dx + dy * dy) / R2); }
          if (foc.a > 0.001) { dx = x - foc.x; dy = y - foc.y; v += o.focusLift * foc.a * Math.exp(-(dx * dx + dy * dy) / F2); }
          field[j * cols + i] = v;
        }
      }
    }

    // marching squares: corners a(top-left)=8 b(top-right)=4 c(bottom-right)=2 d(bottom-left)=1
    function contour(L) {
      for (var j = 0; j < rows - 1; j++) {
        for (var i = 0; i < cols - 1; i++) {
          var a = field[j * cols + i], b = field[j * cols + i + 1];
          var c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
          var n = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
          if (n === 0 || n === 15) continue;
          var x = i * CELL, y = j * CELL;
          var T = [x + CELL * (L - a) / (b - a), y];
          var Rt = [x + CELL, y + CELL * (L - b) / (c - b)];
          var B = [x + CELL * (L - d) / (c - d), y + CELL];
          var Lf = [x, y + CELL * (L - a) / (d - a)];
          switch (n) {
            case 1: case 14: seg(Lf, B); break;
            case 2: case 13: seg(B, Rt); break;
            case 3: case 12: seg(Lf, Rt); break;
            case 4: case 11: seg(T, Rt); break;
            case 6: case 9: seg(T, B); break;
            case 7: case 8: seg(T, Lf); break;
            case 5: seg(T, Rt); seg(Lf, B); break;
            case 10: seg(T, Lf); seg(B, Rt); break;
          }
        }
      }
    }
    function seg(p, q) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }

    var LEVELS = [];
    for (var l = 0.18; l < 1.05; l += 0.055) LEVELS.push(l);
    var TRACE = 7; // the level drawn in the accent colour

    function draw(t, snap) {
      var e = snap ? 1 : 0.12;
      mouse.x += (mouse.tx - mouse.x) * e;
      mouse.y += (mouse.ty - mouse.y) * e;
      mouse.a += ((mouse.in ? 1 : 0) - mouse.a) * (snap ? 1 : 0.06);
      foc.x += (foc.tx - foc.x) * (snap ? 1 : 0.07);
      foc.y += (foc.ty - foc.y) * (snap ? 1 : 0.07);
      foc.a += ((foc.on ? 1 : 0) - foc.a) * (snap ? 1 : 0.04);
      compute(t);
      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = 'round';
      LEVELS.forEach(function (L, n) {
        if (n === TRACE) return;
        ctx.beginPath();
        contour(L);
        ctx.strokeStyle = n % 4 === 0 ? o.major : o.minor;
        ctx.lineWidth = n % 4 === 0 ? 1.1 : 0.8;
        ctx.stroke();
      });
      ctx.beginPath();
      contour(LEVELS[TRACE]);
      ctx.strokeStyle = o.trace;
      ctx.lineWidth = o.traceWidth;
      ctx.stroke();
      if (o.probe && mouse.a > 0.02) probe();
    }

    // crosshair + readout at the cursor, like a survey point
    function probe() {
      var x = mouse.x, y = mouse.y;
      ctx.save();
      ctx.globalAlpha = mouse.a;
      ctx.strokeStyle = '#B8401F'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.moveTo(x - 18, y); ctx.lineTo(x - 10, y); ctx.moveTo(x + 10, y); ctx.lineTo(x + 18, y);
      ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 10); ctx.moveTo(x, y + 10); ctx.lineTo(x, y + 18);
      ctx.stroke();
      var lat = 51.47 + (H / 2 - y) / H * 0.08, lon = -0.035 + (x - W / 2) / W * 0.12;
      var i = Math.round(x / CELL), j = Math.round(y / CELL);
      var z = field && i >= 0 && j >= 0 && i < cols && j < rows ? field[j * cols + i] : 0;
      ctx.font = '10px "Space Mono", monospace';
      ctx.fillStyle = o.probeText;
      ctx.fillText(lat.toFixed(4) + '\u00b0N ' + Math.abs(lon).toFixed(4) + (lon < 0 ? '\u00b0W' : '\u00b0E'), x + 22, y - 6);
      ctx.fillText('z ' + (z * 100).toFixed(1), x + 22, y + 8);
      ctx.restore();
    }

    /* ---------- loop ---------- */
    var running = false, raf = 0, last = 0, t0 = performance.now();
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // ~30fps is plenty for drifting lines
      last = now;
      draw((now - t0) / 1000);
    }
    function still() { draw((performance.now() - t0) / 1000, true); }
    function start() {
      resize();
      if (reduceMotion) { still(); return; }
      if (running) return;
      running = true; last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    var host = o.host || cv.parentElement;
    host.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch') return;
      var rect = cv.getBoundingClientRect();
      mouse.tx = ev.clientX - rect.left; mouse.ty = ev.clientY - rect.top;
      if (!mouse.in) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
      mouse.in = true;
      if (reduceMotion) still();
    });
    host.addEventListener('pointerleave', function () { mouse.in = false; if (reduceMotion) still(); });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (running || reduceMotion) { resize(); if (reduceMotion) still(); } }, 80);
    });

    return {
      start: start, stop: stop,
      focus: function (x, y) {
        foc.tx = x; foc.ty = y;
        if (!foc.set) { foc.x = x; foc.y = y; foc.set = true; }
        foc.on = true;
        if (reduceMotion && field) still();
      },
      unfocus: function () { foc.on = false; }
    };
  }

  window.Contours = { create: create };

  /* ---------- About: runs only while the panel is open ---------- */
  var aboutCv = document.getElementById('aboutBg');
  if (aboutCv) window.aboutBg = create(aboutCv, { probe: true, seed: 1 });
})();
