const notes = document.querySelector('.notes-band');

if (notes) {
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      notes.classList.toggle('is-active', entry.isIntersecting);
    }, { threshold: .04 }).observe(notes);
  } else {
    notes.classList.add('is-active');
  }
}
