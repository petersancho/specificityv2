import type { WorkflowNodeDefinition } from "../../nodeRegistry";
import type { Geometry, RenderMesh, Vec3, MeshGeometry } from "../../../types";

/**
 * Topology Optimization Solver Node
 * 
 * This solver generates topologically optimized structures from input geometry using:
 * 1. Point cloud generation (stratified sampling from geometry surface)
 * 2. Curve network generation (3D proximity-based connections)
 * 3. Multipipe operation (pipes along curves)
 * 
 * Named after Leonhard Euler (topology pioneer, Euler characteristic).
 */
export const TopologyOptimizationSolverNode: WorkflowNodeDefinition = {
  type: "topologyOptimizationSolver",
  label: "Topology Optimization",
  shortLabel: "TOPO",
  description: "Generates topologically optimized structures using point cloud → curve network → multipipe.",
  category: "solver",
  semanticOps: ['solver.topologyOptimization'],
  iconId: "topologyOptimizationSolver",
  inputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      description: "Input geometry to optimize (mesh, solid, or any geometry type).",
    },
    {
      key: "pointDensity",
      label: "Point Density",
      type: "number",
      parameterKey: "pointDensity",
      defaultValue: 100,
      description: "Number of points to generate (10-1000).",
    },
    {
      key: "connectionRadius",
      label: "Connection Radius",
      type: "number",
      parameterKey: "connectionRadius",
      defaultValue: 0.5,
      description: "3D proximity threshold for curve network (0.01-5.0).",
    },
    {
      key: "pipeRadius",
      label: "Pipe Radius",
      type: "number",
      parameterKey: "pipeRadius",
      defaultValue: 0.05,
      description: "Radius for multipipe operation (0.01-1.0).",
    },
  ],
  outputs: [
    {
      key: "optimizedMesh",
      label: "Optimized Mesh",
      type: "mesh",
      description: "Topologically optimized structure (multipipe result).",
    },
    {
      key: "pointCloud",
      label: "Point Cloud",
      type: "geometry",
      description: "Generated point cloud for visualization.",
    },
    {
      key: "curveNetwork",
      label: "Curve Network",
      type: "geometry",
      description: "Generated curve network for visualization.",
    },
    {
      key: "pointCount",
      label: "Point Count",
      type: "number",
      description: "Number of points generated.",
    },
    {
      key: "curveCount",
      label: "Curve Count",
      type: "number",
      description: "Number of curves generated.",
    },
    {
      key: "volume",
      label: "Volume",
      type: "number",
      description: "Volume of optimized structure.",
    },
    {
      key: "surfaceArea",
      label: "Surface Area",
      type: "number",
      description: "Surface area of optimized structure.",
    },
  ],
  parameters: [
    {
      key: "pointDensity",
      label: "Point Density",
      type: "number",
      defaultValue: 100,
      min: 10,
      max: 1000,
      step: 10,
      description: "Number of points to generate from geometry surface.",
    },
    {
      key: "connectionRadius",
      label: "Connection Radius",
      type: "number",
      defaultValue: 0.5,
      min: 0.01,
      max: 5.0,
      step: 0.01,
      description: "3D proximity threshold for connecting points.",
    },
    {
      key: "pipeRadius",
      label: "Pipe Radius",
      type: "number",
      defaultValue: 0.05,
      min: 0.01,
      max: 1.0,
      step: 0.01,
      description: "Radius for multipipe operation.",
    },
    {
      key: "seed",
      label: "Random Seed",
      type: "number",
      defaultValue: 42,
      min: 0,
      max: 9999,
      step: 1,
      description: "Random seed for point generation.",
    },
  ],
  display: {
    nameGreek: "Ἐπιλύτης Τοπολογικῆς Βελτιστοποίησης",
    nameEnglish: "Topology Optimization Solver",
    romanization: "Epilýtēs Topologikís Veltitopoíisis",
    description: "Generates topologically optimized structures using point cloud → curve network → multipipe.",
  },
  customUI: {
    dashboardButton: {
      label: "Open Topology Simulator",
      component: "TopologyOptimizationSimulatorDashboard",
    },
  },
  compute: (args) => {
    const { parameters, inputs, context } = args;
    
    const pointDensity = Math.max(10, Math.min(1000, Math.round(
      Number(inputs.pointDensity ?? parameters.pointDensity ?? 100)
    )));
    const connectionRadius = Math.max(0.01, Math.min(5.0, 
      Number(inputs.connectionRadius ?? parameters.connectionRadius ?? 0.5)
    ));
    const pipeRadius = Math.max(0.01, Math.min(1.0, 
      Number(inputs.pipeRadius ?? parameters.pipeRadius ?? 0.05)
    ));
    const seed = Math.max(0, Math.min(9999, Math.round(
      Number(parameters.seed ?? 42)
    )));
    
    const emptyResult = {
      optimizedMesh: { positions: [], normals: [], uvs: [], indices: [] } as RenderMesh,
      pointCloud: null,
      curveNetwork: null,
      pointCount: 0,
      curveCount: 0,
      volume: 0,
      surfaceArea: 0,
    };
    
    // Get input geometry
    const geometryId = inputs.geometry as string | undefined;
    if (!geometryId) {
      return emptyResult;
    }
    
    const geometry = context.geometryById.get(geometryId) as Geometry | undefined;
    if (!geometry) {
      return emptyResult;
    }
    
    // Check if geometry has mesh data
    const meshGeometry = geometry as MeshGeometry;
    if (!meshGeometry.mesh || meshGeometry.type !== "mesh") {
      return emptyResult;
    }
    
    const mesh = meshGeometry.mesh;
    if (!mesh.positions || mesh.positions.length === 0) {
      return emptyResult;
    }
    
    // Step 1: Generate point cloud from geometry surface
    const points = samplePointsFromGeometry(mesh, pointDensity, seed);
    
    // Step 2: Generate curve network based on 3D proximity
    const curves = generateCurveNetwork(points, connectionRadius);
    
    // Step 3: Multipipe operation
    const optimizedMesh = multipipe(curves, pipeRadius);
    
    // Calculate statistics
    const volume = calculateVolume(optimizedMesh);
    const surfaceArea = calculateSurfaceArea(optimizedMesh);
    
    return {
      optimizedMesh,
      pointCloud: null, // TODO: Create point cloud geometry
      curveNetwork: null, // TODO: Create curve network geometry
      pointCount: points.length,
      curveCount: curves.length,
      volume,
      surfaceArea,
    };
  },
};

