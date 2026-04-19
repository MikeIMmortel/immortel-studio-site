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

  // Source "I AM VAN DE MORTEL" — KEEP indices form "I M MORTEL" = IMMORTEL
  const SOURCE = 'I AM VAN DE MORTEL';
  const KEEP = new Set([0, 3, 12, 13, 14, 15, 16, 17]);

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
    card.innerHTML = `
      <div class="project-card__cover">
        <img src="${p.photos[0]}" alt="${p.title}" loading="lazy">
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

  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lightboxImg');
  const lbCount = document.getElementById('lightboxCount');
  const btnPrev = lb.querySelector('.lightbox__prev');
  const btnNext = lb.querySelector('.lightbox__next');
  const btnClose= lb.querySelector('.lightbox__close');

  let currentProject = null;
  let currentIndex = 0;

  function open(projectIdx, photoIdx = 0) {
    currentProject = projects[projectIdx];
    currentIndex = photoIdx;
    update();
    lb.dataset.open = '1';
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lb.dataset.open = '0';
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentProject = null;
  }
  function step(delta) {
    if (!currentProject) return;
    const n = currentProject.photos.length;
    currentIndex = (currentIndex + delta + n) % n;
    update();
  }
  function update() {
    if (!currentProject) return;
    lbImg.src = currentProject.photos[currentIndex];
    lbImg.alt = `${currentProject.title} — foto ${currentIndex + 1}`;
    lbCount.textContent = `${currentIndex + 1} / ${currentProject.photos.length}`;
  }

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.project-card');
    if (!card) return;
    open(Number(card.dataset.projectIdx));
  });
  btnPrev.addEventListener('click', () => step(-1));
  btnNext.addEventListener('click', () => step(+1));
  btnClose.addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.dataset.open !== '1') return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(+1);
  });
})();
