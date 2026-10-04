const trail = document.querySelector('.archive-trail');

if (trail) {
  const scenes = [...trail.querySelectorAll('.archive-scene')];
  const portrait = trail.querySelector('.archive-profile');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const positionPortraitCutout = (trailRect = trail.getBoundingClientRect()) => {
    if (!portrait) return;
    const rect = portrait.getBoundingClientRect();
    trail.style.setProperty('--archive-portrait-x', `${(rect.left + rect.width / 2 - trailRect.left).toFixed(1)}px`);
    trail.style.setProperty('--archive-portrait-y', `${(rect.top + rect.height / 2 - trailRect.top).toFixed(1)}px`);
  };

  portrait?.addEventListener('click', () => {
    const revealed = portrait.classList.toggle('is-revealed');
    const label = revealed ? '收起旧版头像显影' : '显影旧版头像';
    portrait.setAttribute('aria-pressed', String(revealed));
    portrait.setAttribute('aria-label', label);
    portrait.title = label;
  });

  if (!reducedMotion) {
    trail.classList.add('is-enhanced');
    let frame = 0;
    const paint = () => {
      const trailRect = trail.getBoundingClientRect();
      const start = Math.max(0, trailRect.top + scrollY - innerHeight * .8);
      const end = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const progress = end <= start ? 1 : Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
      trail.style.setProperty('--archive-progress', progress.toFixed(3));
      trail.style.setProperty('--archive-reveal', `${(progress * 100).toFixed(1)}%`);
      positionPortraitCutout(trailRect);
      for (const scene of scenes) {
        if (scene.classList.contains('is-visible')) continue;
        const bounds = scene.getBoundingClientRect();
        if (bounds.top < innerHeight * .92 && bounds.bottom > innerHeight * .08) scene.classList.add('is-visible');
      }
      frame = 0;
    };
    const schedulePaint = () => {
      if (document.hidden) { paint(); return; }
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('scroll', schedulePaint, { passive: true });
    window.addEventListener('resize', schedulePaint);
    document.addEventListener('visibilitychange', schedulePaint);
    paint();

    for (const scene of scenes) {
      scene.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        const rect = scene.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        scene.style.setProperty('--archive-shift-x', `${(x * 16).toFixed(1)}px`);
        scene.style.setProperty('--archive-shift-y', `${(y * 12).toFixed(1)}px`);
      });
      scene.addEventListener('pointerleave', () => {
        scene.style.setProperty('--archive-shift-x', '0px');
        scene.style.setProperty('--archive-shift-y', '0px');
      });
    }
  } else {
    trail.style.setProperty('--archive-progress', '1');
    trail.style.setProperty('--archive-reveal', '100%');
    positionPortraitCutout();
    window.addEventListener('resize', () => positionPortraitCutout());
  }
}
