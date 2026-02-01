import type { Geometry, RenderMesh, Vec3, VoxelGrid } from "../../types";

export type InspectContext = {
  resolveGeometry?: (id: string) => Geometry | undefined;
  maxDepth?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  maxLines?: number;
  showMeshPositions?: boolean;
  portIndex?: number;
};

const DEFAULT_INSPECT_CONTEXT: Required<InspectContext> = {
  resolveGeometry: () => undefined,
  maxDepth: 3,
  maxArrayItems: 50,
  maxObjectKeys: 50,
  maxLines: 500,
  showMeshPositions: false,
  portIndex: 0,
};

const isRenderMesh = (v: unknown): v is RenderMesh => {
  if (!v || typeof v !== "object") return false;
  const obj = v as Partial<RenderMesh>;
  return (
    Array.isArray(obj.positions) &&
    Array.isArray(obj.indices) &&
    obj.positions.length > 0
  );
};

const isVoxelGrid = (v: unknown): v is VoxelGrid => {
  if (!v || typeof v !== "object") return false;
  const obj = v as Partial<VoxelGrid>;
  return (
    obj.resolution !== undefined &&
    typeof obj.resolution === "object" &&
    "x" in obj.resolution &&
    obj.bounds !== undefined &&
    Array.isArray(obj.densities)
  );
};

const formatNumber = (value: number, decimals = 2) => {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
};

const formatVec3 = (v: Vec3) =>
  `(${formatNumber(v.x)}, ${formatNumber(v.y)}, ${formatNumber(v.z)})`;

const isVec3Object = (v: unknown): v is Vec3 => {
  if (!v || typeof v !== "object") return false;
  const vec = v as Partial<Vec3>;
  return (
    typeof vec.x === "number" &&
    Number.isFinite(vec.x) &&
    typeof vec.y === "number" &&
    Number.isFinite(vec.y) &&
    typeof vec.z === "number" &&
    Number.isFinite(vec.z)
  );
};

const isVec3Array = (v: unknown): v is [number, number, number] => {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number" &&
    typeof v[2] === "number"
  );
};

const meshStats = (mesh: RenderMesh): { vertexCount: number; faceCount: number } => {
  const vertexCount = Math.floor((mesh.positions?.length ?? 0) / 3);
  const faceCount = Array.isArray(mesh.indices) ? Math.floor(mesh.indices.length / 3) : 0;
  return { vertexCount, faceCount };
};

const formatRenderMesh = (mesh: RenderMesh, ctx: Required<InspectContext>): string[] => {
  const lines: string[] = [];
  const stats = meshStats(mesh);
  
  lines.push(`RenderMesh:`);
  lines.push(`  vertexCount: ${stats.vertexCount}`);
  lines.push(`  faceCount: ${stats.faceCount}`);
  
  if (mesh.normals && mesh.normals.length > 0) {
    lines.push(`  hasNormals: true`);
  }
  if (mesh.uvs && mesh.uvs.length > 0) {
    lines.push(`  hasUVs: true`);
  }
  if (mesh.colors && mesh.colors.length > 0) {
    lines.push(`  hasColors: true`);
  }
  
  if (ctx.showMeshPositions && mesh.positions.length > 0) {
    const limit = Math.min(stats.vertexCount, 20);
    lines.push(`  positions (${limit} of ${stats.vertexCount}):`);
    for (let i = 0; i < limit; i++) {
      const x = mesh.positions[i * 3] ?? 0;
      const y = mesh.positions[i * 3 + 1] ?? 0;
      const z = mesh.positions[i * 3 + 2] ?? 0;
      lines.push(`    ${i}: (${formatNumber(x)}, ${formatNumber(y)}, ${formatNumber(z)})`);
    }
    if (stats.vertexCount > limit) {
      lines.push(`    ... (${stats.vertexCount - limit} more)`);
    }
  }
  
  return lines;
};

const formatVoxelGrid = (grid: VoxelGrid, ctx: Required<InspectContext>): string[] => {
  const lines: string[] = [];
  const res = grid.resolution;
  const totalVoxels = res.x * res.y * res.z;
  const filledVoxels = grid.densities.filter(d => d > 0).length;
  
  lines.push(`VoxelGrid:`);
  lines.push(`  resolution: (${res.x}, ${res.y}, ${res.z})`);
  lines.push(`  totalVoxels: ${totalVoxels}`);
  lines.push(`  filledVoxels: ${filledVoxels}`);
  lines.push(`  fillRatio: ${formatNumber(filledVoxels / totalVoxels * 100, 1)}%`);
  
  if (grid.bounds) {
    const min = grid.bounds.min;
    const max = grid.bounds.max;
    lines.push(`  bounds:`);
    lines.push(`    min: (${formatNumber(min.x)}, ${formatNumber(min.y)}, ${formatNumber(min.z)})`);
    lines.push(`    max: (${formatNumber(max.x)}, ${formatNumber(max.y)}, ${formatNumber(max.z)})`);
  }
  
  if (grid.cellSize) {
    const cs = grid.cellSize;
    lines.push(`  cellSize: (${formatNumber(cs.x, 3)}, ${formatNumber(cs.y, 3)}, ${formatNumber(cs.z, 3)})`);
  }
  
  if (ctx.showMeshPositions && grid.densities.length > 0) {
    const limit = Math.min(grid.densities.length, 20);
    lines.push(`  densities (${limit} of ${grid.densities.length}):`);
    for (let i = 0; i < limit; i++) {
      lines.push(`    ${i}: ${formatNumber(grid.densities[i], 3)}`);
    }
    if (grid.densities.length > limit) {
      lines.push(`    ... (${grid.densities.length - limit} more)`);
    }
  }
  
  return lines;
};