/**
 * Sample points from geometry surface using stratified sampling
 */
function samplePointsFromGeometry(mesh: RenderMesh, count: number, seed: number): Vec3[] {
  const positions = mesh.positions;
  const indices = mesh.indices;
  const points: Vec3[] = [];
  
  // Simple random number generator (seeded)
  let rng = seed;
  const random = () => {
    rng = (rng * 1664525 + 1013904223) % 4294967296;
    return rng / 4294967296;
  };
  
  // Calculate triangle areas
  const triangleCount = indices.length / 3;
  const triangleAreas: number[] = [];
  let totalArea = 0;
  
  for (let t = 0; t < triangleCount; t++) {
    const i0 = indices[t * 3] * 3;
    const i1 = indices[t * 3 + 1] * 3;
    const i2 = indices[t * 3 + 2] * 3;
    
    const v0x = positions[i0], v0y = positions[i0 + 1], v0z = positions[i0 + 2];
    const v1x = positions[i1], v1y = positions[i1 + 1], v1z = positions[i1 + 2];
    const v2x = positions[i2], v2y = positions[i2 + 1], v2z = positions[i2 + 2];
    
    // Triangle area using cross product
    const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
    const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;
    const cx = e1y * e2z - e1z * e2y;
    const cy = e1z * e2x - e1x * e2z;
    const cz = e1x * e2y - e1y * e2x;
    const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    
    triangleAreas.push(area);
    totalArea += area;
  }
  
  // Sample points proportional to triangle area
  for (let i = 0; i < count; i++) {
    // Select triangle based on area
    let r = random() * totalArea;
    let triangleIndex = 0;
    for (let t = 0; t < triangleCount; t++) {
      r -= triangleAreas[t];
      if (r <= 0) {
        triangleIndex = t;
        break;
      }
    }
    
    // Sample point within triangle using barycentric coordinates
    const i0 = indices[triangleIndex * 3] * 3;
    const i1 = indices[triangleIndex * 3 + 1] * 3;
    const i2 = indices[triangleIndex * 3 + 2] * 3;
    
    const v0x = positions[i0], v0y = positions[i0 + 1], v0z = positions[i0 + 2];
    const v1x = positions[i1], v1y = positions[i1 + 1], v1z = positions[i1 + 2];
    const v2x = positions[i2], v2y = positions[i2 + 1], v2z = positions[i2 + 2];
    
    let u = random();
    let v = random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    
    const px = w * v0x + u * v1x + v * v2x;
    const py = w * v0y + u * v1y + v * v2y;
    const pz = w * v0z + u * v1z + v * v2z;
    
    points.push({ x: px, y: py, z: pz });
  }
  
  return points;
}

/**
 * Generate curve network based on 3D proximity
 */
