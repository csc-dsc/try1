(() => {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem('site-theme');
  if (storedTheme === 'prism') root.dataset.theme = 'prism';

  const init = () => {
    const button = document.getElementById('prism-toggle');
    if (!button) return;

    const render = () => {
      const active = root.dataset.theme === 'prism';
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? '退出幻彩模式' : '开启幻彩模式');
      button.title = active ? '退出幻彩模式' : '幻彩模式';
    };
    const apply = (theme) => {
      if (theme === 'dark') delete root.dataset.theme;
      else root.dataset.theme = theme;
      localStorage.setItem('site-theme', theme);
      render();
    };
    const previousTheme = () => localStorage.getItem('site-theme-return') === 'light' ? 'light' : 'dark';

    button.addEventListener('click', () => {
      if (root.dataset.theme === 'prism') {
        apply(previousTheme());
      } else {
        localStorage.setItem('site-theme-return', root.dataset.theme === 'light' ? 'light' : 'dark');
        apply('prism');
      }
    });

    const normalThemeButton = document.getElementById('theme-toggle');
    normalThemeButton?.addEventListener('click', () => queueMicrotask(render));
    const mikuModeButton = document.getElementById('mode-toggle');
    mikuModeButton?.addEventListener('click', () => {
      if (root.dataset.theme === 'prism') apply(previousTheme());
      else render();
    });
    render();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
