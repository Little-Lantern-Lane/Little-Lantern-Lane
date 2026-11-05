// The walkable 3D world. Presentation and input only: it reads WorldState, tells the director
// when the player reaches something the story offered, and runs the movement challenges.
// Game rules stay in src/logic, and every position comes from src/game/layout.ts.

import * as THREE from "three";
import type { StoryChoice } from "../engine";
import { CHARACTER_IDS, talkGroup, type CharacterId, type Expression } from "../logic/cast";
import { heldHeadUp } from "../logic/outcome";
import type { HotspotId } from "../logic/facts";
import { hasRoom, type HomeChoice } from "../logic/appearance";
import type { WorldState } from "../logic/world";
import type { Sound } from "../audio/sound";
import { pickBark } from "../game/barks";
import {
  AREAS, areaAt, DOORS, FISHING_SPOTS, FOUNTAIN_X, GROUND_Y, HOOKS, INTERACT_RANGE, laneBlocked, NPC_SPOTS, phaseOf,
  NODES, PLAYER_SPOTS, PROPS, regionAt, REGIONS, SHED_ITEMS, USABLES, VIEW_H, WORLD_W, WOODS, woodsAreaAt, woodsLimit, ZONES, type Area, type GatherNode, type Region,
} from "../game/layout";
import { makeFigure } from "./figure";
import { ball, cyl, glowing, lantern, LANTERN_COLOURS, own, soft } from "./kit";
import { sight } from "./kit";
import { buildCoast } from "./regions/coast";
import { buildHouse, type HouseKit } from "./regions/house";
import { buildWoods, type WoodsKit } from "./regions/woods";
import { buildRoom, type RoomKit } from "./regions/rooms";
import { furnitureModel } from "./furniture";
import { homeColours } from "./regions/home3d";
import { FURNITURE, ROOMS, type Placed, type RoomId } from "../logic/furniture";
import { fishFor, ITEMS, type BagState, type ItemId } from "../logic/bag";
import { buildMill } from "./regions/mill";
import { buildVillage, VILLAGE_Z } from "./regions/village";
import { buildWorkshop } from "./regions/workshop";
import { at, bandAt, gameX, groundH, regionZ, SCALE, worldX } from "./space";
import type { Blocker, Figure, LightSpot, RegionKit } from "./types";

type Npc = Exclude<CharacterId, "you">;
const NPCS = CHARACTER_IDS.filter((id): id is Npc => id !== "you");

/** Which check-the-facts detail frees each villager from the shame lens. */
const NPC_FACT: Partial<Record<Npc, HotspotId>> = { tobin: "tobin", wren: "bakers", oda: "bakers", pip: "kids", juno: "kids", mara: "mara" };

const WALK_SPEED = 270;
const PULL_DRIFT = 70;
const ACROSS_SPEED = WALK_SPEED / SCALE;
/** How far across the path you can be from something and still reach it. */
const REACH_ACROSS = 3.6;
const TIDE_SECONDS = 38;
const TIDE_TOP = GROUND_Y - 150;
/** Hook of the red lantern the kids call the brightest. */
const BRIGHTEST = 11;
/** Across-the-path line of the lantern string in the Square. */
const STRING_Z = -1.5;
const MAX_LIGHTS = 6;

export interface TideResult {
  saved: string[];
  fought: number;
}
export interface ApproachResult {
  reached: boolean;
  headUp: boolean;
  turnedBack: boolean;
}
export interface SceneHooks {
  sound: Sound;
  onArea(area: Area): void;
  onAction(label: string | null, run: (() => void) | null): void;
  touch: boolean;
  onApproachEvent(name: string, arg?: string): void;
  /** What you're carrying, for tools. */
  bag(): BagState;
  /** You picked something, or landed a fish. */
  onGather(item: ItemId, fish: boolean): void;
  /** You walked up to the stall by the woods gate. */
  onStall(): void;
}

/** Light and sky for one mood of the day. */
interface Sky {
  top: string; mid: string; low: string;
  hemi: string; ground: string; hemiI: number;
  sun: string; sunI: number; fog: string;
}
const SKY: Record<string, Sky> = {
  afternoon: { top: "#8cc4e8", mid: "#bfe0ee", low: "#f4ecd2", hemi: "#fff6e6", ground: "#b8a98c", hemiI: 2.1, sun: "#fff1d8", sunI: 2.4, fog: "#d6e6e6" },
  sunset: { top: "#2b3a78", mid: "#8a64a0", low: "#f6ad7c", hemi: "#c6c6f0", ground: "#8d6f72", hemiI: 1.9, sun: "#ffb987", sunI: 1.6, fog: "#7d6aa6" },
  night: { top: "#0e1336", mid: "#1c2452", low: "#3a3468", hemi: "#8f98d0", ground: "#4a4260", hemiI: 1.25, sun: "#aab6e4", sunI: 0.45, fog: "#1c2452" },
  morning: { top: "#a8c6e0", mid: "#dfe3e6", low: "#f8e6cf", hemi: "#f4f0ec", ground: "#a79f90", hemiI: 1.9, sun: "#ffe6c8", sunI: 1.8, fog: "#dfe3e6" },
  storm: { top: "#1b2236", mid: "#2f3a52", low: "#4a5468", hemi: "#b0b8c8", ground: "#565c68", hemiI: 1.7, sun: "#b8c4d8", sunI: 0.7, fog: "#2f3a52" },
  "winter-sunset": { top: "#44508e", mid: "#a68bb6", low: "#f6c6a2", hemi: "#d8d8f4", ground: "#a79fb8", hemiI: 2, sun: "#ffc8a0", sunI: 1.5, fog: "#a68bb6" },
  "winter-night": { top: "#0e1436", mid: "#1f2a58", low: "#3f4a7a", hemi: "#bcc4e4", ground: "#5a6390", hemiI: 1.6, sun: "#b8c8f4", sunI: 0.8, fog: "#1f2a58" },
  "winter-dawn": { top: "#9fb8dc", mid: "#e4dee8", low: "#fbe2d0", hemi: "#f4f0f6", ground: "#c8c8d8", hemiI: 2, sun: "#ffdcc0", sunI: 1.8, fog: "#e4dee8" },
  coast: { top: "#7cc0e4", mid: "#c4e6ee", low: "#f6efd8", hemi: "#fff8ec", ground: "#b8b09a", hemiI: 2.1, sun: "#fff4dc", sunI: 2.4, fog: "#cfe6ea" },
  "coast-dusk": { top: "#34447e", mid: "#a06c98", low: "#f8b078", hemi: "#ccc8ee", ground: "#8f7a78", hemiI: 1.9, sun: "#ffb080", sunI: 1.5, fog: "#a06c98" },
  mill: { top: "#9ccce4", mid: "#d4e8e0", low: "#f6eccc", hemi: "#fff6e4", ground: "#a8a988", hemiI: 2, sun: "#ffefd0", sunI: 2.1, fog: "#d4e8e0" },
  farbank: { top: "#6f8fc4", mid: "#a9c4d8", low: "#d9e4dc", hemi: "#d8e4f4", ground: "#7f9a98", hemiI: 2, sun: "#e4e8ff", sunI: 1.7, fog: "#a9c4d8" },
  indoor: { top: "#1e1712", mid: "#1e1712", low: "#1e1712", hemi: "#fff0dc", ground: "#a48c70", hemiI: 2.1, sun: "#ffe6c4", sunI: 1.3, fog: "#1e1712" },
};

const isExtraRoom = (id: Region["id"]) => id === "bedroom" || id === "sitting" || id === "cellar";

/** The sky to show: by chapter, place, weather and time of day. */
function skyFor(w: WorldState, x: number, z = 0): string {
  const region = regionAt(x).id;
  const area = region === "woods" ? woodsAreaAt(x, z).id : areaAt(x).id;
  if (region === "workshop" || region === "home" || isExtraRoom(region) || area === "teashop" || (region === "coast" && x >= 12900)) return "indoor";
  if (w.weather === "storm") return "storm";
  if (w.level === 5) return w.time === "morning" ? "winter-dawn" : w.time === "night" ? "winter-night" : "winter-sunset";
  if (area === "farbank" && (w.time === "morning" || w.time === "afternoon")) return "farbank";
  if (region === "coast") return w.time === "sunset" || w.time === "night" ? "coast-dusk" : "coast";
  if (region === "mill" && w.time === "morning") return "mill";
  return w.time in SKY ? w.time : "afternoon";
}

/** How dark it is, 0..1: the same rules as the 2D game's darkness. */
function darknessOf(w: WorldState, region: Region["id"]): number {
  const festival = w.time === "night" && w.lanterns === "hung" && w.level <= 3;
  let a = w.time === "night" ? (festival ? 0.72 - w.squareLight * 0.2 + (w.weather === "storm" ? 0.1 : 0) : 0.8) : w.form === "shell" ? 0.35 : w.time === "sunset" ? 0.2 : 0;
  if (w.level === 4 && w.time === "night") a = 0.5;
  // The power cut in chapter five; any other evening the house is lit and the stove's going.
  if (region === "home") a = w.level !== 5 ? (w.time === "night" ? 0.25 : 0) : w.time === "night" ? 0.72 : w.time === "sunset" ? 0.3 : a;
  if (region === "coast" && w.time === "sunset") a = 0.22;
  if (region === "woods") a = Math.min(a, 0.5); // the moon gets through the trees
  if (isExtraRoom(region)) a = w.level === 5 && w.time === "night" ? 0.6 : w.time === "night" ? 0.25 : 0;
  return a;
}

interface Target {
  choice: StoryChoice;
  x: number;
  z: number;
  label: string;
  auto: boolean;
}

