// Evaluate through browser-harness on the local platform preview. Uses same-origin,
// temporary iframe fixtures; it does not navigate or change the current page.
// Optional window.__platformEyeTestAssets = { html, core, effect, styles: { filename: css } }
// accepts the built assets without background-tab network waits. Clock advancement
// and CSS transition completion are controlled; these checks are not visual QA.
(() => {
  window.__platformEyeQA = { status: 'running' };
  const reports = [];
  const frames = [];
  const originalFocus = document.activeElement;
  const originalScroll = [scrollX, scrollY];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const restore = () => {
    frames.forEach(frame => frame.remove());
    window.scrollTo({ left: originalScroll[0], top: originalScroll[1], behavior: 'instant' });
    if (originalFocus?.isConnected) originalFocus.focus?.({ preventScroll: true });
  };
  const run = async () => {
    window.__platformEyeQA.step = 'loading assets';
    const paths = ['platforms.html', 'platforms-scene.js', 'platforms-eye-events.js'];
    const bundle = window.__platformEyeTestAssets;
    const [html, core, effect] = bundle ? [bundle.html, bundle.core, bundle.effect] : await Promise.all(paths.map(async (path) => {
      const response = await fetch(new URL(path, location.href), { cache: 'no-store' });
      check(response.ok, 'Asset failed: ' + path);
      return response.text();
    }));
    const fixture = async (width, height, reduced = false) => {
      window.__platformEyeQA.step = 'fixture ' + width + 'px / reduced=' + reduced;
      const frame = document.createElement('iframe');
      frames.push(frame);
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;top:0;left:0;border:0;opacity:0;pointer-events:none;z-index:-100;width:'
        + width + 'px;height:' + height + 'px';
      let content = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace('<head>', '<head><base href="' + new URL('.', location.href).href + '">');
      if (bundle) {
        content = content.replace(/<link\b[^>]+href="([^"?]+)[^"]*"[^>]*>/gi, (match, name) =>
          bundle.styles[name] ? '<style>' + bundle.styles[name] + '</style>' : '');
        document.body.append(frame);
        frame.contentDocument.open();
        frame.contentDocument.write(content);
        frame.contentDocument.close();
      } else {
        const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
        frame.srcdoc = content;
        document.body.append(frame);
        await loaded;
      }
      const w = frame.contentWindow;
      const d = w.document;
      let hidden = false;
      Object.defineProperty(d, 'hidden', { get: () => hidden, configurable: true });
      Object.defineProperty(d, 'visibilityState', { get: () => hidden ? 'hidden' : 'visible', configurable: true });
      const nativeMatch = w.matchMedia.bind(w);
      const preferenceListeners = [];
      w.matchMedia = query => query.includes('prefers-reduced-motion') ? {
        matches: reduced, addEventListener: (_, callback) => preferenceListeners.push(callback),
      } : nativeMatch(query);
      let clock = 0;
      let nextTimer = 0;
      const timers = new Map();
      w.setTimeout = (callback, delay = 0) => {
        const id = ++nextTimer;
        timers.set(id, { callback, at: clock + delay });
        return id;
      };
      w.clearTimeout = id => timers.delete(id);
      const rafs = new Map();
      w.requestAnimationFrame = callback => { const id = ++nextTimer; rafs.set(id, callback); return id; };
      w.cancelAnimationFrame = id => rafs.delete(id);
      Object.defineProperty(w.performance, 'now', { value: () => clock });
      const nativeAnimate = w.Element.prototype.animate;
      const animations = [];
      w.Element.prototype.animate = function (keyframes, options) {
        const animation = nativeAnimate.call(this, keyframes, options);
        animation.pause();
        animation.currentTime = 0;
        animations.push({ animation, started: clock });
        return animation;
      };
      const sampleAnimations = () => animations.forEach(({ animation, started }) => {
        if (animation.playState !== 'idle') {
          animation.currentTime = Math.min(clock - started, animation.effect.getComputedTiming().endTime);
        }
      });
      const advance = (elapsed) => {
        const target = clock + elapsed;
        for (let steps = 0; ; steps++) {
          check(steps < 1000, 'Timer work must remain bounded');
          const pending = [...timers.entries()].filter(([, timer]) => timer.at <= target)
            .sort((a, b) => a[1].at - b[1].at)[0];
          if (!pending) break;
          clock = pending[1].at;
          timers.delete(pending[0]);
          pending[1].callback();
          sampleAnimations();
        }
        clock = target;
        sampleAnimations();
      };
      const style = (element, property) => {
        // Inspect settled CSS destinations. Actual duration is checked separately.
        w.getComputedStyle(element)[property];
        d.getAnimations().forEach((animation) => {
          if (animation instanceof w.CSSTransition) animation.finish();
        });
        return w.getComputedStyle(element)[property];
      };
      w.eval(core);
      w.eval(effect);
      const eye = d.querySelector('.platform-eye');
      const scene = d.querySelector('.platform-eye-scene');
      const bounds = eye.getBoundingClientRect();
      w.scrollTo({ top: Math.max(0, bounds.top - (height - bounds.height) / 2), behavior: 'instant' });
      w.dispatchEvent(new w.Event('scroll'));
      eye.focus({ preventScroll: true });
      const savedScroll = w.scrollY;
      const click = () => eye.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      const key = (value, repeat = false) => eye.dispatchEvent(new w.KeyboardEvent('keydown', {
        key: value, repeat, bubbles: true, cancelable: true,
      }));
      const overlay = () => d.querySelector('.pet-haunt');
      const phase = () => overlay()?.getAttribute('data-phase');
      const count = () => Number(eye.getAttribute('data-pet-warnings'));
      const clean = () => {
        check(!overlay(), 'Overlay must be removed');
        check(!scene.classList.contains('is-vanished'), 'Original eye must return');
        check(!d.documentElement.classList.contains('pet-sequence-active'), 'Scrolling must unlock');
        check([...d.body.children].filter(node => !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName))
          .every(node => !node.inert), 'Original content must become interactive');
        check(count() === 0, 'Counter must reset');
        check(timers.size === 0, 'All effect timeouts must be cleared');
        check(animations.every(({ animation }) => animation.playState === 'idle'), 'All effect animations must be cancelled');
        check(w.scrollY === savedScroll, 'Scroll position must recover');
        if (!hidden) check(d.activeElement === eye, 'Focus must recover');
      };
      return { w, d, eye, scene, click, key, advance, overlay, phase, count, style, clean, timers,
        hide: () => { hidden = true; d.dispatchEvent(new w.Event('visibilitychange')); },
        show: () => { hidden = false; d.dispatchEvent(new w.Event('visibilitychange')); },
        preferenceChange: () => preferenceListeners.forEach(callback => callback()),
      };
    };

    const f = await fixture(1440, 900);
    check(f.eye.getAttribute('role') === 'button', 'Eye must be keyboard accessible');
    const aperture = f.eye.querySelector('.platform-eye__aperture');
    const rim = f.eye.querySelector('.platform-eye__rim');
    const iris = f.eye.querySelector('.platform-eye__gaze circle');
    const lid = f.eye.querySelector('g[clip-path]');
    const idleParts = [...f.eye.querySelectorAll('.platform-eye__aperture, .platform-eye__rim, .platform-eye__shadow')];
    const idleAnimations = idleParts.map(part => part.getAnimations().find(animation => animation.animationName === 'platform-blink'));
    check(idleAnimations.every(Boolean), 'All lid contours must blink automatically');
    idleAnimations.forEach((animation) => { animation.pause(); animation.currentTime = 6200 * .964; });
    check(aperture.getBBox().height < 30, 'Automatic blink must close with a curved seam');
    check(!aperture.isPointInFill(new f.w.DOMPoint(300, 175)), 'Closed eyelids must hide the iris center');
    check(Math.abs(aperture.getBBox().height - rim.getBBox().height) < .01, 'Aperture and rim must stay aligned');
    check(iris.getBBox().height === 212, 'Automatic blink must keep the iris round');
    check(new f.w.DOMMatrix(f.w.getComputedStyle(lid).transform).d === 1, 'Automatic blink must not compress the eyeball');
    check(f.count() === 0 && !f.d.querySelector('.pet-warning').classList.contains('is-visible'), 'Normal blinking must not issue warnings');
    idleAnimations.forEach((animation) => { animation.currentTime = 0; });
    check(aperture.getBBox().height > 250, 'Automatic blink must reopen fully');
    f.click();
    check(f.count() === 1, 'First click warns once');
    f.advance(300);
    check(aperture.getBBox().height < 30, 'Pain must close the eyelids');
    check(!aperture.isPointInFill(new f.w.DOMPoint(300, 175)), 'Pain closure must obscure the iris');
    check(iris.getBBox().height === 212, 'Pain must not flatten the iris');
    check(new f.w.DOMMatrix(f.w.getComputedStyle(lid).transform).d === 1, 'Pain must not compress the eyeball');
    f.advance(700);
    check(!f.eye.classList.contains('is-hurt'), 'Pain must end');
    check(aperture.getBBox().height > 250, 'Eye must reopen');
    check(aperture.getAnimations().some(animation => animation.animationName === 'platform-blink'), 'Automatic blinking must resume after pain');
    f.key('Enter', true);
    check(f.count() === 1, 'Keyboard repeat must not increment');
    f.key(' ');
    check(f.count() === 2, 'Space must trigger exactly one warning');
    f.advance(1000);
    f.key('Enter');
    check(f.count() === 3, 'Enter must work');
    check(f.d.querySelector('.pet-warning strong').textContent === '不要惹怒 GOD 的宠物', 'Third-click special warning');
    f.advance(1000);
    f.click();
    check(f.count() === 4 && !f.overlay(), 'Fourth click stays local');
    f.advance(1000);
    f.click();
    check(f.phase() === 'withdrawal' && f.count() === 5, 'Fifth click starts takeover');
    check(f.d.querySelector('main').inert, 'Background must be inert');
    check(f.d.activeElement === f.overlay().querySelector('button'), 'Focus must enter effect');
    f.click();
    check(f.count() === 5, 'Additional clicks during takeover must be ignored');
    const ids = [...f.d.querySelectorAll('[id]')].map(node => node.id);
    check(ids.length === new Set(ids).size, 'SVG IDs must be unique');
    f.d.querySelectorAll('.pet-eye').forEach((copy) => {
      check(copy.querySelector('.platform-eye__aperture').getAnimations().length === 0, 'Haunting eyes must keep their original behavior');
      copy.querySelectorAll('*').forEach((node) => [...node.attributes].forEach(({ value }) => {
        for (const reference of value.matchAll(/url\(#([^)]*)\)/g)) {
          check(!!copy.querySelector('[id="' + reference[1] + '"]'), 'SVG references must remain inside each clone');
        }
      }));
    });
    f.advance(1200);
    check(f.phase() === 'wandering' && f.scene.classList.contains('is-vanished'), 'Eye must vanish and roam');
    check(f.d.querySelectorAll('.pet-haunt__ghost').length === 3, 'Ghost pool must stay at three nodes');
    f.advance(4200);
    check(f.phase() === 'blackout', 'Roaming must progress to black');
    check(f.style(f.overlay(), 'backgroundColor') === 'rgb(0, 0, 0)', 'Blackout must fill the viewport');
    f.advance(1100);
    check(f.phase() === 'staring', 'Blood-red hero must reappear');
    check(f.style(f.d.querySelector('.pet-haunt__hero'), 'opacity') === '1', 'Hero must be visible');
    check(f.style(f.d.querySelector('.pet-haunt__roaming'), 'opacity') === '0', 'Only the hero remains');
    const irisColor = f.style(f.d.querySelector('.pet-haunt__hero [id$="-platform-iris-fill"] stop:nth-child(2)'), 'stopColor');
    const irisRGB = irisColor.startsWith('color(srgb ')
      ? irisColor.slice(11, -1).trim().split(/\s+/).slice(0, 3).map(value => Math.round(Number(value) * 255))
      : [...irisColor.matchAll(/[\d.]+/g)].slice(0, 3).map(value => Number(value[0]));
    check(irisRGB.join(',') === '238,8,50', 'Hero iris must be blood red: ' + irisColor);
    f.advance(1500);
    check(f.phase() === 'alerts', 'Warning coverage must follow the blood eye');
    f.advance(4600);
    const boxes = [...f.d.querySelectorAll('.pet-haunt__warning')];
    check(boxes.length >= 24 && boxes.length <= 48, 'Warning count must be finite');
    check(boxes.every(box => box.querySelector('strong').textContent === '警告！！'), 'Warning wording');
    check(f.style(boxes[0], 'borderRadius') === '18px', 'Warnings must have rounded corners');
    check(new Set(boxes.map(box => box.style.left + box.style.top)).size === boxes.length, 'Warnings must occupy different positions');
    f.advance(200);
    check(f.phase() === 'red', 'Entire viewport must turn red');
    check(f.style(f.overlay(), 'backgroundColor') === 'rgb(210, 8, 40)', 'Red wash must cover any gaps');
    f.advance(1500);
    check(f.phase() === 'black', 'Red must fade to black');
    check(parseFloat(f.style(f.overlay(), 'transitionDuration')) >= 1.6, 'Fade to black must be gradual');
    f.advance(1700);
    check(f.phase() === 'restoring' && !f.scene.classList.contains('is-vanished'), 'Original page must return under the fade');
    f.advance(1900);
    f.clean();
    check(f.d.querySelectorAll('.platform-entry').length === 6, 'All six platform links must survive');
    reports.push({ test: 'desktop full timeline / pain / keyboard / SVG / reset', passed: true, warningBoxes: boxes.length });
    window.__platformEyeQA.step = 'desktop complete; checking cleanup';

    for (let cycle = 0; cycle < 2; cycle++) {
      for (let click = 0; click < 5; click++) f.click();
      f.advance(8500);
      f.d.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      check(f.d.activeElement === f.overlay().querySelector('button'), 'Tab must remain inside the overlay');
      f.d.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      f.advance(20000);
      f.clean();
    }
    for (let i = 0; i < 5; i++) f.click();
    f.advance(1800);
    f.hide();
    f.advance(20000);
    f.clean();
    f.show();
    for (let i = 0; i < 5; i++) f.click();
    f.preferenceChange();
    f.clean();
    for (let i = 0; i < 5; i++) f.click();
    f.overlay().querySelector('button').click();
    f.clean();
    reports.push({ test: 'repeated cycles / Escape / Tab / hidden / preference change / close', passed: true });

    const mobile = await fixture(375, 812);
    for (let i = 0; i < 5; i++) mobile.click();
    const rect = mobile.overlay().getBoundingClientRect();
    check(rect.left === 0 && rect.top === 0 && Math.abs(rect.width - 375) < 1 && Math.abs(rect.height - 812) < 1,
      'Mobile overlay must fill its viewport: ' + JSON.stringify({ rect: rect.toJSON(), width: mobile.w.innerWidth,
        client: mobile.d.documentElement.clientWidth }));
    mobile.advance(12400);
    const mobileBoxes = mobile.d.querySelectorAll('.pet-haunt__warning').length;
    check(mobileBoxes >= 12 && mobileBoxes <= 48, 'Mobile coverage must stay bounded');
    mobile.advance(5500);
    mobile.clean();
    reports.push({ test: '375px layout / full mobile lifecycle', passed: true, warningBoxes: mobileBoxes });

    const reduced = await fixture(375, 812, true);
    for (let i = 0; i < 5; i++) reduced.key('Enter');
    reduced.advance(650);
    check(reduced.phase() === 'staring' && reduced.overlay().classList.contains('is-reduced'), 'Reduced motion must skip roaming');
    check(!reduced.d.querySelector('.pet-haunt__ghost').getAnimations().length, 'Reduced motion must not flash roaming eyes');
    reduced.advance(1150);
    check(reduced.phase() === 'red', 'Reduced sequence keeps red stage');
    reduced.advance(1100);
    check(reduced.phase() === 'black', 'Reduced sequence keeps black stage');
    reduced.advance(1800);
    reduced.clean();
    reports.push({ test: 'reduced motion static sequence / reset', passed: true });
    restore();
    window.__platformEyeQA = { status: 'passed', reports, fixturesRemaining: document.querySelectorAll('iframe').length };
  };
  return run().then(() => window.__platformEyeQA).catch((error) => {
    restore();
    window.__platformEyeQA = { status: 'failed', error: error.stack, reports };
    return window.__platformEyeQA;
  });
})();
