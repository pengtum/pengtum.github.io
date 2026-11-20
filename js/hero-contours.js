/* Slowly drifting contour lines behind the homepage hero. */
(function () {
  var cv = document.getElementById('hero-bg');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HILLS = [[0.10, 0.30, 0.16, 0.30, 1.0, 0.9], [0.92, 0.25, 0.15, 0.32, 0.9, 1.2],
               [0.80, 0.85, 0.20, 0.30, 0.6, 0.7], [0.25, 0.90, 0.20, 0.28, 0.5, 1.1],
               [0.55, 0.15, 0.14, 0.25, 0.35, 1.3], [0.45, 0.65, 0.12, 0.22, 0.3, 0.8]];
  var NX = 120, NY = 60, LEVELS = 16, W = 0, H = 0, dpr = 1;
  var grid = new Float32Array((NX + 1) * (NY + 1));
  var fade = document.createElement('canvas');

  function field(x, y, t) {            // x, y in [0,1]
    var z = 0;
    for (var i = 0; i < HILLS.length; i++) {
      var h = HILLS[i];
      var cx = h[0] + 0.03 * Math.sin(t * 0.08 * h[5] + i), cy = h[1] + 0.05 * Math.cos(t * 0.07 * h[5] + 2 * i);
      var dx = (x - cx) / h[2], dy = (y - cy) / h[3];
      z += h[4] * Math.exp(-(dx * dx + dy * dy));
    }
    return z + 0.05 * Math.sin(x * 9 + t * 0.05) * Math.cos(y * 6 - t * 0.04);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = fade.width = Math.round(W * dpr); cv.height = fade.height = Math.round(H * dpr);
    // Fade mask: lines strongest at the page edges, faint behind the text, gone at the bottom.
    var f = fade.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, fade.width, fade.height);
    var gx = f.createLinearGradient(0, 0, fade.width, 0);
    gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.28, 'rgba(0,0,0,0.35)');
    gx.addColorStop(0.72, 'rgba(0,0,0,0.35)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
    f.fillStyle = gx; f.fillRect(0, 0, fade.width, fade.height);
    f.globalCompositeOperation = 'destination-in';
    var gy = f.createLinearGradient(0, 0, 0, fade.height);
    gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(0.55, 'rgba(0,0,0,0.8)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = gy; f.fillRect(0, 0, fade.width, fade.height);
    f.globalCompositeOperation = 'source-over';
    draw(lastT);
  }

  var lastT = 0;
  function draw(t) {
    lastT = t;
    var i, j, k, zmin = 1e9, zmax = -1e9, dx = 1 / NX, dy = 1 / NY;
    for (j = 0; j <= NY; j++) for (i = 0; i <= NX; i++) {
      var v = field(i * dx, j * dy, t); grid[j * (NX + 1) + i] = v;
      if (v < zmin) zmin = v; if (v > zmax) zmax = v;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineWidth = 1 * dpr; ctx.strokeStyle = 'rgba(45,90,142,0.42)'; ctx.lineCap = 'round';
    ctx.beginPath();
    var sx = cv.width, sy = cv.height;
    for (k = 0; k < LEVELS; k++) {
      var L = zmin + (zmax - zmin) * (k + 0.5) / LEVELS;
      for (j = 0; j < NY; j++) for (i = 0; i < NX; i++) {
        var a = grid[j * (NX + 1) + i], b = grid[j * (NX + 1) + i + 1],
            c = grid[(j + 1) * (NX + 1) + i + 1], d = grid[(j + 1) * (NX + 1) + i];
        var code = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
        if (code === 0 || code === 15) continue;
        var X = i * dx, Y = j * dy, p = [];
        if ((a > L) !== (b > L)) p.push(X + dx * (L - a) / (b - a), Y);
        if ((b > L) !== (c > L)) p.push(X + dx, Y + dy * (L - b) / (c - b));
        if ((d > L) !== (c > L)) p.push(X + dx * (L - d) / (c - d), Y + dy);
        if ((a > L) !== (d > L)) p.push(X, Y + dy * (L - a) / (d - a));
        for (var q = 0; q + 3 < p.length; q += 4) {
          ctx.moveTo(p[q] * sx, p[q + 1] * sy); ctx.lineTo(p[q + 2] * sx, p[q + 3] * sy);
        }
      }
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(fade, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  var visible = true, t0 = performance.now(), last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden || now - last < 50) return;   // ~20 fps
    last = now; draw((now - t0) / 1000);
  }
  window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window)
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
  resize();
  if (!reduce) requestAnimationFrame(loop);
})();
