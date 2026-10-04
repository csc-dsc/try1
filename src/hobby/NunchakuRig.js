import Matter from 'matter-js';
import * as THREE from 'three';

const { Body, Bodies, Composite, Constraint, Engine } = Matter;
const units = 100;
const handleLength = 164;
const rest = { x: -38, y: -24, angle: -0.16 };

function handleMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.28, roughness: 0.52 });
}

function makeHandle(bodyColor, wrapColor) {
  const handle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.117, handleLength / units, 16), handleMaterial(bodyColor));
  handle.add(body);

  const metal = new THREE.MeshStandardMaterial({ color: 0xc6d4d0, metalness: 0.72, roughness: 0.28 });
  for (const y of [-0.83, 0.83]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.116, 0.116, 0.085, 16), metal);
    cap.position.y = y;
    handle.add(cap);
  }
  const wrap = handleMaterial(wrapColor);
  for (const y of [0.56, 0.64, 0.72]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.025, 16), wrap);
    band.position.y = y;
    handle.add(band);
  }
  const pivot = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.024, 8, 14), metal);
  pivot.position.y = 0.9;
  pivot.rotation.x = Math.PI / 2;
  handle.add(pivot);
  return handle;
}

export class NunchakuRig {
  constructor() {
    this.engine = Engine.create({ gravity: { x: 0, y: 0.75, scale: 0.001 } });
    this.engine.positionIterations = 10;
    this.engine.constraintIterations = 10;
    this.group = new THREE.Group();
    this.group.name = 'NunchakuRig';

    const filter = { group: -1 };
    this.anchor = Bodies.rectangle(rest.x, rest.y, 22, handleLength, {
      isStatic: true, angle: rest.angle, collisionFilter: filter,
    });
    this.follower = Bodies.rectangle(45, 45, 22, handleLength, {
      density: 0.0014, frictionAir: 0.065, restitution: 0, collisionFilter: filter,
    });
    this.links = Array.from({ length: 4 }, (_, index) => Bodies.rectangle(-14 + index * 19, -110 + index * 7, 20, 7, {
      density: 0.001, frictionAir: 0.085, collisionFilter: filter,
    }));

    const constraints = [Constraint.create({
      bodyA: this.anchor, pointA: { x: 0, y: -handleLength / 2 - 7 },
      bodyB: this.links[0], pointB: { x: -10, y: 0 }, length: 3, stiffness: 0.9, damping: 0.12,
    })];
    for (let index = 0; index < this.links.length - 1; index++) {
      constraints.push(Constraint.create({
        bodyA: this.links[index], pointA: { x: 10, y: 0 },
        bodyB: this.links[index + 1], pointB: { x: -10, y: 0 },
        length: 2, stiffness: 0.9, damping: 0.12,
      }));
    }
    constraints.push(Constraint.create({
      bodyA: this.links.at(-1), pointA: { x: 10, y: 0 },
      bodyB: this.follower, pointB: { x: 0, y: -handleLength / 2 - 7 },
      length: 3, stiffness: 0.9, damping: 0.12,
    }));
    Composite.add(this.engine.world, [this.anchor, this.follower, ...this.links, ...constraints]);

    this.anchorMesh = makeHandle(0x39575b, 0x3fa9a2);
    this.followerMesh = makeHandle(0x405257, 0xd65b73);
    this.group.add(this.anchorMesh, this.followerMesh);
    const chainMaterial = new THREE.MeshStandardMaterial({ color: 0xb9cbc8, metalness: 0.8, roughness: 0.25 });
    const chainGeometry = new THREE.TorusGeometry(0.1, 0.023, 8, 14);
    this.linkMeshes = this.links.map(() => {
      const mesh = new THREE.Mesh(chainGeometry, chainMaterial);
      this.group.add(mesh);
      return mesh;
    });

    this.dragTarget = null;
    this.hover = { x: 0, y: 0 };
    this.anchorX = rest.x;
    this.anchorY = rest.y;
    this.anchorAngle = rest.angle;
    this.loopElapsed = 0;
    this.loopDirection = 1;
    for (let index = 0; index < 75; index++) Engine.update(this.engine, 1000 / 60);
    this.syncMeshes();
    this.replay();
  }

  hoverAt(x, y) {
    this.hover.x = Math.max(-1, Math.min(1, x));
    this.hover.y = Math.max(-1, Math.min(1, y));
  }

  dragBy(dx, dy) {
    this.dragTarget = {
      x: rest.x + Math.max(-125, Math.min(125, dx * 0.8)),
      y: rest.y + Math.max(-95, Math.min(115, dy * 0.65)),
      angle: rest.angle + Math.max(-0.43, Math.min(0.43, dx / 240)),
    };
  }

  release() { this.dragTarget = null; this.loopElapsed = 0; }

  replay() {
    Body.applyForce(this.follower, this.follower.position, { x: 0.02 * this.loopDirection, y: -0.026 });
    this.loopDirection *= -1;
  }

  update(delta, simulate = true) {
    const target = this.dragTarget ?? {
      x: rest.x + this.hover.x * 14,
      y: rest.y + this.hover.y * 8,
      angle: rest.angle + this.hover.x * 0.09,
    };
    const pursuit = 1 - Math.exp(-delta * 10);
    this.anchorX += (target.x - this.anchorX) * pursuit;
    this.anchorY += (target.y - this.anchorY) * pursuit;
    this.anchorAngle += (target.angle - this.anchorAngle) * pursuit;
    Body.setPosition(this.anchor, { x: this.anchorX, y: this.anchorY });
    Body.setAngle(this.anchor, this.anchorAngle);
    if (simulate) {
      Engine.update(this.engine, Math.min(delta, 1 / 30) * 1000);
      if (!this.dragTarget) {
        this.loopElapsed += delta;
        if (this.loopElapsed >= 5.8) { this.loopElapsed -= 5.8; this.replay(); }
      }
    }
    this.syncMeshes();
  }

  syncMeshes() {
    for (const [body, mesh] of [[this.anchor, this.anchorMesh], [this.follower, this.followerMesh]]) {
      mesh.position.set(body.position.x / units, -body.position.y / units, 0);
      mesh.rotation.z = -body.angle;
    }
    for (let index = 0; index < this.links.length; index++) {
      const body = this.links[index];
      const mesh = this.linkMeshes[index];
      mesh.position.set(body.position.x / units, -body.position.y / units, 0);
      mesh.rotation.z = -body.angle;
    }
  }

  getHandleGap() {
    const a = Matter.Vector.add(this.anchor.position, Matter.Vector.rotate({ x: 0, y: -handleLength / 2 - 7 }, this.anchor.angle));
    const b = Matter.Vector.add(this.follower.position, Matter.Vector.rotate({ x: 0, y: -handleLength / 2 - 7 }, this.follower.angle));
    return Matter.Vector.magnitude(Matter.Vector.sub(a, b)) / units;
  }

  getMotion() { return (this.anchorX - rest.x) / units; }

  dispose() {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
