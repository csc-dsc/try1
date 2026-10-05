(() => {
  const scene = document.querySelector('.platform-eye-scene');
  const eye = scene?.querySelector('.platform-eye');
  if (!eye) return;

  const aperture = eye.querySelector('.platform-eye__aperture');
  if (!aperture) return;
  const lidParts = [...eye.querySelectorAll('.platform-eye__aperture, .platform-eye__rim, .platform-eye__shadow')];
  const openLid = 'path("' + aperture.getAttribute('d') + '")';
  const closedLid = 'path("M28 175C90 186 194 198 300 198C406 198 510 186 572 175C510 186 406 198 300 198C194 198 90 186 28 175Z")';

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toast = document.createElement('div');
  toast.className = 'pet-warning';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  const warningCode = document.createElement('span');
  warningCode.className = 'pet-warning__code';
  const warningText = document.createElement('strong');
  toast.append(warningCode, warningText);
  scene.append(toast);

  let touches = 0;
  let cycle = 0;
  let sequence = null;
  let painTimer = null;
  let toastTimer = null;
  let painAnimations = [];
  const warnings = [
    '警告 · 它感觉到了疼痛。',
    '警告 · 别再碰它。',
    '不要惹怒 GOD 的宠物',
    '最后一次警告 · 它正在记住你。',
    '你惹怒了 GOD 的宠物。',
  ];
  const setCount = (value) => {
    touches = value;
    eye.setAttribute('data-pet-warnings', String(value));
    eye.setAttribute('aria-label', value ? '触碰眼睛，已警告 ' + value + ' 次' : '触碰眼睛');
  };
  const hideWarning = () => {
    clearTimeout(toastTimer);
    toastTimer = null;
    toast.classList.remove('is-visible');
  };
  const showWarning = () => {
    hideWarning();
    warningCode.textContent = 'WARNING / 0' + touches;
    warningText.textContent = warnings[touches - 1];
    toast.classList.toggle('is-severe', touches >= 3);
    toast.classList.add('is-visible');
    toastTimer = setTimeout(hideWarning, touches >= 3 ? 4200 : 2800);
  };
  const stopPain = () => {
    clearTimeout(painTimer);
    painTimer = null;
    painAnimations.forEach(animation => animation.cancel());
    painAnimations = [];
    eye.classList.remove('is-hurt');
  };
  const hurt = () => {
    const currentLid = getComputedStyle(aperture).d;
    stopPain();
    eye.classList.add('is-hurt');
    const duration = motionPreference.matches ? 380 : 880;
    const lids = [
      { d: currentLid && currentLid !== 'none' ? currentLid : openLid, offset: 0 },
      { d: closedLid, offset: .22 },
      { d: closedLid, offset: .54 },
      { d: openLid, offset: 1 },
    ];
    if (eye.animate) {
      // Move the lid contours and clip the iris; the eyeball itself keeps its shape.
      lidParts.forEach((part) => {
        const animation = part.animate(lids, { duration, easing: 'ease-in-out' });
        animation.finished.catch(() => {});
        painAnimations.push(animation);
      });
      if (!motionPreference.matches) {
        const shake = eye.animate([
          { transform: 'translate(0, 0)' }, { transform: 'translate(-6px, 2px) rotate(-1deg)' },
          { transform: 'translate(5px, -2px) rotate(1deg)' }, { transform: 'translate(-3px, 1px)' },
          { transform: 'translate(0, 0)' },
        ], { duration: 340, easing: 'ease-out' });
        shake.finished.catch(() => {});
        painAnimations.push(shake);
      }
    }
    painTimer = setTimeout(stopPain, duration);
  };

  // Every clone owns its gradients and clipping IDs; no copy points at the original SVG.
  const copyEye = (prefix) => {
    const copy = eye.cloneNode(true);
    copy.setAttribute('class', 'pet-eye');
    ['role', 'tabindex', 'aria-label', 'data-pet-warnings', 'style'].forEach(name => copy.removeAttribute(name));
    copy.setAttribute('aria-hidden', 'true');
    const ids = new Map();
    copy.querySelectorAll('[id]').forEach((node) => {
      const original = node.id;
      ids.set(original, prefix + original);
      node.id = prefix + original;
    });
    [copy, ...copy.querySelectorAll('*')].forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        let value = attribute.value.replace(/url\(#([^)]*)\)/g, (match, id) =>
          ids.has(id) ? 'url(#' + ids.get(id) + ')' : match);
        if (value.startsWith('#') && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
        if (value !== attribute.value) node.setAttribute(attribute.name, value);
      });
      node.removeAttribute('data-eye-gaze');
    });
    copy.querySelector('.platform-eye__gaze')?.setAttribute('transform', 'translate(0 0)');
    return copy;
  };
  const later = (current, delay, action) => {
    const timer = setTimeout(() => {
      current.timers.delete(timer);
      if (sequence === current) action();
    }, delay);
    current.timers.add(timer);
  };
  const animateGhost = (current, node, frames, options) => {
    if (!node.animate) return;
    const animation = node.animate(frames, options);
    current.animations.add(animation);
    animation.finished.then(() => {
      current.animations.delete(animation);
      animation.cancel();
    }, () => current.animations.delete(animation));
  };
  const phase = (current, name, message) => {
    current.phase = name;
    current.overlay.setAttribute('data-phase', name);
    if (message) current.status.textContent = message;
  };
  const fitOverlay = (overlay) => {
    // A stable scrollbar gutter reduces CSS vw; the takeover must cover that gutter too.
    overlay.style.width = innerWidth + 'px';
    overlay.style.height = innerHeight + 'px';
  };
  const finish = () => {
    const current = sequence;
    if (!current) return;
    sequence = null;
    current.timers.forEach(clearTimeout);
    current.animations.forEach(animation => animation.cancel());
    current.timers.clear();
    current.animations.clear();
    stopPain();
    hideWarning();
    current.overlay.remove();
    current.background.forEach(([node, inert]) => { node.inert = inert; });
    document.documentElement.classList.remove('pet-sequence-active');
    scene.classList.remove('is-vanished');
    setCount(0);
    window.scrollTo({ left: current.scrollX, top: current.scrollY, behavior: 'instant' });
    document.dispatchEvent(new CustomEvent('platform-eye-sequence', { detail: { active: false } }));
    if (!document.hidden) {
      const target = current.focus?.isConnected && current.focus !== document.body ? current.focus : eye;
      target.focus?.({ preventScroll: true });
    }
  };
  const prepareReturn = (current) => {
    current.animations.forEach(animation => animation.cancel());
    current.animations.clear();
    scene.classList.remove('is-vanished');
    phase(current, 'restoring', '它回到了原处。');
  };
  const roam = (current, index = 0) => {
    if (current.phase !== 'wandering') return;
    const progress = Math.min(1, index / 7);
    current.overlay.style.setProperty('--pet-anger', progress.toFixed(2));
    const ghost = current.ghosts[index % current.ghosts.length];
    const width = Math.min(innerWidth * .72, 170 + Math.random() * (170 + progress * 180));
    const height = width * 350 / 600;
    const inset = 18;
    ghost.style.width = width + 'px';
    ghost.style.left = (inset + Math.random() * Math.max(0, innerWidth - width - inset * 2)) + 'px';
    ghost.style.top = (inset + Math.random() * Math.max(0, innerHeight - height - inset * 2)) + 'px';
    const turn = (Math.random() - .5) * (8 + progress * 24);
    animateGhost(current, ghost, [
      { opacity: 0, transform: 'scale(.88) rotate(' + turn + 'deg)' },
      { opacity: .58 + progress * .42, transform: 'scale(1) rotate(' + turn + 'deg)', offset: .25 },
      { opacity: .7, offset: .65 },
      { opacity: 0, transform: 'scale(1.06) rotate(' + (turn + 3) + 'deg)' },
    ], { duration: 720 - progress * 130, easing: 'ease-out' });
    later(current, 740 - progress * 230, () => roam(current, index + 1));
  };
  const spreadWarnings = (current) => {
    const columns = Math.min(8, Math.max(3, Math.ceil(innerWidth / 250)));
    const rows = Math.min(6, Math.max(4, Math.ceil(innerHeight / 165)));
    const cells = Array.from({ length: columns * rows }, (_, index) => index);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    cells.forEach((cell, index) => later(current, index * 4400 / cells.length, () => {
      const alert = document.createElement('div');
      alert.className = 'pet-haunt__warning';
      alert.style.left = (((cell % columns) + .5) * 100 / columns + (Math.random() - .5) * 7) + '%';
      alert.style.top = ((Math.floor(cell / columns) + .5) * 100 / rows + (Math.random() - .5) * 5) + '%';
      alert.style.width = (100 / columns * (1.1 + Math.random() * .4)) + 'vw';
      alert.style.height = (100 / rows * (1.05 + Math.random() * .35)) + 'vh';
      alert.style.setProperty('--warning-turn', ((Math.random() - .5) * 14) + 'deg');
      const label = document.createElement('span');
      label.textContent = 'GOD IS WATCHING / ' + String(index + 1).padStart(2, '0');
      const text = document.createElement('strong');
      text.textContent = '警告！！';
      alert.append(label, text);
      current.alerts.append(alert);
      current.overlay.style.setProperty('--pet-coverage', ((index + 1) / cells.length).toFixed(3));
    }));
  };
  const start = () => {
    const overlay = document.createElement('div');
    overlay.className = 'pet-haunt';
    fitOverlay(overlay);
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'GOD 的宠物');
    const close = document.createElement('button');
    close.className = 'pet-haunt__close';
    close.type = 'button';
    close.setAttribute('aria-label', '结束特效，回到页面');
    close.textContent = '×';
    close.addEventListener('click', finish);
    const status = document.createElement('p');
    status.className = 'pet-haunt__status';
    status.setAttribute('role', 'status');
    const roaming = document.createElement('div');
    roaming.className = 'pet-haunt__roaming';
    roaming.setAttribute('aria-hidden', 'true');
    const ghosts = Array.from({ length: 3 }, (_, index) => {
      const holder = document.createElement('div');
      holder.className = 'pet-haunt__ghost';
      holder.append(copyEye('pet-' + cycle + '-' + index + '-'));
      roaming.append(holder);
      return holder;
    });
    const hero = document.createElement('div');
    hero.className = 'pet-haunt__hero';
    hero.setAttribute('aria-hidden', 'true');
    hero.append(copyEye('pet-' + cycle++ + '-hero-'));
    const alerts = document.createElement('div');
    alerts.className = 'pet-haunt__alerts';
    alerts.setAttribute('aria-hidden', 'true');
    overlay.append(roaming, hero, alerts, status, close);
    const current = {
      overlay, status, ghosts, alerts, close, timers: new Set(), animations: new Set(),
      focus: document.activeElement, scrollX: window.scrollX, scrollY: window.scrollY,
      background: [...document.body.children].filter(node => !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName))
        .map(node => [node, node.inert]),
    };
    sequence = current;
    document.body.append(overlay);
    current.background.forEach(([node]) => { node.inert = true; });
    document.documentElement.classList.add('pet-sequence-active');
    document.dispatchEvent(new CustomEvent('platform-eye-sequence', { detail: { active: true } }));
    close.focus({ preventScroll: true });
    phase(current, 'withdrawal', '你惹怒了 GOD 的宠物。按 Escape 可结束特效。');
    later(current, motionPreference.matches ? 400 : 800, () => {
      hideWarning();
      scene.classList.add('is-vanished');
      phase(current, 'wandering');
    });
    if (motionPreference.matches) {
      overlay.classList.add('is-reduced');
      overlay.style.setProperty('--pet-anger', '1');
      later(current, 650, () => phase(current, 'staring', '不要惹怒 GOD 的宠物。'));
      later(current, 1800, () => phase(current, 'red'));
      later(current, 2900, () => phase(current, 'black'));
      later(current, 4000, () => prepareReturn(current));
      later(current, 4700, finish);
      return;
    }
    later(current, 1000, () => roam(current));
    later(current, 5400, () => {
      phase(current, 'blackout', '它在黑暗中注视着你。');
      overlay.style.setProperty('--pet-anger', '1');
    });
    later(current, 6500, () => phase(current, 'staring'));
    later(current, 8000, () => {
      phase(current, 'alerts', '警告！！不要惹怒 GOD 的宠物。');
      spreadWarnings(current);
    });
    later(current, 12800, () => phase(current, 'red'));
    later(current, 14300, () => phase(current, 'black'));
    later(current, 16000, () => prepareReturn(current));
    later(current, 17900, finish);
  };
  const touch = () => {
    if (sequence || document.hidden) return;
    setCount(touches + 1);
    hurt();
    showWarning();
    if (touches === 5) start();
  };
  eye.addEventListener('click', touch);
  eye.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) touch();
  });
  document.addEventListener('keydown', (event) => {
    if (!sequence) return;
    if (event.key === 'Escape') { event.preventDefault(); finish(); }
    else if (event.key === 'Tab') { event.preventDefault(); sequence.close.focus({ preventScroll: true }); }
  });
  const suspend = () => {
    finish();
    stopPain();
    hideWarning();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  window.addEventListener('pagehide', suspend);
  window.addEventListener('resize', () => { if (sequence) fitOverlay(sequence.overlay); }, { passive: true });
  motionPreference.addEventListener?.('change', () => { if (sequence) finish(); });
})();
