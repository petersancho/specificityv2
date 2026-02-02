// Earcut polygon triangulation algorithm
// Based on https://github.com/mapbox/earcut
// Converts polygon with holes to triangle indices

type Point = { x: number; y: number };

export function triangulatePolygon(
  vertices: Point[],
  holes: Point[][] = []
): number[] {
  if (vertices.length < 3) return [];

  // Flatten vertices and holes into single array
  const data: number[] = [];
  const holeIndices: number[] = [];

  // Add outer ring
  for (const v of vertices) {
    data.push(v.x, v.y);
  }

  // Add holes
  for (const hole of holes) {
    holeIndices.push(data.length / 2);
    for (const v of hole) {
      data.push(v.x, v.y);
    }
  }

  return earcut(data, holeIndices);
}

// Earcut triangulation implementation
function earcut(data: number[], holeIndices: number[] = []): number[] {
  const dim = 2;
  const hasHoles = holeIndices.length > 0;
  const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
  let outerNode = linkedList(data, 0, outerLen, dim, true);
  const triangles: number[] = [];

  if (!outerNode || outerNode.next === outerNode.prev) return triangles;

  if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

  // Run earcut algorithm
  if (data.length > 80 * dim) {
    earcutLinked(outerNode, triangles, dim, 0, 0, 0, 0);
  } else {
    earcutLinked(outerNode, triangles, dim);
  }

  return triangles;
}

type Node = {
  i: number;
  x: number;
  y: number;
  prev: Node;
  next: Node;
  z: number;
  prevZ: Node | null;
  nextZ: Node | null;
  steiner: boolean;
};

function linkedList(
  data: number[],
  start: number,
  end: number,
  dim: number,
  clockwise: boolean
): Node | null {
  let last: Node | null = null;

  if (clockwise === signedArea(data, start, end, dim) > 0) {
    for (let i = start; i < end; i += dim) {
      last = insertNode(i / dim, data[i], data[i + 1], last);
    }
  } else {
    for (let i = end - dim; i >= start; i -= dim) {
      last = insertNode(i / dim, data[i], data[i + 1], last);
    }
  }

  if (last && equals(last, last.next)) {
    removeNode(last);
    last = last.next;
  }

  return last;
}

function eliminateHoles(
  data: number[],
  holeIndices: number[],
  outerNode: Node,
  dim: number
): Node {
  const queue: Node[] = [];

  for (let i = 0; i < holeIndices.length; i++) {
    const start = holeIndices[i] * dim;
    const end = i < holeIndices.length - 1 ? holeIndices[i + 1] * dim : data.length;
    const list = linkedList(data, start, end, dim, false);
    if (list && list === list.next) list.steiner = true;
    if (list) queue.push(getLeftmost(list));
  }

  queue.sort((a, b) => a.x - b.x);

  for (const holeNode of queue) {
    eliminateHole(holeNode, outerNode);
    outerNode = filterPoints(outerNode, outerNode.next);
  }

  return outerNode;
}

function eliminateHole(hole: Node, outerNode: Node): void {
  const bridge = findHoleBridge(hole, outerNode);
  if (!bridge) return;

  const b = splitPolygon(bridge, hole);
  filterPoints(filterPoints(b, b.next), b.next);
}

function findHoleBridge(hole: Node, outerNode: Node): Node | null {
  let p = outerNode;
  const hx = hole.x;
  const hy = hole.y;
  let qx = -Infinity;
  let m: Node | null = null;

  do {
    if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
      const x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
      if (x <= hx && x > qx) {
        qx = x;
        m = p.x < p.next.x ? p : p.next;
        if (x === hx) return m;
      }
    }
    p = p.next;
  } while (p !== outerNode);

  if (!m) return null;

  const stop = m;
  let e = m;
  let mx = m.x;
  let my = m.y;
  let tanMin = Infinity;

  p = m;

  do {
    if (
      hx >= p.x &&
      p.x >= mx &&
      hx !== p.x &&
      pointInTriangle(hx < mx ? hx : qx, hy, mx, my, hx < mx ? qx : hx, hy, p.x, p.y)
    ) {
      const tan = Math.abs(hy - p.y) / (hx - p.x);

      if (
        locallyInside(p, hole) &&
        (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))
      ) {
        m = p;
        tanMin = tan;
      }
    }

    p = p.next;
  } while (p !== stop);

  return m;
}

