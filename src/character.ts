// What the stage needs from a character, whichever style it is drawn in.

import type * as THREE from "three";
import type { Expression } from "./cast";

export interface Character {
  root: THREE.Group;
  setFeeling(e: Expression): void;
  /** Called every frame. vx, vz: walking speed; view: where the camera is. */
  update(dt: number, t: number, vx: number, vz: number, view: THREE.Vector3, spin: number): void;
}
