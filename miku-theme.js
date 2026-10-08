const nav = document.getElementById('miku-nav');
const menu = document.getElementById('miku-menu');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrevious = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxCounter = document.getElementById('lightbox-counter');
const galleryButtons = [...document.querySelectorAll('.gallery-item button[data-src]')];
const hero = document.querySelector('.miku-hero');
const heroImage = hero?.querySelector('.miku-hero__image');
let currentImage = 0;

if (heroImage) {
  const revealHero = () => hero.classList.add('is-image-ready');
  if (heroImage.complete) revealHero();
  else {
    heroImage.addEventListener('load', revealHero, { once: true });
    heroImage.addEventListener('error', revealHero, { once: true });
  }
}

document.querySelectorAll('.miku-vector, .motion-figure img').forEach((image) => {
  image.fetchPriority = 'low';
  image.loading = 'eager';
});

const galleryImages = galleryButtons.map((button) => button.querySelector('img')).filter(Boolean);
galleryImages.forEach((image) => {
  const width = Number(image.getAttribute('width'));
  const height = Number(image.getAttribute('height'));
  if (width && height) image.style.aspectRatio = `${width} / ${height}`;
  const reveal = () => image.classList.add('is-loaded');
  if (image.complete) reveal();
  else {
    image.addEventListener('load', reveal, { once: true });
    image.addEventListener('error', reveal, { once: true });
  }
  image.fetchPriority = 'low';
});
if ('IntersectionObserver' in window) {
  const preloadGallery = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.loading = 'eager';
      preloadGallery.unobserve(entry.target);
    });
  }, { rootMargin: '1200px 0px' });
  galleryImages.forEach((image) => preloadGallery.observe(image));
} else galleryImages.forEach((image) => { image.loading = 'eager'; });
document.documentElement.classList.add('miku-media-enhanced');

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

function showGalleryImage(index) {
  currentImage = (index + galleryButtons.length) % galleryButtons.length;
  const button = galleryButtons[currentImage];
  lightboxImage.src = button.dataset.src;
  lightboxImage.alt = button.querySelector('img')?.alt || '画廊大图预览';
  lightboxCounter.textContent = `${String(currentImage + 1).padStart(2, '0')} / ${String(galleryButtons.length).padStart(2, '0')}`;
}

galleryButtons.forEach((button, index) => {
  button.closest('.gallery-item')?.style.setProperty('--gallery-delay', `${index % 3 * 85}ms`);
  button.addEventListener('click', () => {
    showGalleryImage(index);
    if (typeof lightbox.showModal === 'function') lightbox.showModal();
    else lightbox.setAttribute('open', '');
  });
});
document.querySelectorAll('.track-entry').forEach((entry, index) => {
  entry.style.setProperty('--track-delay', `${index * 90}ms`);
});

function closeLightbox() {
  if (lightbox?.open && typeof lightbox.close === 'function') lightbox.close();
  else lightbox?.removeAttribute('open');
}

lightboxClose?.addEventListener('click', closeLightbox);
lightboxPrevious?.addEventListener('click', () => showGalleryImage(currentImage - 1));
lightboxNext?.addEventListener('click', () => showGalleryImage(currentImage + 1));
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
    closeLightbox();
  } else if (lightbox?.open && event.key === 'ArrowLeft') {
    event.preventDefault();
    showGalleryImage(currentImage - 1);
  } else if (lightbox?.open && event.key === 'ArrowRight') {
    event.preventDefault();
    showGalleryImage(currentImage + 1);
  }
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

const signalLayout = document.querySelector('.signal-layout');
if (signalLayout && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    signalLayout.classList.toggle('is-active', entry.isIntersecting);
  }, { threshold: .1 }).observe(signalLayout);
}

const motionSections = document.querySelectorAll('.miku-hero, .archive-section');
if ('IntersectionObserver' in window) {
  const motionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.target.classList.toggle('is-active', entry.isIntersecting));
  }, { threshold: .08 });
  motionSections.forEach(section => motionObserver.observe(section));
} else {
  motionSections.forEach(section => section.classList.add('is-active'));
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (hero && !reducedMotion) {
  if (window.matchMedia('(pointer: fine)').matches) {
    let frame = 0;
    let shiftX = 0;
    let shiftY = 0;
    const paint = () => {
      hero.style.setProperty('--hero-shift-x', `${shiftX.toFixed(1)}px`);
      hero.style.setProperty('--hero-shift-y', `${shiftY.toFixed(1)}px`);
      frame = 0;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      shiftX = ((event.clientX - rect.left) / rect.width - .5) * 14;
      shiftY = ((event.clientY - rect.top) / rect.height - .5) * 10;
      schedule();
    });
    hero.addEventListener('pointerleave', () => { shiftX = 0; shiftY = 0; schedule(); });
  }
  hero.addEventListener('pointerdown', (event) => {
    if (document.hidden || event.target.closest('a, button')) return;
    const rect = hero.getBoundingClientRect();
    const trace = document.createElement('span');
    trace.className = 'miku-click-trace';
    trace.style.left = `${event.clientX - rect.left}px`;
    trace.style.top = `${event.clientY - rect.top}px`;
    trace.addEventListener('animationend', () => trace.remove(), { once: true });
    hero.append(trace);
    window.setTimeout(() => trace.remove(), 800);
  });
}

const year = document.getElementById('miku-year');
if (year) year.textContent = String(new Date().getFullYear());