function sectorContainsSector(m: Node, p: Node): boolean {
  return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}

function earcutLinked(
  ear: Node | null,
  triangles: number[],
  dim: number,
  minX?: number,
  minY?: number,
  invSize?: number,
  pass?: number
): void {
  if (!ear) return;

  const _minX = minX ?? 0;
  const _minY = minY ?? 0;
  const _invSize = invSize ?? 0;
  const _pass = pass ?? 0;

  if (!_pass && _invSize) indexCurve(ear, _minX, _minY, _invSize);

  let stop = ear;
  let current: Node | null = ear;

  while (current && current.prev !== current.next) {
    const prev: Node = current.prev;
    const next: Node = current.next;

    if (_invSize ? isEarHashed(current, _minX, _minY, _invSize) : isEar(current)) {
      triangles.push(prev.i, current.i, next.i);

      removeNode(current);

      current = next.next;
      stop = next.next;

      continue;
    }

    current = next;

    if (current === stop) {
      if (!_pass) {
        earcutLinked(filterPoints(current), triangles, dim, _minX, _minY, _invSize, 1);
      } else if (_pass === 1) {
        const cured = cureLocalIntersections(filterPoints(current), triangles);
        earcutLinked(cured, triangles, dim, _minX, _minY, _invSize, 2);
      } else if (_pass === 2) {
        splitEarcut(current, triangles, dim, _minX, _minY, _invSize);
      }

      break;
    }
  }
}

function isEar(ear: Node): boolean {
  const a = ear.prev;
  const b = ear;
  const c = ear.next;

  if (area(a, b, c) >= 0) return false;

  const ax = a.x;
  const bx = b.x;
  const cx = c.x;
  const ay = a.y;
  const by = b.y;
  const cy = c.y;

  const x0 = ax < bx ? (ax < cx ? ax : cx) : bx < cx ? bx : cx;
  const y0 = ay < by ? (ay < cy ? ay : cy) : by < cy ? by : cy;
  const x1 = ax > bx ? (ax > cx ? ax : cx) : bx > cx ? bx : cx;
  const y1 = ay > by ? (ay > cy ? ay : cy) : by > cy ? by : cy;

  let p = c.next;
  while (p !== a) {
    if (
      p.x >= x0 &&
      p.x <= x1 &&
      p.y >= y0 &&
      p.y <= y1 &&
      pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    )
      return false;
    p = p.next;
  }

  return true;
}

function isEarHashed(ear: Node, minX: number, minY: number, invSize: number): boolean {
  const a = ear.prev;
  const b = ear;
  const c = ear.next;

  if (area(a, b, c) >= 0) return false;

  const ax = a.x;
  const bx = b.x;
  const cx = c.x;
  const ay = a.y;
  const by = b.y;
  const cy = c.y;

  const x0 = ax < bx ? (ax < cx ? ax : cx) : bx < cx ? bx : cx;
  const y0 = ay < by ? (ay < cy ? ay : cy) : by < cy ? by : cy;
  const x1 = ax > bx ? (ax > cx ? ax : cx) : bx > cx ? bx : cx;
  const y1 = ay > by ? (ay > cy ? ay : cy) : by > cy ? by : cy;

  const minZ = zOrder(Math.floor(x0), Math.floor(y0), minX, minY, invSize);
  const maxZ = zOrder(Math.floor(x1), Math.floor(y1), minX, minY, invSize);

  let p = ear.prevZ;
  let n = ear.nextZ;

  while (p && p.z >= minZ && n && n.z <= maxZ) {
    if (
      p.x >= x0 &&
      p.x <= x1 &&
      p.y >= y0 &&
      p.y <= y1 &&
      p !== a &&
      p !== c &&
      pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    )
      return false;
    p = p.prevZ;

    if (
      n.x >= x0 &&
      n.x <= x1 &&
      n.y >= y0 &&
      n.y <= y1 &&
      n !== a &&
      n !== c &&
      pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) &&
      area(n.prev, n, n.next) >= 0
    )
      return false;
    n = n.nextZ;
  }

  while (p && p.z >= minZ) {
    if (
      p.x >= x0 &&
      p.x <= x1 &&
      p.y >= y0 &&
      p.y <= y1 &&
      p !== a &&
      p !== c &&
      pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    )
      return false;
    p = p.prevZ;
  }

  while (n && n.z <= maxZ) {
    if (
      n.x >= x0 &&
      n.x <= x1 &&
      n.y >= y0 &&
      n.y <= y1 &&
      n !== a &&
      n !== c &&
      pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) &&
      area(n.prev, n, n.next) >= 0
    )
      return false;
    n = n.nextZ;
  }

  return true;
}

