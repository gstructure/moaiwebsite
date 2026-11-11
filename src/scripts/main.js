// MOAI · site interactions. No dependencies; every feature degrades gracefully without JS.

const DESKTOP = window.matchMedia('(min-width: 900px)');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)');

/* Mobile menu ------------------------------------------------------------- */
function initMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById('menu-movil');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    toggle.textContent = open ? 'CERRAR' : 'MENÚ';
    document.body.style.overflow = open ? 'hidden' : '';
  };

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); }
  });
  DESKTOP.addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}

/* Hero tower: one front open at a time (hover, focus or tap) -------------- */
function initFronts() {
  const fronts = [...document.querySelectorAll('[data-front]')];
  const pick = (active) => fronts.forEach((front) => {
    const on = front === active;
    front.classList.toggle('is-active', on);
    front.querySelector('.front__button').setAttribute('aria-expanded', String(on));
    front.querySelector('.front__panel').hidden = !on;
  });
  fronts.forEach((front) => {
    const button = front.querySelector('.front__button');
    const select = () => { if (!front.classList.contains('is-active')) pick(front); };
    button.addEventListener('click', select);
    button.addEventListener('focus', select);
    button.addEventListener('mouseenter', () => { if (FINE_POINTER.matches) select(); });
  });
}

/* FAQ accordion ----------------------------------------------------------- */
function initFaq() {
  const buttons = [...document.querySelectorAll('[data-faq] .faq__button')];
  const panelOf = (button) => document.getElementById(button.getAttribute('aria-controls'));
  const setOpen = (button, open) => {
    button.setAttribute('aria-expanded', String(open));
    panelOf(button).hidden = !open;
  };
  buttons.forEach((button) => {
    setOpen(button, false); // panels ship open in the HTML so they stay readable without JS
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      buttons.forEach((other) => setOpen(other, other === button && open));
    });
  });
}

/* Technology strip: mouse drag + arrow buttons ---------------------------- */
function initStrip() {
  const strip = document.querySelector('[data-strip]');
  if (!strip) return;

  let down = false;
  let startX = 0;
  let startLeft = 0;
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a,button')) return;
    down = true; startX = e.clientX; startLeft = strip.scrollLeft;
    strip.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => { if (down) strip.scrollLeft = startLeft - (e.clientX - startX); });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    strip.classList.remove('is-dragging');
  });

  const scroll = (dir) => strip.scrollBy({
    left: dir * Math.min(560, strip.clientWidth * 0.8),
    behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth',
  });
  document.querySelector('[data-strip-prev]')?.addEventListener('click', () => scroll(-1));
  document.querySelector('[data-strip-next]')?.addEventListener('click', () => scroll(1));
}

/* Scroll reveal ----------------------------------------------------------- */
function initReveal() {
  if (REDUCED_MOTION.matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    io.unobserve(entry.target);
  }), { threshold: 0.15 });
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.getBoundingClientRect().top > window.innerHeight) {
      el.classList.add('reveal-init');
      io.observe(el);
    }
  });
}

/* Pointer effects: symbol parallax + magnetic CTA ------------------------- */
function initPointerEffects() {
  if (REDUCED_MOTION.matches || !FINE_POINTER.matches) return;
  const symbol = document.querySelector('[data-parallax]');
  const magnet = document.querySelector('[data-magnet]');
  if (!symbol && !magnet) return;

  const t = { x: 0, y: 0, cx: 0, cy: 0, bx: 0, by: 0, tbx: 0, tby: 0 };
  let raf = 0;

  const tick = () => {
    t.cx += (t.x - t.cx) * 0.06; t.cy += (t.y - t.cy) * 0.06;
    t.bx += (t.tbx - t.bx) * 0.14; t.by += (t.tby - t.by) * 0.14;
    if (symbol) symbol.style.transform = `translate(${(t.cx * -10).toFixed(2)}px,${(t.cy * -8).toFixed(2)}px) rotate(${(t.cx * 3).toFixed(2)}deg)`;
    if (magnet) magnet.style.transform = `translate(${t.bx.toFixed(2)}px,${t.by.toFixed(2)}px)`;
    // Stop the loop once everything has settled; the next mousemove restarts it.
    const settled = Math.abs(t.x - t.cx) < 0.001 && Math.abs(t.y - t.cy) < 0.001
      && Math.abs(t.tbx - t.bx) < 0.05 && Math.abs(t.tby - t.by) < 0.05;
    raf = settled ? 0 : requestAnimationFrame(tick);
  };

  window.addEventListener('mousemove', (e) => {
    t.x = e.clientX / window.innerWidth - 0.5;
    t.y = e.clientY / window.innerHeight - 0.5;
    if (magnet) {
      const r = magnet.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.hypot(dx, dy) < r.width * 1.3;
      t.tbx = near ? dx * 0.25 : 0;
      t.tby = near ? dy * 0.25 : 0;
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
}

initMenu();
initFronts();
initFaq();
initStrip();
initReveal();
initPointerEffects();
