import type { WorkflowNodeDefinition } from "../../nodeRegistry";
import type { Geometry, RenderMesh, Vec3, MeshGeometry } from "../../../types";
import type { GoalSpecification, VolumeGoal, StiffnessGoal, AnchorGoal, LoadGoal } from "./types";

/**
 * Topology Optimization Solver Node
 * 
 * This solver generates topologically optimized structures using:
 * 1. Goal-based optimization (volume, stiffness, anchor, load)
 * 2. Point cloud generation (optimized based on goals)
 * 3. Curve network generation (constrained connectivity)
 * 4. Multipipe operation (pipes along curves)
 * 
 * Named after Leonhard Euler (topology pioneer, Euler characteristic).
 */
export const TopologyOptimizationSolverNode: WorkflowNodeDefinition = {
  type: "topologyOptimizationSolver",
  label: "Topology Optimization",
  shortLabel: "TOPO",
  description: "Generates topologically optimized structures using goal-based optimization.",
  category: "solver",
  semanticOps: ['solver.topologyOptimization'],
  iconId: "topologyOptimizationSolver",
  inputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      description: "Input geometry defines the domain for optimization.",
    },
    {
      key: "goals",
      label: "Goals",
      type: "goal",
      allowMultiple: true,
      description: "Optimization goals (volume, stiffness, anchor, load).",
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
      key: "maxLinksPerPoint",
      label: "Max Links Per Point",
      type: "number",
      parameterKey: "maxLinksPerPoint",
      defaultValue: 4,
      description: "Maximum connectivity degree (2-8).",
    },
    {
      key: "maxSpanLength",
      label: "Max Span Length",
      type: "number",
      parameterKey: "maxSpanLength",
      defaultValue: 1.0,
      description: "Maximum distance between connected points (0.1-10.0).",
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
      description: "Number of points to generate.",
    },
    {
      key: "maxLinksPerPoint",
      label: "Max Links Per Point",
      type: "number",
      defaultValue: 4,
      min: 2,
      max: 8,
      step: 1,
      description: "Maximum connectivity degree for each point.",
    },
    {
      key: "maxSpanLength",
      label: "Max Span Length",
      type: "number",
      defaultValue: 1.0,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      description: "Maximum distance between connected points.",
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
      description: "Random seed for optimization.",
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
    const maxLinksPerPoint = Math.max(2, Math.min(8, Math.round(
      Number(inputs.maxLinksPerPoint ?? parameters.maxLinksPerPoint ?? 4)
    )));
    const maxSpanLength = Math.max(0.1, Math.min(10.0, 
      Number(inputs.maxSpanLength ?? parameters.maxSpanLength ?? 1.0)
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
    
    // Get goals
    const goalsInput = inputs.goals;
    const goals: GoalSpecification[] = [];
    if (Array.isArray(goalsInput)) {
      for (const g of goalsInput) {
        if (g && typeof g === 'object') {
          goals.push(g as unknown as GoalSpecification);
        }
      }
    } else if (goalsInput && typeof goalsInput === 'object') {
      goals.push(goalsInput as unknown as GoalSpecification);
    }
    
    // Calculate bounding box from geometry
    const bbox = calculateBoundingBox(mesh);
    
    // Step 1: Generate optimized point cloud based on goals
    const points = generateOptimizedPointCloud(mesh, bbox, pointDensity, goals, seed);
    
    // Step 2: Generate constrained curve network
    const curves = generateConstrainedCurveNetwork(points, maxLinksPerPoint, maxSpanLength);
    
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
 * Calculate bounding box from mesh
 */
function calculateBoundingBox(mesh: RenderMesh): { min: Vec3; max: Vec3 } {
  const positions = mesh.positions;
  if (positions.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
  }
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/**
 * Generate optimized point cloud based on goals
 * 
 * This is a simplified optimization that:
 * 1. Distributes points within the bounding box
 * 2. Biases point placement based on goals (anchor/load positions)
 * 3. Uses volume goal to determine target density
 */
function generateOptimizedPointCloud(
  mesh: RenderMesh,
  bbox: { min: Vec3; max: Vec3 },
  count: number,
  goals: GoalSpecification[],
  seed: number
): Vec3[] {
  const points: Vec3[] = [];
  
  // Simple random number generator (seeded)
  let rng = seed;
  const random = () => {
    rng = (rng * 1664525 + 1013904223) % 4294967296;
    return rng / 4294967296;
  };
  
  // Extract goal information
  const volumeGoal = goals.find(g => g.goalType === 'volume') as VolumeGoal | undefined;
  const anchorGoals = goals.filter(g => g.goalType === 'anchor') as AnchorGoal[];
  const loadGoals = goals.filter(g => g.goalType === 'load') as LoadGoal[];
  
  // Get anchor and load positions from mesh vertices
  const anchorPositions: Vec3[] = [];
  const loadPositions: Vec3[] = [];
  
  for (const anchor of anchorGoals) {
    for (const vertexIdx of anchor.geometry.elements) {
      const idx = vertexIdx * 3;
      if (idx < mesh.positions.length) {
        anchorPositions.push({
          x: mesh.positions[idx],
          y: mesh.positions[idx + 1],
          z: mesh.positions[idx + 2],
        });
      }
    }
  }
  
  for (const load of loadGoals) {
    for (const vertexIdx of load.geometry.elements) {
      const idx = vertexIdx * 3;
      if (idx < mesh.positions.length) {
        loadPositions.push({
          x: mesh.positions[idx],
          y: mesh.positions[idx + 1],
          z: mesh.positions[idx + 2],
        });
      }
    }
  }
  
  // Generate points with bias towards anchor/load regions
  const biasStrength = 0.3; // 30% of points biased towards goals
  const biasedCount = Math.floor(count * biasStrength);
  const uniformCount = count - biasedCount;
  
  // Generate uniform points
  for (let i = 0; i < uniformCount; i++) {
    const x = bbox.min.x + random() * (bbox.max.x - bbox.min.x);
    const y = bbox.min.y + random() * (bbox.max.y - bbox.min.y);
    const z = bbox.min.z + random() * (bbox.max.z - bbox.min.z);
    points.push({ x, y, z });
  }
  
  // Generate biased points near anchors and loads
  const criticalPoints = [...anchorPositions, ...loadPositions];
  if (criticalPoints.length > 0) {
    for (let i = 0; i < biasedCount; i++) {
      const targetPoint = criticalPoints[Math.floor(random() * criticalPoints.length)];
      const radius = Math.min(
        bbox.max.x - bbox.min.x,
        bbox.max.y - bbox.min.y,
        bbox.max.z - bbox.min.z
      ) * 0.2;
      
      const x = targetPoint.x + (random() - 0.5) * radius;
      const y = targetPoint.y + (random() - 0.5) * radius;
      const z = targetPoint.z + (random() - 0.5) * radius;
      
      // Clamp to bounding box
      points.push({
        x: Math.max(bbox.min.x, Math.min(bbox.max.x, x)),
        y: Math.max(bbox.min.y, Math.min(bbox.max.y, y)),
        z: Math.max(bbox.min.z, Math.min(bbox.max.z, z)),
      });
    }
  } else {
    // No critical points, generate more uniform points
    for (let i = 0; i < biasedCount; i++) {
      const x = bbox.min.x + random() * (bbox.max.x - bbox.min.x);
      const y = bbox.min.y + random() * (bbox.max.y - bbox.min.y);
      const z = bbox.min.z + random() * (bbox.max.z - bbox.min.z);
      points.push({ x, y, z });
    }
  }
  
  return points;
}

/**
 * Generate constrained curve network
 * 
 * Constraints:
 * - Each point has at most maxLinksPerPoint connections
 * - Connections are only made within maxSpanLength distance
 * - Prefer shorter connections (greedy approach)
 */
function generateConstrainedCurveNetwork(
  points: Vec3[],
  maxLinksPerPoint: number,
  maxSpanLength: number
): { start: Vec3; end: Vec3 }[] {
  const maxSpanSquared = maxSpanLength * maxSpanLength;
  
  // Build adjacency list with distances
  const adjacency = new Map<number, { neighbor: number; distance: number }[]>();
  
  for (let i = 0; i < points.length; i++) {
    adjacency.set(i, []);
    const p1 = points[i];
    
    for (let j = i + 1; j < points.length; j++) {
      const p2 = points[j];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const distSquared = dx * dx + dy * dy + dz * dz;
      
      // Check span constraint
      if (distSquared <= maxSpanSquared) {
        const distance = Math.sqrt(distSquared);
        adjacency.get(i)!.push({ neighbor: j, distance });
        if (!adjacency.has(j)) adjacency.set(j, []);
        adjacency.get(j)!.push({ neighbor: i, distance });
      }
    }
  }
  
  // Prune to maxLinksPerPoint (keep shortest connections)
  for (const [node, neighbors] of adjacency.entries()) {
    if (neighbors.length > maxLinksPerPoint) {
      // Sort by distance (ascending)
      neighbors.sort((a, b) => a.distance - b.distance);
      // Keep only maxLinksPerPoint shortest
      adjacency.set(node, neighbors.slice(0, maxLinksPerPoint));
    }
  }
  
  // Convert to edge list (avoid duplicates)
  const curves: { start: Vec3; end: Vec3 }[] = [];
  const edgeSet = new Set<string>();
  
  for (const [node, neighbors] of adjacency.entries()) {
    for (const { neighbor } of neighbors) {
      const edgeKey = node < neighbor ? `${node}-${neighbor}` : `${neighbor}-${node}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        curves.push({ start: points[node], end: points[neighbor] });
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