function cureLocalIntersections(start: Node, triangles: number[]): Node {
  let p = start;
  do {
    const a = p.prev;
    const b = p.next.next;

    if (
      !equals(a, b) &&
      intersects(a, p, p.next, b) &&
      locallyInside(a, b) &&
      locallyInside(b, a)
    ) {
      triangles.push(a.i, p.i, b.i);

      removeNode(p);
      removeNode(p.next);

      p = start = b;
    }
    p = p.next;
  } while (p !== start);

  return filterPoints(p);
}

function splitEarcut(
  start: Node,
  triangles: number[],
  dim: number,
  minX: number,
  minY: number,
  invSize: number
): void {
  let a = start;
  do {
    let b = a.next.next;
    while (b !== a.prev) {
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        let c = splitPolygon(a, b);

        a = filterPoints(a, a.next);
        c = filterPoints(c, c.next);

        earcutLinked(a, triangles, dim, minX, minY, invSize);
        earcutLinked(c, triangles, dim, minX, minY, invSize);
        return;
      }
      b = b.next;
    }
    a = a.next;
  } while (a !== start);
}

function filterPoints(start: Node, end: Node | null = null): Node {
  if (!end) end = start;

  let p = start;
  let again;
  do {
    again = false;

    if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
      removeNode(p);
      p = end = p.prev;
      if (p === p.next) break;
      again = true;
    } else {
      p = p.next;
    }
  } while (again || p !== end);

  return end;
}

function splitPolygon(a: Node, b: Node): Node {
  const a2 = insertNode(a.i, a.x, a.y, null);
  const b2 = insertNode(b.i, b.x, b.y, null);
  const an = a.next;
  const bp = b.prev;

  a.next = b;
  b.prev = a;

  a2.next = an;
  an.prev = a2;

  b2.next = a2;
  a2.prev = b2;

  bp.next = b2;
  b2.prev = bp;

  return b2;
}

function insertNode(i: number, x: number, y: number, last: Node | null): Node {
  const p: Node = {
    i,
    x,
    y,
    prev: null as any,
    next: null as any,
    z: 0,
    prevZ: null,
    nextZ: null,
    steiner: false,
  };

  if (!last) {
    p.prev = p;
    p.next = p;
  } else {
    p.next = last.next;
    p.prev = last;
    last.next.prev = p;
    last.next = p;
  }

  return p;
}

