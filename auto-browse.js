(() => {
  const button = document.getElementById('auto-browse-toggle');
  const page = location.pathname.split('/').pop() || 'index.html';
  if (!button || !['index.html', 'personal-instruction.html', 'links.html'].includes(page)) return;

  const controls = button.closest('.auto-browse-control');
  const speedMenu = document.getElementById('auto-browse-menu');
  if (!controls || !speedMenu) return;
  const speedOptions = [...speedMenu.querySelectorAll('[data-browse-level]')];

  const root = document.documentElement;
  const levels = [null,
    { speed: 36 },
    { label: '慢', speed: 54 },
    { label: '中', speed: 72 },
    { label: '快', speed: 96 },
    { label: '较快', speed: 128 },
  ];
  let selectedLevel = 1;
  let targetSpeed = levels[1].speed;
  let currentSpeed = 0;
  let speedFrom = 0;
  let autoplayPending = true;
  let active = false;
  let frame = null;
  let started = 0;
  let previousTime = 0;
  let position = 0;
  let observedPosition = 0;
  const bottom = () => Math.max(0, (document.scrollingElement ?? root).scrollHeight - innerHeight);
  const render = () => {
    button.setAttribute('aria-pressed', String(active));
    const selected = levels[selectedLevel];
    button.setAttribute('aria-label', selectedLevel === 1 ? '自动浏览' : '自动浏览速度：' + selected.label);
    button.setAttribute('title', '自动浏览');
    button.setAttribute('data-browse-mode', !active ? 'stopped' : selectedLevel === 1 ? 'automatic' : 'fast');
    button.setAttribute('data-browse-level', String(selectedLevel));
    speedOptions.forEach(option => option.setAttribute('aria-checked',
      String(Number(option.getAttribute('data-browse-level')) === selectedLevel)));
    root.classList.toggle('is-auto-browsing', active);
  };
  const closeSpeedMenu = (restoreFocus = false) => {
    speedMenu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus && !document.hidden) button.focus({ preventScroll: true });
  };
  const stop = () => {
    const hadWork = active || autoplayPending || frame !== null;
    autoplayPending = false;
    if (!hadWork) return;
    active = false;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    render();
  };
  const advance = (now) => {
    frame = null;
    if (!active) return;
    if (document.hidden) { stop(); return; }
    const elapsed = Math.min(64, Math.max(0, now - previousTime));
    previousTime = now;
    const ramp = Math.min(1, Math.max(0, (now - started) / 1200));
    const limit = bottom();
    // Accumulate fractional pixels so slow movement works at high refresh rates too.
    currentSpeed = speedFrom + (targetSpeed - speedFrom) * ramp * (2 - ramp);
    position = Math.min(limit, position + currentSpeed * elapsed / 1000);
    window.scrollTo({ top: position, behavior: 'instant' });
    if (position >= limit) { stop(); return; }
    frame = requestAnimationFrame(advance);
  };
  const start = (level) => {
    autoplayPending = false;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    selectedLevel = level;
    if (document.hidden || window.scrollY >= bottom() - 1) { render(); return; }
    const menu = document.getElementById('menu-toggle');
    if (menu?.getAttribute('aria-expanded') === 'true') menu.click();
    active = true;
    targetSpeed = levels[level].speed;
    speedFrom = currentSpeed = 0;
    started = previousTime = performance.now();
    position = observedPosition = window.scrollY;
    render();
    window.scrollTo({ top: position, behavior: 'instant' });
    frame = requestAnimationFrame(advance);
  };
  const waitForEntry = () => {
    frame = null;
    if (!autoplayPending || document.hidden) return;
    if (document.readyState === 'loading' || document.body.classList.contains('visual-loading')) {
      frame = requestAnimationFrame(waitForEntry);
      return;
    }
    start(1);
  };
  const queueAutoplay = () => {
    if (autoplayPending && !document.hidden && frame === null) frame = requestAnimationFrame(waitForEntry);
  };

  button.addEventListener('click', () => {
    if (!speedMenu.hidden) { closeSpeedMenu(); return; }
    speedMenu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    const selected = speedOptions.find(option => Number(option.getAttribute('data-browse-level')) === selectedLevel);
    (selected ?? speedOptions[0]).focus({ preventScroll: true });
  });
  speedOptions.forEach(option => option.addEventListener('click', () => {
    const level = Number(option.getAttribute('data-browse-level'));
    if (![2, 3, 4, 5].includes(level)) return;
    selectedLevel = level;
    if (active) {
      speedFrom = currentSpeed;
      targetSpeed = levels[level].speed;
      started = performance.now();
      render();
    } else start(level);
    closeSpeedMenu(true);
  }));
  controls.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !controls.contains(event.relatedTarget)) closeSpeedMenu();
  });
  window.addEventListener('wheel', (event) => {
    if (event.deltaY) { closeSpeedMenu(); stop(); }
  }, { passive: true, capture: true });
  const manualPointer = (event) => {
    if (!event.target?.closest?.('.auto-browse-control')) { closeSpeedMenu(); stop(); }
  };
  window.addEventListener('pointerdown', manualPointer, { passive: true, capture: true });
  window.addEventListener('touchstart', manualPointer, { passive: true, capture: true });
  document.addEventListener('click', (event) => {
    if (event.target?.closest?.('footer a[href="#top"]')) { closeSpeedMenu(); stop(); }
  }, { capture: true });
  document.addEventListener('keydown', (event) => {
    const withinControls = event.target?.closest?.('.auto-browse-control');
    if (!speedMenu.hidden && withinControls && event.key === 'Tab') {
      closeSpeedMenu(true);
      return;
    }
    if (!speedMenu.hidden && withinControls && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const options = speedOptions;
      const current = options.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : (current + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1) + options.length) % options.length;
      options[next].focus({ preventScroll: true });
      return;
    }
    if (event.key === ' ' && withinControls) return;
    if (event.key === 'Escape') closeSpeedMenu(Boolean(withinControls));
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) {
      closeSpeedMenu();
      stop();
    }
  }, { capture: true });
  window.addEventListener('scroll', () => {
    const next = window.scrollY;
    if (active && next < observedPosition - .5) { closeSpeedMenu(); stop(); }
    observedPosition = next;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      closeSpeedMenu();
      if (active) stop();
      else if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
    } else queueAutoplay();
  });
  window.addEventListener('pagehide', () => { closeSpeedMenu(); stop(); });
  document.addEventListener('DOMContentLoaded', queueAutoplay, { once: true });
  window.addEventListener('load', queueAutoplay, { once: true });
  render();
  if (document.readyState === 'complete') queueAutoplay();
})();
