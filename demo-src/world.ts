// What a built village hands back: the parts that change between evening and day.

import type * as THREE from "three";

export interface Built {
  /** Materials that glow in the evening, with their evening strength. */
  lit: { m: THREE.MeshStandardMaterial; on: number }[];
  glows: THREE.Sprite[];
  lamps: THREE.PointLight[];
}