function removeNode(p: Node): void {
  p.next.prev = p.prev;
  p.prev.next = p.next;

  if (p.prevZ) p.prevZ.nextZ = p.nextZ;
  if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

function indexCurve(start: Node, minX: number, minY: number, invSize: number): void {
  let p = start;
  do {
    if (p.z === 0) p.z = zOrder(Math.floor(p.x), Math.floor(p.y), minX, minY, invSize);
    p.prevZ = p.prev;
    p.nextZ = p.next;
    p = p.next;
  } while (p !== start);

  p.prevZ!.nextZ = null;
  p.prevZ = null;

  sortLinked(p);
}

function sortLinked(list: Node): Node {
  let inSize = 1;

  while (true) {
    let p: Node | null = list;
    list = null as any;
    let tail: Node | null = null;
    let numMerges = 0;

    while (p) {
      numMerges++;
      let q: Node | null = p;
      let pSize = 0;
      for (let i = 0; i < inSize && q; i++) {
        pSize++;
        q = q.nextZ;
      }
      let qSize = inSize;

      while (pSize > 0 || (qSize > 0 && q)) {
        let e: Node;
        if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
          e = p;
          p = p.nextZ!;
          pSize--;
        } else {
          e = q!;
          q = q!.nextZ;
          qSize--;
        }

        if (tail) tail.nextZ = e;
        else list = e;

        e.prevZ = tail;
        tail = e;
      }

      p = q;
    }

    tail!.nextZ = null;
    inSize *= 2;

    if (numMerges <= 1) break;
  }

  return list;
}

function zOrder(x: number, y: number, minX: number, minY: number, invSize: number): number {
  x = ((x - minX) * invSize) | 0;
  y = ((y - minY) * invSize) | 0;

  x = (x | (x << 8)) & 0x00ff00ff;
  x = (x | (x << 4)) & 0x0f0f0f0f;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y = (y | (y << 8)) & 0x00ff00ff;
  y = (y | (y << 4)) & 0x0f0f0f0f;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

function getLeftmost(start: Node): Node {
  let p = start;
  let leftmost = start;
  do {
    if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
    p = p.next;
  } while (p !== start);

  return leftmost;
}

function pointInTriangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  px: number,
  py: number
): boolean {
  return (
    (cx - px) * (ay - py) >= (ax - px) * (cy - py) &&
    (ax - px) * (by - py) >= (bx - px) * (ay - py) &&
    (bx - px) * (cy - py) >= (cx - px) * (by - py)
  );
}

function isValidDiagonal(a: Node, b: Node): boolean {
  return (
    a.next.i !== b.i &&
    a.prev.i !== b.i &&
    !intersectsPolygon(a, b) &&
    ((locallyInside(a, b) &&
      locallyInside(b, a) &&
      middleInside(a, b) &&
      (area(a.prev, a, b.prev) !== 0 || area(a, b.prev, b) !== 0)) ||
      (equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0))
  );
}

function area(p: Node, q: Node, r: Node): number {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

function equals(p1: Node, p2: Node): boolean {
  return p1.x === p2.x && p1.y === p2.y;
}

function intersects(p1: Node, q1: Node, p2: Node, q2: Node): boolean {
  const o1 = sign(area(p1, q1, p2));
  const o2 = sign(area(p1, q1, q2));
  const o3 = sign(area(p2, q2, p1));
  const o4 = sign(area(p2, q2, q1));

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

function onSegment(p: Node, q: Node, r: Node): boolean {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

function sign(num: number): number {
  return num > 0 ? 1 : num < 0 ? -1 : 0;
}

function intersectsPolygon(a: Node, b: Node): boolean {
  let p = a;
  do {
    if (
      p.i !== a.i &&
      p.next.i !== a.i &&
      p.i !== b.i &&
      p.next.i !== b.i &&
      intersects(p, p.next, a, b)
    )
      return true;
    p = p.next;
  } while (p !== a);

  return false;
}

function locallyInside(a: Node, b: Node): boolean {
  return area(a.prev, a, a.next) < 0
    ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0
    : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

function middleInside(p: Node, q: Node): boolean {
  let a = p;
  let inside = false;
  const px = (p.x + q.x) / 2;
  const py = (p.y + q.y) / 2;
  do {
    const sx = a.x;
    const sy = a.y;
    const ex = a.next.x;
    const ey = a.next.y;
    if (sy > py !== ey > py && px < ((ex - sx) * (py - sy)) / (ey - sy) + sx) inside = !inside;
    a = a.next;
  } while (a !== p);

  return inside;
}

function signedArea(data: number[], start: number, end: number, dim: number): number {
  let sum = 0;
  let j = end - dim;

  for (let i = start; i < end; i += dim) {
    sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
    j = i;
  }

  return sum;
}
