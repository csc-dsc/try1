(() => {
  const rig = document.querySelector('.articles-rig');
  const screen = document.getElementById('article-screen');
  if (!rig || !screen) return;

  const scenes = [...screen.querySelectorAll('[data-article-scene]')];
  const steps = [...screen.querySelectorAll('[data-article-target]')];
  const counter = document.getElementById('article-counter');
  const status = document.getElementById('article-status');
  const previous = document.getElementById('article-prev');
  const next = document.getElementById('article-next');
  const ids = scenes.map((scene) => scene.dataset.articleScene);
  const labels = ['SYSTEM READY', 'ASM / ACTIVE', 'HOOK / ACTIVE', 'PWN / ACTIVE'];
  const effects = ['scan', 'split', 'signal', 'reboot'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = 0;
  let busy = false;
  let swapTimer;
  let finishTimer;

  function indexFromHash() {
    const index = ids.indexOf(decodeURIComponent(location.hash.slice(1)));
    return index < 0 ? 0 : index;
  }

  function display(index) {
    active = index;
    scenes.forEach((scene, position) => { scene.hidden = position !== index; });
    steps.forEach((step, position) => {
      const current = position === index;
      step.classList.toggle('is-current', current);
      step.setAttribute('aria-pressed', String(current));
    });
    screen.dataset.scene = ids[index];
    rig.dataset.scene = ids[index];
    counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(ids.length).padStart(2, '0');
    previous.disabled = index === 0;
    next.setAttribute('aria-label', index === ids.length - 1 ? '重新打开文章简介' : '接管下一画面');
    next.title = next.getAttribute('aria-label');
    if (!busy) status.textContent = labels[index];
  }

  function finish() {
    clearTimeout(swapTimer);
    clearTimeout(finishTimer);
    busy = false;
    screen.classList.remove('is-hacking');
    rig.classList.remove('is-hacking');
    screen.removeAttribute('data-effect');
    screen.setAttribute('aria-busy', 'false');
    status.textContent = labels[active];
  }

  function navigate(index, { push = true, animate = true } = {}) {
    if (busy || index === active || index < 0 || index >= ids.length) return;
    const effect = index === (active + 1) % ids.length ? effects[active] : effects[index];
    if (push) history.pushState({ articleScene: ids[index] }, '', '#' + ids[index]);
    if (reducedMotion || !animate) {
      display(index);
      return;
    }

    busy = true;
    screen.dataset.effect = effect;
    screen.classList.add('is-hacking');
    rig.classList.add('is-hacking');
    screen.setAttribute('aria-busy', 'true');
    status.textContent = 'SIGNAL BREACH';
    swapTimer = setTimeout(() => display(index), 390);
    finishTimer = setTimeout(finish, 860);
  }

  function advance() { navigate((active + 1) % ids.length); }

  screen.addEventListener('click', (event) => {
    if (event.target.closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    advance();
  });
  previous.addEventListener('click', () => navigate(active - 1));
  next.addEventListener('click', advance);
  steps.forEach((step, index) => step.addEventListener('click', () => navigate(index)));
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable]')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); advance(); }
    if (event.key === 'ArrowLeft' && active > 0) { event.preventDefault(); navigate(active - 1); }
  });

  const restoreFromHistory = () => {
    finish();
    display(indexFromHash());
  };
  window.addEventListener('popstate', restoreFromHistory);
  window.addEventListener('hashchange', restoreFromHistory);
  display(indexFromHash());
})();