const getGeometryTypeLabel = (geom: Geometry): string => {
  if (geom.type === "mesh" && "subtype" in geom && geom.subtype === "voxels") {
    return "voxels";
  }
  if (geom.type === "mesh" && "sourceNodeId" in geom && typeof geom.sourceNodeId === "string" && geom.sourceNodeId.includes("voxelSolver")) {
    return "voxels";
  }
  return geom.type;
};

export const formatGeometrySummary = (
  value: unknown,
  portIndex: number,
  resolveGeometry: (id: string) => Geometry | undefined
): string | null => {
  const ids = Array.isArray(value) ? value : [value];
  const geomIds = ids.filter((v): v is string => typeof v === "string");
  
  const typeCounts = new Map<string, number>();
  for (const id of geomIds) {
    const geom = resolveGeometry(id);
    if (geom) {
      const label = getGeometryTypeLabel(geom);
      typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
    }
  }
  
  if (typeCounts.size === 0) return null;
  
  const parts: string[] = [];
  typeCounts.forEach((count, type) => {
    parts.push(`${portIndex}:${count} ${type}`);
  });
  
  return parts.join(", ");
};

const formatGeometry = (g: Geometry, ctx: Required<InspectContext>): string[] => {
  const lines: string[] = [];
  const typeLabel = getGeometryTypeLabel(g);
  
  lines.push(`Geometry: ${typeLabel}`);
  lines.push(`  id: ${g.id}`);
  lines.push(`  layerId: ${g.layerId}`);
  
  if ("mesh" in g && g.mesh) {
    const stats = meshStats(g.mesh);
    lines.push(`  vertexCount: ${stats.vertexCount}`);
    lines.push(`  faceCount: ${stats.faceCount}`);
  }
  
  if ("area_m2" in g && typeof g.area_m2 === "number") {
    lines.push(`  area_m2: ${formatNumber(g.area_m2, 4)}`);
  }
  
  if ("volume_m3" in g && typeof g.volume_m3 === "number") {
    lines.push(`  volume_m3: ${formatNumber(g.volume_m3, 4)}`);
  }
  
  if ("centroid" in g && g.centroid && isVec3Object(g.centroid)) {
    lines.push(`  centroid: ${formatVec3(g.centroid)}`);
  }
  
  if ("mass_kg" in g && typeof g.mass_kg === "number") {
    lines.push(`  mass_kg: ${formatNumber(g.mass_kg, 4)}`);
  }
  
  if ("thickness_m" in g && typeof g.thickness_m === "number") {
    lines.push(`  thickness_m: ${formatNumber(g.thickness_m, 4)}`);
  }
  
  if ("sourceNodeId" in g && typeof g.sourceNodeId === "string") {
    lines.push(`  sourceNodeId: ${g.sourceNodeId}`);
  }
  
  if ("primitive" in g && g.primitive && typeof g.primitive === "object") {
    const prim = g.primitive as { kind?: string };
    if (typeof prim.kind === "string") {
      lines.push(`  primitive: ${prim.kind}`);
    }
  }
  
  if (g.metadata && typeof g.metadata === "object") {
    const keys = Object.keys(g.metadata);
    if (keys.length > 0) {
      lines.push(`  metadata: {${keys.slice(0, 5).join(", ")}${keys.length > 5 ? ", ..." : ""}}`);
    }
  }
  
  if (ctx.showMeshPositions && "mesh" in g && g.mesh && Array.isArray(g.mesh.positions)) {
    const positions = g.mesh.positions;
    const voxelCount = Math.floor(positions.length / 3);
    const limit = Math.min(voxelCount, 20);
    lines.push(`  positions (showing ${limit} of ${voxelCount}):`);
    for (let i = 0; i < limit; i++) {
      const x = positions[i * 3] ?? 0;
      const y = positions[i * 3 + 1] ?? 0;
      const z = positions[i * 3 + 2] ?? 0;
      lines.push(`    ${i}: (${formatNumber(x)}, ${formatNumber(y)}, ${formatNumber(z)})`);
    }
    if (voxelCount > limit) {
      lines.push(`    ... (${voxelCount - limit} more)`);
    }
  }
  
  return lines;
};

