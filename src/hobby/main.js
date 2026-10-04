const mount = document.getElementById('hobby-app');

if (mount) {
  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    try {
      const [{ default: Vue }, { default: HobbyStage }] = await Promise.all([
        import('vue'),
        import('./HobbyStage.vue'),
      ]);
      new Vue({ render: (h) => h(HobbyStage) }).$mount(mount);
    } catch (error) {
      mount.dataset.loadError = 'true';
    }
  };

  if ('IntersectionObserver' in window) {
    const startIfVisible = () => {
      if (document.hidden) return;
      const rect = mount.getBoundingClientRect();
      if (rect.top > innerHeight + 320 || rect.bottom < -320) return;
      observer.disconnect();
      document.removeEventListener('visibilitychange', startIfVisible);
      start();
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      document.removeEventListener('visibilitychange', startIfVisible);
      start();
    }, { rootMargin: '320px 0px' });
    observer.observe(mount);
    document.addEventListener('visibilitychange', startIfVisible);
    startIfVisible();
  } else {
    start();
  }
}
