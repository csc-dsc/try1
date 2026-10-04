(() => {
  const scenes = [...document.querySelectorAll('[data-platform-art]')];
  const eyeScene = document.querySelector('.platform-eye-scene');
  const eye = document.querySelector('.platform-eye');
  const gaze = document.querySelector('[data-eye-gaze]');
  const heartScene = document.querySelector('.platform-heart-scene');
  const heart = document.querySelector('.platform-heart');
  if (!scenes.length || !eyeScene || !eye || !gaze) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ecgPaths = heartScene ? [...heartScene.querySelectorAll('[data-ecg-geometry]')] : [];
  const innerTrace = heartScene?.querySelector('.platform-heart__trace');
  const heartParts = heartScene ? [...heartScene.querySelectorAll(
    '.platform-heart__body, .platform-heart__blood-flow, .platform-heart__drop',
  )] : [];
  let visible = false;
  let eyeSequenceActive = false;
  let excited = false;
  let pointer = null;
  let eyeBounds = eye.getBoundingClientRect();
  let frame = null;
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;
  const normalHeart = { rate: 1, ecgRate: 1, amplitude: 1, strength: 0 };
  const peakHeart = { rate: 4, ecgRate: 4, amplitude: 1.5, strength: 1 };
  const denseHighHeart = { rate: 4, ecgRate: 8, amplitude: 2.1, strength: 1 };
  const denseLowHeart = { rate: 4, ecgRate: 8, amplitude: .9, strength: 1 };
  const fadingHeart = { rate: 0, ecgRate: 8, amplitude: 0, strength: 0 };
  const flatHeart = { rate: 0, ecgRate: 0, amplitude: 0, strength: 0 };
  let heartValues = { ...normalHeart };
  let heartFrom = { ...normalHeart };
  let heartState = 'idle';
  let heartStarted = 0;
  let heartFrame = null;
  let heartRendered = -Infinity;
  let heartRate = null;
  let heartAnimations = null;
  let heartVisualKey = '';
  const ecgStep = .5;
  const ecgInterval = 5;
  const ecgBaseline = 120;
  const traceBaseline = 195;
  const ecgSamples = new Float32Array(2001);
  let ecgHead = 0;
  let ecgPhase = 0;
  let ecgCarry = 0;
  let ecgLastTime = null;
  let ecgFlatSamples = 0;
  let ecgRenderedFlat = false;
  let inletFrom = null;
  let inletStarted = -Infinity;
  let pausedInlet = null;

  const intersectsViewport = (rect) => rect.width > 0 && rect.height > 0
    && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;

  const resetGaze = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    x = y = targetX = targetY = 0;
    gaze.setAttribute('transform', 'translate(0 0)');
  };
  const updateTarget = () => {
    if (!pointer || !visible || !eyeBounds.width || !eyeBounds.height) {
      targetX = targetY = 0;
      return;
    }
    const dx = (pointer.x - eyeBounds.left - eyeBounds.width / 2) * 600 / eyeBounds.width;
    const dy = (pointer.y - eyeBounds.top - eyeBounds.height / 2) * 350 / eyeBounds.height;
    // Saturate smoothly inside an ellipse so distant pointers pull the iris toward the rim.
    const distance = Math.hypot(dx / 118, dy / 36);
    const reach = distance ? (1 - Math.exp(-distance * .55)) / distance : 0;
    targetX = dx * reach;
    targetY = dy * reach;
  };
  const stepGaze = () => {
    x += (targetX - x) * .17;
    y += (targetY - y) * .17;
    gaze.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
  };
  const paint = () => {
    frame = null;
    if (!visible || document.hidden) return;
    stepGaze();
    if (Math.abs(targetX - x) > .15 || Math.abs(targetY - y) > .15) frame = requestAnimationFrame(paint);
  };
  const schedule = () => {
    if (!reducedMotion && visible && !document.hidden && frame === null) frame = requestAnimationFrame(paint);
  };

  const applyHeartRate = (rate) => {
    if (heartRate !== null && Math.abs(rate - heartRate) < .015
      && rate !== 0 && rate !== 1 && rate !== peakHeart.rate) return;
    if (rate === heartRate) return;
    heartRate = rate;
    heartAnimations ??= heartParts.flatMap(part => part.getAnimations?.() ?? []);
    heartAnimations.forEach((animation) => {
      if (animation.updatePlaybackRate) animation.updatePlaybackRate(rate);
      else animation.playbackRate = rate;
    });
    heartParts.forEach((part) => {
      if (!part.getAnimations) part.style.animationDuration = (3.2 / Math.max(.05, rate)).toFixed(3) + 's';
    });
  };

  const ecgCycle = [[0, 0], [.08, 0], [.14, .13], [.21, 0], [.29, 0], [.31, -.12],
    [.34, 1], [.37, -.3], [.4, 0], [.55, .27], [.7, 0], [1, 0]];
  const pulseAt = (phase) => {
    phase = ((phase % 1) + 1) % 1;
    for (let i = 1; i < ecgCycle.length; i++) {
      const [end, height] = ecgCycle[i];
      if (phase <= end) {
        const [start, previous] = ecgCycle[i - 1];
        return previous + (height - previous) * (phase - start) / (end - start);
      }
    }
    return 0;
  };
  const mixHeart = (from, to, amount) => Object.fromEntries(
    Object.keys(normalHeart).map(key => [key, from[key] + (to[key] - from[key]) * amount]),
  );
  const smooth = progress => progress * progress * (3 - 2 * progress);
  const heartAt = (now) => {
    const elapsed = Math.max(0, now - heartStarted);
    if (!excited) {
      if (heartState === 'idle') return { state: 'idle', values: normalHeart };
      const progress = Math.min(1, elapsed / 4800);
      return { state: progress < 1 ? 'recovering' : 'idle', values: mixHeart(heartFrom, normalHeart, smooth(progress)) };
    }
    if (elapsed < 7000) {
      return { state: 'accelerating', values: mixHeart(heartFrom, peakHeart, (elapsed / 7000) ** 2) };
    }
    if (elapsed < 8200) return { state: 'peaking', values: peakHeart };
    if (elapsed < 9400) {
      return { state: 'surging', values: mixHeart(peakHeart, denseHighHeart, smooth((elapsed - 8200) / 1200)) };
    }
    if (elapsed < 11000) return { state: 'dense-high', values: denseHighHeart };
    if (elapsed < 12600) {
      return { state: 'dense-lowering', values: mixHeart(denseHighHeart, denseLowHeart, smooth((elapsed - 11000) / 1600)) };
    }
    if (elapsed < 13600) return { state: 'dense-low', values: denseLowHeart };
    if (elapsed < 16400) {
      return { state: 'fading', values: mixHeart(denseLowHeart, fadingHeart, smooth((elapsed - 13600) / 2800)) };
    }
    return { state: 'flatline', values: flatHeart };
  };
  const inputAt = now => excited ? heartAt(now).values : normalHeart;
  const inletValueAt = (now, phase) => {
    const raw = ecgBaseline - pulseAt(phase) * 54 * inputAt(now).amplitude;
    const progress = Math.max(0, Math.min(1, (now - inletStarted) / 120));
    return inletFrom === null ? raw : inletFrom + (raw - inletFrom) * smooth(progress);
  };
  const leftValueAt = (now) => {
    const phase = ecgPhase - inputAt(now).ecgRate * ecgCarry / 3200;
    return inletValueAt(now, phase);
  };
  const advanceECG = (now) => {
    if (ecgLastTime === null) { ecgLastTime = now; return; }
    if (ecgFlatSamples === ecgSamples.length && excited && heartState === 'flatline') {
      ecgLastTime = now;
      ecgCarry = 0;
      return;
    }
    ecgCarry += Math.max(0, now - ecgLastTime);
    ecgLastTime = now;
    // Each old sample is immutable; a ring buffer moves history right at 100 SVG units/second.
    while (ecgCarry >= ecgInterval) {
      ecgCarry -= ecgInterval;
      const input = inputAt(now - ecgCarry);
      ecgPhase = ((ecgPhase - input.ecgRate * ecgInterval / 3200) % 1 + 1) % 1;
      ecgHead = (ecgHead + ecgSamples.length - 1) % ecgSamples.length;
      ecgSamples[ecgHead] = inletValueAt(now - ecgCarry, ecgPhase);
      ecgFlatSamples = input.amplitude < .001 ? Math.min(ecgSamples.length, ecgFlatSamples + 1) : 0;
    }
  };
  const renderECG = () => {
    const offset = ecgCarry / ecgInterval * ecgStep;
    const sample = index => ecgSamples[(ecgHead + index) % ecgSamples.length];
    let path;
    if (ecgFlatSamples === ecgSamples.length) {
      path = 'M0 ' + ecgBaseline + 'H1000';
      ecgRenderedFlat = true;
    } else {
      ecgRenderedFlat = false;
      const points = ['M0 ' + leftValueAt(ecgLastTime ?? performance.now()).toFixed(2)];
      for (let i = 0; i < ecgSamples.length; i++) {
        const px = offset + i * ecgStep;
        if (px > 0 && px < 1000) points.push('L' + px.toFixed(2) + ' ' + sample(i).toFixed(2));
      }
      const last = Math.floor((1000 - offset) / ecgStep);
      const blend = (1000 - offset) / ecgStep - last;
      const right = sample(last) + (sample(Math.min(last + 1, ecgSamples.length - 1)) - sample(last)) * blend;
      points.push('L1000 ' + right.toFixed(2));
      path = points.join('');
    }
    ecgPaths.forEach(element => element.setAttribute('d', path));
    heartScene?.setAttribute('data-ecg-input', excited ? heartState : 'normal');
  };
  const renderHeart = () => {
    if (!heartScene) return;
    const { rate, amplitude, strength } = heartValues;
    const key = heartState + ':' + rate.toFixed(4) + ':' + amplitude.toFixed(4) + ':' + strength.toFixed(4);
    if (key === heartVisualKey) return;
    heartVisualKey = key;
    const activity = Math.min(1, amplitude);
    heartScene.setAttribute('data-heart-state', heartState);
    heartScene.classList.toggle('is-flatline', heartState === 'flatline');
    heartScene.style.setProperty('--heart-peak', (1 + (.08 + .1 * strength) * activity).toFixed(4));
    heartScene.style.setProperty('--heart-second-peak', (1 + (.045 + .065 * strength) * activity).toFixed(4));
    heartScene.style.setProperty('--heart-rest', (1 - .025 * strength * activity).toFixed(4));
    heartScene.style.setProperty('--drop-scale', ((.65 + .35 * strength) * activity).toFixed(4));
    heartScene.style.setProperty('--blood-activity', activity.toFixed(4));
    applyHeartRate(rate);
    if (innerTrace) {
      innerTrace.setAttribute('d', 'M106 ' + traceBaseline + 'H159L176 ' + (traceBaseline - 31 * amplitude).toFixed(1)
        + 'L196 ' + (traceBaseline + 38 * amplitude).toFixed(1) + 'L218 ' + (traceBaseline - 12 * amplitude).toFixed(1)
        + 'L235 ' + (traceBaseline + 5 * amplitude).toFixed(1) + 'H313');
    }
  };
  const paintHeart = (now) => {
    heartFrame = null;
    if (!heartScene?.classList.contains('is-active') || document.hidden || reducedMotion) return;
    advanceECG(now);
    const next = heartAt(now);
    const changed = next.state !== heartState;
    heartValues = next.values;
    heartState = next.state;
    // Dense, narrow QRS peaks keep their height with fixed subpixel samples; drawing stays at 30 Hz.
    if (changed || now - heartRendered >= 32 || (ecgFlatSamples === ecgSamples.length && !ecgRenderedFlat)) {
      renderHeart();
      renderECG();
      heartRendered = now;
    }
    if (heartState !== 'flatline' || ecgFlatSamples < ecgSamples.length) {
      heartFrame = requestAnimationFrame(paintHeart);
    }
  };
  const resetHeart = () => {
    if (heartFrame !== null) cancelAnimationFrame(heartFrame);
    heartFrame = null;
    pausedInlet = leftValueAt(ecgLastTime ?? performance.now());
    ecgLastTime = null;
    if (excited || heartState !== 'idle') { ecgPhase = .46; ecgFlatSamples = 0; }
    excited = false;
    heartState = 'idle';
    heartValues = { ...normalHeart };
    heartScene?.classList.toggle('is-excited', false);
    renderHeart();
  };
  const setHeartExcited = (value) => {
    if (!heartScene) return;
    const next = Boolean(value && heartScene.classList.contains('is-active') && !reducedMotion && !document.hidden);
    if (next === excited) return;
    const now = performance.now();
    advanceECG(now);
    const previousInlet = leftValueAt(now);
    excited = next;
    // Normal beats restart only at the inlet; the dense/flat history is left untouched.
    if (!next) { ecgPhase = .46; ecgFlatSamples = 0; }
    heartScene.classList.toggle('is-excited', next);
    heartFrom = { ...heartValues };
    heartState = next ? 'accelerating' : 'recovering';
    heartStarted = now;
    inletFrom = previousInlet;
    inletStarted = now;
    heartRendered = -Infinity;
    renderHeart();
    renderECG();
    if (heartFrame === null) heartFrame = requestAnimationFrame(paintHeart);
  };
  const setActive = (scene, active) => {
    active = active && !eyeSequenceActive;
    scene.classList.toggle('is-active', active);
    if (scene === eyeScene) {
      const entered = active && !visible;
      visible = active;
      if (!active) resetGaze();
      else if (entered) {
        eyeBounds = eye.getBoundingClientRect();
        updateTarget();
        if (!reducedMotion) { stepGaze(); schedule(); }
      }
    }
    if (scene === heartScene) {
      if (!active && (heartFrame !== null || excited || heartState !== 'idle')) resetHeart();
      else if (active && !reducedMotion && heartFrame === null
        && (heartState !== 'flatline' || ecgFlatSamples < ecgSamples.length)) {
        const now = performance.now();
        if (ecgLastTime === null && pausedInlet !== null) {
          inletFrom = pausedInlet;
          inletStarted = now;
          pausedInlet = null;
        }
        ecgLastTime = now;
        heartFrame = requestAnimationFrame(paintHeart);
      }
    }
  };
  const refreshVisibility = () => {
    eyeBounds = eye.getBoundingClientRect();
    scenes.forEach((scene) => {
      const rect = scene === eyeScene ? eyeBounds : scene.getBoundingClientRect();
      setActive(scene, !document.hidden && intersectsViewport(rect));
    });
    if (visible && !reducedMotion) { updateTarget(); stepGaze(); schedule(); }
    if (excited && pointer && heart) {
      const rect = heart.getBoundingClientRect();
      if (pointer.x < rect.left || pointer.x > rect.right || pointer.y < rect.top || pointer.y > rect.bottom) {
        setHeartExcited(false);
      }
    }
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setActive(
        entry.target === eye ? eyeScene : entry.target, entry.isIntersecting && !document.hidden,
      ));
    }, { threshold: 0 });
    scenes.forEach((scene) => observer.observe(scene === eyeScene ? eye : scene));
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    pointer = { x: event.clientX, y: event.clientY };
    if (reducedMotion || !visible || document.hidden) return;
    updateTarget();
    stepGaze();
    schedule();
  }, { passive: true });
  document.addEventListener('pointerleave', () => {
    pointer = null;
    updateTarget();
    if (visible && !reducedMotion) { stepGaze(); schedule(); }
    setHeartExcited(false);
  });
  window.addEventListener('scroll', refreshVisibility, { passive: true });
  window.addEventListener('resize', refreshVisibility, { passive: true });
  document.addEventListener('visibilitychange', refreshVisibility);
  document.addEventListener('platform-eye-sequence', (event) => {
    eyeSequenceActive = Boolean(event.detail?.active);
    refreshVisibility();
  });
  window.addEventListener('blur', () => {
    pointer = null;
    resetGaze();
    setHeartExcited(false);
  });

  heart?.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch') setHeartExcited(true);
  });
  heart?.addEventListener('pointerleave', () => setHeartExcited(false));
  heart?.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') setHeartExcited(true);
  });
  const releaseTouch = (event) => { if (event.pointerType === 'touch') setHeartExcited(false); };
  document.addEventListener('pointerup', releaseTouch);
  document.addEventListener('pointercancel', releaseTouch);
  for (let i = 0; i < ecgSamples.length; i++) ecgSamples[i] = ecgBaseline - pulseAt(i * ecgInterval / 3200) * 54;
  renderHeart();
  renderECG();
  refreshVisibility();
})();
