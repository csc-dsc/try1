(() => {
  const scriptBase = new URL('.', document.currentScript.src);
  const asset = (path) => new URL(path, scriptBase).href;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function enterPage() {
    if (reducedMotion) return;
    const lines = document.querySelectorAll('.hero-line, .directory-hero h1, .profile-hero h1');
    lines.forEach((line, index) => line.animate([
      { opacity: 0, transform: 'translateY(30px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 820, delay: index * 120, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' }));
  }

  async function showLoader() {
    let seen = false;
    try { seen = sessionStorage.getItem('null-garden-seen') === '1'; } catch (_) { /* Storage may be disabled. */ }
    if (seen || reducedMotion) { enterPage(); return; }

    const layer = document.createElement('div');
    layer.className = 'visual-loader';
    layer.setAttribute('role', 'status');
    layer.setAttribute('aria-label', '页面加载中');
    const cube = document.createElement('div');
    cube.className = 'visual-loader__cube';
    const mark = document.createElement('div');
    mark.className = 'visual-loader__mark';
    mark.textContent = 'N//G';
    const bar = document.createElement('div');
    bar.className = 'visual-loader__bar';
    const progress = document.createElement('span');
    bar.append(progress);
    layer.append(cube, mark, bar);
    document.body.append(layer);
    document.body.classList.add('visual-loading');
    const started = performance.now();
    progress.style.transform = 'scaleX(.25)';

    let lottieLoaded = false;
    const lottieReady = new Promise((resolve) => {
      if (!window.lottie) { resolve(); return; }
      try {
        const player = window.lottie.loadAnimation({
          container: cube,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: asset('motion/loader-cube.json'),
        });
        player.addEventListener('DOMLoaded', () => { lottieLoaded = true; resolve(); });
        player.addEventListener('data_failed', resolve);
      } catch (_) { resolve(); }
    });
    const windowReady = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    await Promise.race([Promise.all([lottieReady, windowReady, fontsReady]),
      new Promise((resolve) => setTimeout(resolve, 1800))]);
    const remaining = Math.max(0, (lottieLoaded ? 3200 : 500) - (performance.now() - started));
    progress.style.transitionDuration = `${Math.max(250, remaining)}ms`;
    progress.style.transform = 'scaleX(1)';
    if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
    layer.classList.add('is-leaving');
    document.body.classList.remove('visual-loading');
    try { sessionStorage.setItem('null-garden-seen', '1'); } catch (_) { /* Storage may be disabled. */ }
    enterPage();
    setTimeout(() => layer.remove(), 850);
  }

  function orbitHero() {
    const stage = document.querySelector('.hero-constellation');
    const hero = document.querySelector('.hero');
    if (!stage || !hero) return;
    const parts = [...stage.querySelectorAll('.hero-orbit-item')];
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let phase = -.55;
    let frame = null;
    let active = false;
    let pressed = false;
    let last = performance.now();

    const paint = (now) => {
      frame = null;
      if (!active || document.hidden) return;
      const delta = Math.min((now - last) / 1000, .05);
      last = now;
      if (!reducedMotion) phase += delta * (pressed ? .55 : .13);
      pointer.x += (pointer.targetX - pointer.x) * Math.min(1, delta * 5);
      pointer.y += (pointer.targetY - pointer.y) * Math.min(1, delta * 5);
      const radiusX = Math.min(stage.clientWidth * .33, 430);
      const radiusY = Math.min(stage.clientHeight * .34, 265);
      parts.forEach((part, index) => {
        const angle = phase + index * Math.PI * 2 / parts.length;
        const depth = (Math.sin(angle) + 1) / 2;
        const x = Math.cos(angle) * radiusX + pointer.x * (10 + depth * 14);
        const y = Math.sin(angle) * radiusY + pointer.y * (8 + depth * 8);
        const scale = .64 + depth * .52;
        part.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${Math.cos(angle) * 11}deg)`;
        part.style.opacity = String(.34 + depth * .6);
        part.style.zIndex = String(Math.round(depth * 10));
      });
      if (!reducedMotion) frame = requestAnimationFrame(paint);
    };
    const start = () => {
      if (frame !== null || !active || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(paint);
    };
    const stop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; };
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) start(); else stop();
    }, { threshold: .02 });
    observer.observe(hero);
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      pointer.targetX = ((event.clientX - rect.left) / rect.width - .5) * 2;
      pointer.targetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { pointer.targetX = 0; pointer.targetY = 0; pressed = false; });
    hero.addEventListener('pointerdown', (event) => { if (!event.target.closest('a, button')) pressed = true; });
    window.addEventListener('pointerup', () => { pressed = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    if (reducedMotion) { active = true; paint(performance.now()); }
  }

  function directoryMotif() {
    const hero = document.querySelector('.directory-hero');
    if (!hero) return;
    const bridge = document.createElement('div');
    bridge.className = 'directory-bridge';
    bridge.setAttribute('aria-hidden', 'true');
    hero.after(bridge);
    const choices = {
      'page-platforms': 'cpu', 'page-articles': 'solder',
      'page-links': 'mouse',
    };
    const symbol = Object.entries(choices).find(([name]) => document.body.classList.contains(name))?.[1];
    if (!symbol) return;
    const motif = document.createElement('div');
    motif.className = 'directory-motif';
    motif.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 180 180');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', asset(`graphics/hardware.svg#${symbol}`));
    svg.append(use);
    motif.append(svg);
    hero.append(motif);
    if (reducedMotion) return;
    const move = () => {
      const rect = hero.getBoundingClientRect();
      const shift = Math.max(-30, Math.min(30, -rect.top * .08));
      motif.style.setProperty('--motif-shift', `${shift}px`);
    };
    window.addEventListener('scroll', move, { passive: true });
    move();
  }

  function scrollScenes() {
    const intro = document.querySelector('.intro-band');
    const portrait = document.querySelector('.profile-portrait');
    const portraitHero = portrait?.closest('.profile-hero');
    const notes = document.querySelector('.notes-band');
    if (!reducedMotion) {
      document.querySelectorAll('.shatter-bridge').forEach((bridge) => {
        for (let count = bridge.querySelectorAll('.shatter-bridge__shard').length; count < 24; count++) {
          const shard = document.createElement('i');
          shard.className = `shatter-bridge__shard shatter-bridge__shard--${count < 14 ? 'fragment' : 'micro'}`;
          bridge.append(shard);
        }
      });
    }
    const bridges = [...document.querySelectorAll('.screen-breach, .shatter-bridge, .wave-bridge, .tear-bridge, .directory-bridge')];
    const wave = document.querySelector('.wave-bridge');
    if (!intro && !portrait && !notes && !bridges.length) return;
    let frame = null;
    const progress = (element) => {
      const rect = element.getBoundingClientRect();
      return Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
    };
    const ramp = (value, start, end) => Math.max(0, Math.min(1, (value - start) / (end - start)));
    const update = () => {
      frame = null;
      if (intro) intro.style.setProperty('--intro-scan', `${Math.round(progress(intro) * 100)}%`);
      if (portrait) {
        const distance = Math.max(1, Math.min(innerHeight, portraitHero.offsetHeight) * .5);
        const reveal = reducedMotion ? 1 : Math.max(0, Math.min(1, scrollY / distance));
        portrait.style.setProperty('--portrait-reveal', reveal.toFixed(3));
        portrait.style.setProperty('--scan-progress', `${(reveal * 100).toFixed(1)}%`);
      }
      bridges.forEach((bridge) => {
        const rect = bridge.getBoundingClientRect();
        if (rect.bottom < -rect.height || rect.top > innerHeight + rect.height) return;
        const value = reducedMotion ? .55 : Math.max(0, Math.min(1, (innerHeight * .88 - rect.top) / (innerHeight * .75 + rect.height)));
        bridge.style.setProperty('--bridge-progress', value.toFixed(3));
        if (bridge.classList.contains('shatter-bridge') && !reducedMotion) {
          const split = ramp(value, .05, .72);
          const large = ramp(value, .1, .68);
          const medium = ramp(value, .36, .84);
          const micro = ramp(value, .6, 1);
          bridge.style.setProperty('--split-progress', (split * split * (3 - 2 * split)).toFixed(3));
          bridge.style.setProperty('--large-fall', (large * large).toFixed(3));
          bridge.style.setProperty('--large-opacity', (ramp(value, .09, .22) * (1 - ramp(value, .62, .96))).toFixed(3));
          bridge.style.setProperty('--medium-fall', (medium * medium).toFixed(3));
          bridge.style.setProperty('--medium-opacity', (ramp(value, .33, .49) * (1 - ramp(value, .78, 1))).toFixed(3));
          bridge.style.setProperty('--micro-fall', (micro * micro).toFixed(3));
          bridge.style.setProperty('--micro-opacity', (.8 * ramp(value, .57, .76)).toFixed(3));
        }
      });
      if (wave) {
        const value = Number(wave.style.getPropertyValue('--bridge-progress'));
        const points = [];
        for (let x = 0; x <= 1200; x += 40) {
          const y = 53 + Math.sin(x / 1200 * Math.PI * 4 + value * Math.PI * 3) * (11 + value * 12)
            + Math.sin(x / 1200 * Math.PI * 7 - value * Math.PI * 2) * 4;
          points.push(`${x} ${y.toFixed(1)}`);
        }
        const line = `M${points.join('L')}`;
        wave.querySelector('.wave-bridge__fill')?.setAttribute('d', `${line}L1200 120L0 120Z`);
        wave.querySelector('.wave-bridge__crest')?.setAttribute('d', line);
      }
      if (notes) {
        notes.style.setProperty('--notes-progress', `${Math.round(progress(notes) * 100)}%`);
        notes.querySelectorAll('.note-card').forEach((row) => {
          row.classList.toggle('is-passed', row.getBoundingClientRect().top < innerHeight * .72);
        });
      }
    };
    const schedule = () => {
      if (document.hidden) { update(); return; }
      if (frame !== null) return;
      frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    update();
  }

  function cursorField() {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'cursor-field';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) { canvas.remove(); return; }
    const colors = ['198,255,85', '143,217,207', '237,95,128'];
    const particles = [];
    let frame = null, lastMove = 0, lastX = -100, lastY = -100;
    const resize = () => {
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(innerWidth * ratio);
      canvas.height = Math.round(innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const paint = (now) => {
      frame = null;
      context.clearRect(0, 0, innerWidth, innerHeight);
      for (let index = particles.length - 1; index >= 0; index--) {
        const p = particles[index];
        const age = (now - p.born) / p.life;
        if (age >= 1) { particles.splice(index, 1); continue; }
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= .95;
        p.vy *= .95;
        context.strokeStyle = `rgba(${p.color},${(1 - age) * .75})`;
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(p.x, p.y);
        context.lineTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4);
        context.stroke();
      }
      if (particles.length && !document.hidden) frame = requestAnimationFrame(paint);
    };
    const add = (x, y, count) => {
      for (let index = 0; index < count; index++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = .7 + Math.random() * 1.7;
        particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
          born: performance.now(), life: 300 + Math.random() * 340, color: colors[index % colors.length] });
      }
      while (particles.length > 28) particles.shift();
      if (frame === null && !document.hidden) frame = requestAnimationFrame(paint);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || performance.now() - lastMove < 18) return;
      if (Math.hypot(event.clientX - lastX, event.clientY - lastY) < 10) return;
      lastMove = performance.now();
      lastX = event.clientX;
      lastY = event.clientY;
      add(lastX, lastY, 2);
    }, { passive: true });
    document.addEventListener('pointerdown', (event) => { if (event.pointerType === 'mouse') add(event.clientX, event.clientY, 6); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden || frame === null) return;
      cancelAnimationFrame(frame);
      frame = null;
      particles.length = 0;
      context.clearRect(0, 0, innerWidth, innerHeight);
    });
  }

  function tutorialNavigation() {
    if (!document.body.classList.contains('page-tutorial')) return;
    const sidebar = document.querySelector('.sidebar');
    const logo = sidebar?.querySelector('.sidebar-logo');
    if (!sidebar || !logo) return;
    const home = document.createElement('a');
    home.className = 'tutorial-home';
    home.href = 'articles.html';
    home.textContent = '← NULL GARDEN / ARTICLES';
    logo.append(home);

    const toggle = document.createElement('button');
    toggle.className = 'tutorial-toc-toggle';
    toggle.type = 'button';
    toggle.textContent = '☰';
    toggle.setAttribute('aria-label', '打开章节目录');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.append(toggle);
    const close = () => {
      document.body.classList.remove('is-toc-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '打开章节目录');
    };
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('is-toc-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '关闭章节目录' : '打开章节目录');
    });
    sidebar.addEventListener('click', (event) => { if (event.target.closest('nav a')) close(); });
    document.addEventListener('click', (event) => {
      if (document.body.classList.contains('is-toc-open') && !sidebar.contains(event.target) && event.target !== toggle) close();
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  }

  function backToTop() {
    document.querySelectorAll('footer a[href="#top"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
      });
    });
  }

  orbitHero();
  directoryMotif();
  scrollScenes();
  cursorField();
  tutorialNavigation();
  backToTop();
  showLoader();
})();
