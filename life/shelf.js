(function () {
  var cfg = window.SHELF, items = cfg.items, wall = document.getElementById('wall'), cap = document.getElementById('cap'), insight = document.getElementById('insight');
  var inner = document.createElement('div'); inner.id = 'wallInner'; wall.appendChild(inner);
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, cw = 0, ch = 0, ptr = null, last = null, focus = null, raf = 0, touching = false, mode = cfg.modes[0][0], hl = null, map = null, heads = {};
  var idle = cap.innerHTML;
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function initials(n) { return n.replace(/\(.*?\)|&.*$/g, '').trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function face(n) { var a = cfg.authors[n] || {}; return a.photo ? '<img src="' + a.photo + '" alt="" />' : '<span>' + esc(initials(n)) + '</span>'; }

  var q = [], active = 0;
  function pump() {
    while (active < 8 && q.length) (function (j) {
      active++;
      j.im.onload = function () { active--; pump(); };
      j.im.onerror = function () { active--; if (++j.n < 4) q.push(j); pump(); };
      j.im.src = j.url + (j.n ? '?r=' + j.n : '');
    })(q.shift());
  }

  var tiles = items.map(function (it) {
    var a = document.createElement('a');
    a.className = 'tile'; a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', it.en + ', ' + it.sub);
    if (it.img) { var im = new Image(); im.alt = ''; im.draggable = false; q.push({ im: im, url: it.img, n: 0 }); a.appendChild(im); }
    else { var n = document.createElement('span'); n.className = 'nocover'; n.textContent = it.en; a.appendChild(n); }
    var b = document.createElement('span'); b.className = 'badge'; b.textContent = it.d.slice(5); a.appendChild(b);
    inner.appendChild(a);
    var t = { el: a, it: it, tx: 0, ty: 0, x: null, y: null, s: calm ? 1 : .2, o: 0, rx: 0, ry: 0, delay: calm ? 0 : Math.random() * 500 };
    a.addEventListener('focus', function () { if (!ptr) { setFocus(t); wake(); } });
    a.addEventListener('blur', function () { if (!ptr) { setFocus(null); wake(); } });
    a.addEventListener('click', function (e) { if (touching && focus !== t) { e.preventDefault(); setFocus(t); ptr = { x: t.tx, y: t.ty }; wake(); } });
    return t;
  });
  pump();

  function byDate(a, b) { return b.it.d.localeCompare(a.it.d); }
  function bucket(key, rank) {
    var m = {}, out = [];
    tiles.forEach(function (t) { var k = key(t); (m[k] = m[k] || []).push(t); });
    Object.keys(m).forEach(function (k) { out.push({ key: k, items: m[k].sort(byDate) }); });
    return out.sort(rank);
  }
  function nn(n) { return n + ' ' + (n === 1 ? cfg.noun.slice(0, -1) : cfg.noun); }
  function pct(n) { return Math.round(n / tiles.length * 100) + '%'; }
  function arrange() {
    if (mode === 'color') return null;
    var g;
    if (mode === 'time') { g = bucket(function (t) { return t.it.d.slice(0, 4); }, function (a, b) { return b.key - a.key; }); g.forEach(function (x) { x.title = x.key || 'Undated'; x.sub = nn(x.items.length); }); return { groups: g, brk: true }; }
    if (mode === 'rating') { g = bucket(function (t) { return t.it.r; }, function (a, b) { return b.key - a.key; }); g.forEach(function (x) { x.title = +x.key ? '★'.repeat(+x.key) : 'Unrated'; x.sub = nn(x.items.length); }); return { groups: g, brk: true }; }
    if (mode === 'cat') { g = bucket(function (t) { return t.it.cat; }, function (a, b) { return cfg.cats.indexOf(a.key) - cfg.cats.indexOf(b.key); }); g.forEach(function (x) { x.title = x.key; x.sub = x.items.length + ' · ' + pct(x.items.length); }); return { groups: g, brk: true }; }
    if (cfg.groupNum) { g = bucket(function (t) { return t.it.g; }, function (a, b) { return b.key - a.key; }); g.forEach(function (x) { x.title = x.key + 's'; x.sub = nn(x.items.length); }); return { groups: g, brk: true }; }
    g = bucket(function (t) { return t.it.g; }, function (a, b) { return b.items.length - a.items.length || a.key.localeCompare(b.key); });
    g.forEach(function (x) { x.title = x.key; x.sub = x.items.length + (x.items.length > 1 ? ' books' : ' book'); x.author = true; });
    return { groups: g, brk: false };
  }
  function colorOrder(rows) {
    var vivid = tiles.filter(function (t) { return t.it.c[1] >= .18; }).sort(function (a, b) { return a.it.c[0] - b.it.c[0]; });
    var grey = tiles.filter(function (t) { return t.it.c[1] < .18; }).sort(function (a, b) { return b.it.c[2] - a.it.c[2]; });
    var all = vivid.concat(grey), out = [];
    for (var i = 0; i < all.length; i += rows) out = out.concat(all.slice(i, i + rows).sort(function (a, b) { return b.it.c[2] - a.it.c[2]; }));
    return out;
  }
  // Flow groups into c columns; a heading fills two cells.
  function flow(groups, c, brk) {
    var col = 0, row = 0, cells = [];
    groups.forEach(function (g) {
      if (brk && col) { col = 0; row++; }
      if (col + 2 > c) { col = 0; row++; }
      cells.push({ head: g, col: col, row: row }); col += 2;
      g.items.forEach(function (t) { if (col >= c) { col = 0; row++; } cells.push({ t: t, col: col, row: row }); col++; });
    });
    return { cells: cells, rows: row + 1 };
  }
  function headFor(g) {
    var k = mode + ':' + g.key, h = heads[k];
    if (!h) {
      var d = document.createElement('div'); d.className = 'head' + (g.author ? ' author' : '');
      d.innerHTML = (g.author ? '<div class="avatar">' + face(g.key) + '</div>' : '') + '<b>' + esc(g.title) + '</b><small>' + esc(g.sub) + '</small>';
      inner.appendChild(d);
      h = heads[k] = { el: d, head: true, mode: mode, tx: 0, ty: 0, x: null, y: null, s: 1, o: 0, rx: 0, ry: 0, delay: 0 };
    }
    return h;
  }
  function place(t, cx, cy, w, h) {
    t.tx = cx; t.ty = cy; t.el.style.width = (w - 2) + 'px'; t.el.style.height = (h - 2) + 'px';
    if (t.x === null) { if (t.head || calm) { t.x = cx; t.y = cy; } else { var a = Math.random() * 6.283, d = Math.max(W, H); t.x = W / 2 + Math.cos(a) * d * .7; t.y = H / 2 + Math.sin(a) * d * .7; } }
  }
  function layout() {
    if (mode === 'places') return;
    W = wall.clientWidth; H = wall.clientHeight;
    var N = tiles.length, ar = arrange(), best = 0, bc = 1, c, rows, w, minW = W < 500 ? 46 : 62;
    if (ar) {
      for (c = 4; c <= 40; c++) { rows = flow(ar.groups, c, ar.brk).rows; w = Math.min(W / c, H / rows / 1.5); if (w > best) { best = w; bc = c; } }
      if (best < minW) { bc = Math.floor(W / minW); best = W / bc; }
      cw = best; ch = cw * 1.5;
      var fl = flow(ar.groups, bc, ar.brk), ox = (W - bc * cw) / 2, top = 4, active = {};
      inner.style.height = Math.max(H, fl.rows * ch + 8) + 'px';
      if (fl.rows * ch + 8 < H) top = (H - fl.rows * ch) / 2;
      fl.cells.forEach(function (x) {
        var cy = top + (x.row + .5) * ch;
        if (x.head) { var h = headFor(x.head); active[x.head.key] = 1; place(h, ox + (x.col + 1) * cw, cy, cw * 2, ch); }
        else place(x.t, ox + (x.col + .5) * cw, cy, cw, ch);
      });
    } else {
      inner.style.height = H + 'px';
      for (c = 1; c <= N; c++) { var rw = Math.ceil(N / c); w = Math.min(W / c, H / rw / 1.5); if (w > best) { best = w; bc = c; } }
      cw = best; ch = cw * 1.5; rows = Math.ceil(N / bc);
      var ox2 = (W - bc * cw) / 2, oy = (H - rows * ch) / 2;
      colorOrder(rows).forEach(function (t, i) { place(t, ox2 + (Math.floor(i / rows) + .5) * cw, oy + (i % rows + .5) * ch, cw, ch); });
    }
    wake();
  }
  function setFocus(t) {
    if (t === focus) return;
    if (focus) focus.el.classList.remove('focus');
    focus = t;
    if (!t) { cap.className = 'shelf-cap idle'; cap.innerHTML = idle; return; }
    t.el.classList.add('focus');
    var it = t.it, st = it.r ? '<span class="stars">' + '★'.repeat(it.r) + '<i>' + '★'.repeat(5 - it.r) + '</i></span>' : '';
    cap.className = 'shelf-cap';
    cap.innerHTML = '<b>' + esc(it.en) + '</b><span lang="zh">' + esc(it.zh) + '</span><span>' + esc(it.sub) + (it.d ? ' &middot; logged ' + it.d : '') + '</span>' + st;
  }
  function near(x, y) {
    var b = null, bd = Infinity;
    tiles.forEach(function (t) { var dx = (t.tx - x) / cw, dy = (t.ty - y) / ch, d = dx * dx + dy * dy; if (d < bd) { bd = d; b = t; } });
    return bd < .9 ? b : null;
  }

  var start = performance.now();
  function frame(now) {
    raf = 0;
    if (mode === 'places') return;
    var R = cw * 3.4, moving = false, k = calm ? 1 : .16, el = now - start, sy = wall.scrollTop;
    function step(t, shown) {
      var gx = t.tx, gy = t.ty, gs = 1, go = shown ? 1 : 0, grx = 0, gry = 0;
      if (shown && ptr) {
        var dx = t.tx - ptr.x, dy = t.ty - ptr.y, d = Math.sqrt(dx * dx + dy * dy) || 1, g = Math.exp(-(d * d) / (R * R));
        if (t === focus) {
          gs = calm ? 2.4 : 3.5;
          if (!calm) { gry = Math.max(-1, Math.min(1, (ptr.x - t.tx) / cw)) * 14; grx = -Math.max(-1, Math.min(1, (ptr.y - t.ty) / ch)) * 14; }
          var hw = cw * gs / 2, hh = ch * gs / 2;
          gx = Math.max(hw, Math.min(W - hw, gx)); gy = Math.max(sy + hh, Math.min(sy + H - hh, gy));
        } else if (!calm) {
          gs = 1 + (t.head ? .1 : .55) * g; var push = cw * 2.1 * g * Math.min(1, d / cw);
          gx += dx / d * push; gy += dy / d * push;
        }
        if (focus && t !== focus) go = .3 + .7 * g;
      }
      if (hl && !t.head && shown) go = (t.it.tags || [t.it.cat]).indexOf(hl) >= 0 ? 1 : .12;
      if (el < t.delay) { moving = true; return; }
      var f = function (p, g) { var v = t[p] + (g - t[p]) * k; if (Math.abs(g - v) > (p === 'x' || p === 'y' ? .05 : .002)) moving = true; else v = g; t[p] = v; };
      f('x', gx); f('y', gy); f('s', gs); f('o', go); f('rx', grx); f('ry', gry);
      var e = t.el.style, w = parseFloat(e.width) + 2, h = parseFloat(e.height) + 2;
      e.transform = 'translate3d(' + (t.x - w / 2).toFixed(1) + 'px,' + (t.y - h / 2).toFixed(1) + 'px,0) perspective(700px) rotateX(' + t.rx.toFixed(2) + 'deg) rotateY(' + t.ry.toFixed(2) + 'deg) scale(' + t.s.toFixed(3) + ')';
      e.opacity = t.o.toFixed(3);
      e.visibility = t.o < .004 && !shown ? 'hidden' : 'visible';
      e.zIndex = t === focus ? 99 : Math.round(t.s * 10);
    }
    tiles.forEach(function (t) { step(t, true); });
    Object.keys(heads).forEach(function (k) { step(heads[k], heads[k].mode === mode); });
    if (moving) wake();
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }

  function point() { var r = wall.getBoundingClientRect(); ptr = { x: last.x - r.left, y: last.y - r.top + wall.scrollTop }; }
  wall.addEventListener('pointerdown', function (e) { touching = e.pointerType !== 'mouse'; });
  wall.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || mode === 'places') return;
    touching = false; last = { x: e.clientX, y: e.clientY }; point(); setFocus(near(ptr.x, ptr.y)); wake();
  });
  wall.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { ptr = null; last = null; setFocus(null); wake(); } });
  wall.addEventListener('scroll', function () { if (last && mode !== 'places') { point(); setFocus(near(ptr.x, ptr.y)); wake(); } }, { passive: true });

  function bars(rows, onHover) {
    var max = rows[0][1];
    insight.innerHTML = '<div class="ins-title">' + (mode === 'cat' ? cfg.catTitle : cfg.placeTitle) + '</div>' + rows.map(function (r) {
      return '<button class="bar" data-k="' + esc(r[0]) + '"><span class="bl">' + esc(r[0]) + '</span><span class="bv">' + r[1] + '</span><span class="bt"><i style="width:' + (r[1] / max * 100).toFixed(1) + '%"></i></span></button>';
    }).join('');
    insight.querySelectorAll('.bar').forEach(function (b) {
      var on = function () { onHover(b.dataset.k); }, off = function () { onHover(null); };
      b.addEventListener('mouseenter', on); b.addEventListener('mouseleave', off); b.addEventListener('focus', on); b.addEventListener('blur', off);
    });
  }
  function insightFor() {
    insight.innerHTML = '';
    if (mode === 'cat') {
      var c = {}; tiles.forEach(function (t) { (t.it.tags || [t.it.cat]).forEach(function (k) { c[k] = (c[k] || 0) + 1; }); });
      bars(Object.keys(c).map(function (k) { return [k, c[k]]; }).sort(function (a, b) { return b[1] - a[1]; }), function (k) { hl = k; wake(); });
    }
    if (mode === 'places') {
      var n = {}; tiles.forEach(function (t) { (t.it.ctry || [(cfg.authors[t.it.g] || {}).country]).forEach(function (x) { n[x] = (n[x] || 0) + 1; }); });
      bars(Object.keys(n).map(function (k) { return [k, n[k]]; }).sort(function (a, b) { return b[1] - a[1]; }), function (k) {
        document.querySelectorAll('.pin').forEach(function (p) { p.classList.toggle('dim', !!k && p.dataset.c !== k); });
      });
    }
  }

  function loadMap(cb) {
    if (window.maplibregl) return cb();
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.css'; document.head.appendChild(l);
    var s = document.createElement('script'); s.src = 'https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.js'; s.onload = cb; document.head.appendChild(s);
  }
  function showAuthor(n, books) {
    var a = cfg.authors[n];
    cap.className = 'shelf-cap';
    cap.innerHTML = '<b>' + esc(n) + '</b><span>Born in ' + esc(a.place) + '</span><span>' + esc(a.country) + ' &middot; ' + books.length + (books.length > 1 ? ' books' : ' book') + '</span><span class="titles">' + books.slice(0, 4).map(function (t) { return esc(t.it.en); }).join(' · ') + (books.length > 4 ? ' …' : '') + '</span>';
  }
  function countryPins() {
    var by = {};
    tiles.forEach(function (t) { t.it.ctry.forEach(function (c) { (by[c] = by[c] || []).push(t); }); });
    Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; }).forEach(function (c) {
      var p = cfg.countries[c], l = by[c], size = Math.round(24 + Math.min(62, 6.2 * Math.sqrt(l.length)));
      var el = document.createElement('button'); el.className = 'pin num'; el.dataset.c = c; el.setAttribute('aria-label', c + ', ' + l.length + ' titles'); el.style.width = el.style.height = size + 'px'; el.textContent = l.length;
      var show = function () { cap.className = 'shelf-cap'; cap.innerHTML = '<b>' + esc(c) + '</b><span>' + l.length + (l.length > 1 ? ' titles' : ' title') + '</span><span class="titles">' + l.slice().sort(function (a, b) { return b.it.r - a.it.r; }).slice(0, 4).map(function (t) { return esc(t.it.en); }).join(' · ') + (l.length > 4 ? ' …' : '') + '</span>'; }, hide = function () { cap.className = 'shelf-cap idle'; cap.innerHTML = idle; };
      el.addEventListener('mouseenter', show); el.addEventListener('focus', show); el.addEventListener('click', show); el.addEventListener('mouseleave', hide); el.addEventListener('blur', hide);
      new maplibregl.Marker({ element: el }).setLngLat([p[1], p[0]]).addTo(map);
    });
  }
  function buildMap() {
    var box = document.createElement('div'); box.id = 'shelfMap'; wall.appendChild(box);
    map = new maplibregl.Map({ container: box, style: 'https://tiles.openfreemap.org/styles/dark', center: [30, 28], zoom: 1, attributionControl: { compact: true }, renderWorldCopies: false });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('style.load', function () { map.getStyle().layers.forEach(function (l) { if (l.type === 'symbol') map.removeLayer(l.id); }); });
    map.fitBounds([[-125, -38], [148, 60]], { padding: 30, duration: 0 });
    if (cfg.items[0].ctry) return countryPins();
    var by = {}; tiles.forEach(function (t) { (by[t.it.g] = by[t.it.g] || []).push(t); });
    var cl = {};
    Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; }).forEach(function (n) {
      var a = cfg.authors[n]; if (!a || a.lat == null) return;
      var key = Math.round(a.lat / 2.5) + ':' + Math.round(a.lng / 2.5), i = cl[key] = (cl[key] === undefined ? 0 : cl[key] + 1);
      var size = Math.round(26 + Math.min(32, 7 * Math.sqrt(by[n].length))), ang = i * 2.4, rad = i ? 15 * Math.sqrt(i) : 0;
      var el = document.createElement('button'); el.className = 'pin'; el.dataset.c = a.country; el.setAttribute('aria-label', n + ', born in ' + a.place); el.style.width = el.style.height = size + 'px'; el.innerHTML = face(n);
      var show = function () { showAuthor(n, by[n]); }, hide = function () { cap.className = 'shelf-cap idle'; cap.innerHTML = idle; };
      el.addEventListener('mouseenter', show); el.addEventListener('focus', show); el.addEventListener('click', show); el.addEventListener('mouseleave', hide); el.addEventListener('blur', hide);
      new maplibregl.Marker({ element: el, offset: [Math.cos(ang) * rad, Math.sin(ang) * rad] }).setLngLat([a.lng, a.lat]).addTo(map);
    });
  }

  var btns = document.querySelectorAll('.shelf-modes button');
  function setMode(m) {
    mode = m; hl = null; ptr = null; last = null; setFocus(null); wall.scrollTop = 0;
    wall.className = 'm-' + m;
    btns.forEach(function (b) { var on = b.dataset.m === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    insightFor();
    if (m === 'places') { if (!map) loadMap(buildMap); else map.resize(); return; }
    layout();
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.m); }); });
  new ResizeObserver(function () { if (map && mode === 'places') map.resize(); layout(); }).observe(wall);
  setMode(mode);
  window.__shelf = { tiles: tiles, get mode() { return mode; } };
})();