function generateCurveNetwork(points: Vec3[], radius: number): { start: Vec3; end: Vec3 }[] {
  const curves: { start: Vec3; end: Vec3 }[] = [];
  const radiusSquared = radius * radius;
  
  // For each point, find neighbors within radius
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    for (let j = i + 1; j < points.length; j++) {
      const p2 = points[j];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const distSquared = dx * dx + dy * dy + dz * dz;
      
      if (distSquared <= radiusSquared) {
        curves.push({ start: p1, end: p2 });
      }
    }
  }
  
  return curves;
}

/**
 * Multipipe operation - create pipes along curves
 */
function multipipe(curves: { start: Vec3; end: Vec3 }[], radius: number): RenderMesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const segments = 8; // Number of segments around pipe
  const angleStep = (2 * Math.PI) / segments;
  
  for (const curve of curves) {
    const { start, end } = curve;
    
    // Calculate pipe direction
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (length < 0.001) continue;
    
    const dirX = dx / length;
    const dirY = dy / length;
    const dirZ = dz / length;
    
    // Calculate perpendicular vectors
    let perpX, perpY, perpZ;
    if (Math.abs(dirY) < 0.9) {
      perpX = 0;
      perpY = 1;
      perpZ = 0;
    } else {
      perpX = 1;
      perpY = 0;
      perpZ = 0;
    }
    
    // Cross product to get first perpendicular
    const perp1X = perpY * dirZ - perpZ * dirY;
    const perp1Y = perpZ * dirX - perpX * dirZ;
    const perp1Z = perpX * dirY - perpY * dirX;
    const perp1Len = Math.sqrt(perp1X * perp1X + perp1Y * perp1Y + perp1Z * perp1Z);
    const p1X = perp1X / perp1Len;
    const p1Y = perp1Y / perp1Len;
    const p1Z = perp1Z / perp1Len;
    
    // Cross product to get second perpendicular
    const p2X = dirY * p1Z - dirZ * p1Y;
    const p2Y = dirZ * p1X - dirX * p1Z;
    const p2Z = dirX * p1Y - dirY * p1X;
    
    const baseIdx = positions.length / 3;
    
    // Generate vertices for start and end circles
    for (let ring = 0; ring < 2; ring++) {
      const centerX = ring === 0 ? start.x : end.x;
      const centerY = ring === 0 ? start.y : end.y;
      const centerZ = ring === 0 ? start.z : end.z;
      
      for (let seg = 0; seg < segments; seg++) {
        const angle = seg * angleStep;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const offsetX = radius * (cos * p1X + sin * p2X);
        const offsetY = radius * (cos * p1Y + sin * p2Y);
        const offsetZ = radius * (cos * p1Z + sin * p2Z);
        
        positions.push(centerX + offsetX, centerY + offsetY, centerZ + offsetZ);
        normals.push(cos * p1X + sin * p2X, cos * p1Y + sin * p2Y, cos * p1Z + sin * p2Z);
        uvs.push(seg / segments, ring);
      }
    }
    
    // Generate indices for pipe surface
    for (let seg = 0; seg < segments; seg++) {
      const nextSeg = (seg + 1) % segments;
      
      const i0 = baseIdx + seg;
      const i1 = baseIdx + nextSeg;
      const i2 = baseIdx + segments + seg;
      const i3 = baseIdx + segments + nextSeg;
      
      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
  }
  
  return { positions, normals, uvs, indices };
}

/**
 * Calculate volume of mesh using divergence theorem
 */
function calculateVolume(mesh: RenderMesh): number {
  const positions = mesh.positions;
  const indices = mesh.indices;
  let volume = 0;
  
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    
    const v0x = positions[i0], v0y = positions[i0 + 1], v0z = positions[i0 + 2];
    const v1x = positions[i1], v1y = positions[i1 + 1], v1z = positions[i1 + 2];
    const v2x = positions[i2], v2y = positions[i2 + 1], v2z = positions[i2 + 2];
    
    volume += (v0x * v1y * v2z + v1x * v2y * v0z + v2x * v0y * v1z -
               v2x * v1y * v0z - v1x * v0y * v2z - v0x * v2y * v1z) / 6;
  }
  
  return Math.abs(volume);
}

/**
 * Calculate surface area of mesh
 */
function calculateSurfaceArea(mesh: RenderMesh): number {
  const positions = mesh.positions;
  const indices = mesh.indices;
  let area = 0;
  
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    
    const v0x = positions[i0], v0y = positions[i0 + 1], v0z = positions[i0 + 2];
    const v1x = positions[i1], v1y = positions[i1 + 1], v1z = positions[i1 + 2];
    const v2x = positions[i2], v2y = positions[i2 + 1], v2z = positions[i2 + 2];
    
    const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
    const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;
    const cx = e1y * e2z - e1z * e2y;
    const cy = e1z * e2x - e1x * e2z;
    const cz = e1x * e2y - e1y * e2x;
    
    area += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }
  
  return area;
}
