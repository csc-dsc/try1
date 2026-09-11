const page = document.documentElement;
const nav = document.getElementById('miku-nav');
const menu = document.getElementById('miku-menu');
const mode = document.getElementById('mode-toggle');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxClose = document.getElementById('lightbox-close');

function closeMenu() {
  nav?.classList.remove('is-open');
  menu?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-label', '打开导航');
}

menu?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
});

nav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

const savedMode = localStorage.getItem('miku-mode');
if (savedMode === 'dark') page.dataset.mode = 'dark';

mode?.addEventListener('click', () => {
  const next = page.dataset.mode === 'dark' ? 'light' : 'dark';
  if (next === 'dark') page.dataset.mode = 'dark';
  else delete page.dataset.mode;
  localStorage.setItem('miku-mode', next);
});

document.querySelectorAll('.gallery-item button[data-src]').forEach((button) => {
  button.addEventListener('click', () => {
    const preview = button.querySelector('img');
    lightboxImage.src = button.dataset.src;
    lightboxImage.alt = preview?.alt || '画廊大图预览';
    if (typeof lightbox.showModal === 'function') lightbox.showModal();
    else lightbox.setAttribute('open', '');
  });
});

function closeLightbox() {
  if (lightbox?.open && typeof lightbox.close === 'function') lightbox.close();
  else lightbox?.removeAttribute('open');
}

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeMenu();
  closeLightbox();
});

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });
  reveals.forEach((element) => observer.observe(element));
} else {
  reveals.forEach((element) => element.classList.add('is-visible'));
}

const year = document.getElementById('miku-year');
if (year) year.textContent = String(new Date().getFullYear());
