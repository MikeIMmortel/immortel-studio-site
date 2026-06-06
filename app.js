/* ============================================================
   Immortel Studio — app.js
   - Name animation (I AM VAN DE MORTEL ↔ IMMORTEL, looping)
   - Scroll reveal
   - Project cards from projects.json
   - Lightbox
   ============================================================ */

// --------- Name animation ----------
(function nameAnimation() {
  const line = document.getElementById('nameLine');
  const sub  = document.getElementById('nameSub');
  const hero = document.getElementById('hero');
  if (!line) return;

  // Source "I AM VANDEMORTEL" — KEEP indices form "I M MORTEL" = IMMORTEL
  const SOURCE = 'I AM VANDEMORTEL';
  const KEEP = new Set([0, 3, 10, 11, 12, 13, 14, 15]);

  const frag = document.createDocumentFragment();
  for (let i = 0; i < SOURCE.length; i++) {
    const ch = SOURCE[i];
    const span = document.createElement('span');
    span.className = 'letter' + (ch === ' ' ? ' space' : '') + (KEEP.has(i) ? ' keep' : ' drop');
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    frag.appendChild(span);
  }
  line.appendChild(frag);

  const letters = Array.from(line.querySelectorAll('.letter'));

  // Assign per-letter --i (used by CSS transition-delay for staggered expand)
  // Only non-keep letters get a growing index so they stagger visibly.
  let stagger = 0;
  letters.forEach(el => {
    if (!el.classList.contains('keep')) {
      el.style.setProperty('--i', stagger++);
    }
  });

  const LETTER_DELAY = 70;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  (async () => {
    // --- Intro: stagger fade-in of all letters ---
    await sleep(250);
    letters.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), i * LETTER_DELAY));
    await sleep((letters.length - 1) * LETTER_DELAY + 700);

    // --- Morph to IMMORTEL ---
    line.dataset.state = 'morph';
    await sleep(800);
    line.dataset.state = 'final';
    sub.classList.add('is-in');
    hero.dataset.revealed = '1';

    // --- Continuous loop: expand back (staggered) → collapse (together) → repeat ---
    if (reduce) return;

    const HOLD_FINAL = 2200;     // pause at IMMORTEL
    const HOLD_EXPANDED = 1400;  // pause at full phrase

    while (true) {
      await sleep(HOLD_FINAL);

      // Expand: the CSS transition-delay per letter produces the stagger on its own
      line.dataset.state = 'start';
      // Wait for the last letter to finish expanding: stagger + transition
      await sleep(stagger * 55 + 900 + HOLD_EXPANDED);

      // Collapse: state=morph triggers simultaneous morph (transition-delay: 0)
      line.dataset.state = 'morph';
      await sleep(800);
      line.dataset.state = 'final';
    }
  })();
})();

// --------- Footer year ----------
document.getElementById('year').textContent = new Date().getFullYear();

