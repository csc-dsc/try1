<template>
  <section class="hobby-stage" aria-labelledby="hobby-title">
    <div class="hobby-stage__field" aria-hidden="true">
      <div class="hobby-stage__ring"></div>
      <div ref="underlay" class="hobby-stage__underlay">{{ selectedDisplay }}</div>
    </div>
    <div class="hobby-stage__surface">
      <canvas ref="canvas" class="hobby-stage__canvas" :aria-label="canvasLabel" role="img"></canvas>
    </div>

    <div class="hobby-stage__shell">
      <div class="hobby-stage__eyebrow"><span>03</span> AFTER HOURS <span class="hobby-stage__count">0{{ activeIndex + 1 }} / 03</span></div>
      <h2 id="hobby-title" class="hobby-stage__heading">AFTER HOURS</h2>

      <div class="hobby-stage__choices" role="group" aria-label="兴趣场景">
        <button v-for="(model, index) in models" :key="model.id" type="button"
          :aria-label="model.label" :aria-pressed="model.id === selectedId ? 'true' : 'false'"
          :class="{ 'is-active': model.id === selectedId }" @click="selectModel(model)">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>{{ displayFor(model.id) }}
        </button>
      </div>

      <p v-if="statusText" class="hobby-stage__status" aria-live="polite">{{ statusText }}</p>

      <div v-if="modelReady && hasAnimation" class="hobby-stage__transport">
        <button type="button" @click="togglePlayback">{{ playing ? 'PAUSE' : 'PLAY' }}</button>
        <button type="button" @click="restart">REPLAY</button>
        <label class="hobby-stage__speed">
          <span>SPEED</span>
          <input v-model.number="speed" type="range" min="0.5" :max="selectedId === 'nunchaku' ? 1.5 : 2" step="0.25" @input="updateSpeed">
          <output>{{ speed.toFixed(2) }}×</output>
        </label>
      </div>

      <div v-if="modelReady && hasStrings" class="hobby-stage__strings">
        <div class="hobby-stage__string-buttons" role="group" aria-label="吉他琴弦">
          <button v-for="(note, index) in stringNotes" :key="index" type="button" :title="`拨动第 ${index + 1} 根弦`"
            :class="{ 'is-plucked': pluckedString === index }"
            @click="pluck(index)">{{ note }}</button>
        </div>
      </div>
      <label v-if="modelReady && hasStrings" class="hobby-stage__sound"><input v-model="soundOn" type="checkbox"> AUDIO</label>

      <span v-if="selectedModel" class="hobby-stage__credit" :title="selectedModel.source">
        {{ selectedId === 'nunchaku' ? 'REFERENCE' : '3D' }} / {{ selectedModel.credit }} · CC BY 4.0
      </span>
    </div>
  </section>
</template>

<script>
import { gsap } from 'gsap';
import './stage.css';

const notes = [82.41, 110, 146.83, 196, 246.94, 329.63];

