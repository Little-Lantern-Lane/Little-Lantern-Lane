// One view of the look test: a renderer, a scene and the characters in it.

import * as THREE from "three";
import { CHARACTER_IDS, CAST, type Expression } from "./cast";
import type { Character } from "./character";
import { VILLAGERS, WALK } from "./layout";
import { makePaperCharacter } from "./paper/character";
import { buildPaperVillage } from "./paper/village";
import { skyTexture, toTexture, addGrain } from "./svg";
import { makeToyCharacter } from "./toy/character";
import { buildToyVillage } from "./toy/village";
import type { Built } from "./world";

export type Style = "paper" | "toy";
export type View = "cast" | "village";
export type Light = "evening" | "day";

export const input = { x: 0, z: 0 };

export class Stage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  private chars: { c: Character; fixed: Expression | null }[] = [];
  private player: Character | null = null;
  private built: Built = { lit: [], glows: [], lamps: [] };
  private hemi = new THREE.HemisphereLight();
  private sun = new THREE.DirectionalLight();
  private last = performance.now();
  private start = performance.now();
  private raf = 0;
  private look = new THREE.Vector3();
  private spin = 0;
  private drag: number | null = null;
  private resizer: ResizeObserver;
  private skies: Record<Light, THREE.Texture>;

  constructor(private host: HTMLElement, private style: Style, private view: View, private light: Light, private feeling: Expression) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Keeps the characters' colours true; filmic curves turned them muddy at dusk.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    host.appendChild(this.renderer.domElement);

    const paper = style === "paper";
    this.skies = {
      evening: skyTexture("#2b3a78", "#8a64a0", "#f6ad7c", false),
      day: skyTexture("#8cc4e8", "#bfe0ee", "#f4ecd2", false),
    };
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = paper ? 2 : 5;
    const sc = this.sun.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 80;

    this.resizer = new ResizeObserver(() => this.resize());
    this.resizer.observe(host);

    const el = this.renderer.domElement;
    if (view === "cast") {
      el.addEventListener("pointerdown", (e) => (this.drag = e.clientX));
      addEventListener("pointerup", this.endDrag);
      addEventListener("pointermove", this.onDrag);
      el.style.cursor = "grab";
    }
  }

  private endDrag = () => (this.drag = null);
  private onDrag = (e: PointerEvent) => {
    if (this.drag === null) return;
    this.spin += (e.clientX - this.drag) * 0.012;
    this.drag = e.clientX;
  };

  private make(id: (typeof CHARACTER_IDS)[number], e: Expression): Character {
    return this.style === "paper" ? makePaperCharacter(id, e) : makeToyCharacter(id, e);
  }

  async build() {
    if (this.view === "village") {
      this.built = this.style === "paper" ? await buildPaperVillage(this.scene) : buildToyVillage(this.scene);
      for (const v of VILLAGERS) {
        const c = this.make(v.id, v.feeling);
        c.root.position.set(v.x, 0, v.z);
        this.scene.add(c.root);
        this.chars.push({ c, fixed: v.feeling });
      }
      this.player = this.make("you", "neutral");
      this.player.root.position.set(-5, 0, 2.6);
      this.scene.add(this.player.root);
      this.chars.push({ c: this.player, fixed: "neutral" });
    } else {
      this.buildCast();
    }
    this.setLight(this.light);
    this.resize();
    this.look.set(this.player?.root.position.x ?? 0, 0, this.player?.root.position.z ?? 0);
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  private buildCast() {
    const paper = this.style === "paper";
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const g = c.getContext("2d")!;
    g.fillStyle = paper ? "#efe2c8" : "#bcd3a4";
    g.fillRect(0, 0, 1024, 1024);
    if (paper) addGrain(c);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ map: toTexture(c), roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Four rows on a raised view, so nobody stands in front of anybody.
    const rows = [CHARACTER_IDS.slice(0, 4), CHARACTER_IDS.slice(4, 7), CHARACTER_IDS.slice(7, 10), CHARACTER_IDS.slice(10)];
    rows.forEach((row, r) => {
      row.forEach((id, i) => {
        const x = (i - (row.length - 1) / 2) * 2.5;
        const z = -7.2 + r * 4.7;
        const ch = this.make(id, this.feeling);
        ch.root.position.set(x, 0, z);
        this.scene.add(ch.root);
        this.chars.push({ c: ch, fixed: null });
        this.scene.add(nameTag(CAST[id].name, x, z + 0.72, paper));
      });
    });
  }

  setFeeling(e: Expression) {
    this.feeling = e;
    for (const { c, fixed } of this.chars) if (!fixed) c.setFeeling(e);
  }

  setLight(l: Light) {
    this.light = l;
    const eve = l === "evening";
    this.scene.background = this.skies[l];
    const cast = this.view === "cast";
    this.hemi.color.set(eve ? "#c6c6f0" : "#fff6e6");
    this.hemi.groundColor.set(eve ? "#8d6f72" : "#b8a98c");
    this.hemi.intensity = eve ? (cast ? 2.3 : 1.9) : 2.1;
    this.sun.color.set(eve ? (cast ? "#ffd9bd" : "#ffb987") : "#fff1d8");
    this.sun.intensity = eve ? (cast ? 2 : 1.5) : 2.4;
    this.sun.position.set(eve ? -14 : -9, eve ? 12 : 20, 18);
    this.scene.fog = this.view === "village" ? new THREE.Fog(eve ? "#7d6aa6" : "#d6e6e6", 40, 110) : null;
    for (const { m, on } of this.built.lit) m.emissiveIntensity = eve ? on : on * 0.12;
    for (const s of this.built.glows) s.visible = eve;
    for (const p of this.built.lamps) p.visible = eve;
  }

  private resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    const t = (now - this.start) / 1000;
    const cam = this.camera;

    if (this.view === "cast") {
      // Far enough back that the whole line-up fits, whatever the panel's shape.
      const half = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const d = Math.max(24, 5.6 / (half * cam.aspect));
      cam.position.set(0, 0.8 + d * 0.42, -0.2 + d * 0.906);
      cam.lookAt(0, 0.8, -0.2);
    } else if (this.player) {
      const p = this.player.root.position;
      const vx = input.x * 6;
      const vz = input.z * 6;
      p.x = THREE.MathUtils.clamp(p.x + vx * dt, WALK.x0, WALK.x1);
      p.z = THREE.MathUtils.clamp(p.z + vz * dt, WALK.z0, WALK.z1);
      this.look.lerp(p, Math.min(1, dt * 4));
      // Pull back in a narrow panel so buildings still fit.
      const k = Math.max(1, 1.55 / cam.aspect);
      cam.position.set(this.look.x, 3 + 5.4 * k, this.look.z - 2 + 19.5 * k);
      cam.lookAt(this.look.x, 3, this.look.z - 2);
      this.sun.target.position.set(this.look.x, 0, this.look.z - 3);
      this.sun.position.x = this.look.x - 14;
    }

    for (const { c } of this.chars) {
      const mine = c === this.player;
      c.update(dt, t, mine ? input.x * 6 : 0, mine ? input.z * 6 : 0, cam.position, this.spin);
    }
    this.renderer.render(this.scene, cam);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizer.disconnect();
    removeEventListener("pointerup", this.endDrag);
    removeEventListener("pointermove", this.onDrag);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function nameTag(name: string, x: number, z: number, paper: boolean): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 72;
  const g = c.getContext("2d")!;
  g.fillStyle = paper ? "#fdf6e6" : "#fbf3e2";
  g.beginPath();
  g.roundRect(4, 4, 248, 64, 20);
  g.fill();
  g.fillStyle = "#3a2a22";
  g.font = "600 38px 'Baloo 2', ui-rounded, system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(name, 128, 38);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.42), new THREE.MeshBasicMaterial({ map: toTexture(c), transparent: true }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.03, z);
  return m;
}
