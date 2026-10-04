const slots = [...document.querySelectorAll('[data-ambient-model]')];

if (slots.length) {
  const mounted = new WeakSet();
  const mount = async (slot) => {
    if (mounted.has(slot)) return;
    mounted.add(slot);
    try {
      const [{ default: Vue }, { default: InlineObject }] = await Promise.all([
        import('vue'), import('./InlineObject.vue'),
      ]);
      new Vue({ render: (h) => h(InlineObject, { props: { modelId: slot.dataset.ambientModel } }) }).$mount(slot);
    } catch (_) {
      slot.dataset.loadError = 'true';
    }
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { observer.unobserve(entry.target); mount(entry.target); } });
  }, { rootMargin: '220px 0px' });
  slots.forEach((slot) => observer.observe(slot));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    slots.forEach((slot) => {
      const rect = slot.getBoundingClientRect();
      if (rect.top < innerHeight + 220 && rect.bottom > -220) mount(slot);
    });
  });
}