interface Person {
  fig: Figure;
  x: number;
  z: number;
  here: boolean;
  bubble: HTMLElement;
  bark: HTMLElement;
  barkedAt: number;
  barkUntil: number;
  heading: number;
}

/** Each villager's usual place across the path, so a crowd doesn't stand in a line. */
function acrossOf(id: Npc, x: number): number {
  const [back, front] = bandAt(x);
  const k0 = (id.charCodeAt(0) * 7 + id.charCodeAt(1) * 3) % 10 / 10;
  // Standing on the bridge, not beside it.
  if (x > WOODS.river0 - 40 && x < WOODS.river1 + 40) return (k0 - 0.5) * 1.6;
  const k = (id.charCodeAt(0) * 7 + id.charCodeAt(1) * 3) % 10 / 10;
  // Near the front of the fountain's reach; never in it.
  const near = Math.max(back + 0.8, x >= 2410 && x <= 2690 ? -0.6 : -2.4);
  return near + k * Math.min(3.2, front - near - 0.8);
}

const doorZ = (d: (typeof DOORS)[number]) => d.z ?? bandAt(d.x)[0];

/** How long fishing's moments last, in seconds. */
const FISH = { settle: [2.5, 5], nibble: 1.1, lull: [2, 4], pull: 1.3 } as const;
/** How long something takes to grow back after you pick it. */
const REGROW = 80;
const between = ([a, b]: readonly [number, number]) => a + Math.random() * (b - a);

interface Fishing {
  spot: (typeof FISHING_SPOTS)[number];
  stage: "settle" | "nibble" | "lull" | "pull";
  until: number;
}

const lerpColor = (a: THREE.Color, b: string, t: number) => a.lerp(new THREE.Color(b), t);