export const inspectValue = (
  value: unknown,
  ctx: Partial<InspectContext> = {},
  depth = 0
): string[] => {
  const fullCtx: Required<InspectContext> = { ...DEFAULT_INSPECT_CONTEXT, ...ctx };
  const lines: string[] = [];
  const seen = new WeakSet<object>();
  
  const inspect = (val: unknown, currentDepth: number, prefix = ""): void => {
    if (lines.length >= fullCtx.maxLines) {
      return;
    }
    
    if (val == null) {
      lines.push(`${prefix}null`);
      return;
    }
    
    if (typeof val === "string") {
      const resolved = fullCtx.resolveGeometry(val);
      if (resolved) {
        const geomLines = formatGeometry(resolved, fullCtx);
        geomLines.forEach((line, i) => {
          if (i === 0) {
            lines.push(`${prefix}${line}`);
          } else {
            lines.push(`${prefix}${line}`);
          }
        });
        return;
      }
      lines.push(`${prefix}"${val}"`);
      return;
    }
    
    if (typeof val === "number") {
      lines.push(`${prefix}${formatNumber(val, 3)}`);
      return;
    }
    
    if (typeof val === "boolean") {
      lines.push(`${prefix}${val ? "true" : "false"}`);
      return;
    }
    
    if (typeof val === "bigint") {
      lines.push(`${prefix}${val}n`);
      return;
    }
    
    if (isVec3Object(val)) {
      lines.push(`${prefix}Vec3 ${formatVec3(val)}`);
      return;
    }
    
    if (isVec3Array(val)) {
      lines.push(`${prefix}Vec3 (${formatNumber(val[0])}, ${formatNumber(val[1])}, ${formatNumber(val[2])})`);
      return;
    }
    
    if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`${prefix}[]`);
        return;
      }
      
      if (currentDepth >= fullCtx.maxDepth) {
        lines.push(`${prefix}[... ${val.length} items]`);
        return;
      }
      
      lines.push(`${prefix}Array (${val.length} items):`);
      const limit = Math.min(val.length, fullCtx.maxArrayItems);
      for (let i = 0; i < limit; i++) {
        if (lines.length >= fullCtx.maxLines) break;
        inspect(val[i], currentDepth + 1, `  ${i}: `);
      }
      if (val.length > limit) {
        lines.push(`  ... (${val.length - limit} more)`);
      }
      return;
    }
    
    if (typeof val === "object") {
      if (seen.has(val)) {
        lines.push(`${prefix}[circular]`);
        return;
      }
      seen.add(val);
      
      if (isRenderMesh(val)) {
        const meshLines = formatRenderMesh(val, fullCtx);
        meshLines.forEach((line, i) => {
          lines.push(i === 0 ? `${prefix}${line}` : `${prefix}${line}`);
        });
        return;
      }
      
      if (isVoxelGrid(val)) {
        const gridLines = formatVoxelGrid(val, fullCtx);
        gridLines.forEach((line, i) => {
          lines.push(i === 0 ? `${prefix}${line}` : `${prefix}${line}`);
        });
        return;
      }
      
      const typed = val as { type?: unknown; id?: unknown };
      if (typeof typed.type === "string" && typeof typed.id === "string") {
        const geomLines = formatGeometry(val as Geometry, fullCtx);
        geomLines.forEach((line, i) => {
          if (i === 0) {
            lines.push(`${prefix}${line}`);
          } else {
            lines.push(`${prefix}${line}`);
          }
        });
        return;
      }
      
      const keys = Object.keys(val);
      if (keys.length === 0) {
        lines.push(`${prefix}{}`);
        return;
      }
      
      if (currentDepth >= fullCtx.maxDepth) {
        lines.push(`${prefix}{... ${keys.length} keys}`);
        return;
      }
      
      lines.push(`${prefix}Object (${keys.length} keys):`);
      const limit = Math.min(keys.length, fullCtx.maxObjectKeys);
      for (let i = 0; i < limit; i++) {
        if (lines.length >= fullCtx.maxLines) break;
        const key = keys[i];
        const keyVal = (val as Record<string, unknown>)[key];
        inspect(keyVal, currentDepth + 1, `  ${key}: `);
      }
      if (keys.length > limit) {
        lines.push(`  ... (${keys.length - limit} more keys)`);
      }
      return;
    }
    
    lines.push(`${prefix}${String(val)}`);
  };
  
  inspect(value, depth);
  
  if (lines.length === 0) {
    lines.push("--");
  }
  
  return lines;
};
