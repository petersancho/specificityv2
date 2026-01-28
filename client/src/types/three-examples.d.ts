declare module "three/examples/jsm/geometries/ConvexGeometry.js" {
  import { BufferGeometry, Vector3 } from "three";

  export class ConvexGeometry extends BufferGeometry {
    constructor(points: Vector3[]);
  }
}

declare module "three/examples/jsm/geometries/TeapotGeometry.js" {
  import { BufferGeometry } from "three";

  export class TeapotGeometry extends BufferGeometry {
    constructor(
      size?: number,
      segments?: number,
      bottom?: boolean,
      lid?: boolean,
      body?: boolean,
      fitLid?: boolean,
      blinn?: boolean
    );
  }
}
