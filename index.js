const root = document.documentElement;
const nav = document.getElementById('site-nav');
const menuButton = document.getElementById('menu-toggle');
const themeButton = document.getElementById('theme-toggle');

const savedTheme = localStorage.getItem('site-theme');
if (savedTheme === 'light') root.dataset.theme = 'light';

function closeMenu() {
  if (!nav || !menuButton) return;
  nav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '打开导航');
}

menuButton?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? '关闭导航' : '打开导航');
});

nav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

themeButton?.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  if (next === 'light') root.dataset.theme = 'light';
  else delete root.dataset.theme;
  localStorage.setItem('site-theme', next);
  themeButton.setAttribute('aria-label', next === 'light' ? '切换到深色主题' : '切换到浅色主题');
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  reveals.forEach((element) => observer.observe(element));
} else {
  reveals.forEach((element) => element.classList.add('is-visible'));
}

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

const terminalOutput = document.getElementById('terminal-output');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const terminalMessages = [
  'TYPE=ENTP',
  'MODE=Hands-on',
  'LOOP=Break -> Learn -> Write',
  'STATUS=Exploring systems'
];

if (terminalOutput) {
  if (reducedMotion) {
    terminalOutput.textContent = terminalMessages[0];
  } else {
    let messageIndex = 0;
    let characterIndex = 0;
    let deleting = false;

    const renderTerminal = () => {
      const message = terminalMessages[messageIndex];
      terminalOutput.textContent = message.slice(0, characterIndex);

      if (!deleting && characterIndex < message.length) {
        characterIndex += 1;
        window.setTimeout(renderTerminal, 58);
        return;
      }
      if (!deleting) {
        deleting = true;
        window.setTimeout(renderTerminal, 1300);
        return;
      }
      if (characterIndex > 0) {
        characterIndex -= 1;
        window.setTimeout(renderTerminal, 28);
        return;
      }
      deleting = false;
      messageIndex = (messageIndex + 1) % terminalMessages.length;
      window.setTimeout(renderTerminal, 360);
    };

    renderTerminal();
  }
}