export class World3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 400);
  private hemi = new THREE.HemisphereLight();
  private sun = new THREE.DirectionalLight();
  private fill = new THREE.DirectionalLight("#ffe8d0", 0);
  private lamps: THREE.PointLight[] = [];
  private carriedLight = new THREE.PointLight("#ffbe78", 0, 11, 1.6);
  private kits: Record<Region["id"], RegionKit>;
  private house: HouseKit;
  private woods: WoodsKit;
  private rooms: Record<"bedroom" | "sitting" | "cellar", RoomKit>;
  private homeNow: HomeChoice;
  /** Furniture in the rooms, and the solid part of each. */
  private pieces: { room: RoomId; mesh: THREE.Group; block: Blocker | null }[] = [];
  /** Picked things and when they'll be back. */
  private regrowing = new Map<GatherNode, number>();
  private fishing: Fishing | null = null;
  /** How far the camera has been turned around you, in the woods. */
  private camYaw = 0;
  private camYawGoal = 0;
  private float = new THREE.Group();
  private ripple = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 28), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0 }));
  private fishLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: "#f4efe4" }));
  private rod = new THREE.Group();
  private village: ReturnType<typeof buildVillage>;
  private coast: ReturnType<typeof buildCoast>;

  // Sky, drawn to a small canvas and eased between moods.
  private skyCanvas = document.createElement("canvas");
  private skyTexture: THREE.CanvasTexture;
  private skyNow = { top: new THREE.Color(), mid: new THREE.Color(), low: new THREE.Color() };
  private skyKey = "";
  private skyTarget: Sky = SKY.afternoon;
  private skyEase = 1;

  // The player
  private you: Figure;
  private px = 600;
  private pz = 1;
  private heading = 0;
  private carry = new THREE.Group();
  private stack = new THREE.Group();
  private candle = new THREE.Group();
  private shell = new THREE.Group();
  private walking = false;
  private stepClock = 0;

  private people = new Map<Npc, Person>();

  // Lanterns on the string in the Square
  private hookLanterns: { g: THREE.Group; mat: THREE.MeshStandardMaterial; tied: boolean; shown: boolean; pop: number; lit: number }[] = [];
  private hookMarkers: THREE.Mesh[] = [];
  private hookSpots: LightSpot[] = [];
  private heap = new THREE.Group();
  private scatter = new THREE.Group();
  private laneFog: THREE.Mesh;

  // Weather and effects
  private rain: THREE.Points;
  private snow: THREE.Points;
  private sparks: { p: THREE.Points; v: Float32Array; age: number }[] = [];
  private tweens: { t: number; dur: number; fn: (k: number) => void }[] = [];

  // Overlays
  private root: HTMLElement;
  private promptEl: HTMLButtonElement;
  private vignette: HTMLElement;
  private fade: HTMLElement;

  // Input and state
  private keys = new Set<string>();
  private world: WorldState;
  private locked = true;
  private targets: Target[] = [];
  private insideZones = new Set<string>();
  private onPick: ((c: StoryChoice) => void) | null = null;
  private moveTo: { x: number; z: number; since: number } | null = null;
  private pendingAction: (() => void) | null = null;
  private promptAction: (() => void) | null = null;
  private promptAt: [number, number, number] | null = null;
  private actionLabel: string | null = null;
  private hookAction: (() => void) | null = null;
  private tideAction: (() => void) | null = null;
  private approaching = false;
  private hanging = false;
  private tiding = false;
  private headUpButton = false;
  private area: Area = AREAS[0];
  private region: Region = REGIONS[0];
  private lastLocation: WorldState["location"] | null = null;
  private lastLevel = 1;
  private feel = 0;
  private feelTarget = 0;
  private lastBark = -99999;
  private unlockedAt = 0;
  private gust = 0;
  private shake = 0;
  private time = 0;
  private lastFrame = performance.now();
  private lightClock = 0;
  private slowFrames = 0;
  private frames = 0;
  private lookAt = new THREE.Vector3();
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private raf = 0;
  private tick: ((dt: number) => void) | null = null;
  private ray = new THREE.Raycaster();
  private resizer: ResizeObserver;

  constructor(parent: HTMLElement, private hooks: SceneHooks, world: WorldState, home: HomeChoice) {
    this.world = world;
    this.root = parent;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    parent.appendChild(this.renderer.domElement);

    this.skyCanvas.width = 4;
    this.skyCanvas.height = 256;
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = this.skyTexture;
    this.scene.fog = new THREE.Fog("#d6e6e6", 44, 130);

    this.scene.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target, this.carriedLight);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 4;
    const sc = this.sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 90;
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = new THREE.PointLight("#ffb56a", 0, 13, 1.7);
      this.lamps.push(l);
      this.scene.add(l);
    }

    // Every place is built once; only the one you're in is shown.
    this.village = buildVillage({ home });
    this.house = buildHouse(home);
    this.coast = buildCoast();
    this.woods = buildWoods();
    this.homeNow = home;
    this.rooms = { bedroom: buildRoom("bedroom", home), sitting: buildRoom("sitting", home), cellar: buildRoom("cellar", home) };
    this.kits = { village: this.village, workshop: buildWorkshop(), home: this.house, mill: buildMill(), coast: this.coast, woods: this.woods, ...this.rooms };
    for (const k of Object.values(this.kits)) {
      k.group.visible = false;
      this.scene.add(k.group);
    }

    this.buildFishing();
    this.placeFurniture();
    this.buildLanterns();
    this.laneFog = this.makeLaneFog();
    this.rain = this.makeFall(900, "#b8c8e0", 0.09);
    this.snow = this.makeFall(700, "#ffffff", 0.16);

    // The player and what they carry
    this.you = makeFigure("you", "neutral");
    this.scene.add(this.you.root);
    this.you.root.add(this.carry, this.rod);
    for (let i = 0; i < 3; i++) {
      const b = ball(0.26, soft(LANTERN_COLOURS[i]), 0, 0.2 + i * 0.36, 0, 0.8);
      this.stack.add(b);
    }
    this.stack.position.set(0, 0.62, 0.62);
    this.candle.add(cyl(0.13, 0.13, 0.28, own("#d8ecf0", { transparent: true, opacity: 0.55, roughness: 0.2 }), 0, 0.14, 0, 14), cyl(0.05, 0.05, 0.16, soft("#fbf3e2"), 0, 0.1, 0, 10), ball(0.05, glowing("#ffc66a", 3), 0, 0.23, 0, 1.5));
    this.candle.position.set(0.72, 0.5, 0.2);
    this.carry.add(this.stack, this.candle);
    this.shell.add(ball(0.92, soft("#b9a488"), 0, 0.68, 0, 0.82), ball(0.7, soft("#a58e72"), 0.14, 0.8, 0.28, 0.72), ball(0.42, soft("#8f795e"), 0.26, 0.92, 0.55, 0.72));
    this.shell.visible = false;
    this.scene.add(this.shell);

    for (const id of NPCS) {
      const fig = makeFigure(id, "neutral");
      fig.root.visible = false;
      this.scene.add(fig.root);
      const bubble = this.label("bubble");
      bubble.textContent = "…";
      bubble.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        const p = this.people.get(id)!;
        this.walkToAndInteract(p.x, p.z);
      });
      const bark = this.label("bark");
      this.people.set(id, { fig, x: 0, z: 0, here: false, bubble, bark, barkedAt: -99999, barkUntil: 0, heading: 0 });
    }

    // Overlays
    this.promptEl = document.createElement("button");
    this.promptEl.className = "world-prompt";
    this.promptEl.hidden = true;
    this.promptEl.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.promptAction?.();
    });
    parent.appendChild(this.promptEl);
    this.vignette = document.createElement("div");
    this.vignette.className = "world-vignette";
    this.fade = document.createElement("div");
    this.fade.className = "world-fade";
    parent.append(this.vignette, this.fade);

    addEventListener("keydown", this.onKeyDown);
    addEventListener("keyup", this.onKeyUp);
    addEventListener("blur", this.onBlur);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointer);
    this.resizer = new ResizeObserver(() => this.resize());
    this.resizer.observe(parent);
    this.resize();

    this.px = world.level === 1 ? 600 : PLAYER_SPOTS[world.location];
    this.applyState(world);
    this.teleport(this.px);
    this.lastLocation = world.location;
    this.lastLevel = world.level;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  private label(kind: string): HTMLElement {
    const el = document.createElement("div");
    el.className = `world-${kind}`;
    el.hidden = true;
    this.root.appendChild(el);
    return el;
  }

  private buildFishing() {
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), new THREE.MeshStandardMaterial({ color: "#e9583c", roughness: 0.5 }));
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#fffaf0", roughness: 0.5 }));
    white.position.y = 0.01;
    this.float.add(red, white);
    this.ripple.rotation.x = Math.PI / 2;
    this.fishLine.frustumCulled = false;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.035, 2.6, 7), new THREE.MeshStandardMaterial({ color: "#8a6a4a", roughness: 0.7 }));
    pole.position.set(0.5, 1.45, 0.9);
    pole.rotation.x = 1;
    this.rod.add(pole);
    for (const o of [this.float, this.ripple, this.fishLine, this.rod]) o.visible = false;
    this.scene.add(this.float, this.ripple, this.fishLine);
  }

  private buildLanterns() {
    HOOKS.forEach((h, i) => {
      const color = i === BRIGHTEST ? "#d9473f" : LANTERN_COLOURS[i % 6];
      const mat = own(color, { emissive: color, emissiveIntensity: 0, roughness: 0.6 });
      const g = lantern(mat);
      const y = (GROUND_Y - h.y) / SCALE;
      g.position.set(...at(h.x, STRING_Z, y));
      if (i === BRIGHTEST) g.scale.setScalar(1.25);
      g.visible = false;
      this.kits.village.group.add(g);
      this.hookLanterns.push({ g, mat, tied: false, shown: false, pop: 1, lit: 0 });
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: "#fff3c4" }));
      marker.position.set(...at(h.x, STRING_Z, y - 0.2));
      marker.visible = false;
      this.kits.village.group.add(marker);
      this.hookMarkers.push(marker);
      this.hookSpots.push({ pos: at(h.x, STRING_Z + 0.5, y - 0.9), color: "#ffb56a", power: i === BRIGHTEST ? 30 : 18, on: () => false });
    });
    // The string itself
    const pts = HOOKS.map((h) => new THREE.Vector3(...at(h.x, STRING_Z, (GROUND_Y - h.y) / SCALE)));
    this.kits.village.group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.022, 6), soft("#4a3a30")));
    // A heap by the fountain, and lanterns scattered where they fell
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4;
      this.heap.add(ball(0.28, soft(LANTERN_COLOURS[i % 6]), Math.cos(a) * 0.5 * (i % 3), 0.24 + Math.floor(i / 5) * 0.3, Math.sin(a) * 0.4 * (i % 3), 0.85));
      const s = ball(0.28, soft(LANTERN_COLOURS[i % 6]), Math.cos(a) * (1 + (i % 4) * 0.8), 0.2, Math.sin(a) * (0.8 + (i % 3) * 0.7), 0.8);
      s.rotation.z = a;
      this.scatter.add(s);
    }
    this.heap.position.set(...at(USABLES.heap.x, 1.4));
    this.scatter.position.set(...at(FOUNTAIN_X + 10, 2.4));
    this.kits.village.group.add(this.heap, this.scatter);
  }

  /** Darkness over the lane: solid, then fading out toward Market Street. */
  private makeLaneFog(): THREE.Mesh {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 4;
    const g = c.getContext("2d")!;
    const r = g.createLinearGradient(0, 0, 256, 0);
    r.addColorStop(0, "rgba(5,6,26,.97)");
    r.addColorStop(0.72, "rgba(5,6,26,.92)");
    r.addColorStop(1, "rgba(5,6,26,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const w = 1500 / SCALE;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 40), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    m.position.set(1250 / SCALE - w / 2, 10, 7);
    m.renderOrder = 5;
    this.kits.village.group.add(m);
    return m;
  }

  private makeFall(n: number, color: string, size: number): THREE.Points {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = Math.random() * 18;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.8, depthWrite: false }));
    p.frustumCulled = false;
    p.visible = false;
    this.scene.add(p);
    return p;
  }

  // --- Called by the director ------------------------------------------------

  applyState(w: WorldState) {
    this.world = w;
    if (w.location !== this.lastLocation || w.level !== this.lastLevel) {
      if (this.lastLocation !== null) this.teleport(PLAYER_SPOTS[w.location]);
      this.lastLocation = w.location;
      this.lastLevel = w.level;
    }
    for (const k of Object.values(this.kits)) k.setState(w);
    this.setSky(skyFor(w, this.px, this.pz));
    const storm = w.weather === "storm";
    this.rain.visible = storm && this.region.id === "village";
    this.snow.visible = w.weather === "snow" && (this.region.id === "village" || this.region.id === "woods");

    this.stack.visible = w.lanterns === "carried" && w.form === "person";
    this.scatter.visible = w.lanterns === "scattered";
    this.heap.visible = w.lanterns === "heaped";

    const night = w.time === "night";
    this.hookLanterns.forEach((l, i) => {
      if (!this.hanging) l.g.visible = l.shown = w.lanterns === "hung" && i >= w.lanternsLost;
      const lit = night && i < w.lanternsHung && w.lanterns === "hung" && i >= w.lanternsLost;
      l.lit = lit ? (i === BRIGHTEST ? 0.6 : 0.3) : 0;
      this.hookSpots[i].on = () => lit && (i % 2 === 0 || i === BRIGHTEST);
      if (i === BRIGHTEST && w.heirloom !== "whole") l.mat.color.set(w.heirloom === "mended" ? "#e0604f" : "#9a4a42");
    });

    const person = w.form === "person";
    this.you.root.visible = person;
    this.shell.visible = !person;
    this.candle.visible = w.hasLight && person;
    this.you.setFeeling(this.playerFace(w));
    this.you.setPosture(w.posture === "slumped" ? 0.94 : w.posture === "upright" ? 1.04 : 1);

    const flashback = w.lens === "shame";
    const spots = NPC_SPOTS[phaseOf(w, this.approaching)];
    for (const [id, p] of this.people) {
      const moved = w.placed[id];
      const x = moved === null ? undefined : moved ?? spots[id];
      p.here = x !== undefined;
      p.fig.root.visible = p.here;
      if (x === undefined) continue;
      p.x = x;
      p.z = acrossOf(id, x);
      p.fig.root.position.set(...at(x, p.z));
      const fact = NPC_FACT[id];
      const pointing = flashback && fact !== undefined && !w.factsFound.includes(fact);
      p.fig.setFeeling(w.faces[id] ?? "neutral");
      p.fig.setPointing(pointing);
      p.fig.setTint(pointing ? "#d9a0a0" : null);
      p.heading = pointing ? this.headingTo(p) : 0;
      p.fig.face(p.heading);
    }
    this.hooks.sound.setMood(this.moodFor(w));
  }

  private headingTo(p: Person): number {
    return Math.atan2(worldX(this.px) - worldX(p.x), this.pz - p.z);
  }

  /** Offer story choices that live in the world. Picking one calls onPick. */
  setTargets(choices: StoryChoice[], onPick: (c: StoryChoice) => void) {
    this.targets = [];
    for (const c of choices) {
      const t = c.target;
      if (!t) continue;
      if (t.kind === "talk") {
        for (const id of [t.id, ...talkGroup(t.id)] as Npc[]) {
          const p = this.people.get(id);
          if (p?.here) this.targets.push({ choice: c, x: p.x, z: p.z, label: `Talk to ${c.text.replace(/^(Talk to|Ask) /, "")}`, auto: false });
        }
      } else if (t.kind === "use") {
        const u = USABLES[t.id];
        if (u) this.targets.push({ choice: c, x: u.x, z: Math.max(bandAt(u.x)[0] + 0.6, -1.2), label: c.text, auto: false });
      } else {
        const z = ZONES[t.id];
        if (z) this.targets.push({ choice: c, x: (z.x0 + z.x1) / 2, z: 0, label: c.text, auto: z.auto });
      }
    }
    this.onPick = onPick;
    this.insideZones = new Set(Object.keys(ZONES).filter((id) => this.inZone(id)));
    this.refreshBubbles();
  }

  private inZone(id: string) {
    const z = ZONES[id];
    return this.px >= z.x0 && this.px <= z.x1;
  }

  clearTargets() {
    this.targets = [];
    this.onPick = null;
    this.refreshBubbles();
    this.hidePrompt();
  }

  setLocked(locked: boolean) {
    if (this.locked && !locked) this.unlockedAt = this.time;
    this.locked = locked;
    if (locked) {
      this.moveTo = null;
      this.hidePrompt();
    }
  }

  setHeadUp(on: boolean) {
    this.headUpButton = on;
  }

  /** Open or close a character's mouth while their line is being typed out. */
  setMouth(id: CharacterId, open: boolean) {
    if (id === "you") this.you.setMouth(open);
    else this.people.get(id as Npc)?.fig.setMouth(open);
  }

  /** How bad it feels right now (the meter's distress, 0..100). */
  setFeeling(distress: number) {
    this.feelTarget = THREE.MathUtils.clamp((distress - 25) / 60, 0, 1);
  }

  /** Face a character the player just started talking to. */
  faceCharacter(id: CharacterId) {
    const p = this.people.get(id as Npc);
    if (!p) return;
    p.heading = this.headingTo(p);
    p.fig.face(p.heading);
    this.heading = Math.atan2(worldX(p.x) - worldX(this.px), p.z - this.pz);
    this.you.face(this.heading);
  }

  /** Which room you're standing in, if you're inside your home. */
  roomHere(): RoomId | null {
    return (ROOMS as readonly string[]).includes(this.region.id) ? (this.region.id as RoomId) : null;
  }

  /** The spot just in front of you, for putting something down. */
  spotAhead(): { x: number; z: number; turn: number } {
    const [back, front] = bandAt(this.px);
    const x = THREE.MathUtils.clamp(this.px + Math.sin(this.heading) * 1.7 * SCALE, this.region.min + 30, this.region.max - 30);
    const z = THREE.MathUtils.clamp(this.pz + Math.cos(this.heading) * 1.7, back + 0.3, front - 0.1);
    return { x, z, turn: Math.round(this.heading / (Math.PI / 2)) };
  }

  /** Stand every piece of furniture where it's been put. */
  private placeFurniture() {
    for (const p of this.pieces) {
      this.kits[p.room].group.remove(p.mesh);
      p.mesh.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      if (p.block) {
        const list = this.kits[p.room].blockers;
        list.splice(list.indexOf(p.block), 1);
      }
    }
    const colours = homeColours(this.homeNow);
    this.pieces = this.homeNow.furniture.placed.map((f: Placed) => {
      const mesh = furnitureModel(f.id, colours);
      mesh.position.set(...at(f.x, f.z));
      mesh.rotation.y = (f.turn * Math.PI) / 2;
      this.kits[f.room].group.add(mesh);
      const [X, , Z] = at(f.x, f.z);
      const r = FURNITURE[f.id].r;
      const block = r ? { X, Z, r } : null;
      if (block) this.kits[f.room].blockers.push(block);
      return { room: f.room, mesh, block };
    });
  }

  /** Put the player back together after a change of clothes. */
  refreshLook() {
    this.scene.remove(this.you.root);
    this.you = makeFigure("you", "neutral");
    this.scene.add(this.you.root);
    this.you.root.add(this.carry, this.rod);
    this.applyState(this.world);
  }

  refreshHome(home: HomeChoice): Promise<void> {
    this.homeNow = home;
    this.village.refreshHome(home);
    this.house.refreshHome(home);
    this.house.setState(this.world);
    for (const r of Object.values(this.rooms)) {
      r.refreshHome(home);
      r.setState(this.world);
    }
    this.placeFurniture();
    return Promise.resolve();
  }

  /** Walk back to Mara while the pull to hide drags toward the hollow. */
  runApproach(): Promise<ApproachResult> {
    this.approaching = true;
    this.applyState(this.world);
    this.teleport(3150);
    const mara = this.people.get("mara")!;
    const startX = this.px;
    let walk = 0;
    let headUp = 0;
    let stillAtEdge = 0;
    let milestones = 0;
    let wasUp = false;
    let beat = 0;
    this.setLocked(false);
    return new Promise((resolve) => {
      const finish = (r: ApproachResult) => {
        this.tick = null;
        this.approaching = false;
        this.hookAction = null;
        this.hidePrompt();
        this.setLocked(true);
        this.applyState(this.world);
        resolve(r);
      };
      const stay = () => {
        if (stillAtEdge > 2.5) finish({ reached: false, headUp: heldHeadUp(headUp, walk), turnedBack: false });
      };
      this.hookAction = stay;
      this.tick = (dt) => {
        const up = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.headUpButton;
        const left = this.held("left") || (this.moveTo !== null && this.moveTo.x < this.px - 10);
        const right = this.held("right") || (this.moveTo !== null && this.moveTo.x > this.px + 10);
        if (up !== wasUp) {
          wasUp = up;
          this.hooks.onApproachEvent("posture", up ? "up" : "down");
          if (up && milestones === 0) {
            milestones = 1;
            this.hooks.onApproachEvent("oa_step");
          }
        }
        // Behind the cart at the edge of the square the pull is weak, so you can choose to stay there.
        const sheltered = this.px > 2980 && this.px < 3250;
        let vx = PULL_DRIFT * (sheltered ? 0.15 : 1.6);
        if (left) {
          vx -= up ? 330 : 190;
          walk += dt;
          if (up) headUp += dt;
        } else if (right) vx += 160;
        this.px = THREE.MathUtils.clamp(this.px + vx * dt, 2100, WORLD_W - 60);
        // The way back runs straight to Mara.
        this.pz += (mara.z - this.pz) * Math.min(1, dt * 0.8);
        this.walking = left || right;
        this.heading = left ? -Math.PI / 2 : Math.PI / 2;
        this.you.move(this.walking ? Math.abs(vx) / SCALE : 0, this.heading);

        const progress = (startX - this.px) / (startX - (mara.x + 90));
        if (progress > 0.4 && milestones < 2) {
          milestones = 2;
          this.hooks.onApproachEvent("oa_step");
        }
        beat -= dt;
        if (beat <= 0) {
          this.hooks.sound.play("heartbeat", { volume: 0.5 + progress * 0.5 });
          beat = up ? 0.55 : 0.8;
        }
        if (!left && !right && this.px > 2980 && this.px < 3250) stillAtEdge += dt;
        else stillAtEdge = 0;
        if (stillAtEdge > 2.5) this.showPrompt(at(this.px, this.pz), "Stay here, at the edge", stay);
        else this.showPrompt(at(mara.x, mara.z), up ? "Keep going" : this.hooks.touch ? "Hold Head up" : "Hold Shift: head up");

        if (this.px <= mara.x + 90) finish({ reached: true, headUp: heldHeadUp(headUp, walk), turnedBack: false });
        else if (this.px >= ZONES.hollow.x0) finish({ reached: false, headUp: false, turnedBack: true });
      };
    });
  }

  /** Hang lanterns on each hook along the string. */
  runHang(): Promise<void> {
    this.hanging = true;
    let hung = 0;
    this.hookLanterns.forEach((l) => (l.g.visible = l.shown = false));
    this.hookMarkers.forEach((m) => (m.visible = true));
    this.setLocked(false);
    return new Promise((resolve) => {
      const tryHang = () => {
        const i = this.nearestHook();
        if (i < 0 || this.hookLanterns[i].shown) return;
        const l = this.hookLanterns[i];
        l.shown = l.g.visible = true;
        this.tween(0.3, (k) => l.g.scale.setScalar((i === BRIGHTEST ? 1.25 : 1) * (0.25 + 0.75 * (1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2))));
        this.hookMarkers[i].visible = false;
        this.hooks.sound.play("hang", { pitch: 0.9 + i * 0.03 });
        hung++;
        if (hung === HOOKS.length) {
          this.tick = null;
          this.hookAction = null;
          this.hanging = false;
          this.hidePrompt();
          this.setLocked(true);
          resolve();
        }
      };
      this.tick = () => {
        const i = this.nearestHook();
        if (i >= 0 && !this.hookLanterns[i].shown) this.showPrompt(at(HOOKS[i].x, STRING_Z), "Hang a lantern", tryHang);
        else this.showPrompt(at(this.px, this.pz), `${HOOKS.length - hung} lanterns left`);
        this.px = THREE.MathUtils.clamp(this.px, 2150, 2950);
      };
      this.hookAction = tryHang;
    });
  }

  /** Tie each lantern down before the wind takes it, while gusts shove you around. */
  runSecure(): Promise<void> {
    const todo = this.hookLanterns.map((_, i) => i).filter((i) => i >= this.world.lanternsLost);
    let tied = 0;
    this.hanging = true;
    todo.forEach((i) => (this.hookMarkers[i].visible = true));
    this.setLocked(false);
    return new Promise((resolve) => {
      const tryTie = () => {
        const i = this.nearestHook();
        if (i < 0 || !todo.includes(i) || this.hookLanterns[i].tied) return;
        this.hookLanterns[i].tied = true;
        this.hookMarkers[i].visible = false;
        this.hooks.sound.play("hang", { pitch: 0.9 + i * 0.03 });
        tied++;
        if (tied === todo.length) {
          this.tick = null;
          this.hookAction = null;
          this.hanging = false;
          this.hidePrompt();
          this.setLocked(true);
          resolve();
        }
      };
      this.tick = (dt) => {
        // Gusts come and go, blowing one way and then the other.
        this.gust = Math.sin(this.time / 0.9) * 140 + Math.sin(this.time / 0.37) * 60;
        if (this.moveTo === null) this.px += this.gust * dt;
        this.px = THREE.MathUtils.clamp(this.px, 2150, 2950);
        const i = this.nearestHook();
        if (i >= 0 && todo.includes(i) && !this.hookLanterns[i].tied) this.showPrompt(at(HOOKS[i].x, STRING_Z), "Tie it down", tryTie);
        else this.showPrompt(at(this.px, this.pz), `${todo.length - tied} to tie down`);
      };
      this.hookAction = tryTie;
    });
  }

  /** Chapter six: the tide comes in. Carry out what you can, or heave at the sandbags (the water comes anyway). */
  runTide(onFight: () => void): Promise<TideResult> {
    this.tiding = true;
    this.teleport(12720);
    const saved: string[] = [];
    const lost = new Set<string>();
    let fought = 0;
    let heaving = 0;
    let elapsed = 0;
    const share = () => Math.min(1, elapsed / TIDE_SECONDS);
    const top = () => VIEW_H - (VIEW_H - TIDE_TOP) * share();
    const crate = PROPS.crate;
    this.setLocked(false);
    return new Promise((resolve) => {
      const finish = () => {
        this.tick = null;
        this.tiding = false;
        this.tideAction = null;
        this.hidePrompt();
        this.setLocked(true);
        this.tween(1.5, (k) => this.coast.setWater((1 - k) * share()));
        resolve({ saved, fought });
      };
      const nearest = () => {
        const item = SHED_ITEMS.find((i) => Math.abs(i.x - this.px) < 45 && !saved.includes(i.id) && !lost.has(i.id));
        if (item) return { kind: "item" as const, item };
        if (Math.abs(PROPS.sandbags.x - this.px) < 55) return { kind: "bags" as const };
        return null;
      };
      this.tideAction = () => {
        if (heaving > 0) return;
        const n = nearest();
        if (!n) return;
        if (n.kind === "item") {
          saved.push(n.item.id);
          this.hooks.sound.play("pickup");
          const o = this.coast.shedItem(n.item.id);
          const from = o.position.clone();
          const to = new THREE.Vector3(...at(crate.x - 30 + (saved.length % 3) * 30, 0.6, 0.9 + Math.floor((saved.length - 1) / 3) * 0.4));
          if (o.parent) o.parent.worldToLocal(to);
          this.tween(0.6, (k) => o.position.lerpVectors(from, to, k));
        } else {
          fought++;
          heaving = 1.1;
          onFight();
          this.hooks.sound.play("trip", { volume: 0.4 });
          this.shake = 0.18;
        }
      };
      this.tick = (dt) => {
        elapsed += dt;
        if (heaving > 0) {
          heaving -= dt;
          this.moveTo = null;
        }
        this.coast.setWater(share());
        for (const item of SHED_ITEMS) {
          if (saved.includes(item.id) || lost.has(item.id) || top() > item.y - 12) continue;
          lost.add(item.id);
          this.hooks.sound.play("shell", { volume: 0.4 });
          const o = this.coast.shedItem(item.id);
          const y0 = o.position.y;
          this.tween(0.9, (k) => {
            o.position.y = y0 - k * 0.5;
            o.scale.setScalar(1 - k);
          });
        }
        const n = nearest();
        if (heaving > 0) this.showPrompt(at(PROPS.sandbags.x, -0.5), "Heaving...");
        else if (n?.kind === "item") this.showPrompt(at(n.item.x, -1), `Carry out ${n.item.label}`, () => this.tideAction?.());
        else if (n?.kind === "bags") this.showPrompt(at(PROPS.sandbags.x, -0.5), "Hold back the water", () => this.tideAction?.());
        else this.hidePrompt();
        if (elapsed >= TIDE_SECONDS + 2) finish();
      };
    });
  }

  sparkle(_x?: number, _y?: number) {
    const n = 16;
    const pos = new Float32Array(n * 3);
    const v = new Float32Array(n * 3);
    const [X, Y, Z] = at(this.px, this.pz, 2.2);
    for (let i = 0; i < n; i++) {
      pos.set([X, Y, Z], i * 3);
      v.set([(Math.random() - 0.5) * 5, 1 + Math.random() * 3, (Math.random() - 0.5) * 5], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: "#ffe69a", size: 0.2, transparent: true, depthWrite: false }));
    p.frustumCulled = false;
    this.scene.add(p);
    this.sparks.push({ p, v, age: 0 });
  }

  playerX() {
    return this.px;
  }

  /** Testing aid: jump the player to x. */
  debugTeleport(x: number, z?: number) {
    this.teleport(x, z);
  }

  /** Testing aid: walk the player to x as if they had clicked there. */
  debugWalkTo(x: number, interact = false) {
    this.moveTo = { x, z: this.pz, since: this.time };
    this.pendingAction = interact ? () => this.interact() : null;
  }

  /** Testing aid: run the next challenge input as if the key was pressed. */
  debugAct() {
    if (this.tiding) this.tideAction?.();
    else if (this.hookAction) this.hookAction();
    else this.interact();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizer.disconnect();
    removeEventListener("keydown", this.onKeyDown);
    removeEventListener("keyup", this.onKeyUp);
    removeEventListener("blur", this.onBlur);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.root.replaceChildren();
  }

  // --- Input --------------------------------------------------------------------

  private onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select")) return;
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") {
      if (this.tiding) this.tideAction?.();
      else if (this.hanging || this.approaching) this.hookAction?.();
      else this.interact();
    }
  };
  private onKeyUp = (e: KeyboardEvent) => void this.keys.delete(e.code);
  private onBlur = () => this.keys.clear();

  private held(dir: "left" | "right" | "up" | "down") {
    const k = this.keys;
    if (dir === "left") return k.has("ArrowLeft") || k.has("KeyA");
    if (dir === "right") return k.has("ArrowRight") || k.has("KeyD");
    if (dir === "up") return k.has("ArrowUp") || k.has("KeyW");
    return k.has("ArrowDown") || k.has("KeyS");
  }

  /** Where a tap lands on the ground, as a game x and across-the-path offset. */
  private pointOnGround(e: PointerEvent): { x: number; z: number } | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundH(this.px));
    const hit = this.ray.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return null;
    return { x: gameX(hit.x), z: hit.z - regionZ(this.px) };
  }

  private onPointer = (e: PointerEvent) => {
    if (this.locked && !this.approaching && !this.hanging && !this.tiding) return;
    this.hooks.sound.unlock();
    const p = this.pointOnGround(e);
    if (!p) return;
    this.moveTo = { x: p.x, z: p.z, since: this.time };
    this.pendingAction = null;
    if (this.approaching) return;
    if (this.tiding) {
      const near = [...SHED_ITEMS.map((i) => i.x), PROPS.sandbags.x].find((x) => Math.abs(x - p.x) < 60);
      if (near !== undefined) {
        this.moveTo = { x: near, z: p.z, since: this.time };
        this.pendingAction = () => this.tideAction?.();
      }
      return;
    }
    if (this.hanging) {
      const i = HOOKS.findIndex((h) => Math.abs(h.x - p.x) < 55);
      if (i >= 0) {
        this.moveTo = { x: HOOKS[i].x, z: STRING_Z + 0.8, since: this.time };
        this.pendingAction = () => this.hookAction?.();
      }
      return;
    }
    const spots = [
      ...this.targets.filter((t) => !t.auto),
      ...DOORS.filter((d) => (!d.when || d.when(this.world)) && (!d.needs || hasRoom(this.homeNow, d.needs))).map((d) => ({ x: d.x, z: doorZ(d) + 0.5 })),
      ...(this.region.id === "woods" ? [...NODES.filter((n) => !this.regrowing.has(n)), ...FISHING_SPOTS] : []),
    ];
    const near = spots.find((s) => Math.abs(s.x - p.x) < 80 && Math.abs(s.z - p.z) < 2.6);
    if (near) this.walkToAndInteract(near.x, near.z);
  };

  private walkToAndInteract(x: number, z: number) {
    if (this.locked) return;
    this.hooks.sound.unlock();
    this.moveTo = { x: x + (x > this.px ? -55 : 55), z: z + 0.5, since: this.time };
    this.pendingAction = () => this.interact();
  }

  // --- Frame loop -----------------------------------------------------------------

  private frame() {
    const now = performance.now();
    const raw = (now - this.lastFrame) / 1000;
    const dt = Math.min(raw, 0.05);
    this.lastFrame = now;
    this.time += dt;
    const t = this.time;
    this.watchSpeed(raw);

    if (this.tick) this.tick(dt);
    this.regrow();
    if (this.fishing) this.updateFishing(dt);
    else if (!this.locked && !this.approaching && !(this.tiding && this.moveTo === null && !this.anyMoveKey())) this.move(dt);
    else if (!this.approaching) {
      this.walking = false;
      this.you.move(0, this.heading);
    }

    const [X, Y, Z] = at(this.px, this.pz);
    this.you.root.position.set(X, Y, Z);
    this.shell.position.set(X, Y, Z);
    this.carry.rotation.y = this.heading;
    this.you.update(dt, t);

    if (this.walking && this.world.form === "person") {
      this.stepClock += dt;
      if (this.stepClock > 0.3) {
        this.stepClock = 0;
        this.hooks.sound.play("step");
      }
    }

    for (const p of this.people.values()) if (p.here) p.fig.update(dt, t);

    // Lanterns: glow eases toward lit; in the storm, untied ones swing.
    const storm = this.world.weather === "storm";
    this.hookLanterns.forEach((l, i) => {
      l.mat.emissiveIntensity += (l.lit - l.mat.emissiveIntensity) * Math.min(1, dt * 2);
      l.g.rotation.z = storm && !l.tied ? Math.sin(t * (2.4 + i * 0.12) + i) * 0.32 : l.g.rotation.z * 0.9;
    });

    const area = regionAt(this.px).id === "woods" ? woodsAreaAt(this.px, this.pz) : areaAt(this.px);
    if (area !== this.area) {
      this.area = area;
      this.hooks.onArea(area);
      this.setSky(skyFor(this.world, this.px, this.pz));
    }
    const region = regionAt(this.px);
    if (region !== this.region) this.enterRegion(region);
    this.kits[this.region.id].update(dt, t);

    this.updateLight(dt);
    this.updateCamera(dt);
    this.updateWeather(dt);
    this.updateFeelingFx(dt);
    this.updateEffects(dt);

    if (!this.locked && !this.approaching && !this.hanging && !this.tiding && !this.fishing) {
      this.maybeBark();
      this.updatePrompt();
    }
    this.renderer.render(this.scene, this.camera);
    this.placeOverlays();
  }

  /** On a slow machine, trade sharpness and shadows for smooth movement. */
  private watchSpeed(raw: number) {
    this.frames++;
    if (raw > 0.033) this.slowFrames++;
    if (this.frames < 90) return;
    if (this.slowFrames > 55) {
      const ratio = this.renderer.getPixelRatio();
      if (ratio > 1) this.renderer.setPixelRatio(Math.max(1, ratio - 0.5));
      else if (this.renderer.getPixelRatio() > 0.75) this.renderer.setPixelRatio(0.75);
      else this.sun.shadow.autoUpdate = false;
      this.resize();
    }
    this.frames = this.slowFrames = 0;
  }

  private anyMoveKey() {
    return this.held("left") || this.held("right") || this.held("up") || this.held("down");
  }

  private move(dt: number) {
    const left = this.held("left");
    const right = this.held("right");
    const up = this.held("up");
    const down = this.held("down");
    let vx = 0;
    let vz = 0;
    if (left || right || up || down) {
      this.moveTo = null;
      this.pendingAction = null;
      const ix = (right ? 1 : 0) - (left ? 1 : 0);
      const iz = (down ? 1 : 0) - (up ? 1 : 0);
      const n = Math.hypot(ix, iz) || 1;
      // Keys are relative to the camera, which only turns in the woods.
      const c = Math.cos(this.camYaw);
      const s = Math.sin(this.camYaw);
      vx = ((ix * c + iz * s) / n) * WALK_SPEED;
      vz = ((iz * c - ix * s) / n) * ACROSS_SPEED;
    } else if (this.moveTo) {
      const dx = this.moveTo.x - this.px;
      const dz = this.moveTo.z - this.pz;
      const dist = Math.hypot(dx / SCALE, dz);
      if (dist < 0.16 || this.time - this.moveTo.since > (this.region.id === "woods" ? 24 : 9)) {
        this.moveTo = null;
        const arrived = this.pendingAction;
        this.pendingAction = null;
        arrived?.();
      } else {
        vx = (dx / SCALE / dist) * WALK_SPEED;
        vz = (dz / dist) * ACROSS_SPEED;
      }
    }
    const walking = vx !== 0 || vz !== 0;
    if (this.world.pull && !this.hanging) vx += PULL_DRIFT;
    this.walking = walking;
    if (walking) this.heading = Math.atan2(vx / SCALE, vz);

    const region = regionAt(this.px);
    let minX: number = region.min;
    const interior = region.id !== "village";
    if (!interior && laneBlocked(this.world)) minX = 1080;
    const before = this.px;
    this.px = THREE.MathUtils.clamp(this.px + vx * dt, minX, region.max);
    this.pz += vz * dt;
    if (region.id === "woods") {
      // Once you're on the bridge you stay on it until you reach the far end.
      const onBridge = before > WOODS.river0 && before < WOODS.river1 && Math.abs(this.pz) <= WOODS.bridgeHalf + 0.6;
      if (onBridge) this.pz = THREE.MathUtils.clamp(this.pz, -WOODS.bridgeHalf, WOODS.bridgeHalf);
      this.px = woodsLimit(this.px, this.pz, this.world.props.includes("bridge"));
    }
    const [back, front] = this.hanging ? [STRING_Z - 0.8, STRING_Z + 2] : bandAt(this.px);
    this.pz = THREE.MathUtils.clamp(this.pz, back, front);
    this.pushOutOfBlockers();
    if (laneBlocked(this.world) && before > 1080 && this.px <= 1080 && left) this.showPrompt(at(1100, this.pz), "Too dark to go on without a light");
    // Feeling bad, you walk slower.
    this.you.move(walking ? (WALK_SPEED / SCALE) * (this.feel > 0.5 ? 0.65 : 1) : 0, this.heading);
    this.checkAutoZones();
  }

  private pushOutOfBlockers() {
    const list: Blocker[] = this.kits[this.region.id].blockers;
    const rz = regionZ(this.px);
    // Twice, because being pushed out of one thing can push you into the next.
    for (let pass = 0; pass < 2; pass++) {
      for (const b of list) {
        const dx = worldX(this.px) - b.X;
        const dz = this.pz + rz - b.Z;
        const r = b.r + 0.4;
        if (Math.abs(dx) >= r || Math.abs(dz) >= r) continue;
        const d = Math.hypot(dx, dz);
        if (d >= r || d === 0) continue;
        this.px = gameX(b.X + (dx / d) * r);
        this.pz = b.Z - rz + (dz / d) * r;
      }
    }
  }

  private checkAutoZones() {
    for (const id of [...this.insideZones]) if (!this.inZone(id)) this.insideZones.delete(id);
    for (const t of this.targets) {
      if (!t.auto || !this.onPick) continue;
      const id = t.choice.target!.id;
      if (this.inZone(id) && !this.insideZones.has(id)) {
        this.pick(t.choice);
        return;
      }
    }
  }

  private nearestTarget(): Target | null {
    let best: Target | null = null;
    for (const t of this.targets) {
      if (t.auto || Math.abs(t.z - this.pz) > REACH_ACROSS) continue;
      const d = Math.abs(t.x - this.px);
      if (d <= INTERACT_RANGE && (!best || d < Math.abs(best.x - this.px))) best = t;
    }
    return best;
  }

  private nearestDoor() {
    return DOORS.find((d) => regionAt(d.x) === regionAt(this.px) && Math.abs(d.x - this.px) < 60 && Math.abs(this.pz - doorZ(d)) < REACH_ACROSS && (!d.when || d.when(this.world)) && (!d.needs || hasRoom(this.homeNow, d.needs))) ?? null;
  }

  private nearestHook(): number {
    let best = -1;
    HOOKS.forEach((h, i) => {
      if (Math.abs(h.x - this.px) < 40 && (best < 0 || Math.abs(h.x - this.px) < Math.abs(HOOKS[best].x - this.px))) best = i;
    });
    return best;
  }

  /** A person or story target, unless something to gather or a fishing spot is closer to you. */
  private reachableTarget(): Target | null {
    const t = this.nearestTarget();
    if (!t) return null;
    const away = (p: { x: number; z: number }) => Math.hypot((p.x - this.px) / SCALE, p.z - this.pz);
    const thing = this.nearestNode() ?? this.nearestFishing();
    return thing && away(thing) < away(t) ? null : t;
  }

  private updatePrompt() {
    const t = this.reachableTarget();
    if (t) return this.showPrompt(at(t.x, t.z), t.label, () => this.interact());
    const door = this.nearestDoor();
    if (door) return this.showPrompt(at(door.x, doorZ(door)), door.label, () => this.interact());
    if (this.atStall()) return this.showPrompt(at(WOODS.stall, WOODS.stallZ), "Use the stall", () => this.interact());
    const node = this.nearestNode();
    if (node) {
      const name = ITEMS[node.item].name;
      if (node.tool && !this.hooks.bag().tools.includes(node.tool)) return this.showPrompt(at(node.x, node.z), `${name}: make a hammer in your bag (B)`);
      return this.showPrompt(at(node.x, node.z), `Gather ${name.toLowerCase()}`, () => this.interact());
    }
    const spot = this.nearestFishing();
    if (spot) {
      if (!this.hooks.bag().tools.includes("rod")) return this.showPrompt(at(spot.x, spot.z), "Good water. Make a rod in your bag (B)");
      return this.showPrompt(at(spot.x, spot.z), "Fish here", () => this.interact());
    }
    this.hidePrompt();
  }

  /** A label over the world. With an action, it's tappable and drives the action button. */
  private showPrompt(pos: [number, number, number], text: string, action?: () => void) {
    this.promptEl.textContent = action && !this.hooks.touch ? `E  ${text}` : text;
    this.promptEl.hidden = false;
    this.promptEl.classList.toggle("can", !!action);
    this.promptAt = [pos[0], pos[1] + 2.9, pos[2]];
    this.promptAction = action ?? null;
    this.setActionButton(action ? text : null);
  }

  private hidePrompt() {
    this.promptEl.hidden = true;
    this.promptAt = null;
    this.promptAction = null;
    this.setActionButton(null);
  }

  private setActionButton(label: string | null) {
    if (label === this.actionLabel) return;
    this.actionLabel = label;
    this.hooks.onAction(label, label ? () => this.promptAction?.() : null);
  }

  private interact() {
    if (this.tiding) return this.tideAction?.();
    if (this.fishing) return this.strike();
    if (this.locked || this.approaching || this.hanging) return;
    if (this.time - this.unlockedAt < 0.6) return;
    this.hooks.sound.unlock();
    const t = this.reachableTarget();
    if (t) return this.pick(t.choice);
    const door = this.nearestDoor();
    if (!door) {
      if (this.atStall()) return this.hooks.onStall();
      const node = this.nearestNode();
      if (node) return this.pickNode(node);
      const spot = this.nearestFishing();
      if (spot && this.hooks.bag().tools.includes("rod")) this.startFishing(spot);
      return;
    }
    // Walk up to it, then through.
    this.moveTo = { x: door.x, z: doorZ(door), since: this.time - 7.5 };
    this.pendingAction = () => {
      this.hooks.sound.play("door");
      this.fade.classList.add("on");
      setTimeout(() => {
        this.teleport(door.to, door.toZ);
        // Stepping out of your own door isn't walking up to it: the story waits until you do.
        for (const id of Object.keys(ZONES)) if (this.inZone(id)) this.insideZones.add(id);
        this.fade.classList.remove("on");
      }, 200);
    };
  }

  // --- Gathering and fishing ---------------------------------------------------------

  private atStall() {
    return this.region.id === "woods" && this.world.level !== 7 && Math.hypot((WOODS.stall - this.px) / SCALE, WOODS.stallZ - this.pz) < 2.4;
  }

  private nearestNode(): GatherNode | null {
    if (this.region.id !== "woods") return null;
    let best: GatherNode | null = null;
    let bestD = 1.9;
    for (const n of NODES) {
      if (this.regrowing.has(n)) continue;
      const d = Math.hypot((n.x - this.px) / SCALE, n.z - this.pz);
      if (d < bestD) [best, bestD] = [n, d];
    }
    return best;
  }

  private nearestFishing() {
    if (this.region.id !== "woods") return null;
    return FISHING_SPOTS.find((s) => Math.hypot((s.x - this.px) / SCALE, s.z - this.pz) < 1.9) ?? null;
  }

  private pickNode(n: GatherNode) {
    if (n.tool && !this.hooks.bag().tools.includes(n.tool)) return;
    this.woods.setNode(n.id, false);
    this.regrowing.set(n, this.time + REGROW);
    this.hooks.sound.play("pickup");
    this.hooks.onGather(n.item, false);
    this.sparkle(n.x, GROUND_Y - 80);
  }

  private regrow() {
    for (const [n, when] of this.regrowing) {
      if (this.time < when) continue;
      this.regrowing.delete(n);
      this.woods.setNode(n.id, true);
    }
  }

  private startFishing(spot: Fishing["spot"]) {
    this.moveTo = null;
    this.pendingAction = null;
    this.walking = false;
    this.fishing = { spot, stage: "settle", until: this.time + between(FISH.settle) };
    this.heading = Math.atan2(worldX(spot.floatX) - worldX(this.px), spot.floatZ - this.pz);
    this.you.face(this.heading);
    this.float.position.set(...at(spot.floatX, spot.floatZ, 0.12));
    this.ripple.position.set(...at(spot.floatX, spot.floatZ, 0.08));
    for (const o of [this.float, this.fishLine, this.rod, this.ripple]) o.visible = true;
    this.hooks.sound.play("blip");
    this.showFishPrompt("Watch the float");
  }

  private showFishPrompt(text: string) {
    this.showPrompt(at(this.px, this.pz), text, () => this.interact());
  }

  private stopFishing() {
    this.fishing = null;
    for (const o of [this.float, this.fishLine, this.rod, this.ripple]) o.visible = false;
    this.hidePrompt();
  }

  private strike() {
    const f = this.fishing!;
    if (f.stage === "settle" || f.stage === "lull") {
      // Nothing there. The float settles again; that's all.
      f.stage = "settle";
      f.until = this.time + between(FISH.settle);
      this.showFishPrompt("Nothing yet. Back on the water");
      return;
    }
    const item = fishFor(f.spot.bank, f.stage === "nibble" ? "nibble" : "pull");
    this.stopFishing();
    this.hooks.sound.play("fact");
    this.hooks.onGather(item, true);
  }

  private updateFishing(dt: number) {
    const f = this.fishing!;
    this.you.move(0, this.heading);
    if (this.anyMoveKey() || this.locked) return this.stopFishing();
    const t = this.time;
    if (t >= f.until) {
      if (f.stage === "settle") {
        f.stage = "nibble";
        f.until = t + FISH.nibble;
        this.showFishPrompt("A twitch. Take it, or wait for more");
      } else if (f.stage === "nibble") {
        f.stage = "lull";
        f.until = t + between(FISH.lull);
        this.showFishPrompt("Let it go by. Stay with it");
      } else if (f.stage === "lull") {
        f.stage = "pull";
        f.until = t + FISH.pull;
        this.hooks.sound.play("blip");
        this.showFishPrompt("A real pull! Now");
      } else {
        f.stage = "settle";
        f.until = t + between(FISH.settle);
        this.showFishPrompt("It's gone. The water closes over");
      }
    }
    const [fx, fy, fz] = at(f.spot.floatX, f.spot.floatZ, 0.12);
    const dip = f.stage === "pull" ? -0.2 + Math.sin(t * 20) * 0.05 : f.stage === "nibble" ? Math.sin(t * 16) * 0.06 : Math.sin(t * 1.8) * 0.025;
    this.float.position.set(fx, fy + dip, fz);
    const busy = f.stage === "nibble" || f.stage === "pull";
    const m = this.ripple.material as THREE.MeshBasicMaterial;
    const cycle = (t * (busy ? 1.6 : 0.5)) % 1;
    this.ripple.scale.setScalar(0.4 + cycle * (busy ? 1.5 : 0.9));
    m.opacity = (1 - cycle) * (busy ? 0.75 : 0.28);
    const [px, py, pz] = at(this.px, this.pz);
    const tip = new THREE.Vector3(0.5, 2.05, 2).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading).add(new THREE.Vector3(px, py, pz));
    const pts = this.fishLine.geometry.attributes.position as THREE.BufferAttribute;
    pts.setXYZ(0, tip.x, tip.y, tip.z);
    pts.setXYZ(1, fx, fy + dip + 0.1, fz);
    pts.needsUpdate = true;
    void dt;
  }

  private pick(choice: StoryChoice) {
    const cb = this.onPick;
    if (!cb) return;
    this.clearTargets();
    if (choice.target?.kind === "talk") this.faceCharacter(choice.target.id);
    cb(choice);
  }

  /** Someone nearby says something in passing, now and then. */
  private maybeBark() {
    const now = this.time;
    if (now - this.lastBark < 6) return;
    for (const [id, p] of this.people) {
      if (!p.here || Math.abs(p.x - this.px) > 170 || now - p.barkedAt < 30) continue;
      const line = pickBark(this.world, id, Math.random());
      if (!line) continue;
      p.barkedAt = now;
      p.barkUntil = now + 3.3;
      this.lastBark = now;
      p.bark.textContent = line;
      return;
    }
  }

  /** Speech bubbles: bright for someone with something new to say, faint otherwise. */
  private refreshBubbles() {
    const talkable = new Map<Npc, boolean>();
    for (const t of this.targets) {
      if (t.choice.target?.kind !== "talk") continue;
      for (const id of [t.choice.target.id, ...talkGroup(t.choice.target.id)]) talkable.set(id as Npc, t.choice.fresh);
    }
    for (const [id, p] of this.people) {
      p.bubble.hidden = !(talkable.has(id) && p.here);
      p.bubble.classList.toggle("fresh", talkable.get(id) ?? false);
    }
  }

  private enterRegion(region: Region) {
    this.kits[this.region.id].group.visible = false;
    this.region = region;
    this.kits[region.id].group.visible = true;
    this.rain.visible = this.world.weather === "storm" && region.id === "village";
    this.snow.visible = this.world.weather === "snow" && (region.id === "village" || region.id === "woods");
    this.setSky(skyFor(this.world, this.px, this.pz));
    this.lightClock = 0;
    // The woods go on further than the eye: haze closes them in, and nothing past it is drawn.
    const woods = region.id === "woods";
    const fog = this.scene.fog as THREE.Fog;
    fog.near = woods ? 26 : 44;
    fog.far = woods ? 84 : 130;
    this.camera.far = woods ? 100 : 400;
    this.camera.updateProjectionMatrix();
    this.camYaw = this.camYawGoal = 0;
  }

  private teleport(x: number, z?: number) {
    this.px = x;
    const [back, front] = bandAt(x);
    this.pz = THREE.MathUtils.clamp(z ?? (x >= ZONES.hollow.x0 && x < ZONES.hollow.x1 ? VILLAGE_Z.hollow : 0.6), back, front);
    this.moveTo = null;
    const region = regionAt(x);
    this.kits[region.id].group.visible = true;
    if (region !== this.region) this.enterRegion(region);
    this.lookAt.set(...at(this.px, this.pz));
    this.clampLook();
    this.skyEase = 1;
    this.setSky(skyFor(this.world, x, this.pz));
  }

  /** The player's face follows how they're doing unless the story sets it. */
  private playerFace(w: WorldState): Expression {
    if (w.faces.you) return w.faces.you;
    if (w.panic) return "scared";
    if (w.lens === "shame" || w.faceHot) return "embarrassed";
    if (w.posture === "slumped") return "sad";
    if (w.ended || (w.lanterns === "hung" && w.squareLight === 1)) return "happy";
    return "neutral";
  }

  private moodFor(w: WorldState) {
    if (w.weather === "storm") return w.panic ? ("shame" as const) : ("night" as const);
    if (w.level === 5) return w.time === "morning" ? ("day" as const) : ("night" as const);
    if (w.level === 4 && w.time === "night") return "festival" as const;
    if (w.form === "shell" || (w.location === "cave" && w.level === 2)) return "hollow" as const;
    if (w.lens === "shame") return "shame" as const;
    if (w.time === "night") return w.lanterns === "hung" ? ("festival" as const) : ("night" as const);
    return "day" as const;
  }

  // --- Light, sky, camera -----------------------------------------------------------

  private setSky(key: string) {
    if (key === this.skyKey) return;
    const first = this.skyKey === "";
    this.skyKey = key;
    this.skyTarget = SKY[key] ?? SKY.afternoon;
    this.skyEase = 0;
    if (first) {
      this.skyNow.top.set(this.skyTarget.top);
      this.skyNow.mid.set(this.skyTarget.mid);
      this.skyNow.low.set(this.skyTarget.low);
    }
  }

  private updateLight(dt: number) {
    const s = this.skyTarget;
    const k = Math.min(1, dt * 1.8);
    const dark = darknessOf(this.world, this.region.id);
    if (this.skyEase < 1) {
      this.skyEase = Math.min(1, this.skyEase + dt * 0.7);
      lerpColor(this.skyNow.top, s.top, k);
      lerpColor(this.skyNow.mid, s.mid, k);
      lerpColor(this.skyNow.low, s.low, k);
      const g = this.skyCanvas.getContext("2d")!;
      const r = g.createLinearGradient(0, 0, 0, 256);
      r.addColorStop(0, `#${this.skyNow.top.getHexString()}`);
      r.addColorStop(0.6, `#${this.skyNow.mid.getHexString()}`);
      r.addColorStop(1, `#${this.skyNow.low.getHexString()}`);
      g.fillStyle = r;
      g.fillRect(0, 0, 4, 256);
      this.skyTexture.needsUpdate = true;
    }
    lerpColor(this.hemi.color, s.hemi, k);
    lerpColor(this.hemi.groundColor, s.ground, k);
    lerpColor(this.sun.color, s.sun, k);
    const fog = this.scene.fog as THREE.Fog;
    lerpColor(fog.color, s.fog, k);
    // Faces stay readable at night: darkness dims the world but never blacks it out.
    this.hemi.intensity += (s.hemiI * (1 - dark * 0.3) - this.hemi.intensity) * k;
    this.sun.intensity += (s.sunI * (1 - dark * 0.55) - this.sun.intensity) * k;

    const [X, Y, Z] = at(this.px, this.pz);
    // A soft light from where we're looking, stronger in the dark, so faces always read.
    this.fill.intensity += (dark * 1.5 - this.fill.intensity) * k;
    this.fill.position.copy(this.camera.position);
    this.fill.target.position.set(X, Y + 1, Z);
    this.sun.target.position.set(X, Y, Z - 2);
    this.sun.position.set(X - 14, Y + 20, Z + 16);

    // A few real lights go to the nearest things that are on.
    this.lightClock -= dt;
    if (this.lightClock <= 0) {
      this.lightClock = 0.3;
      const w = this.world;
      const night = w.time === "night" || w.weather === "storm" || w.time === "sunset";
      const spots = [...this.kits[this.region.id].lights, ...(this.region.id === "village" ? this.hookSpots : [])]
        .filter((l) => (l.on ? l.on(w) : night))
        .map((l) => ({ l, d: Math.hypot(l.pos[0] - X, l.pos[2] - Z) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_LIGHTS);
      this.lamps.forEach((lamp, i) => {
        const s2 = spots[i]?.l;
        lamp.intensity = s2 ? s2.power : 0;
        if (s2) {
          lamp.position.set(...s2.pos);
          lamp.color.set(s2.color);
        }
      });
    }
    const lit = this.world.hasLight && this.world.form === "person";
    this.carriedLight.intensity = lit ? 22 + Math.sin(this.time * 9) * 2 : 0;
    this.carriedLight.position.set(X, Y + 1.5, Z + 0.4);
    // Darkness in the lanes after hiding: thinner with a light.
    const w = this.world;
    const fog2 = w.time === "morning" || w.time === "night" ? Math.min(0.92, 0.5 + w.darkness * 0.2) * Math.sign(w.darkness) * (w.hasLight ? 0.55 : 1) : 0;
    const fm = this.laneFog.material as THREE.MeshBasicMaterial;
    fm.opacity += (fog2 - fm.opacity) * 0.05;
    this.laneFog.visible = fm.opacity > 0.01;
  }

  /** Turn the camera around you by a step (a button) in the woods. */
  turnCamera(by: number) {
    if (this.region.id === "woods") this.camYawGoal += by;
  }

  private clampLook() {
    const r = this.region;
    if (r.id === "woods") return;
    const span = 8.5 * Math.max(1, (16 / 9) / this.camera.aspect) * 0.9;
    // Rooms stop at their walls, which sit just past where you can walk.
    const room = r.id === "workshop" || r.id === "home" || isExtraRoom(r.id);
    const left = room ? worldX(r.min) - 1 : worldX(r.x0);
    const right = room ? worldX(r.max) + 1 : worldX(r.x1);
    const x0 = left + span;
    const x1 = right - span;
    this.lookAt.x = x0 < x1 ? THREE.MathUtils.clamp(this.lookAt.x, x0, x1) : (left + right) / 2;
  }

  /** In the woods the camera sits higher and closer, follows you everywhere and can go all the way round. */
  private updateWoodsCamera(dt: number) {
    const turn = (this.keys.has("KeyR") ? 1 : 0) - (this.keys.has("KeyQ") ? 1 : 0);
    this.camYawGoal += turn * 1.7 * dt;
    this.camYaw += (this.camYawGoal - this.camYaw) * Math.min(1, dt * 7);
    const [X, Y, Z] = at(this.px, this.pz);
    const k = Math.min(1, dt * 5);
    this.lookAt.x += (X - this.lookAt.x) * k;
    this.lookAt.y += (Y - this.lookAt.y) * k;
    this.lookAt.z += (Z - this.lookAt.z) * k;
    const portrait = Math.max(1, 1.55 / this.camera.aspect);
    const away = 17 * portrait;
    const c = this.camera;
    c.position.set(this.lookAt.x + Math.sin(this.camYaw) * away, this.lookAt.y + 9.5 * portrait, this.lookAt.z + Math.cos(this.camYaw) * away);
    c.lookAt(this.lookAt.x, this.lookAt.y + 1.4, this.lookAt.z);
    sight.uYou.value.set(X, Y + 1.2, Z);
    sight.uCam.value.copy(c.position);
  }

  private updateCamera(dt: number) {
    if (this.region.id === "woods") return this.updateWoodsCamera(dt);
    const [X, Y, Z] = at(this.px, this.pz * 0.55);
    const k = Math.min(1, dt * 4);
    this.lookAt.x += (X - this.lookAt.x) * k;
    this.lookAt.y += (Y - this.lookAt.y) * k;
    this.lookAt.z += (Z - this.lookAt.z) * k;
    this.clampLook();
    const portrait = Math.max(1, 1.55 / this.camera.aspect);
    const c = this.camera;
    c.position.set(this.lookAt.x, this.lookAt.y + 2.4 + 5.4 * portrait, this.lookAt.z + 19.5 * portrait - 2);
    c.lookAt(this.lookAt.x, this.lookAt.y + 2.4, this.lookAt.z - 2);
    if (this.shake > 0) {
      this.shake -= dt;
      c.position.x += (Math.random() - 0.5) * 0.14;
      c.position.y += (Math.random() - 0.5) * 0.14;
    }
  }

  private updateWeather(dt: number) {
    const fall = (p: THREE.Points, vy: number, vx: number) => {
      if (!p.visible) return;
      p.position.set(this.lookAt.x, 0, this.lookAt.z);
      const a = p.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = a.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= vy * dt;
        arr[i] += vx * dt;
        if (arr[i + 1] < 0) arr[i + 1] += 18;
        if (arr[i] < -25) arr[i] += 50;
        if (arr[i] > 25) arr[i] -= 50;
      }
      a.needsUpdate = true;
    };
    fall(this.rain, 15, -4);
    fall(this.snow, 1.4, Math.sin(this.time * 0.5) * 0.5);
  }

  /** When it feels bad, the colours drain and the world closes in around you. */
  private updateFeelingFx(dt: number) {
    this.feel += (this.feelTarget - this.feel) * Math.min(1, dt * 1.5);
    const k = this.feel;
    this.renderer.domElement.style.filter = k > 0.01 ? `saturate(${(1 - 0.85 * k).toFixed(3)}) brightness(${(1 - 0.12 * k).toFixed(3)})` : "";
    this.vignette.style.opacity = k.toFixed(3);
    if (k > 0.01) {
      const p = this.project(at(this.px, this.pz, 1));
      this.vignette.style.background = `radial-gradient(circle at ${p.x}px ${p.y}px, transparent ${(62 - 34 * k).toFixed(0)}%, rgba(8,8,22,${(0.72 * k).toFixed(3)}) 100%)`;
    }
  }

  private tween(dur: number, fn: (k: number) => void) {
    fn(0);
    this.tweens.push({ t: 0, dur, fn });
  }

  private updateEffects(dt: number) {
    this.tweens = this.tweens.filter((w) => {
      w.t += dt;
      w.fn(Math.min(1, w.t / w.dur));
      return w.t < w.dur;
    });
    this.sparks = this.sparks.filter((s) => {
      s.age += dt;
      const a = s.p.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = a.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        s.v[i + 1] -= 6 * dt;
        arr[i] += s.v[i] * dt;
        arr[i + 1] += s.v[i + 1] * dt;
        arr[i + 2] += s.v[i + 2] * dt;
      }
      a.needsUpdate = true;
      (s.p.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - s.age / 0.8);
      if (s.age < 0.8) return true;
      this.scene.remove(s.p);
      s.p.geometry.dispose();
      return false;
    });
  }

  private project(pos: [number, number, number]) {
    const v = new THREE.Vector3(...pos).project(this.camera);
    const r = this.renderer.domElement;
    return { x: (v.x * 0.5 + 0.5) * r.clientWidth, y: (-v.y * 0.5 + 0.5) * r.clientHeight };
  }

  /** Labels ride above the people and things they belong to. */
  private placeOverlays() {
    const put = (el: HTMLElement, pos: [number, number, number]) => {
      const p = this.project(pos);
      el.style.transform = `translate(-50%, -100%) translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    };
    if (this.promptAt) put(this.promptEl, this.promptAt);
    for (const p of this.people.values()) {
      const here = at(p.x, p.z);
      if (!p.bubble.hidden) put(p.bubble, [here[0], here[1] + 2.5, here[2]]);
      const speaking = p.here && this.time < p.barkUntil;
      p.bark.hidden = !speaking;
      if (speaking) put(p.bark, [here[0], here[1] + 3, here[2]]);
    }
  }

  private resize() {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

