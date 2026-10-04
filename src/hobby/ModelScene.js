import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const stringFrequencies = [9, 11, 13, 15, 17, 19];

function disposeObject(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  object.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });

  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

function styleBalisong(asset) {
  const replaced = new Set();
  asset.traverse((child) => {
    if (!child.isMesh) return;
    replaced.add(child.material);
    const blade = child.name === 'Plane_0';
    child.material = new THREE.MeshStandardMaterial({
      color: blade ? 0xcbd7d4 : 0x29383b,
      metalness: blade ? 0.58 : 0.25,
      roughness: blade ? 0.35 : 0.52,
      side: THREE.DoubleSide,
    });
  });
  replaced.forEach((material) => material?.dispose());
}

export class GuitarStrings {
  constructor(mesh) {
    this.mesh = mesh;
    this.positions = mesh.geometry.getAttribute('position');
    this.originalZ = Array.from({ length: this.positions.count }, (_, i) => this.positions.getZ(i));
    this.groups = this.findStrings();
    this.elapsed = Array(6).fill(null);
  }

  findStrings() {
    const positions = this.positions;
    const indices = this.mesh.geometry.getIndex();
    if (!indices) throw new Error('Guitar string topology is unavailable');

    const parent = Array.from({ length: positions.count }, (_, index) => index);
    const find = (start) => {
      let index = start;
      while (parent[index] !== index) index = parent[index];
      return index;
    };
    for (let i = 0; i < indices.count; i += 3) {
      const a = find(indices.getX(i));
      parent[find(indices.getX(i + 1))] = a;
      parent[find(indices.getX(i + 2))] = a;
    }

    const connected = new Map();
    for (let i = 0; i < positions.count; i++) {
      const root = find(i);
      if (!connected.has(root)) connected.set(root, []);
      connected.get(root).push(i);
    }

    // The source mesh contains two connected ribbon segments per string, meeting at the nut.
    const frequency = new Map();
    for (let i = 0; i < positions.count; i++) {
      const key = positions.getY(i).toFixed(3);
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
    const jointY = Number([...frequency].sort((a, b) => b[1] - a[1])[0][0]);
    const buckets = new Map();
    for (const vertices of connected.values()) {
      const atJoint = vertices.filter((i) => Math.abs(positions.getY(i) - jointY) < 0.004);
      if (!atJoint.length) throw new Error('Guitar string joint is missing');
      const jointX = atJoint.reduce((sum, i) => sum + positions.getX(i), 0) / atJoint.length;
      const key = jointX.toFixed(3);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(...vertices);
    }

    const groups = [...buckets.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([x, vertices]) => ({
        x: Number(x),
        vertices,
        minY: Math.min(...vertices.map((i) => positions.getY(i))),
        jointY,
      }));
    if (groups.length !== 6 || connected.size !== 12) {
      throw new Error('Expected six separable guitar strings');
    }
    return groups;
  }

  pluck(index) {
    if (index < 0 || index >= this.groups.length) return;
    this.elapsed[index] = 0;
  }

  pluckNearest(clientX, camera, canvas) {
    const rect = canvas.getBoundingClientRect();
    this.mesh.updateWorldMatrix(true, false);
    let closest = 0;
    let distance = Infinity;
    for (let i = 0; i < this.groups.length; i++) {
      const group = this.groups[i];
      const point = this.mesh.localToWorld(new THREE.Vector3(
        group.x, (group.minY + group.jointY) / 2, 0.35,
      )).project(camera);
      const x = rect.left + (point.x + 1) * rect.width / 2;
      if (Math.abs(clientX - x) < distance) {
        closest = i;
        distance = Math.abs(clientX - x);
      }
    }
    this.pluck(closest);
    return closest;
  }

  update(delta) {
    if (this.elapsed.every((value) => value === null)) return;
    for (let string = 0; string < this.groups.length; string++) {
      if (this.elapsed[string] === null) continue;
      const time = this.elapsed[string] + delta;
      const group = this.groups[string];
      const amplitude = time > 2.2 ? 0 : 0.14 * Math.exp(-3.2 * time)
        * Math.sin(Math.PI * 2 * stringFrequencies[string] * time);
      for (const index of group.vertices) {
        const y = this.positions.getY(index);
        const along = Math.max(0, Math.min(1, (y - group.minY) / (group.jointY - group.minY)));
        this.positions.setZ(index, this.originalZ[index] + amplitude * Math.sin(Math.PI * along));
      }
      this.elapsed[string] = time > 2.2 ? null : time;
    }
    this.positions.needsUpdate = true;
  }
}

export class ModelScene {
  constructor(canvas, callbacks = {}, options = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.inline = Boolean(options.inline);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xf0fffc, 0x273c43, 2.1));
    const key = new THREE.DirectionalLight(0xfff3de, 3.2);
    key.position.set(3, 5, 7);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x2ce5d3, 2);
    rim.position.set(-4, 1, -4);
    this.scene.add(rim);
    const rose = new THREE.DirectionalLight(0xff4f7b, 0.9);
    rose.position.set(1, -3, 3);
    this.scene.add(rose);

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.loader = new GLTFLoader();
    this.loadToken = 0;
    this.visible = true;
    this.playing = true;
    this.speed = 1;
    this.guitarBeat = 0;
    this.guitarStep = 0;
    this.yaw = 0;
    this.baseYaw = 0;
    this.basePitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.displayScale = 1;
    this.drag = null;
    this.lastFrame = 0;
    this.frame = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.pointerMove = (event) => this.onPointerMove(event);
    this.pointerDown = (event) => this.onPointerDown(event);
    this.pointerUp = (event) => this.onPointerUp(event);
    this.pointerCancel = (event) => this.onPointerCancel(event);
    this.pointerLeave = () => {
      if (this.drag) return;
      this.targetYaw = 0;
      this.targetPitch = 0;
      this.nunchakuRig?.hoverAt(0, 0);
    };
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerCancel);
    canvas.addEventListener('pointerleave', this.pointerLeave);
    this.resize();
    this.start();
  }

  resize() {
    const inlineBalisong = this.inline && this.currentModel?.id === 'balisong';
    const displayScale = inlineBalisong
      ? Number(getComputedStyle(this.canvas).getPropertyValue('--balisong-zoom')) || 1 : 1;
    this.displayScale = displayScale;
    const bounds = inlineBalisong ? this.canvas.getBoundingClientRect()
      : this.canvas.parentElement.getBoundingClientRect();
    const width = bounds.width / displayScale;
    const height = bounds.height / displayScale;
    if (!width || !height) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * displayScale);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    const targetX = this.inline || width < 700 ? 0 : -1.1;
    const targetY = this.inline ? 0 : width < 700 ? 0.25 : 0;
    this.camera.position.set(targetX, targetY + 0.2, this.inline ? 6.4 : 7.8);
    this.camera.lookAt(targetX, targetY, 0);
    this.camera.updateProjectionMatrix();
    if (this.modelSize) {
      const span = this.inline
        ? ({ balisong: 3, nunchaku: 2.5, guitar: 2.7 }[this.currentModel?.id] ?? 2.2)
        : this.currentModel?.id === 'balisong'
          ? (width < 700 ? 1.95 : 3)
          : this.currentModel?.id === 'nunchaku'
            ? (width < 700 ? 1.85 : 3)
            : (width < 700 ? 2.15 : 3.6);
      this.root.scale.setScalar(span / this.modelSize);
    }
    this.baseYaw = this.currentModel?.id === 'balisong'
      ? (inlineBalisong || width >= 700 ? Math.PI / 2 : 0.25) : 0;
    this.basePitch = this.currentModel?.id === 'balisong' && !inlineBalisong && width < 700 ? Math.PI / 2 : 0;
    this.root.rotation.set(this.basePitch, this.baseYaw + this.yaw, 0);
    this.renderer.render(this.scene, this.camera);
  }

  async loadModel(model) {
    const token = ++this.loadToken;
    this.clearModel();
    this.currentModel = model;
    try {
      let gltf;
      if (model.id === 'nunchaku') {
        const { NunchakuRig } = await import('./NunchakuRig.js');
        if (token !== this.loadToken) return;
        this.nunchakuRig = new NunchakuRig();
        this.asset = this.nunchakuRig.group;
      } else {
        const url = `${import.meta.env.BASE_URL}models/${model.src}`;
        gltf = await new Promise((resolve, reject) => {
          this.loader.load(url, resolve, (event) => {
            if (event.lengthComputable) this.callbacks.onProgress?.(event.loaded / event.total);
          }, reject);
        });
      }
      if (token !== this.loadToken) {
        if (gltf) disposeObject(gltf.scene);
        this.nunchakuRig?.dispose();
        return;
      }

      this.asset ??= gltf.scene;
      if (model.id === 'balisong') styleBalisong(this.asset);
      const bounds = new THREE.Box3().setFromObject(this.asset);
      const center = bounds.getCenter(new THREE.Vector3());
      this.modelSize = Math.max(...bounds.getSize(new THREE.Vector3()).toArray());
      this.asset.position.sub(center);
      this.root.add(this.asset);
      if (gltf) this.mixer = new THREE.AnimationMixer(this.asset);
      if (model.id === 'guitar') {
        const strings = this.asset.getObjectByName('Guitar_Strings_0');
        this.strings = new GuitarStrings(strings);
        this.guitarBeat = 0;
        this.guitarStep = 0;
      } else if (gltf) {
        this.clips = gltf.animations;
        this.setVariant();
      }
      this.targetYaw = 0;
      this.yaw = 0;
      this.resize();
      if (model.id === 'nunchaku') this.centerCurrentPose();
      this.callbacks.onReady?.({
        id: model.id,
        duration: this.nunchakuRig ? 1 : this.action?.getClip().duration ?? 0,
        hasStrings: Boolean(this.strings),
      });
      this.start();
    } catch (error) {
      if (token === this.loadToken) {
        this.clearModel();
        this.callbacks.onError?.(error);
      }
    }
  }

  setVariant() {
    if (!this.clips?.length || !this.currentModel) return;
    if (this.action) this.action.stop();
    const clip = this.clips.find((item) => item.duration > 0.2);
    if (!clip) return;
    this.action = this.mixer.clipAction(clip);
    this.action.setLoop(THREE.LoopRepeat, Infinity).reset().play();
    this.mixer.setTime(0);
  }

  centerCurrentPose() {
    if (!this.asset) return;
    this.root.updateMatrixWorld(true);
    const center = new THREE.Box3().setFromObject(this.asset).getCenter(new THREE.Vector3());
    this.root.position.sub(center);
    this.root.updateMatrixWorld(true);
  }

  setPlaying(playing) { this.playing = playing; }
  setSpeed(speed) { this.speed = speed; }
  restart() {
    if (this.nunchakuRig) this.nunchakuRig.replay();
    else if (this.action) this.mixer.setTime(0);
  }
  pluck(index) { this.strings?.pluck(index); }

  setVisible(visible) {
    this.visible = visible;
    if (visible) this.start();
    else if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  start() {
    if (!this.visible || this.frame !== null || document.hidden) return;
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  tick(now) {
    this.frame = null;
    if (!this.visible || document.hidden) return;
    const delta = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    if (this.playing) this.mixer?.update(delta * this.speed);
    this.nunchakuRig?.update(delta * this.speed, this.playing || Boolean(this.drag));
    if (this.playing && this.strings) {
      this.guitarBeat += delta * this.speed;
      if (this.guitarBeat >= 1.08) {
        const pattern = [0, 2, 4, 1, 3, 5];
        const string = pattern[this.guitarStep % pattern.length];
        this.strings.pluck(string);
        this.callbacks.onAutoPluck?.(string);
        this.guitarStep++;
        this.guitarBeat -= 1.08;
      }
    }
    this.strings?.update(delta);
    const response = this.inline && this.currentModel?.id === 'balisong' ? (this.drag ? 18 : 12) : 5;
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, delta * response);
    this.root.rotation.y = this.baseYaw + this.yaw;
    this.root.rotation.x += (this.basePitch + this.targetPitch - this.root.rotation.x) * Math.min(1, delta * response);
    if (this.currentModel?.id === 'nunchaku' && this.asset) {
      this.root.updateMatrixWorld(true);
      const center = new THREE.Box3().setFromObject(this.asset).getCenter(new THREE.Vector3());
      this.root.position.addScaledVector(center, -Math.min(1, delta * 2.5));
    }
    this.renderer.render(this.scene, this.camera);
    this.callbacks.onMotion?.(this.nunchakuRig ? this.nunchakuRig.getMotion() : this.yaw);
    this.start();
  }

  onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.drag = { x: event.clientX, y: event.clientY, yaw: this.targetYaw, pitch: this.targetPitch };
    this.nunchakuRig?.dragBy(0, 0);
    this.canvas.setPointerCapture(event.pointerId);
  }

  onPointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (this.nunchakuRig) {
      if (this.drag) this.nunchakuRig.dragBy(event.clientX - this.drag.x, event.clientY - this.drag.y);
      else this.nunchakuRig.hoverAt((event.clientX - rect.left - rect.width / 2) / (rect.width / 2),
        (event.clientY - rect.top - rect.height / 2) / (rect.height / 2));
      return;
    }
    const inlineBalisong = this.inline && this.currentModel?.id === 'balisong';
    if (this.drag) {
      this.targetYaw = THREE.MathUtils.clamp(this.drag.yaw + (event.clientX - this.drag.x) * (inlineBalisong ? 0.02 : 0.007), -0.75, 0.75);
      this.targetPitch = THREE.MathUtils.clamp(this.drag.pitch + (event.clientY - this.drag.y) * (inlineBalisong ? 0.0125 : 0.0045), -0.3, 0.3);
      return;
    }
    const hoverWidth = inlineBalisong ? rect.width / this.displayScale : rect.width;
    const fromCenter = (event.clientX - rect.left - rect.width * 0.62) / Math.min(hoverWidth * 0.4, 600);
    const hoverGain = inlineBalisong ? 0.46 : 0.2;
    this.targetYaw = THREE.MathUtils.clamp(fromCenter * hoverGain, -hoverGain, hoverGain);
  }

  onPointerUp(event) {
    if (!this.drag) return;
    const moved = Math.hypot(event.clientX - this.drag.x, event.clientY - this.drag.y);
    if (moved < 12 && this.strings) {
      const string = this.strings.pluckNearest(event.clientX, this.camera, this.canvas);
      this.callbacks.onStringPluck?.(string);
    }
    this.nunchakuRig?.release();
    this.drag = null;
    this.targetPitch = 0;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  }

  onPointerCancel(event) {
    this.nunchakuRig?.release();
    this.drag = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  }

  clearModel() {
    this.action?.stop();
    this.action = null;
    this.nunchakuRig?.dispose();
    if (this.asset) {
      this.mixer?.stopAllAction();
      this.mixer?.uncacheRoot(this.asset);
      this.root.remove(this.asset);
      disposeObject(this.asset);
    }
    this.asset = null;
    this.mixer = null;
    this.strings = null;
    this.clips = null;
    this.nunchakuRig = null;
    this.modelSize = null;
    this.root.position.set(0, 0, 0);
    this.root.scale.setScalar(1);
  }

  dispose() {
    ++this.loadToken;
    this.setVisible(false);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('pointercancel', this.pointerCancel);
    this.canvas.removeEventListener('pointerleave', this.pointerLeave);
    this.clearModel();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
