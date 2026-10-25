(function () {
  'use strict';

  var S = window.SITE;
  var START = S.start, END = S.end;
  var GAP = 0.22;   // years: marks closer than this in one lane get their own sub-column

  /* ---------- data ---------- */
  var byId = {}, laneById = {}, pathById = {};
  S.entries.forEach(function (e) { byId[e.id] = e; e.rel = (e.rel || []).filter(function (r) { return r !== e.id; }); });
  S.lanes.forEach(function (l) { laneById[l.id] = l; });
  S.paths.forEach(function (p) {
    p.ids = p.ids.filter(function (id) { return byId[id]; }).sort(function (a, b) { return byId[b].t - byId[a].t; });
    pathById[p.id] = p;
  });
  // connections run both ways
  S.entries.forEach(function (e) {
    e.rel.forEach(function (r) { var o = byId[r]; if (o && o.rel.indexOf(e.id) === -1) o.rel.push(e.id); });
  });

  var chrono = S.entries.slice().sort(function (a, b) { return a.t - b.t; });
  chrono.forEach(function (e, i) { e._n = i + 1; });
  var desc = chrono.slice().reverse();   // newest first, top to bottom

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var state = { sel: null, path: null, open: null };

  var $tl = document.getElementById('tl');
  var $paths = document.getElementById('paths');
  var $list = document.getElementById('list');
  var $scroller = document.getElementById('scroller');
  var $about = document.getElementById('about');
  var $nameBtn = document.getElementById('nameBtn');
  var tlBody, svg, tip, playhead, marks = {}, cards = [], liveId = null, liveT, booted = false;

  function ypos(t) { return (END - t) / (END - START) * 100; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // organisations become links wherever they're named (run on already-escaped text)
  var ORGS = [
    ['Centre for Research Architecture', 'https://research-architecture.org/HOME'],
    ['Forensic Architecture', 'https://forensic-architecture.org/']
  ];
  function linkOrgs(html) {
    ORGS.forEach(function (o) {
      html = html.split(o[0]).join('<a class="org" href="' + o[1] + '" target="_blank" rel="noopener">' + o[0] + '</a>');
    });
    return html;
  }

  /* ---------- media ---------- */
  function parseVideo(url) {
    if (!url) return null;
    var m;
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/))) return { kind: 'vimeo', id: m[1], h: m[2] };
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/))) return { kind: 'youtube', id: m[1] };
    if ((m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/))) return { kind: 'drive', id: m[1] };
    return null;
  }
  function posterOf(e) {
    if (e.img) return e.img;
    var v = parseVideo(e.video);
    if (!v) return null;
    if (v.kind === 'youtube') return 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg';
    if (v.kind === 'drive') return 'https://drive.google.com/thumbnail?id=' + v.id + '&sz=w1280';
    return null;
  }
  function vimeoSrc(v, extra) { return 'https://player.vimeo.com/video/' + v.id + '?' + (v.h ? 'h=' + v.h + '&' : '') + extra; }
  // silent looping preview; Vimeo's background=1 needs a paid account, so plain muted autoplay is used
  function previewSrc(v, start) {
    start = start || 0;
    if (v.kind === 'vimeo') return vimeoSrc(v, 'autoplay=1&muted=1&loop=1&autopause=0&controls=0&title=0&byline=0&portrait=0&playsinline=1&dnt=1') + (start ? '#t=' + start + 's' : '');
    if (v.kind === 'youtube') return 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&mute=1&loop=1&playlist=' + v.id + '&controls=0&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&start=' + start;
    return null;
  }
  function playerSrc(v, start) {
    start = start || 0;
    if (v.kind === 'vimeo') return vimeoSrc(v, 'autoplay=1&dnt=1') + (start ? '#t=' + start + 's' : '');
    if (v.kind === 'youtube') return 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0&modestbranding=1&start=' + start;
    if (v.kind === 'drive') return 'https://drive.google.com/file/d/' + v.id + '/preview';
    return null;
  }

  // live = the project currently in view: loops and previews play. Others show their poster.
  function renderMedia(e, live) {
    var v = parseVideo(e.video), poster = posterOf(e);
    var alt = esc(e.imgNote || e.title);
    var contain = e.fit === 'contain';
    var moving = !!(e.loop || (v && v.kind !== 'drive'));
    var inner;
    if (live && e.loop && !reduceMotion) {
      inner = '<video class="loop" src="' + esc(e.loop) + '"' + (poster ? ' poster="' + esc(poster) + '"' : '') +
        ' autoplay muted loop playsinline preload="auto" aria-label="' + alt + '"></video>';
    } else if (live && v && v.kind !== 'drive' && !reduceMotion) {
      inner = (poster ? '<img class="under" src="' + esc(poster) + '" alt="">' : '') +
        '<iframe class="bg" src="' + esc(previewSrc(v, e.videoStart)) + '" title="' + alt + '" allow="autoplay; fullscreen; picture-in-picture" tabindex="-1"></iframe>';
    } else if (poster) {
      inner = '<img class="still' + (contain ? ' contain' : '') + '" src="' + esc(poster) + '" alt="' + alt + '" loading="lazy">';
    } else {
      // no image yet: show nothing rather than a placeholder box
      return '';
    }
    var badge = '';
    if (v && live) {
      badge = '<button type="button" class="play" data-play="' + esc(e.id) + '" aria-label="Play video: ' + esc(e.title) + '"><span class="tri" aria-hidden="true"></span>Play' + (v.kind === 'drive' ? '' : ' with sound') + '</button>';
    } else if (moving || v) {
      badge = '<span class="badge"><span class="tri" aria-hidden="true"></span>' + (e.loop && !v ? 'moving image' : 'video') + '</span>';
    }
    return '<div class="frame' + (contain && !moving ? ' is-contain' : '') + '">' + inner + badge + '</div>';
  }

  function mediaEl(id) { return $list.querySelector('[data-media="' + id + '"]'); }

  function setLive(id) {
    if (liveId === id) return;
    var old = liveId && mediaEl(liveId);
    if (old) old.innerHTML = renderMedia(byId[liveId], false);
    liveId = id;
    var m = id && mediaEl(id);
    if (!m) return;
    m.innerHTML = renderMedia(byId[id], true);
    // browsers only autoplay video they know is muted; innerHTML doesn't always set that
    var vid = m.querySelector('video.loop');
    if (vid) { vid.muted = true; var p = vid.play(); if (p && p.catch) p.catch(function () { }); }
  }

  function playVideo(id) {
    var e = byId[id], v = e && parseVideo(e.video), m = mediaEl(id);
    if (!v || !m) return;
    var frame = m.querySelector('.frame');
    frame.classList.add('playing');
    frame.innerHTML = '<iframe class="player" src="' + esc(playerSrc(v, e.videoStart)) + '" title="' + esc(e.title) + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
  }

  /* ---------- left: vertical timeline ---------- */
  function buildTimeline() {
    var heads = '<div class="tl-heads"><span></span>' + S.lanes.map(function (l) { return '<span>' + esc(l.label) + '</span>'; }).join('') + '</div>';
    var grid = '';
    for (var y = START; y <= END; y++) {
      grid += '<div class="yr" style="top:' + ypos(y) + '%">' + (y < END ? '<span>' + y + '</span>' : '') + '</div>';
    }
    var cols = S.lanes.map(function (l) { return '<div class="col" data-lane="' + esc(l.id) + '"></div>'; }).join('');
    $tl.innerHTML = heads + '<div class="tl-body"><div class="grid">' + grid + '</div><div class="cols">' + cols + '</div></div>';
    tlBody = $tl.querySelector('.tl-body');

    S.lanes.forEach(function (lane) {
      var col = tlBody.querySelector('.col[data-lane="' + lane.id + '"]');
      var items = chrono.filter(function (e) { return e.lane === lane.id; });
      var ends = [];
      items.forEach(function (e) {
        var r = -1;
        for (var i = 0; i < ends.length; i++) if (e.t - ends[i] >= GAP) { r = i; break; }
        if (r < 0) { r = ends.length; ends.push(0); }
        ends[r] = e.end || e.t;
        e._sub = r;
      });
      var n = Math.max(1, ends.length);
      col.style.setProperty('--n', n);
      items.forEach(function (e) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mark' + (e.end ? ' range' : '');
        b.style.setProperty('--k', (e._sub - (n - 1) / 2).toFixed(2));
        b.style.top = (e.end ? ypos(e.end) : ypos(e.t)) + '%';
        if (e.end) b.style.height = (ypos(e.t) - ypos(e.end)) + '%';
        b.setAttribute('aria-label', e.title + ', ' + e.when);
        b.dataset.id = e.id;
        b.innerHTML = '<span class="dot"></span>';
        b.addEventListener('click', function () { goTo(e.id, true); });
        b.addEventListener('mouseenter', function () { showTip(b, e); });
        b.addEventListener('mouseleave', hideTip);
        b.addEventListener('focus', function () { showTip(b, e); });
        b.addEventListener('blur', hideTip);
        col.appendChild(b);
        marks[e.id] = b;
      });
    });

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'path-line');
    svg.setAttribute('aria-hidden', 'true');
    tlBody.appendChild(svg);

    playhead = document.createElement('div');
    playhead.className = 'playhead';
    playhead.setAttribute('aria-hidden', 'true');
    playhead.innerHTML = '<span class="playhead-label"></span>';
    tlBody.appendChild(playhead);

    tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.hidden = true;
    tlBody.appendChild(tip);

    // dots pop in from the top on load
    desc.forEach(function (e, i) { marks[e.id].style.setProperty('--d', (150 + i * 30) + 'ms'); });
    $tl.classList.add('intro');
  }

  function showTip(el, e) {
    var host = tlBody.getBoundingClientRect(), r = el.getBoundingClientRect();
    var thumb = posterOf(e);
    tip.innerHTML = (thumb ? '<img src="' + esc(thumb) + '" alt="">' : '') +
      '<span>' + esc(e.title) + ' — ' + esc(e.when) + ((e.video || e.loop) ? ' <span class="vid">▶</span>' : '') + '</span>';
    tip.classList.toggle('has-thumb', !!thumb);
    tip.hidden = false;
    var w = tip.offsetWidth;
    var x = r.right - host.left + 8;
    if (x + w > host.width) x = r.left - host.left - 8 - w;
    var y = e.end ? Math.min(r.bottom, Math.max(r.top, host.top + 20)) - host.top + 10 : r.top + r.height / 2 - host.top;
    tip.style.left = Math.max(0, x) + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { tip.hidden = true; }

  function drawPath() {
    svg.innerHTML = '';
    if (!state.path) return;
    var host = tlBody.getBoundingClientRect();
    var ids = pathById[state.path].ids;
    var boxes = ids.map(function (id) { return marks[id].getBoundingClientRect(); });
    var ys = boxes.map(function (r, i) { return byId[ids[i]].end ? null : r.top + r.height / 2; });
    // a bar (ongoing work) is joined at the point nearest its neighbours
    ys = ys.map(function (y, i) {
      if (y !== null) return y;
      var r = boxes[i], near = [ys[i - 1], ys[i + 1]].filter(function (v) { return v != null; });
      var target = near.length ? near.reduce(function (a, b) { return a + b; }, 0) / near.length : r.top;
      return Math.min(Math.max(target, r.top + 6), r.bottom - 6);
    });
    var pts = boxes.map(function (r, i) {
      return (r.left + r.width / 2 - host.left).toFixed(1) + ',' + (ys[i] - host.top).toFixed(1);
    });
    var pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    pl.setAttribute('points', pts.join(' '));
    svg.appendChild(pl);
  }

  /* ---------- paths ---------- */
  function buildPaths() {
    $paths.innerHTML = '<span class="lbl">Trace a path</span><div class="pills">' + S.paths.map(function (p) {
      return '<button type="button" class="pill" data-path="' + esc(p.id) + '" aria-pressed="false">' + esc(p.label) +
        ' <span class="count">' + p.ids.length + '</span></button>';
    }).join('') + '</div>';
  }

  function setPath(id, keepId) {
    state.path = id;
    var ids = id ? pathById[id].ids : [];
    Object.keys(marks).forEach(function (mid) {
      marks[mid].classList.toggle('in-path', ids.indexOf(mid) !== -1);
      marks[mid].classList.toggle('dim', !!id && ids.indexOf(mid) === -1);
    });
    $paths.querySelectorAll('[data-path]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.path === id ? 'true' : 'false'); });
    buildList();
    state.sel = null;
    if (keepId && document.getElementById('w-' + keepId)) goTo(keepId, false);
    else $scroller.scrollTop = 0;
    drawPath();
    sync();
  }

  /* ---------- right: all projects, folded to their titles ---------- */
  function entryHTML(e) {
    var links = (e.links || []).map(function (l) {
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + ' ↗</a>';
    }).join('');
    var rel = e.rel.filter(function (id) { return byId[id]; }).map(function (id) {
      return '<button type="button" class="chip" data-go="' + esc(id) + '">→ ' + esc(byId[id].title) + '</button>';
    }).join('');
    var onPaths = S.paths.filter(function (p) { return p.ids.indexOf(e.id) !== -1; }).map(function (p) {
      return '<button type="button" class="pill small" data-path="' + esc(p.id) + '">' + esc(p.label) + '</button>';
    }).join('');
    var poster = posterOf(e), v = parseVideo(e.video);
    // the spine of the tape: the project's image fills it; without one, a solid colour per type of work
    var spine = poster ? '<span class="spine-img" aria-hidden="true"><img src="' + esc(poster) + '" alt="" loading="lazy"></span>' : '';
    return '<article class="entry tape ' + (poster ? 'has-img' : 'no-img') + '" data-lane="' + esc(e.lane) + '" id="w-' + esc(e.id) + '" data-id="' + esc(e.id) + '">' +
      '<h2 class="entry-title"><button type="button" class="entry-head" data-toggle="' + esc(e.id) + '" aria-expanded="false" aria-controls="p-' + esc(e.id) + '">' +
      spine +
      '<span class="t">' + esc(e.title) + '</span>' +
      '<span class="meta">' + ((v && !e.loop) ? '<span class="tag vid-tag"><span class="tri"></span> video</span>' : '') +
      '<span class="tag">' + esc(laneById[e.lane].label) + '</span><span class="when-tag">' + esc(e.when) + '</span></span>' +
      '<span class="plus" aria-hidden="true"></span>' +
      '</button></h2>' +
      '<div class="entry-panel" id="p-' + esc(e.id) + '" hidden>' +
      (e.with ? '<div class="with">' + linkOrgs(esc(e.with)) + '</div>' : '') +
      '<figure class="media" data-media="' + esc(e.id) + '">' + renderMedia(e, false) + '</figure>' +
      (e.imgCaption ? '<p class="caption">' + esc(e.imgCaption) + '</p>' : '') +
      '<div class="entry-body">' +
      '<p class="text">' + linkOrgs(esc(e.text)) + '</p>' +
      (links ? '<div class="links">' + links + '</div>' : '') +
      (rel ? '<div class="block"><span class="h">Connected</span><div class="chips">' + rel + '</div></div>' : '') +
      (onPaths ? '<div class="block"><span class="h">On the paths</span><div class="chips">' + onPaths + '</div></div>' : '') +
      '</div></div>' +
      '</article>';
  }

  function buildList() {
    var items = state.path ? desc.filter(function (e) { return pathById[state.path].ids.indexOf(e.id) !== -1; }) : desc;
    var html = '';
    if (state.path) {
      html += '<div class="path-banner"><span>Path</span><strong>' + esc(pathById[state.path].label) + '</strong>' +
        '<span>' + items.length + ' works</span><button type="button" class="pill" data-clear>✕ show all work</button></div>';
    }
    var year = null;
    items.forEach(function (e) {
      var y = Math.floor(e.t);
      if (y !== year) { year = y; html += '<div class="year-head">' + y + '</div>'; }
      html += entryHTML(e);
    });
    $list.innerHTML = html;
    cards = items.map(function (e) { return { id: e.id, el: document.getElementById('w-' + e.id) }; });
    liveId = null;
    state.open = null;
    Object.keys(marks).forEach(function (k) { marks[k].classList.remove('open'); });
    // rows drop in one after another
    cards.forEach(function (c, i) { c.el.style.setProperty('--i', Math.min(i, 14)); });
    $list.classList.remove('list-enter');
    void $list.offsetWidth;
    $list.classList.add('list-enter');
    clearTimeout(buildList.t);
    buildList.t = setTimeout(function () { $list.classList.remove('list-enter'); }, 1400);
  }

  /* ---------- fold / unfold ---------- */
  function openEntry(id, instantFold) {
    if (state.open === id) return 0;
    var el = document.getElementById('w-' + id);
    if (!el) return 0;
    // closing the previous entry shifts everything below it; keep the clicked row where it was on screen
    var before = el.getBoundingClientRect().top;
    // About folds away: at once if it's already scrolled out of view (the scroll is compensated below),
    // otherwise smoothly, and the caller scrolls as if it were already folded
    var shift = 0;
    if (aboutOpen) {
      if (instantFold || aboutOffscreen()) foldAbout(true);
      else { shift = $about.offsetHeight; foldAbout(false); }
    }
    closeEntry();
    $scroller.scrollTop += el.getBoundingClientRect().top - before;
    state.open = id;
    el.classList.add('is-open');
    el.querySelector('.entry-panel').hidden = false;
    el.querySelector('.entry-head').setAttribute('aria-expanded', 'true');
    Object.keys(marks).forEach(function (k) { marks[k].classList.toggle('open', k === id); });
    setLive(id);
    if (booted && history.replaceState) history.replaceState(null, '', '#w/' + id);
    fitPanel(el);
    return shift;
  }

  // size the image so the whole opened project (title, image, text, connections, paths)
  // fits on one screen below the reading line; the text keeps its size, the image gives way
  function fitPanel(el) {
    var frame = el && el.querySelector('.entry-panel .frame');
    if (!frame) return;
    var sr = $scroller.getBoundingClientRect();
    var panel = el.querySelector('.entry-panel');
    frame.style.height = '0px';
    var rest = el.querySelector('.entry-head').offsetHeight + panel.offsetHeight
      - parseFloat(getComputedStyle(panel).paddingBottom || 0);
    var avail = sr.height - (lineY() - sr.top) - rest - 16;
    var w = frame.clientWidth;
    var h = Math.round(Math.max(170, Math.min(avail, w * 9 / 16)));
    frame.style.height = h + 'px';
    // background videos are 16:9; keep them covering the frame whatever its proportion
    var ifr = frame.querySelector('iframe.bg');
    if (ifr) {
      var iw = w / h > 16 / 9 ? w : h * 16 / 9;
      ifr.style.width = iw + 'px';
      ifr.style.height = iw * 9 / 16 + 'px';
      ifr.style.minWidth = '0';
    }
  }
  function closeEntry() {
    var id = state.open;
    if (!id) return;
    state.open = null;
    setLive(null);
    if (marks[id]) marks[id].classList.remove('open');
    var el = document.getElementById('w-' + id);
    if (!el) return;
    el.classList.remove('is-open');
    // the tape slides back into the stack
    el.classList.add('pushed');
    setTimeout(function () { el.classList.remove('pushed'); }, 500);
    el.querySelector('.entry-panel').hidden = true;
    el.querySelector('.entry-head').setAttribute('aria-expanded', 'false');
    if (booted && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }
  function toggleEntry(id) {
    if (state.open === id) { closeEntry(); sync(); }
    else goTo(id, true);
  }


  /* ---------- scroll sync: the list drives the playhead ---------- */
  function lineY() {
    var sr = $scroller.getBoundingClientRect();
    return sr.top + Math.min(104, sr.height * 0.2);
  }
  // the list ends with the oldest project (no empty space below it), so over the last screen
  // the reading line slides down to the bottom and the final projects still get their turn
  function readLine() {
    var sr = $scroller.getBoundingClientRect(), base = lineY();
    var left = $scroller.scrollHeight - $scroller.clientHeight - $scroller.scrollTop;
    var span = sr.bottom - base - 2;
    return left < span ? base + (span - Math.max(0, left)) : base;
  }

  var ticking = false;
  function onScroll() { hideTip(); if (!ticking) { ticking = true; requestAnimationFrame(sync); } }

  function sync() {
    ticking = false;
    if (!cards.length) return;
    var line = readLine(), idx = 0;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].el.getBoundingClientRect().top <= line) idx = i; else break;
    }
    var r = cards[idx].el.getBoundingClientRect();
    var frac = Math.min(1, Math.max(0, (line - r.top) / r.height));
    setSel(cards[idx].id);
    placePlayhead(idx, frac);
  }

  // the playhead glides between projects as you scroll, rather than jumping
  function placePlayhead(idx, frac) {
    var a = byId[cards[idx].id], b = cards[idx + 1] ? byId[cards[idx + 1].id] : null;
    var y = ypos(a.t) + (b ? (ypos(b.t) - ypos(a.t)) * frac : 0);
    var py = y / 100 * tlBody.clientHeight;
    playhead.style.transform = 'translateY(' + py.toFixed(1) + 'px)';
    playhead.querySelector('.playhead-label').textContent = a.when;
  }

  function setSel(id) {
    if (state.sel === id) return;
    var prev = state.sel;
    state.sel = id;
    if (prev && marks[prev]) marks[prev].classList.remove('on');
    if (marks[id]) marks[id].classList.add('on');
    var pe = prev && document.getElementById('w-' + prev);
    if (pe) pe.classList.remove('is-active');
    var ce = document.getElementById('w-' + id);
    if (ce) ce.classList.add('is-active');
  }

  function goTo(id, smooth) {
    if (!byId[id]) return;
    if (state.path && pathById[state.path].ids.indexOf(id) === -1) { setPath(null, id); return; }
    var el = document.getElementById('w-' + id);
    if (!el) return;
    var shift = openEntry(id, !smooth);
    var sr = $scroller.getBoundingClientRect();
    var top = el.getBoundingClientRect().top - sr.top + $scroller.scrollTop - (lineY() - sr.top) + 2 - shift;
    scrollToY(Math.max(0, Math.min(top, $scroller.scrollHeight - $scroller.clientHeight)), smooth && !reduceMotion);
  }

  // eased scroll of the project column (not relying on the browser's smooth scrolling)
  var scrollAnim = null;
  function cancelScroll() { scrollAnim = null; }
  function scrollToY(y, smooth) {
    cancelScroll();
    var from = $scroller.scrollTop, dist = y - from;
    if (!smooth || Math.abs(dist) < 2) { $scroller.scrollTop = y; sync(); return; }
    var dur = Math.min(1400, 500 + Math.abs(dist) * 0.25), t0 = Date.now();
    var token = {};
    scrollAnim = token;
    function frame() {
      if (scrollAnim !== token) return;
      var p = Math.min(1, (Date.now() - t0) / dur);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      $scroller.scrollTop = from + dist * e;
      sync();
      if (p < 1) setTimeout(frame, 16); else scrollAnim = null;
    }
    frame();
  }

  function step(d) {
    var i = -1, cur = state.open || state.sel;
    cards.forEach(function (c, k) { if (c.id === cur) i = k; });
    var next = cards[(Math.max(0, i) + d + cards.length) % cards.length];
    if (next) goTo(next.id, true);
  }

  /* ---------- about: unfolds from the black name bar, folded on landing, folds again when a project is opened ---------- */
  var aboutOpen = false, aboutSeen = true;
  var $hint = $nameBtn.querySelector('.hint');
  function aboutOffscreen() {
    var barH = $scroller.querySelector('.bar').offsetHeight;
    return $scroller.scrollTop + barH >= $about.offsetTop + $about.offsetHeight;
  }
  function aboutState() {
    $about.classList.toggle('is-folded', !aboutOpen);
    $nameBtn.setAttribute('aria-expanded', aboutOpen ? 'true' : 'false');
    if ($hint) $hint.textContent = aboutOpen ? 'about \u2212' : 'about +';
    aboutBgRun();
  }
  // the contour background only runs while About is open and on screen
  function aboutBgRun() {
    if (!window.aboutBg) return;
    if (aboutOpen && aboutSeen) window.aboutBg.start(); else window.aboutBg.stop();
  }
  function foldAbout(instant) {
    if (!aboutOpen) return;
    aboutOpen = false;
    if (instant || reduceMotion) $about.classList.add('instant');
    aboutState();
    void $about.offsetHeight;
    $about.classList.remove('instant');
  }
  function unfoldAbout() {
    aboutOpen = true;
    aboutState();
    scrollToY(0, !reduceMotion);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      aboutSeen = es[0].isIntersecting;
      aboutBgRun();
    }, { root: $scroller }).observe($about.querySelector('.about-content'));
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    // the name bar folds About if it's in view, otherwise brings you back up to it
    if (t.closest('.bar')) { if (aboutOpen && !aboutOffscreen()) foldAbout(false); else unfoldAbout(); return; }
    if (t.closest('[data-close-about]')) { foldAbout(false); return; }
    // choosing a path also folds About, like opening a project
    if (aboutOpen && t.closest('[data-path]')) foldAbout(false);
    var tg = t.closest('[data-toggle]');
    if (tg) { toggleEntry(tg.dataset.toggle); return; }
    var pl = t.closest('[data-play]');
    if (pl) { playVideo(pl.dataset.play); return; }
    var pa = t.closest('[data-path]');
    if (pa) { setPath(state.path === pa.dataset.path ? null : pa.dataset.path, state.open); return; }
    var go = t.closest('[data-go]');
    if (go) { goTo(go.dataset.go, true); return; }
    if (t.closest('[data-clear]')) { setPath(null, state.open); return; }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    var tag = (ev.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || ev.target.isContentEditable) return;
    if (ev.key === 'Escape') {
      if (state.open) { closeEntry(); sync(); }
      else if (state.path) setPath(null, null);
      else if (aboutOpen) foldAbout(false);
      return;
    }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); }
  });

  // the visitor taking hold of the scroll cancels any eased scroll in progress
  ['wheel', 'touchstart', 'pointerdown'].forEach(function (type) {
    $scroller.addEventListener(type, cancelScroll, { passive: true });
  });

  window.addEventListener('hashchange', function () {
    var m = location.hash.match(/^#w\/(.+)$/);
    if (m && decodeURIComponent(m[1]) !== state.open) goTo(decodeURIComponent(m[1]), true);
    if (location.hash === '#about') unfoldAbout();
  });

  $scroller.addEventListener('scroll', onScroll, { passive: true });
  var resizeT;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { drawPath(); sync(); if (state.open) fitPanel(document.getElementById('w-' + state.open)); }, 80); });

  /* ---------- init ---------- */
  buildTimeline();
  buildPaths();
  buildList();

  var h = location.hash.match(/^#w\/(.+)$/);
  var deep = h && byId[decodeURIComponent(h[1])] ? decodeURIComponent(h[1]) : null;
  aboutState();
  if (deep) goTo(deep, false);
  if (location.hash === '#about') {
    unfoldAbout();
    // the browser's own jump to #about would tuck the strip under the bar; start from the top instead
    window.addEventListener('load', function () { $scroller.scrollTop = 0; sync(); });
  }

  // the playhead starts at the top and glides to the first project
  playhead.style.transform = 'translateY(0px)';
  playhead.classList.add('glide');

  setTimeout(function () {
    booted = true;
    sync();
    setTimeout(function () { playhead.classList.remove('glide'); }, 1200);
  }, 400);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawPath(); if (booted) sync(); });
})();
