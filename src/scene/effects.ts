import { BufferAttribute, BufferGeometry, Group, type Material, Mesh, Sprite, SpriteMaterial, type Texture, Vector3 } from 'three';
import { seeded, smooth, type StreamState } from './choreography';

const SEGMENTS = 26;
const RADIAL = 8;
const GRAVITY = 9;

/**
 * A poured stream approximated by a tube along a ballistic path from the
 * container's opening to the receiving surface. `head`/`tail` let it grow from
 * the opening and drain away, entirely as a function of story progress.
 */
export class LiquidStream {
  readonly mesh: Mesh;
  private readonly positions: Float32Array;
  private readonly geometry: BufferGeometry;
  private readonly landing = new Vector3();
  private readonly tangent = new Vector3();
  private readonly normal = new Vector3();
  private readonly binormal = new Vector3();
  private readonly centre = new Vector3();

  constructor(material: Material) {
    this.positions = new Float32Array((SEGMENTS + 1) * RADIAL * 3);
    const index: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      for (let j = 0; j < RADIAL; j++) {
        const a = i * RADIAL + j;
        const b = i * RADIAL + ((j + 1) % RADIAL);
        const c = a + RADIAL;
        const d = b + RADIAL;
        index.push(a, c, b, b, c, d);
      }
    }
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setIndex(index);
    this.mesh = new Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.visible = false;
  }

  /** Returns the landing point while the stream is visible. */
  update(s: StreamState, time: number): Vector3 | null {
    this.mesh.visible = s.on;
    if (!s.on) return null;
    const vx = s.dir[0] * s.speed;
    const vy = s.dir[1] * s.speed;
    const vz = s.dir[2] * s.speed;
    const drop = Math.max(s.start[1] - s.endY, 0.01);
    const tEnd = (vy + Math.sqrt(vy * vy + 2 * GRAVITY * drop)) / GRAVITY;
    const growing = s.head < 1;
    const draining = s.tail > 0;
    for (let i = 0; i <= SEGMENTS; i++) {
      const k = i / SEGMENTS;
      const u = s.tail + (s.head - s.tail) * k;
      const t = u * tEnd;
      this.centre.set(s.start[0] + vx * t, s.start[1] + vy * t - 0.5 * GRAVITY * t * t, s.start[2] + vz * t);
      this.tangent.set(vx, vy - GRAVITY * t, vz).normalize();
      this.normal.set(this.tangent.y, -this.tangent.x, 0);
      if (this.normal.lengthSq() < 1e-6) this.normal.set(1, 0, 0);
      this.normal.normalize();
      this.binormal.crossVectors(this.normal, this.tangent);
      let radius = s.radius * (1 - 0.32 * u) * (1 + 0.07 * Math.sin(u * 20 - time * 12));
      if (draining) radius *= smooth(Math.min(k / 0.16, 1));
      if (growing) radius *= smooth(Math.min((1 - k) / 0.14, 1));
      for (let j = 0; j < RADIAL; j++) {
        const a = (j / RADIAL) * Math.PI * 2;
        const cos = Math.cos(a) * radius;
        const sin = Math.sin(a) * radius;
        const o = (i * RADIAL + j) * 3;
        this.positions[o] = this.centre.x + this.normal.x * cos + this.binormal.x * sin;
        this.positions[o + 1] = this.centre.y + this.normal.y * cos + this.binormal.y * sin;
        this.positions[o + 2] = this.centre.z + this.normal.z * cos + this.binormal.z * sin;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    return this.landing.set(s.start[0] + vx * tEnd, s.endY, s.start[2] + vz * tEnd);
  }
}

/** A few light wisps of steam. Offsets are seeded, so the pattern never jumps between visits. */
export class Steam {
  readonly group = new Group();
  private readonly sprites: Sprite[] = [];
  private readonly seedBase: number;

  constructor(texture: Texture, count: number, seedBase: number) {
    this.seedBase = seedBase;
    for (let i = 0; i < count; i++) {
      const sprite = new Sprite(new SpriteMaterial({ map: texture, color: '#fff7ec', transparent: true, opacity: 0, depthWrite: false }));
      this.sprites.push(sprite);
      this.group.add(sprite);
    }
    this.group.visible = false;
    this.group.renderOrder = 20;
  }

  update(time: number, intensity: number, x: number, y: number, z: number, radius: number, rise: number, size: number): void {
    this.group.visible = intensity > 0.01;
    if (!this.group.visible) return;
    this.sprites.forEach((sprite, i) => {
      const n = this.seedBase + i * 7.3;
      const speed = 0.085 + seeded(n) * 0.05;
      const phase = (time * speed + seeded(n + 1)) % 1;
      const sway = Math.sin(time * 0.6 + i * 1.9) * 0.08 * phase;
      sprite.position.set(x + (seeded(n + 2) - 0.5) * 2 * radius + sway, y + 0.12 + phase * rise, z + (seeded(n + 3) - 0.5) * 2 * radius);
      const s = (0.34 + phase * 0.62) * size;
      sprite.scale.set(s, s * 2.1, 1);
      sprite.material.rotation = (seeded(n + 4) - 0.5) * 0.5 + sway;
      sprite.material.opacity = intensity * Math.pow(Math.sin(Math.PI * phase), 1.3) * 0.55;
    });
  }
}
