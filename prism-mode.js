(() => {
  const root = document.documentElement;
  const modes = ['light', 'dark', 'prism'];
  const labels = { light: '日间', dark: '夜间', prism: '幻彩' };
  const isMiku = document.body?.classList.contains('page-miku');
  const read = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) { /* Keep the control usable without storage. */ } };
  const stored = read('site-theme');
  let current = modes.includes(stored) ? stored
    : isMiku ? (read('miku-mode') === 'dark' ? 'dark' : 'light') : 'dark';

  const apply = (theme) => {
    current = theme;
    if (theme === 'dark') delete root.dataset.theme;
    else root.dataset.theme = theme;
    if (isMiku) root.dataset.mode = theme === 'dark' ? 'dark' : 'light';
  };
  apply(current);

  const init = () => {
    const button = document.getElementById('theme-toggle');
    const menu = document.getElementById('theme-menu');
    const control = document.getElementById('theme-control');
    if (!button || !menu || !control) return;
    const options = [...menu.querySelectorAll('[data-theme-option]')];
    const render = () => {
      button.dataset.theme = current;
      button.setAttribute('aria-label', `选择显示模式，当前${labels[current]}`);
      button.removeAttribute('title');
      options.forEach(option => option.setAttribute('aria-checked', String(option.dataset.themeOption === current)));
    };
    const close = (focus = false) => {
      const wasOpen = !menu.hidden;
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (focus && wasOpen) button.focus({ preventScroll: true });
    };
    const open = () => {
      const speedMenu = document.getElementById('auto-browse-menu');
      if (speedMenu) speedMenu.hidden = true;
      document.getElementById('auto-browse-toggle')?.setAttribute('aria-expanded', 'false');
      const navigation = document.getElementById('menu-toggle') ?? document.getElementById('miku-menu');
      if (navigation?.getAttribute('aria-expanded') === 'true') navigation.click();
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      (options.find(option => option.dataset.themeOption === current) ?? options[0])?.focus({ preventScroll: true });
    };
    const select = (theme) => {
      apply(theme);
      write('site-theme', current);
      if (isMiku) write('miku-mode', current === 'dark' ? 'dark' : 'light');
      render();
      close(true);
    };
    button.addEventListener('click', (event) => {
      if (event.altKey || event.ctrlKey) {
        select(modes[(modes.indexOf(current) + modes.length - 1) % modes.length]);
      } else if (menu.hidden) open();
      else close();
    });
    button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open();
        (event.key === 'ArrowDown' ? options[0] : options.at(-1))?.focus({ preventScroll: true });
      }
    });
    options.forEach(option => option.addEventListener('click', () => select(option.dataset.themeOption)));
    menu.addEventListener('keydown', (event) => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const index = options.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
          : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
        options[next]?.focus({ preventScroll: true });
      } else if (event.key === 'Tab') close(true);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close(true);
    });
    document.addEventListener('pointerdown', (event) => {
      if (!control.contains(event.target)) close();
    });
    control.addEventListener('focusout', (event) => {
      if (event.relatedTarget && !control.contains(event.relatedTarget)) close();
    });
    render();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
