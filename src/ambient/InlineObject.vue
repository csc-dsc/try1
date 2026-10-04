<template>
  <div class="ambient-object" :class="`ambient-object--${modelId}`">
    <canvas ref="canvas" class="ambient-object__canvas" role="img" :aria-label="canvasLabel"></canvas>
    <div v-if="modelId === 'guitar' && ready" class="ambient-object__tools">
      <button ref="keyboardButton" type="button" :aria-pressed="keyboardEnabled ? 'true' : 'false'"
        :aria-label="keyboardEnabled ? '关闭数字键拨弦' : '启用数字键拨弦'" title="数字键 1–6 拨弦"
        @click="keyboardEnabled = !keyboardEnabled">
        <svg viewBox="0 0 180 180" aria-hidden="true"><use :href="keyboardIcon"></use></svg>
      </button>
      <button type="button" :aria-pressed="soundOn ? 'true' : 'false'"
        :aria-label="soundOn ? '关闭吉他声音' : '开启吉他声音'" :title="soundOn ? '静音' : '声音'"
        @click="toggleSound"><span aria-hidden="true">♪</span></button>
    </div>
    <span v-if="model && ready" class="ambient-object__credit"
      :title="`${model.credit} / CC BY 4.0 / ${model.source}`">©</span>
    <span v-if="error" class="ambient-object__error" role="status">{{ error }}</span>
  </div>
</template>

<script>
import './inline-object.css';

const notes = [82.41, 110, 146.83, 196, 246.94, 329.63];

export default {
  name: 'InlineObject',
  props: { modelId: { type: String, required: true } },
  data() {
    return { model: null, ready: false, error: '', keyboardEnabled: true, soundOn: false };
  },
  computed: {
    canvasLabel() { return `${this.model?.label ?? '兴趣器材'}动态模型`; },
    keyboardIcon() { return `${import.meta.env.BASE_URL}graphics/hardware.svg#keyboard`; },
  },
  async mounted() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onVisibility = () => this.scene?.setVisible(this.inViewport && !document.hidden);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.observer = new IntersectionObserver(([entry]) => {
      this.inViewport = entry.isIntersecting;
      this.scene?.setVisible(this.inViewport && !document.hidden);
    }, { threshold: .03 });
    this.observer.observe(this.$el);
    this.onKeyDown = (event) => {
      if (this.modelId !== 'guitar' || !this.keyboardEnabled || !this.inViewport || event.repeat || document.hidden) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const match = /^(?:Digit|Numpad)([1-6])$/.exec(event.code);
      if (!match) return;
      event.preventDefault();
      const index = Number(match[1]) - 1;
      this.scene?.pluck(index);
      this.playNote(index);
      this.$refs.keyboardButton?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }],
        { duration: 230, easing: 'ease-out' });
    };
    document.addEventListener('keydown', this.onKeyDown);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}models/index.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const index = await response.json();
      this.model = index.models.find((item) => item.id === this.modelId);
      if (!this.model) throw new Error('Unknown model');
      const { ModelScene } = await import('../hobby/ModelScene.js');
      if (this._isDestroyed) return;
      this.scene = new ModelScene(this.$refs.canvas, {
        onReady: () => { this.ready = true; this.$el.classList.add('is-ready'); },
        onError: () => { this.error = 'Scene unavailable'; },
        onStringPluck: (string) => this.playNote(string),
        onAutoPluck: (string) => this.playNote(string),
      }, { inline: true });
      this.scene.setVisible(this.inViewport && !document.hidden);
      this.scene.setPlaying(!this.reducedMotion);
      this.scene.loadModel(this.model);
    } catch (_) {
      this.error = 'Scene unavailable';
    }
  },
  beforeDestroy() {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('keydown', this.onKeyDown);
    this.scene?.dispose();
    this.audio?.close();
  },
  methods: {
    async toggleSound() {
      this.soundOn = !this.soundOn;
      if (!this.soundOn) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) { this.soundOn = false; return; }
      this.audio ??= new AudioContext();
      await this.audio.resume();
    },
    playNote(index) {
      if (!this.soundOn || !this.audio || this.audio.state !== 'running') return;
      const now = this.audio.currentTime;
      const oscillator = this.audio.createOscillator();
      const filter = this.audio.createBiquadFilter();
      const gain = this.audio.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(notes[index], now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 1.1);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.09, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + 1.1);
      oscillator.connect(filter).connect(gain).connect(this.audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 1.15);
    },
  },
};
</script>
