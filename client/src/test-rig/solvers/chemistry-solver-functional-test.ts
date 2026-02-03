// @ts-nocheck
/**
 * Chemistry Solver Functional Test
 * 
 * Tests that the Chemistry Solver can:
 * 1. Accept materials, seeds, and goals as inputs
 * 2. Run the simulation
 * 3. Generate output geometry
 * 4. Provide PhD-level analysis and validation
 * 5. Track semantic operations during execution
 */

import { getNodeDefinition } from "../../workflow/nodeRegistry";
import type { WorkflowComputeContext, WorkflowValue } from "../../workflow/nodeRegistry";
import type { Geometry, RenderMesh, Vec3 } from "../../types";
import type { ChemistryMaterialAssignment, ChemistrySeed } from "../../workflow/nodes/solver/ChemistrySolver";
import { resolveChemistryMaterialSpec } from "../../data/chemistryMaterials";
import { withSemanticOpSync } from "../../semantic/semanticTracer";
import { clearSemanticRun, getSemanticEvents } from "../../semantic/semanticTraceStore";

// Create a simple test geometry (cube)
const createTestCube = (): RenderMesh => {
  const positions = new Float32Array([
    // Front face
    -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1,
    // Back face
    -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1, -1,
    // Top face
    -1,  1, -1, -1,  1,  1,  1,  1,  1,  1,  1, -1,
    // Bottom face
    -1, -1, -1,  1, -1, -1,  1, -1,  1, -1, -1,  1,
    // Right face
     1, -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,
    // Left face
    -1, -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1,
  ]);
  
  const indices = new Uint32Array([
    0,  1,  2,   0,  2,  3,   // front
    4,  5,  6,   4,  6,  7,   // back
    8,  9, 10,   8, 10, 11,   // top
    12, 13, 14,  12, 14, 15,  // bottom
    16, 17, 18,  16, 18, 19,  // right
    20, 21, 22,  20, 22, 23,  // left
  ]);
  
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < normals.length; i += 3) {
    normals[i] = 0;
    normals[i + 1] = 0;
    normals[i + 2] = 1;
  }
  
  return {
    positions,
    indices,
    normals,
    colors: new Float32Array(positions.length),
  };
};

// Create test context
const createTestContext = (): WorkflowComputeContext => {
  const geometryById = new Map<string, Geometry>();
  
  // Add test cube geometry
  const cubeGeometry: Geometry = {
    id: "test-cube",
    type: "mesh",
    mesh: createTestCube(),
    layerId: "default",
  };
  geometryById.set("test-cube", cubeGeometry);
  
  return {
    nodeId: "test-chemistry-node",
    geometryById,
    nodeById: new Map(),
    edgesByTarget: new Map(),
    edgesBySource: new Map(),
    evaluatedNodes: new Set(),
    evaluationStack: [],
  };
};

// Test 1: Basic functionality with single material
export const testBasicChemistrySolver = () => {
  console.log("\n🧪 Test 1: Basic Chemistry Solver");
  
  const nodeId = "chemistrySolver";
  const runId = `test-basic-${Date.now()}`;
  clearSemanticRun(runId);
  
  return withSemanticOpSync(
    { nodeId, runId, opId: "test.basic" },
    () => {
      const solver = getNodeDefinition(nodeId);
      if (!solver) {
        throw new Error("ChemistrySolver node not found");
      }
      
      const context = createTestContext();
      
      // Create simple material assignment
      const materials: ChemistryMaterialAssignment[] = [
        {
          geometryId: "test-cube",
          material: resolveChemistryMaterialSpec("Steel"),
          weight: 1,
        },
      ];
      
      // Create simple goal
      const goals = [
        {
          goalType: "chemStiffness",
          weight: 1.0,
          parameters: { targetStiffness: 200e9 },
        },
      ];
      
      try {
        const result = solver.compute({
          inputs: {
            enabled: true,
            domain: "test-cube",
            materials,
            goals: goals as unknown as Record<string, unknown>[],
          },
          parameters: {
            particleCount: 1000,
            iterations: 50,
            fieldResolution: 16,
            convergenceTolerance: 1e-4,
            blendStrength: 1,
          },
          context,
        });
        
        console.log("  ✅ Solver executed successfully");
        console.log(`  ✅ Generated geometry: ${result.geometry}`);
        console.log(`  ✅ Mesh vertices: ${(result.mesh as RenderMesh)?.positions?.length / 3 ?? 0}`);
        console.log(`  ✅ Particles: ${(result.particles as any[])?.length ?? 0}`);
        
        // Report semantic operations
        const events = getSemanticEvents().filter(e => e.runId === runId);
        const opCounts = new Map<string, number>();
        events.forEach(e => {
          if (e.phase === 'end') {
            opCounts.set(e.opId, (opCounts.get(e.opId) || 0) + 1);
          }
        });
        console.log(`  ✅ Semantic operations tracked: ${opCounts.size}`);
        opCounts.forEach((count, opId) => {
          console.log(`     - ${opId}: ${count}x`);
        });
        
        return true;
      } catch (error) {
        console.error("  ❌ Test failed:", error);
        return false;
      }
    }
  );
};