export default {
  name: 'HobbyStage',
  data() {
    return {
      models: [],
      selectedId: 'balisong',
      modelReady: false,
      hasAnimation: false,
      hasStrings: false,
      playing: true,
      speed: 1,
      soundOn: false,
      pluckedString: null,
      reducedMotion: false,
      loadProgress: null,
      error: '',
      stringNotes: ['E', 'A', 'D', 'G', 'B', 'E'],
    };
  },
  computed: {
    selectedModel() { return this.models.find((model) => model.id === this.selectedId); },
    activeIndex() { return Math.max(0, this.models.findIndex((model) => model.id === this.selectedId)); },
    selectedDisplay() { return this.displayFor(this.selectedId); },
    statusText() {
      if (this.error) return this.error;
      if (!this.modelReady) return this.loadProgress === null ? 'LOADING' : `LOADING ${this.loadProgress}%`;
      return '';
    },
    canvasLabel() { return `${this.selectedModel?.label ?? '兴趣物件'}三维场景`; },
  },
  async mounted() {
    this.onKeyDown = (event) => {
      if (this.selectedId !== 'guitar' || !this.inViewport || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const match = /^(?:Digit|Numpad)([1-6])$/.exec(event.code);
      if (!match) return;
      const button = this.$el.querySelectorAll('.hobby-stage__string-buttons button')[Number(match[1]) - 1];
      if (!button) return;
      event.preventDefault();
      button.click();
    };
    document.addEventListener('keydown', this.onKeyDown);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.playing = !this.reducedMotion;
    this.onVisibility = () => this.scene?.setVisible(!document.hidden && this.inViewport);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.observer = new IntersectionObserver((entries) => {
      this.inViewport = entries[0].isIntersecting;
      this.scene?.setVisible(this.inViewport && !document.hidden);
    }, { threshold: 0.05 });
    this.observer.observe(this.$el);

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}models/index.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const index = await response.json();
      this.models = index.models;
      const { ModelScene } = await import('./ModelScene.js');
      if (this._isDestroyed) return;
      this.scene = new ModelScene(this.$refs.canvas, {
        onProgress: (fraction) => { this.loadProgress = Math.round(fraction * 100); },
        onReady: (details) => this.onReady(details),
        onError: () => { this.error = 'SCENE UNAVAILABLE'; },
        onStringPluck: (string) => this.playNote(string),
        onMotion: (value) => this.moveUnderlay(value),
      });
      this.scene.setVisible(this.inViewport && !document.hidden);
      this.scene.setPlaying(this.playing);
      this.scene.loadModel(this.models[0]);
    } catch (error) {
      this.error = 'SCENE UNAVAILABLE';
    }
  },
  beforeDestroy() {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('keydown', this.onKeyDown);
    window.clearTimeout(this.pluckFeedbackTimer);
    gsap.killTweensOf(this.$refs.canvas);
    this.scene?.dispose();
    this.audio?.close();
  },
  methods: {
    displayFor(id) {
      return { balisong: 'BALISONG', nunchaku: 'NUNCHAKU', guitar: 'ACOUSTIC' }[id] ?? 'INTERESTS';
    },
    selectModel(model) {
      if (model.id === this.selectedId || !this.scene) return;
      this.selectedId = model.id;
      this.modelReady = false;
      this.hasAnimation = false;
      this.hasStrings = false;
      this.loadProgress = null;
      this.error = '';
      this.speed = 1;
      this.playing = !this.reducedMotion && model.id !== 'guitar';
      this.scene.setPlaying(this.playing);
      this.scene.setSpeed(1);
      gsap.to(this.$refs.canvas, { opacity: 0.2, duration: 0.18, overwrite: true });
      this.scene.loadModel(model);
    },
    onReady(details) {
      this.modelReady = true;
      this.hasAnimation = details.duration > 0.2;
      this.hasStrings = details.hasStrings;
      this.loadProgress = null;
      this.error = '';
      gsap.to(this.$refs.canvas, { opacity: 1, duration: 0.6, ease: 'power2.out', overwrite: true });
    },
    togglePlayback() {
      this.playing = !this.playing;
      this.scene?.setPlaying(this.playing);
    },
    restart() { this.scene?.restart(); },
    updateSpeed() { this.scene?.setSpeed(this.speed); },
    moveUnderlay(value) {
      if (!this.$refs.underlay || this.reducedMotion) return;
      const shift = Math.max(-34, Math.min(34, value * -32));
      this.$refs.underlay.style.transform = `translate3d(calc(-50% + ${shift}px), -50%, 0)`;
    },
    pluck(index) {
      this.scene?.pluck(index);
      this.pluckedString = index;
      window.clearTimeout(this.pluckFeedbackTimer);
      this.pluckFeedbackTimer = window.setTimeout(() => { this.pluckedString = null; }, 180);
      this.playNote(index);
    },
    async playNote(index) {
      if (!this.soundOn) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.audio ??= new AudioContext();
      await this.audio.resume();
      const now = this.audio.currentTime;
      const oscillator = this.audio.createOscillator();
      const filter = this.audio.createBiquadFilter();
      const gain = this.audio.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(notes[index], now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 1.2);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      oscillator.connect(filter).connect(gain).connect(this.audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 1.25);
    },
  },
};
</script>
