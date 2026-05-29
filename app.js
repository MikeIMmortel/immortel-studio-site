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

  // --------- Touch swipe carousel (iPad / phone) ----------
  // Drag the strip with one finger — the neighbouring photos follow — then a
  // flick or a drag past ~18% of the width settles onto the next/previous one.
  let dragging = false, horizontal = null;
  let startX = 0, startY = 0, dx = 0, dy = 0, baseX = 0, lastX = 0, lastT = 0, vel = 0;
  const FLICK_VEL = 0.45;  // px/ms — a quick flick navigates even if short
  const DIST_FRAC = 0.18;  // fraction of the width that also navigates

  viewport.addEventListener('touchstart', (e) => {
    if (lb.dataset.open !== '1' || !currentProject || animating) return;
    if (currentProject.photos.length < 2 || e.touches.length !== 1) return;
    W = viewport.clientWidth;
    baseX = -W;
    startX = lastX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    lastT = performance.now();
    dx = 0; dy = 0; vel = 0; dragging = true; horizontal = null;
    setTrack(baseX, 0);
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const x = e.touches[0].clientX, y = e.touches[0].clientY;
    dx = x - startX;
    dy = y - startY;
    if (horizontal === null) horizontal = Math.abs(dx) > Math.abs(dy) + 2;
    if (!horizontal) return;
    e.preventDefault(); // claim the horizontal gesture (no page scroll / back-swipe)
    const now = performance.now();
    if (now > lastT) vel = (x - lastX) / (now - lastT);
    lastX = x; lastT = now;
    const cdx = Math.max(-W, Math.min(W, dx)); // never drag past a single neighbour
    setTrack(baseX + cdx, 0);
  }, { passive: false });

  function endSwipe() {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      swiped = true;
      setTimeout(() => { swiped = false; }, 400); // self-clear so it never eats a later tap
    }
    if (!horizontal) return; // vertical drag: track never moved, nothing to settle
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
  viewport.addEventListener('touchend', endSwipe);
  viewport.addEventListener('touchcancel', endSwipe);

  window.addEventListener('resize', () => {
    if (lb.dataset.open === '1' && !dragging && !animating) render();
  });
})();