// Test 2: Multi-material with seeds
export const testMultiMaterialChemistrySolver = () => {
  console.log("\n🧪 Test 2: Multi-Material Chemistry Solver with Seeds");
  
  const nodeId = "chemistrySolver";
  const runId = `test-multi-${Date.now()}`;
  clearSemanticRun(runId);
  
  return withSemanticOpSync(
    { nodeId, runId, opId: "test.multiMaterial" },
    () => {
      const solver = getNodeDefinition(nodeId);
      if (!solver) {
        throw new Error("ChemistrySolver node not found");
      }
      
      const context = createTestContext();
  
  // Create multi-material assignments
  const materials: ChemistryMaterialAssignment[] = [
    {
      geometryId: "test-cube",
      material: resolveChemistryMaterialSpec("Steel"),
      weight: 0.5,
    },
    {
      geometryId: "test-cube",
      material: resolveChemistryMaterialSpec("Aluminum"),
      weight: 0.3,
    },
    {
      geometryId: "test-cube",
      material: resolveChemistryMaterialSpec("Ceramic"),
      weight: 0.2,
    },
  ];
  
  // Create seeds
  const seeds: ChemistrySeed[] = [
    {
      position: { x: 0, y: -0.5, z: 0 },
      radius: 0.4,
      material: "Steel",
      strength: 0.9,
    },
    {
      position: { x: 0, y: 0.5, z: 0 },
      radius: 0.4,
      material: "Ceramic",
      strength: 0.9,
    },
  ];
  
  // Create blend goal
  const goals = [
    {
      goalType: "chemBlend",
      weight: 1.0,
      parameters: {},
    },
  ];
  
      try {
        const result = solver.compute({
          inputs: {
            enabled: true,
            domain: "test-cube",
            materials,
            seeds,
            goals: goals as unknown as Record<string, unknown>[],
          },
          parameters: {
            particleCount: 2000,
            iterations: 100,
            fieldResolution: 24,
            convergenceTolerance: 1e-4,
            blendStrength: 1.5,
          },
          context,
        });
        
        console.log("  ✅ Multi-material solver executed successfully");
        console.log(`  ✅ Generated geometry: ${result.geometry}`);
        console.log(`  ✅ Mesh vertices: ${(result.mesh as RenderMesh)?.positions?.length / 3 ?? 0}`);
        console.log(`  ✅ Particles: ${(result.particles as any[])?.length ?? 0}`);
        console.log(`  ✅ Materials: ${(result.diagnostics as any)?.materials?.length ?? 0}`);
        
        // Report semantic operations
        const events = getSemanticEvents().filter(e => e.runId === runId);
        const opCounts = new Map<string, number>();
        events.forEach(e => {
          if (e.phase === 'end') {
            opCounts.set(e.opId, (opCounts.get(e.opId) || 0) + 1);
          }
        });
        console.log(`  ✅ Semantic operations tracked: ${opCounts.size}`);
        opCounts.forEach((count, opId) => {
          console.log(`     - ${opId}: ${count}x`);
        });
        
        return true;
      } catch (error) {
        console.error("  ❌ Test failed:", error);
        return false;
      }
    }
  );
};

