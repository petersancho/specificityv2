/**
 * Register all semantic operations
 * 
 * This module registers all semantic operations from all domains
 * into the global operation registry.
 */

import { operationRegistry } from './operationRegistry';
import { MATH_OPS } from './ops/mathOps';
import { VECTOR_OPS } from './ops/vectorOps';
import { LOGIC_OPS } from './ops/logicOps';
import { DATA_OPS } from './ops/dataOps';
import { STRING_OPS } from './ops/stringOps';
import { COLOR_OPS } from './ops/colorOps';
import { WORKFLOW_OPS } from './ops/workflowOps';
import { SOLVER_OPS } from './ops/solverOps';
import { COMMAND_OPS } from './ops/commandOps';
import { GEOMETRY_OPS } from './ops/geometryOps';

/**
 * Registers all semantic operations into the global registry
 * 
 * This should be called once at application startup.
 */
export function registerAllSemanticOps(): void {
  // Register all operation metadata
  operationRegistry.registerMetaBatch(MATH_OPS);
  operationRegistry.registerMetaBatch(VECTOR_OPS);
  operationRegistry.registerMetaBatch(LOGIC_OPS);
  operationRegistry.registerMetaBatch(DATA_OPS);
  operationRegistry.registerMetaBatch(STRING_OPS);
  operationRegistry.registerMetaBatch(COLOR_OPS);
  operationRegistry.registerMetaBatch(WORKFLOW_OPS);
  operationRegistry.registerMetaBatch(SOLVER_OPS);
  operationRegistry.registerMetaBatch(COMMAND_OPS);
  operationRegistry.registerMetaBatch(GEOMETRY_OPS);
  
  // Geometry operations are already registered via their wrapper modules
  // (meshOps, meshTessellationOps, etc.) when they're imported
}

// Auto-register on module load
registerAllSemanticOps();
