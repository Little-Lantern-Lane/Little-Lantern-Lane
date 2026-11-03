// The contract between the world core and what is built in it.

import type * as THREE from "three";
import type { Expression } from "../logic/cast";
import type { HomeChoice } from "../logic/appearance";
import type { WorldState } from "../logic/world";

/** A warm light in the scenery. The core keeps a few real lights on the nearest ones that are on. */
export interface LightSpot {
  pos: [number, number, number];
  color: string;
  /** Strength; 20 is a lantern, 40 a stove. */
  power: number;
  /** Whether it's lit now. Default: after dark only. */
  on?: (w: WorldState) => boolean;
}

/** Something you walk around: a circle on the ground, in world units. */
export interface Blocker {
  X: number;
  Z: number;
  r: number;
}

/** One place, or part of one. Everything goes in `group`, already at world positions. */
export interface RegionKit {
  group: THREE.Group;
  lights: LightSpot[];
  blockers: Blocker[];
  /** Show the world as it now is: snow, story props, what's lit. Called on every state change. */
  setState(w: WorldState): void;
  /** Called every frame while this place is in view, for anything that moves (water, wheels, smoke). */
  update(dt: number, t: number): void;
}

export interface BuildContext {
  home: HomeChoice;
}

/** A person (or the player) in the world. Feet at the group's origin; +Z is their front. */
export interface Figure {
  root: THREE.Group;
  setFeeling(e: Expression): void;
  /** Talking: the mouth opens and closes with the words. */
  setMouth(open: boolean): void;
  /** An arm raised, pointing forward, for the memory of being looked at. */
  setPointing(on: boolean): void;
  /** Tint the whole body, or null for true colours. Used in the memory scenes. */
  setTint(color: string | null): void;
  /** Slumped 0.94 .. upright 1.04, 1 usual. */
  setPosture(scale: number): void;
  /** Walking speed in world units per second, and which way (radians, 0 = toward +Z). */
  move(speed: number, heading: number): void;
  /** Turn to face this heading while standing. */
  face(heading: number): void;
  /** Every frame. */
  update(dt: number, t: number): void;
}