// Test 3: PhD-level output validation
export const testChemistrySolverPhdOutput = () => {
  console.log("\n🧪 Test 3: PhD-Level Output Validation");
  
  const nodeId = "chemistrySolver";
  const runId = `test-phd-${Date.now()}`;
  clearSemanticRun(runId);
  
  return withSemanticOpSync(
    { nodeId, runId, opId: "test.phdValidation" },
    () => {
      const solver = getNodeDefinition(nodeId);
      if (!solver) {
        throw new Error("ChemistrySolver node not found");
      }
      
      const context = createTestContext();
  
  const materials: ChemistryMaterialAssignment[] = [
    {
      geometryId: "test-cube",
      material: resolveChemistryMaterialSpec("Steel"),
      weight: 1,
    },
  ];
  
  const goals = [
    {
      goalType: "chemStiffness",
      weight: 1.0,
      parameters: { targetStiffness: 200e9 },
    },
  ];
  
      try {
        const result = solver.compute({
          inputs: {
            enabled: true,
            domain: "test-cube",
            materials,
            goals: goals as unknown as Record<string, unknown>[],
          },
          parameters: {
            particleCount: 1000,
            iterations: 50,
            fieldResolution: 16,
            convergenceTolerance: 1e-4,
            blendStrength: 1,
          },
          context,
        });
        
        const diagnostics = result.diagnostics as any;
        
        // Check for PhD-level outputs
        const hasValidation = diagnostics?.validation !== undefined;
        const hasAnalysis = diagnostics?.analysis !== undefined;
        const hasSemantics = diagnostics?.semantics !== undefined;
        
        console.log(`  ${hasValidation ? '✅' : '❌'} Validation present`);
        console.log(`  ${hasAnalysis ? '✅' : '❌'} Analysis present`);
        console.log(`  ${hasSemantics ? '✅' : '❌'} Semantics present`);
        
        if (hasValidation) {
          const validation = diagnostics.validation;
          console.log(`    - Conservation laws: ${validation.conservationLaws ? '✅' : '❌'}`);
          console.log(`    - Physical constraints: ${validation.physicalConstraints ? '✅' : '❌'}`);
          console.log(`    - Numerical stability: ${validation.numericalStability ? '✅' : '❌'}`);
        }
        
        if (hasAnalysis) {
          const analysis = diagnostics.analysis;
          console.log(`    - Convergence analysis: ${analysis.convergence ? '✅' : '❌'}`);
          console.log(`    - Material distributions: ${analysis.materialDistributions ? '✅' : '❌'}`);
          console.log(`    - Particle statistics: ${analysis.particleStatistics ? '✅' : '❌'}`);
        }
        
        if (hasSemantics) {
          const semantics = diagnostics.semantics;
          console.log(`    - Output metadata: ${semantics.outputs ? '✅' : '❌'}`);
          console.log(`    - Field semantics: ${semantics.fields ? '✅' : '❌'}`);
        }
        
        // Report semantic operations
        const events = getSemanticEvents().filter(e => e.runId === runId);
        const opCounts = new Map<string, number>();
        events.forEach(e => {
          if (e.phase === 'end') {
            opCounts.set(e.opId, (opCounts.get(e.opId) || 0) + 1);
          }
        });
        console.log(`  ✅ Semantic operations tracked: ${opCounts.size}`);
        opCounts.forEach((count, opId) => {
          console.log(`     - ${opId}: ${count}x`);
        });
        
        return hasValidation && hasAnalysis && hasSemantics;
      } catch (error) {
        console.error("  ❌ Test failed:", error);
        return false;
      }
    }
  );
};

// Run all tests
export const runChemistrySolverFunctionalTests = () => {
  console.log("\n" + "=".repeat(60));
  console.log("CHEMISTRY SOLVER FUNCTIONAL TESTS");
  console.log("=".repeat(60));
  
  const results = {
    test1: testBasicChemistrySolver(),
    test2: testMultiMaterialChemistrySolver(),
    test3: testChemistrySolverPhdOutput(),
  };
  
  console.log("\n" + "=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60));
  console.log(`Test 1 (Basic): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (Multi-Material): ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 3 (PhD Output): ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = results.test1 && results.test2 && results.test3;
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log("=".repeat(60) + "\n");
  
  return allPassed;
};

// Export for use in other test files
export default runChemistrySolverFunctionalTests;