// --------- Sticky nav bg ----------
(function scrollNav() {
  const nav = document.querySelector('.site-nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// --------- Theme toggle (light / dark) ----------
(function themeToggle() {
  const btn = document.querySelector('.site-nav__theme');
  if (!btn) return;

  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = (theme, persist) => {
    root.setAttribute('data-theme', theme);
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.setAttribute('aria-label', theme === 'dark' ? 'Schakel lichte modus' : 'Schakel donkere modus');
    if (persist) {
      try { localStorage.setItem('theme', theme); } catch (e) {}
    }
  };

  const current = () => root.getAttribute('data-theme') || (media.matches ? 'dark' : 'light');
  apply(current(), false);

  btn.addEventListener('click', () => {
    apply(current() === 'dark' ? 'light' : 'dark', true);
  });

  // Follow system changes only if the user hasn't explicitly chosen
  media.addEventListener?.('change', (e) => {
    try { if (localStorage.getItem('theme')) return; } catch (_) {}
    apply(e.matches ? 'dark' : 'light', false);
  });
})();

// --------- Mobile hamburger menu ----------
(function mobileMenu() {
  const nav = document.querySelector('.site-nav');
  const toggle = nav?.querySelector('.site-nav__toggle');
  const menu = nav?.querySelector('.site-nav__links');
  if (!nav || !toggle || !menu) return;

  const open = () => {
    nav.dataset.menu = 'open';
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  };
  const close = () => {
    nav.dataset.menu = '';
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };

  toggle.addEventListener('click', () => {
    nav.dataset.menu === 'open' ? close() : open();
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.dataset.menu === 'open') close();
  });
})();

// --------- Reveal on scroll ----------
(function reveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  document.querySelectorAll('.section .h2, .section .eyebrow, .section .prose, .service, .lab__card, .project-card, .contact__link, .contact__intro, .lab__intro, .about__media, .about__body')
    .forEach(el => { el.classList.add('reveal'); io.observe(el); });
})();

// --------- Project grid + lightbox ----------
(async function projects() {
  const grid = document.getElementById('projectGrid');
  if (!grid) return;

  let data;
  try {
    const res = await fetch('projects.json', { cache: 'no-cache' });
    data = await res.json();
  } catch (err) {
    grid.innerHTML = '<p>Kon projecten niet laden.</p>';
    console.error(err);
    return;
  }

  const projects = (data.projects || []).filter(p => (p.photos || []).length > 0);

  projects.forEach((p, idx) => {
    const card = document.createElement('button');
    card.className = 'project-card reveal';
    card.type = 'button';
    card.dataset.projectIdx = idx;
    const hasMultiple = p.photos.length > 1;
    card.innerHTML = `
      <div class="project-card__cover">
        <img src="${p.photos[0]}" alt="${p.title}" loading="lazy">
        ${hasMultiple ? `
          <span class="project-card__badge" aria-label="${p.photos.length} foto's in dit project">
            <svg class="project-card__badge-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="7" y="7" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M4 16V5a1 1 0 0 1 1-1h11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="project-card__badge-count">${p.photos.length}</span>
          </span>
        ` : ''}
      </div>
      <div class="project-card__meta">
        <div class="project-card__head">
          <h3 class="project-card__title">${p.title}</h3>
          <span class="project-card__count">${p.photos.length} ${p.photos.length === 1 ? 'foto' : "foto's"}</span>
        </div>
        ${p.summary ? `<p class="project-card__summary">${p.summary}</p>` : ''}
      </div>
    `;
    grid.appendChild(card);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  grid.querySelectorAll('.project-card').forEach(el => io.observe(el));

  const lb       = document.getElementById('lightbox');
  const lbCount  = document.getElementById('lightboxCount');
  const viewport = lb.querySelector('.lightbox__viewport');
  const track    = lb.querySelector('.lightbox__track');
  const btnPrev  = lb.querySelector('.lightbox__prev');
  const btnNext  = lb.querySelector('.lightbox__next');
  const btnClose = lb.querySelector('.lightbox__close');

  // Three slides act as a [prev, current, next] window onto the photo list.
  let slides = Array.from(track.children);
  let imgs   = slides.map(s => s.querySelector('img'));

  const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  let currentProject = null;
  let currentIndex = 0;
  let swiped = false;     // suppress the click synthesised at the end of a drag
  let animating = false;  // lock input while a settle animation runs
  let W = 0;              // viewport width in px

  // --------- Zoom state (applied to the centred image only) ----------
  const MAX_SCALE = 4;          // hard ceiling for pinch
  const DOUBLE_TAP_SCALE = 2.5; // how far a double-tap zooms in
  let scale = 1, tx = 0, ty = 0;        // current transform of the centred image
  let baseW = 0, baseH = 0;             // its rendered (contain-fit) size at scale 1

  const centerImg = () => imgs[1];

  // Rendered size of the centred photo, mirroring the CSS max 92vw × 90vh contain.
  function measureBase() {
    const img = centerImg();
    const nW = img.naturalWidth, nH = img.naturalHeight;
    if (!nW || !nH) { baseW = viewport.clientWidth; baseH = viewport.clientHeight; return; }
    const fit = Math.min(1, window.innerWidth * 0.92 / nW, window.innerHeight * 0.90 / nH);
    baseW = nW * fit; baseH = nH * fit;
  }

  // Keep the zoomed image from drifting past its own edges.
  function clampTranslate() {
    const maxX = Math.max(0, (baseW * scale - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (baseH * scale - viewport.clientHeight) / 2);
    tx = Math.max(-maxX, Math.min(maxX, tx));
    ty = Math.max(-maxY, Math.min(maxY, ty));
  }

  function applyZoom(animate) {
    const img = centerImg();
    img.style.transition = animate ? `transform 240ms ${EASE}` : 'none';
    img.style.transform = scale === 1 ? '' : `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
  }

  // Drop back to 1× and clear the inline transform on every slide.
  function resetZoom(animate) {
    scale = 1; tx = 0; ty = 0;
    imgs.forEach(im => {
      if (animate && im === imgs[1]) {
        im.style.transition = `transform 240ms ${EASE}`;
        im.style.transform = 'translate3d(0,0,0) scale(1)';
        const clear = () => { im.style.transition = 'none'; im.style.transform = ''; im.removeEventListener('transitionend', clear); };
        im.addEventListener('transitionend', clear);
        setTimeout(clear, 320);
      } else {
        im.style.transition = 'none';
        im.style.transform = '';
      }
    });
  }

  const wrap = (i) => {
    const n = currentProject.photos.length;
    return ((i % n) + n) % n;
  };
  const photoAt = (offset) => currentProject.photos[wrap(currentIndex + offset)];

  const setTrack = (x, dur) => {
    track.style.transition = dur ? `transform ${dur}ms ${EASE}` : 'none';
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  // Build all three slides for the current index and centre the track instantly.
  function render() {
    if (!currentProject) return;
    imgs[0].src = photoAt(-1);
    imgs[1].src = photoAt(0);
    imgs[2].src = photoAt(1);
    imgs[1].alt = `${currentProject.title} — foto ${currentIndex + 1}`;
    imgs[0].alt = imgs[2].alt = '';
    lbCount.textContent = `${currentIndex + 1} / ${currentProject.photos.length}`;
    resetZoom(false);
    W = viewport.clientWidth;
    setTrack(-W, 0);
    void track.offsetWidth; // flush so the next transition starts cleanly
  }

  function animateTrackTo(x, dur, done) {
    setTrack(x, dur);
    let fired = false;
    const finish = () => {
      if (fired) return;
      fired = true;
      track.removeEventListener('transitionend', onEnd);
      if (done) done();
    };
    const onEnd = (e) => { if (e.propertyName === 'transform') finish(); };
    track.addEventListener('transitionend', onEnd);
    setTimeout(finish, dur + 60); // fallback if transitionend is missed
  }

  // After a settle, rotate the slide elements so the now-centred photo stays put
  // (no src swap on the visible slide → no flicker), then refresh the neighbours.
  function recycle(dir) {
    currentIndex = wrap(currentIndex + dir);
    if (dir > 0) track.appendChild(track.firstElementChild);
    else         track.insertBefore(track.lastElementChild, track.firstElementChild);
    slides = Array.from(track.children);
    imgs   = slides.map(s => s.querySelector('img'));
    resetZoom(false);
    W = viewport.clientWidth;
    setTrack(-W, 0);
    void track.offsetWidth;
    imgs[0].src = photoAt(-1);
    imgs[2].src = photoAt(1);
    imgs[1].alt = `${currentProject.title} — foto ${currentIndex + 1}`;
    imgs[0].alt = imgs[2].alt = '';
    lbCount.textContent = `${currentIndex + 1} / ${currentProject.photos.length}`;
    animating = false;
  }

  // Animated navigation (used by the arrows and the keyboard).
  function navigate(dir) {
    if (!currentProject || animating) return;
    if (currentProject.photos.length < 2) return;
    resetZoom(false);
    animating = true;
    W = viewport.clientWidth;
    setTrack(-W, 0);
    void track.offsetWidth;
    animateTrackTo(dir > 0 ? -2 * W : 0, 300, () => recycle(dir));
  }

  function open(projectIdx, photoIdx = 0) {
    currentProject = projects[projectIdx];
    currentIndex = photoIdx;
    lb.dataset.open = '1';
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    render(); // lightbox must be visible first so the viewport has a width
  }
  function close() {
    lb.dataset.open = '0';
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentProject = null;
  }

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.project-card');
    if (!card) return;
    open(Number(card.dataset.projectIdx));
  });
  btnPrev.addEventListener('click', () => navigate(-1));
  btnNext.addEventListener('click', () => navigate(+1));
  btnClose.addEventListener('click', close);
  lb.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }                    // ignore the post-drag click
    if (e.target.closest('.lightbox__close, .lightbox__prev, .lightbox__next')) return;
    if (e.target.tagName === 'IMG') return;                    // tapping the photo keeps it open
    close();                                                   // tap on the dark area closes
  });
  document.addEventListener('keydown', (e) => {
    if (lb.dataset.open !== '1') return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(+1);
  });

  // --------- Touch gestures (iPad / phone): swipe · pinch-zoom · pan ----------
  // One finger at 1×: drag the strip — a flick or a drag past ~18% settles onto
  // the next/previous photo. Two fingers: pinch to zoom the centred photo. Once
  // zoomed in, one finger pans within it; a double-tap toggles zoom in/out.
  let mode = null;                 // null | 'swipe' | 'pan' | 'pinch' | 'tap'
  let dragging = false, horizontal = null;
  let startX = 0, startY = 0, dx = 0, dy = 0, baseX = 0, lastX = 0, lastT = 0, vel = 0;
  let panStartX = 0, panStartY = 0, panBaseTx = 0, panBaseTy = 0;
  let pinchDist0 = 1, pinchScale0 = 1, pinchTx0 = 0, pinchTy0 = 0, pinchMidX0 = 0, pinchMidY0 = 0;
  let lastTapT = 0, lastTapX = 0, lastTapY = 0;
  const FLICK_VEL = 0.45;  // px/ms — a quick flick navigates even if short
  const DIST_FRAC = 0.18;  // fraction of the width that also navigates

  const touchDist = (t) => Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
  function touchMid(t) {
    const r = viewport.getBoundingClientRect();
    return { x: (t[0].clientX + t[1].clientX) / 2 - r.left, y: (t[0].clientY + t[1].clientY) / 2 - r.top };
  }

  function beginPinch(e) {
    mode = 'pinch'; dragging = false;
    W = viewport.clientWidth;
    setTrack(-W, 0);          // recentre in case a swipe was mid-drag
    measureBase();
    pinchDist0 = touchDist(e.touches) || 1;
    pinchScale0 = scale; pinchTx0 = tx; pinchTy0 = ty;
    const m = touchMid(e.touches);
    pinchMidX0 = m.x - viewport.clientWidth / 2;
    pinchMidY0 = m.y - viewport.clientHeight / 2;
    centerImg().style.transition = 'none';
  }

  // Double-tap (or two-finger end) settle: snap fully out below ~1×, else clamp.
  function endZoomGesture() {
    mode = null; dragging = false;
    if (scale <= 1.02) resetZoom(true);
    else { clampTranslate(); applyZoom(true); }
    swiped = true;
    setTimeout(() => { swiped = false; }, 400);
  }

  function toggleZoomAt(px, py) {
    measureBase();
    if (scale > 1.02) { resetZoom(true); return; }
    const fx = px - viewport.clientWidth / 2;
    const fy = py - viewport.clientHeight / 2;
    scale = DOUBLE_TAP_SCALE;
    tx = fx * (1 - scale);   // keep the tapped point under the finger
    ty = fy * (1 - scale);
    clampTranslate();
    applyZoom(true);
    swiped = true;
    setTimeout(() => { swiped = false; }, 400);
  }

  function handleTap(e) {
    const t = e.changedTouches[0];
    const r = viewport.getBoundingClientRect();
    const px = t.clientX - r.left, py = t.clientY - r.top;
    const now = performance.now();
    const isDouble = (now - lastTapT < 300) && Math.abs(px - lastTapX) < 40 && Math.abs(py - lastTapY) < 40;
    lastTapT = now; lastTapX = px; lastTapY = py;
    if (isDouble) { lastTapT = 0; toggleZoomAt(px, py); }
  }

  function settleSwipe() {
    if (!horizontal) { setTrack(baseX, 0); return; }
    const cdx = Math.max(-W, Math.min(W, dx));
    let dir = 0;
    if (dx <= -W * DIST_FRAC || vel <= -FLICK_VEL) dir = +1;       // left  → next
    else if (dx >= W * DIST_FRAC || vel >= FLICK_VEL) dir = -1;    // right → previous
    if (dir !== 0) {
      animating = true;
      const target = dir > 0 ? -2 * W : 0;
      const remaining = Math.abs(target - (baseX + cdx));
      const dur = Math.max(160, Math.min(320, remaining / Math.max(0.9, Math.abs(vel))));
      animateTrackTo(target, dur, () => recycle(dir));
    } else {
      animateTrackTo(baseX, 240, null); // didn't reach the threshold → snap back
    }
  }

  viewport.addEventListener('touchstart', (e) => {
    if (lb.dataset.open !== '1' || !currentProject || animating) return;
    if (e.touches.length >= 2) { beginPinch(e); e.preventDefault(); return; }

    const t = e.touches[0];
    if (scale > 1.02) {                       // already zoomed → pan
      mode = 'pan'; dragging = false;
      measureBase();
      panStartX = t.clientX; panStartY = t.clientY; panBaseTx = tx; panBaseTy = ty;
      centerImg().style.transition = 'none';
      return;
    }

    startX = lastX = t.clientX; startY = t.clientY;
    dx = 0; dy = 0; lastT = performance.now();
    if (currentProject.photos.length >= 2) {  // not zoomed, multi-photo → swipe
      mode = 'swipe';
      W = viewport.clientWidth; baseX = -W;
      vel = 0; dragging = true; horizontal = null;
      setTrack(baseX, 0);
    } else {                                   // single photo → only tap/double-tap
      mode = 'tap'; dragging = false;
    }
  }, { passive: false });

  viewport.addEventListener('touchmove', (e) => {
    if (mode === 'pinch') {
      if (e.touches.length < 2) return;
      e.preventDefault();
      let s = Math.max(1, Math.min(MAX_SCALE, pinchScale0 * (touchDist(e.touches) / pinchDist0)));
      const m = touchMid(e.touches);
      const midX = m.x - viewport.clientWidth / 2, midY = m.y - viewport.clientHeight / 2;
      const ratio = s / pinchScale0;
      scale = s;
      tx = midX - ratio * (pinchMidX0 - pinchTx0);  // focal-point zoom + two-finger drift
      ty = midY - ratio * (pinchMidY0 - pinchTy0);
      clampTranslate();
      applyZoom(false);
      return;
    }
    if (mode === 'pan') {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      tx = panBaseTx + (t.clientX - panStartX);
      ty = panBaseTy + (t.clientY - panStartY);
      clampTranslate();
      applyZoom(false);
      return;
    }
    if (mode === 'swipe') {
      if (!dragging || e.touches.length !== 1) return;
      const x = e.touches[0].clientX, y = e.touches[0].clientY;
      dx = x - startX; dy = y - startY;
      if (horizontal === null) horizontal = Math.abs(dx) > Math.abs(dy) + 2;
      if (!horizontal) return;
      e.preventDefault(); // claim the horizontal gesture (no page scroll / back-swipe)
      const now = performance.now();
      if (now > lastT) vel = (x - lastX) / (now - lastT);
      lastX = x; lastT = now;
      const cdx = Math.max(-W, Math.min(W, dx)); // never drag past a single neighbour
      setTrack(baseX + cdx, 0);
      return;
    }
    if (mode === 'tap' && e.touches.length === 1) {
      dx = e.touches[0].clientX - startX; dy = e.touches[0].clientY - startY;
    }
  }, { passive: false });

  function onTouchEnd(e) {
    if (mode === 'pinch') {
      if (e.touches.length >= 2) return;                 // still pinching
      if (e.touches.length === 1 && scale > 1.02) {      // a finger lifted → keep panning
        mode = 'pan';
        const t = e.touches[0];
        panStartX = t.clientX; panStartY = t.clientY; panBaseTx = tx; panBaseTy = ty;
        return;
      }
      endZoomGesture();
      return;
    }
    if (mode === 'pan') {
      if (e.touches.length === 2) { beginPinch(e); return; } // second finger back down
      if (e.touches.length >= 1) return;
      const t = e.changedTouches[0];
      const moved = Math.hypot(t.clientX - panStartX, t.clientY - panStartY) > 10;
      if (moved) {
        endZoomGesture();        // a real pan → settle within bounds
      } else {
        handleTap(e);            // a tap while zoomed → double-tap zooms back out
        mode = null; dragging = false;
      }
      return;
    }
    if (mode === 'swipe' || mode === 'tap') {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        swiped = true;
        setTimeout(() => { swiped = false; }, 400); // self-clear so it never eats a later tap
        if (mode === 'swipe') settleSwipe();
      } else {
        handleTap(e);
      }
      mode = null; dragging = false;
    }
  }

  function onTouchCancel() {
    if (mode === 'pinch' || mode === 'pan') endZoomGesture();
    else if (mode === 'swipe' && horizontal) animateTrackTo(baseX, 240, null);
    mode = null; dragging = false;
  }

  viewport.addEventListener('touchend', onTouchEnd);
  viewport.addEventListener('touchcancel', onTouchCancel);

  // Suppress Safari's native page magnify so our pinch is the only zoom.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(type =>
    lb.addEventListener(type, (e) => { if (lb.dataset.open === '1') e.preventDefault(); }));

  window.addEventListener('resize', () => {
    if (lb.dataset.open === '1' && !mode && !animating) render();
  });
})();
