// Run through browser-harness with built HTML/CSS in window.__headerAutoQAAssets.
// Hidden same-origin fixtures verify geometry and controlled scrolling, without
// navigating the user's page or claiming visual animation review.
(() => {
  const assets = window.__headerAutoQAAssets;
  if (!assets) return { status: 'failed', error: 'Missing built assets' };
  const frames = [];
  const reports = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const originalFocus = document.activeElement;
  const originalScroll = [scrollX, scrollY];
  const fixture = (page, width, height) => {
    const entry = assets.pages.find(entry => entry.name === page);
    const frame = document.createElement('iframe');
    frames.push(frame);
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;top:0;left:0;border:0;opacity:0;pointer-events:none;z-index:-100;width:'
      + width + 'px;height:' + height + 'px';
    document.body.append(frame);
    const d = frame.contentDocument;
    d.open();
    d.write('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width, initial-scale=1">'
      + entry.styles.map(name => '<style>' + assets.styles[name] + '</style>').join('')
      + '</head><body class="' + entry.bodyClass + '">' + entry.header + '<main style="height:3600px"></main></body></html>');
    d.close();
    const w = frame.contentWindow;
    Object.defineProperty(d, 'hidden', { value: false, configurable: true });
    Object.defineProperty(d, 'readyState', { value: 'complete', configurable: true });
    const header = d.querySelector('header');
    const nav = header.querySelector('nav');
    const tools = header.querySelector('.header-tools, .miku-tools');
    const button = d.getElementById('auto-browse-toggle');
    const controls = button?.closest('.auto-browse-control');
    const speedMenu = d.getElementById('auto-browse-menu');
    const geometry = () => {
      const hs = w.getComputedStyle(header);
      const ns = w.getComputedStyle(nav);
      const links = [...nav.querySelectorAll('a')];
      const badge = header.querySelector('.wordmark-mark, .miku-wordmark b');
      const buttons = [...tools.querySelectorAll('.icon-button, .square-button')].filter(node => node.getBoundingClientRect().width > 0);
      const nr = nav.getBoundingClientRect();
      return {
        height: hs.height, padding: hs.paddingInlineStart, gap: ns.gap,
        font: w.getComputedStyle(links[0]).font, navWidth: nr.width, navCenter: nr.left + nr.width / 2,
        linkSizes: links.map(node => { const r = node.getBoundingClientRect(); return [r.width, r.height]; }),
        badge: [w.getComputedStyle(badge).width, w.getComputedStyle(badge).height],
        buttons: buttons.map(node => [w.getComputedStyle(node).width, w.getComputedStyle(node).height]),
        radii: buttons.map(node => w.getComputedStyle(node).borderRadius),
      };
    };
    let clock = 0;
    let frameId = 0;
    const pending = new Map();
    Object.defineProperty(w.performance, 'now', { value: () => clock });
    w.requestAnimationFrame = callback => { const id = ++frameId; pending.set(id, callback); return id; };
    w.cancelAnimationFrame = id => pending.delete(id);
    w.eval('(() => {' + assets.indexScript + '\n})();');
    w.eval('(() => { const location = { pathname: ' + JSON.stringify('/try1/' + page) + ' };'
      + assets.autoBrowse + '\n})();');
    const advance = (duration) => {
      const end = clock + duration;
      while (clock < end) {
        clock = Math.min(end, clock + 1000 / 60);
        const callbacks = [...pending.values()];
        pending.clear();
        callbacks.forEach(callback => callback(clock));
        check(pending.size <= 1, 'Scrolling work must stay bounded');
      }
    };
    const active = () => button?.getAttribute('aria-pressed') === 'true';
    const choose = (level) => {
      if (speedMenu.hidden) button.click();
      speedMenu.querySelector('[data-browse-level="' + level + '"]').click();
    };
    const pause = () => {
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    };
    const stopped = () => {
      check(!active() && pending.size === 0, 'Auto browsing must stop completely');
      const y = w.scrollY;
      advance(1000);
      check(w.scrollY === y, 'Page must stay where manual control stopped it');
    };
    return { w, d, header, nav, tools, button, controls, speedMenu, geometry, advance, active, stopped, pending, choose, pause };
  };
  try {
    for (const width of [1440, 1060, 1040, 375, 320]) {
      let baseline;
      for (const entry of assets.pages) {
        const f = fixture(entry.name, width, 900);
        if (width <= 1040) f.nav.classList.add('is-open');
        const g = f.geometry();
        check(Math.abs(parseFloat(g.height) - (width <= 1040 ? 64 : 68)) < .1, entry.name + ': header height: ' + g.height);
        check(g.badge.every(value => Math.abs(parseFloat(value) - 38) < .1), entry.name + ': brand badge size');
        check(g.buttons.every(size => size.every(value => Math.abs(parseFloat(value) - 40) < .1)), entry.name + ': toolbar button size');
        check(g.radii.every(radius => radius === '50%'), entry.name + ': toolbar controls must be circular');
        check(f.nav.querySelectorAll('a').length === 7, entry.name + ': all navigation links');
        check(!!f.button === ['index.html', 'personal-instruction.html', 'links.html'].includes(entry.name), entry.name + ': button scope');
        if (!baseline) baseline = g;
        check(g.height === baseline.height && g.padding === baseline.padding && g.gap === baseline.gap && g.font === baseline.font,
          entry.name + ': shared navigation metrics at ' + width + 'px');
        g.linkSizes.forEach((size, index) => size.forEach((value, axis) => check(Math.abs(value - baseline.linkSizes[index][axis]) < .1,
          entry.name + ': navigation link size at ' + width + 'px')));
        check(Math.abs(g.navCenter - baseline.navCenter) < 1, entry.name + ': navigation alignment at ' + width + 'px; '
          + JSON.stringify({ center: g.navCenter, baseline: baseline.navCenter }));
        if (width > 1040) {
          check(f.nav.getBoundingClientRect().right < f.tools.getBoundingClientRect().left, entry.name + ': no toolbar overlap');
        }
      }
      reports.push({ test: 'seven page headers at ' + width + 'px', passed: true });
    }
    for (const page of ['index.html', 'personal-instruction.html', 'links.html']) {
      const f = fixture(page, 375, 812);
      check(f.controls.nextElementSibling.id === 'theme-toggle', page + ': button must sit before theme control');
      check(f.button.title.includes('自动浏览') && !f.active() && f.pending.size === 1, page + ': autoplay scheduled after entry');
      f.advance(6000);
      check(f.w.scrollY >= 199 && f.w.scrollY <= 205 && f.active(), page + ': automatic entry scrolling');
      check(f.button.getAttribute('data-browse-mode') === 'automatic', page + ': normal entry pace');
      f.button.click();
      check(!f.speedMenu.hidden && f.active(), page + ': opening the selector preserves scrolling');
      check([...f.speedMenu.querySelectorAll('[data-browse-level] span')].map(node => node.textContent).join(',') === '慢,中,快,较快', page + ': speed labels');
      check(f.speedMenu.querySelectorAll('button').length === 4, page + ': exactly four menu choices');
      check(f.speedMenu.textContent.trim().split(/\s+/).join(',') === '慢,中,快,较快', page + ': no extra menu text');
      check(f.button.textContent.trim() === '', page + ': arrow icon only');
      const rows = [...f.speedMenu.querySelectorAll('button')].map(node => node.getBoundingClientRect());
      check(rows.every((row, index) => !index || row.top >= rows[index - 1].bottom - 1), page + ': choices form a single dropdown column');
      const menuRect = f.speedMenu.getBoundingClientRect();
      check(menuRect.left >= -1 && menuRect.right <= f.w.innerWidth + 1 && menuRect.bottom <= f.w.innerHeight,
        page + ': selector fits the mobile viewport');
      let previousTravel = 0;
      for (let level = 2; level <= 5; level++) {
        const before = f.w.scrollY;
        f.choose(level);
        check(f.button.getAttribute('data-browse-level') === String(level) && f.active(), page + ': selected speed');
        check(f.speedMenu.hidden && f.d.activeElement === f.button, page + ': close selector and restore focus');
        check(f.speedMenu.querySelector('[data-browse-level="' + level + '"]').getAttribute('aria-checked') === 'true', page + ': selected choice');
        f.advance(6000);
        const travel = f.w.scrollY - before;
        check(travel > previousTravel, page + ': levels get progressively faster');
        previousTravel = travel;
      }
      f.w.dispatchEvent(new f.w.WheelEvent('wheel', { deltaY: -100 }));
      f.stopped();
      f.choose(2);
      f.advance(1000);
      f.d.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      f.stopped();
      f.choose(3);
      f.advance(1000);
      f.d.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      f.stopped();
      f.choose(4);
      f.advance(1000);
      f.w.dispatchEvent(new f.w.PointerEvent('pointerdown', { pointerType: 'touch' }));
      f.stopped();
      f.choose(5);
      f.advance(1000);
      f.pause();
      f.stopped();
      reports.push({ test: page + ': level 1 autoplay / 2–5 selector / mobile layout / wheel / keys / touch / pause', passed: true });
    }
    const compact = fixture('index.html', 320, 640);
    compact.advance(20);
    compact.button.click();
    const compactRect = compact.speedMenu.getBoundingClientRect();
    check(compactRect.left >= -1 && compactRect.right <= 321, 'Selector must fit 320px screens');
    const firstOption = compact.speedMenu.querySelector('[data-browse-level="2"]');
    firstOption.dispatchEvent(new compact.w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    check(compact.d.activeElement.getAttribute('data-browse-level') === '3' && compact.active(), 'Arrow keys navigate the selector');
    compact.d.activeElement.click();
    check(compact.button.getAttribute('data-browse-level') === '3', 'Keyboard selection applies the speed');
    compact.pause();
    compact.stopped();
    reports.push({ test: '320px selector / keyboard selection / pause', passed: true });
    return { status: 'passed', reports };
  } catch (error) {
    return { status: 'failed', error: error.stack, reports };
  } finally {
    frames.forEach(frame => frame.remove());
    window.scrollTo({ left: originalScroll[0], top: originalScroll[1], behavior: 'instant' });
    if (originalFocus?.isConnected) originalFocus.focus?.({ preventScroll: true });
  }
})();
