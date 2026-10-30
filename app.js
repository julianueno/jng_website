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
    ['Forensic Architecture', 'https://forensic-architecture.org/'],
    ['Rectangle', 'https://rectangle.design/']
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
  // data.js points at originals in images/; serve the size-appropriate copy built by make-images.sh
  var MOBILE = !!(window.matchMedia && window.matchMedia('(max-width: 860px), (hover: none) and (pointer: coarse)').matches);
  var IMG_DIR = MOBILE ? 'images/mobile/' : 'images/desktop/';
  // bump after re-running make-images.sh so browsers fetch the new files instead of cached ones
  var IMG_V = '?v=3';
  function imgSrc(p) {
    var m = p && p.match(/^images\/([^\/]+)\.(jpe?g|png|webp)$/i);
    return m ? IMG_DIR + m[1] + '.webp' + IMG_V : p;
  }
  function loopSrc(p) {
    var m = p && p.match(/^images\/([^\/]+\.mp4)$/i);
    return m ? IMG_DIR + m[1] + IMG_V : p;
  }
  function posterOf(e) {
    if (e.img) return imgSrc(e.img);
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
      inner = '<video class="loop" src="' + esc(loopSrc(e.loop)) + '"' + (poster ? ' poster="' + esc(poster) + '"' : '') +
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
    // stills and loops keep their own proportions (no cropping); embedded videos stay 16:9
    var natural = !(live && v && v.kind !== 'drive' && !reduceMotion);
    return '<div class="frame' + (contain && !moving ? ' is-contain' : '') + (natural ? ' is-natural' : '') + '">' + inner + badge + '</div>';
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
    frame.classList.remove('is-natural');
    frame.innerHTML = '<iframe class="player" src="' + esc(playerSrc(v, e.videoStart)) + '" title="' + esc(e.title) + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
  }

  /* ---------- left: vertical timeline ---------- */
  function buildTimeline() {
    var heads = '<div class="tl-heads"><span></span>' + S.lanes.map(function (l) { return '<span>' + esc(l.label) + '</span>'; }).join('') + '</div>';
    var grid = '';
    // year lines only: the orange playhead label already says when you are
    for (var y = START; y <= END; y++) {
      grid += '<div class="yr" style="top:' + ypos(y) + '%"></div>';
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
    playhead.innerHTML = '<span class="playhead-label" title="Drag to move through the work"></span>';
    tlBody.appendChild(playhead);
    bindScrub(playhead.querySelector('.playhead-label'));

    tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.hidden = true;
    tlBody.appendChild(tip);

  }

  /* ---------- intro: the dots fall into the timeline like tetris pieces, all four lanes at once,
     oldest first so the timeline stacks up from the bottom. Each project appears in the index
     (with its hover 'peek') the moment its dot lands. ---------- */
  var INTRO_MS = 2000, LEAD_MS = 150, intro = null;
  function runIntro() {
    var timers = [], anims = [];
    intro = { timers: timers, anims: anims };
    $list.classList.add('intro-wait');
    $tl.classList.add('falling');
    S.lanes.forEach(function (lane) {
      var items = chrono.filter(function (e) { return e.lane === lane.id; });
      var n = items.length;
      if (!n) return;
      var falls = items.map(function (e) {
        var d = marks[e.id].offsetTop + 14;               // from just under the column heads
        return { e: e, d: d, dur: 160 + Math.sqrt(d) * 11 }; // gravity: longer drops take a bit longer
      });
      var maxDur = Math.max.apply(null, falls.map(function (f) { return f.dur; }));
      var stepMs = n > 1 ? (INTRO_MS - LEAD_MS - maxDur) / (n - 1) : 0;
      falls.forEach(function (f, i) {
        var jitter = (i > 0 && i < n - 1) ? (Math.random() - 0.5) * stepMs * 0.6 : 0;
        var delay = LEAD_MS + i * stepMs + jitter;
        var squash = f.e.end ? 'scaleX(1.5)' : 'scale(1.45, 0.6)';
        anims.push(marks[f.e.id].querySelector('.dot').animate([
          { transform: 'translateY(' + (-f.d) + 'px)', opacity: 0, easing: 'cubic-bezier(.5, 0, .9, .4)' },
          { opacity: 1, offset: 0.12 },
          { transform: 'translateY(0px) ' + squash, offset: 0.8, easing: 'ease-out' },
          { transform: 'none', opacity: 1 }
        ], { duration: f.dur, delay: delay, fill: 'backwards' }));
        timers.push(setTimeout(function () { reveal(f.e.id); }, delay + f.dur * 0.8));
      });
    });
    timers.push(setTimeout(endIntro, INTRO_MS + 500));
  }
  function reveal(id) {
    var el = document.getElementById('w-' + id);
    if (!el || el.classList.contains('arrived')) return;
    el.classList.add('arrived', 'peek');
    for (var p = el.previousElementSibling; p; p = p.previousElementSibling) {
      if (p.classList.contains('year-head')) { p.classList.add('arrived'); break; }
    }
    setTimeout(function () { el.classList.remove('peek'); }, 380);
  }
  // finishes at once if the visitor starts doing something
  function endIntro() {
    if (!intro) return;
    intro.timers.forEach(clearTimeout);
    intro.anims.forEach(function (a) { try { a.finish(); } catch (_) { } });
    intro = null;
    $list.classList.remove('intro-wait');
    $tl.classList.remove('falling');
  }
  ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (type) {
    document.addEventListener(type, endIntro, { passive: true, capture: true });
  });

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
    unpin();
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
    // details under the description: a mono label on the left, the information in sans on the right
    function fact(label, html, cls) {
      return '<div class="fact' + (cls ? ' ' + cls : '') + '"><dt>' + label + '</dt><dd>' + html + '</dd></div>';
    }
    var facts = (e.with ? fact('With', linkOrgs(esc(e.with))) : '') +
      (links ? fact('Links', '<span class="links">' + links + '</span>') : '') +
      (rel ? fact('Connected', '<span class="chips">' + rel + '</span>', 'fact-nav') : '') +
      (onPaths ? fact('On the paths', '<span class="chips">' + onPaths + '</span>', 'fact-nav') : '');
    return '<article class="entry tape ' + (poster ? 'has-img' : 'no-img') + '" data-lane="' + esc(e.lane) + '" id="w-' + esc(e.id) + '" data-id="' + esc(e.id) + '">' +
      '<h2 class="entry-title"><button type="button" class="entry-head" data-toggle="' + esc(e.id) + '" aria-expanded="false" aria-controls="p-' + esc(e.id) + '">' +
      spine +
      '<span class="t">' + esc(e.title) + '</span>' +
      '<span class="meta">' + ((v && !e.loop) ? '<span class="tag vid-tag"><span class="tri"></span> video</span>' : '') +
      '<span class="tag">' + esc(laneById[e.lane].label) + '</span><span class="when-tag">' + esc(e.when) + '</span></span>' +
      '<span class="plus" aria-hidden="true"></span>' +
      '</button></h2>' +
      '<div class="entry-panel" id="p-' + esc(e.id) + '" hidden>' +
      '<figure class="media" data-media="' + esc(e.id) + '">' + renderMedia(e, false) + '</figure>' +
      (e.imgCaption ? '<p class="caption">' + esc(e.imgCaption) + '</p>' : '') +
      '<div class="entry-body">' +
      '<p class="text">' + linkOrgs(esc(e.text)) + '</p>' +
      (facts ? '<dl class="facts">' + facts + '</dl>' : '') +
      '</div></div>' +
      '</article>';
  }

  function buildList(quiet) {
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
    if (quiet) return;
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

  // an opened project fits on one screen below the reading line, image beside the text.
  // The image column is sized from the image's own proportions and the height available (never
  // cropped); the text column takes the rest and scrolls inside itself if a description is long.
  // On phones everything stacks and only video frames are sized here.
  var TEXT_MIN = 280;
  function fitPanel(el) {
    var panel = el && el.querySelector('.entry-panel');
    if (!panel) return;
    var sr = $scroller.getBoundingClientRect();
    var H = Math.round(Math.max(260, sr.bottom - lineY() - el.querySelector('.entry-head').offsetHeight - 44));
    // read by CSS: max height of the image and of the text column
    panel.style.setProperty('--fit-h', H + 'px');
    panel.style.gridTemplateColumns = '';
    var frame = panel.querySelector('.frame');
    if (!frame) return;
    var narrow = !!(window.matchMedia && window.matchMedia('(max-width: 860px)').matches);
    var natural = frame.classList.contains('is-natural');
    var ratio = 16 / 9;
    if (natural) {
      var m = frame.querySelector('img.still, video.loop');
      var nw = m && (m.naturalWidth || m.videoWidth), nh = m && (m.naturalHeight || m.videoHeight);
      if (nw && nh) ratio = nw / nh;
      else {
        ratio = 4 / 3;   // until the image arrives, then fit again with its real proportions
        if (m && !m._fitWait) {
          m._fitWait = true;
          m.addEventListener(m.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', function () {
            if (state.open === el.dataset.id) fitPanel(el);
          }, { once: true });
        }
      }
    }
    var cs = getComputedStyle(panel);
    var inner = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var w = inner;
    if (!narrow) {
      var gap = parseFloat(cs.columnGap) || 32;
      // as wide as the image is at full height, but leave the text its minimum (or at least half)
      w = Math.round(Math.max(Math.min(H * ratio, inner - gap - TEXT_MIN), Math.min(H * ratio, inner * 0.5)));
      panel.style.gridTemplateColumns = w + 'px minmax(0, 1fr)';
    }
    if (natural) { frame.style.height = ''; return; }
    var h = Math.round(narrow ? w * 9 / 16 : Math.min(H, w * 9 / 16));
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
  function onScroll() {
    if (!steer) clearHover();
    hideTip();
    if (!ticking) { ticking = true; requestAnimationFrame(sync); }
  }

  function sync() {
    ticking = false;
    // while gliding to a picked project, or previewing a hovered row, the playhead is steered directly
    if (!cards.length || scrubbing || steer || hoverId) return;
    // dropped there by hand: stay put until the visitor scrolls
    if (pinned !== null) { setPlayheadAt(pinned); return; }
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
    lastPct = y;
    var py = y / 100 * tlBody.clientHeight;
    playhead.style.transform = 'translateY(' + py.toFixed(1) + 'px)';
    playhead.querySelector('.playhead-label').textContent = a.when;
  }

  /* ---------- hold the orange label and drag it: the label follows the pointer, the project it crosses
     is highlighted and brought to the reading line. Let go and it stays there (pinned) until the
     visitor scrolls the list or picks a project again. ---------- */
  var scrubbing = false, pinned = null;   // pinned: playhead position in % while it rests where it was dropped
  var lastPct = 0;                        // where the playhead currently is, in %
  var steer = null;                       // {from, to, label}: the playhead glides straight to a picked project
  var SNAP_PX = 8;                        // a dot this close to the playhead counts as crossed
  function hitAt(y) {
    var h = tlBody.clientHeight / 100;   // % -> px
    var dot = -1, dotD = Infinity, bar = -1, barLen = Infinity, near = 0, nearD = Infinity;
    cards.forEach(function (c, i) {
      var e = byId[c.id], d;
      if (e.end) {
        var top = ypos(e.end), bot = ypos(e.t);
        if (y >= top && y <= bot && bot - top < barLen) { bar = i; barLen = bot - top; }  // shortest bar covering y
        d = (y < top ? top - y : y > bot ? y - bot : 0) * h;
      } else {
        d = Math.abs(ypos(e.t) - y) * h;
        if (d < dotD) { dot = i; dotD = d; }
      }
      if (d < nearD) { near = i; nearD = d; }
    });
    if (dot >= 0 && dotD <= SNAP_PX) return dot;   // a dot right under the playhead wins
    if (bar >= 0) return bar;                        // otherwise the bar it runs through
    return near;                                     // otherwise whatever is closest
  }
  function setPlayheadAt(pct, label) {
    lastPct = pct;
    playhead.style.transform = 'translateY(' + (pct / 100 * tlBody.clientHeight).toFixed(1) + 'px)';
    if (label != null) playhead.querySelector('.playhead-label').textContent = label;
  }
  function scrubTo(clientY) {
    if (!cards.length) return;
    var r = tlBody.getBoundingClientRect();
    var y = Math.min(100, Math.max(0, (clientY - r.top) / r.height * 100));
    var idx = hitAt(y), e = byId[cards[idx].id];
    pinned = y;
    setPlayheadAt(y, e.when);
    if (state.sel !== e.id) {
      var sr = $scroller.getBoundingClientRect(), er = cards[idx].el.getBoundingClientRect();
      var top = er.top - sr.top + $scroller.scrollTop - (lineY() - sr.top) + 2;
      $scroller.scrollTop = Math.max(0, Math.min(top, $scroller.scrollHeight - $scroller.clientHeight));
      setSel(e.id);
    }
  }
  function unpin() { pinned = null; }
  function bindScrub(handle) {
    handle.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      ev.preventDefault();
      cancelScroll();
      hideTip();
      scrubbing = true;
      playhead.classList.remove('glide');
      playhead.classList.add('dragging');
      document.documentElement.classList.add('scrubbing');
      try { handle.setPointerCapture(ev.pointerId); } catch (_) { }
    });
    handle.addEventListener('pointermove', function (ev) {
      if (scrubbing) scrubTo(ev.clientY);
    });
    function stop() {
      if (!scrubbing) return;
      scrubbing = false;
      playhead.classList.remove('dragging');
      document.documentElement.classList.remove('scrubbing');
    }
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('lostpointercapture', stop);
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
    clearHover();
    // the playhead heads straight for the picked project: closing the previous one would otherwise
    // shift the list under the reading line and make it jump back before it moves on
    var glide = smooth && !reduceMotion;
    var from = lastPct;
    var shift = openEntry(id, !smooth);
    var sr = $scroller.getBoundingClientRect();
    var top = el.getBoundingClientRect().top - sr.top + $scroller.scrollTop - (lineY() - sr.top) + 2 - shift;
    if (glide) setSel(id);
    scrollToY(Math.max(0, Math.min(top, $scroller.scrollHeight - $scroller.clientHeight)), glide,
      glide ? { from: from, to: ypos(byId[id].t), label: byId[id].when } : null);
  }

  // eased scroll of the project column (not relying on the browser's smooth scrolling)
  var scrollAnim = null;
  function cancelScroll() { scrollAnim = null; steer = null; }
  function scrollToY(y, smooth, steerTo) {
    cancelScroll();
    unpin();
    var from = $scroller.scrollTop, dist = y - from;
    if (!smooth || Math.abs(dist) < 2) { $scroller.scrollTop = y; sync(); return; }
    steer = steerTo || null;
    var dur = Math.min(1400, 500 + Math.abs(dist) * 0.25), t0 = Date.now();
    var token = {};
    scrollAnim = token;
    function frame() {
      if (scrollAnim !== token) return;
      var p = Math.min(1, (Date.now() - t0) / dur);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      $scroller.scrollTop = from + dist * e;
      if (steer) setPlayheadAt(steer.from + (steer.to - steer.from) * e, steer.label);
      else sync();
      if (p < 1) setTimeout(frame, 16);
      else { scrollAnim = null; steer = null; sync(); }
    }
    frame();
  }

  /* ---------- hovering a row in the index previews it on the timeline: the playhead glides to it
     and its dot shows the thumbnail tooltip. Leaving the index hands the playhead back to the scroll. ---------- */
  var hoverId = null, hoverGlideT;
  function hoverGlide() {
    if (reduceMotion) return;
    playhead.classList.add('hover-glide');
    clearTimeout(hoverGlideT);
    hoverGlideT = setTimeout(function () { playhead.classList.remove('hover-glide'); }, 320);
  }
  function clearHover() {
    if (!hoverId) return;
    if (marks[hoverId]) marks[hoverId].classList.remove('hl');
    hoverId = null;
  }
  function previewRow(id) {
    if (id === hoverId || scrubbing || steer || intro || !byId[id] || !marks[id]) return;
    clearHover();
    var e = byId[id];
    hoverId = id;
    marks[id].classList.add('hl');
    hoverGlide();
    setPlayheadAt(ypos(e.t), e.when);
    showTip(marks[id], e);
  }
  function endPreview() {
    if (!hoverId) return;
    clearHover();
    hideTip();
    hoverGlide();
    sync();
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

  // the visitor taking hold of the scroll cancels any eased scroll in progress,
  // and lets go of a playhead that was dropped by hand
  ['wheel', 'touchstart', 'pointerdown'].forEach(function (type) {
    $scroller.addEventListener(type, function () { cancelScroll(); unpin(); }, { passive: true });
  });
  document.addEventListener('keydown', unpin);

  window.addEventListener('hashchange', function () {
    var m = location.hash.match(/^#w\/(.+)$/);
    if (m && decodeURIComponent(m[1]) !== state.open) goTo(decodeURIComponent(m[1]), true);
    if (location.hash === '#about') unfoldAbout();
  });

  $scroller.addEventListener('scroll', onScroll, { passive: true });
  {
    // a real mouse only: touch pointers never report 'mouse', so phones and tablets are left alone
    var lastPX = -1, lastPY = -1;
    $list.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse') return;
      // Chrome fires a still pointermove after scrolling; only real mouse movement counts
      if (ev.clientX === lastPX && ev.clientY === lastPY) return;
      lastPX = ev.clientX; lastPY = ev.clientY;
      var head = ev.target.closest('.entry-head[data-toggle]');
      if (head) previewRow(head.dataset.toggle); else endPreview();
    });
    $list.addEventListener('pointerleave', endPreview);
  }
  var resizeT;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { drawPath(); sync(); if (state.open) fitPanel(document.getElementById('w-' + state.open)); }, 80); });

  /* ---------- init ---------- */
  var h = location.hash.match(/^#w\/(.+)$/);
  var deep = h && byId[decodeURIComponent(h[1])] ? decodeURIComponent(h[1]) : null;
  var playIntro = !reduceMotion && !deep && !!Element.prototype.animate;

  buildTimeline();
  buildPaths();
  buildList(playIntro);
  if (playIntro) runIntro();
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
