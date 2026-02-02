/**
 * Semantic linkage between nodes and geometry operations
 * 
 * This module defines the semantic layer for workflow nodes,
 * enabling explicit declaration of which operations a node uses.
 */

import type { WorkflowNodeDefinition } from '../workflow/registry/types';
import { operationRegistry } from './operationRegistry';

/**
 * Semantic linkage metadata for a node
 */
export interface NodeSemanticLinkage {
  /** Node type identifier */
  type: string;
  
  /** IDs of geometry operations this node uses */
  uses: string[];
  
  /** Optional description of how operations are used */
  usage?: string;
}

/**
 * Extended node definition with semantic linkage
 */
export type SemanticNodeDefinition = WorkflowNodeDefinition & {
  /** Semantic linkage metadata */
  semantics?: NodeSemanticLinkage;
};

/**
 * Validates that a node's declared operations exist in the registry
 * 
 * @param node - The node to validate
 * @returns Validation result
 */
export function validateNodeSemantics(node: SemanticNodeDefinition): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!node.semantics) {
    warnings.push(`Node ${node.type} has no semantic linkage declared`);
    return { valid: true, errors, warnings };
  }

  const { uses } = node.semantics;

  // Validate that all declared operations exist
  for (const opId of uses) {
    if (!operationRegistry.has(opId)) {
      errors.push(`Node ${node.type} declares unknown operation: ${opId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Helper to define a node with semantic linkage
 * 
 * @param node - The node definition
 * @returns The node definition with validation
 * 
 * @example
 * ```ts
 * export const BoxNode = defineSemanticNode({
 *   type: 'box',
 *   label: 'Box',
 *   semantics: {
 *     type: 'box',
 *     uses: ['mesh.generateBox']
 *   },
 *   compute: (args) => {
 *     const mesh = generateBoxMesh(args.size);
 *     return { outputs: { meshData: mesh } };
 *   }
 * });
 * ```
 */
export function defineSemanticNode<T extends SemanticNodeDefinition>(node: T): T {
  // Validate in development
  if (process.env.NODE_ENV !== 'production') {
    const validation = validateNodeSemantics(node);
    
    if (!validation.valid) {
      console.error(`Node ${node.type} has semantic errors:`, validation.errors);
      throw new Error(`Invalid node semantics for ${node.type}`);
    }
    
    if (validation.warnings.length > 0) {
      console.warn(`Node ${node.type} has semantic warnings:`, validation.warnings);
    }
  }
  
  return node;
}

/**
 * Registry for node semantic linkages
 */
export class NodeSemanticRegistry {
  private nodes = new Map<string, NodeSemanticLinkage>();

  /**
   * Registers a node's semantic linkage
   * 
   * @param linkage - The semantic linkage to register
   */
  register(linkage: NodeSemanticLinkage): void {
    this.nodes.set(linkage.type, linkage);
  }

  /**
   * Gets a node's semantic linkage
   * 
   * @param type - The node type
   * @returns The semantic linkage, or undefined if not found
   */
  get(type: string): NodeSemanticLinkage | undefined {
    return this.nodes.get(type);
  }

  /**
   * Lists all registered node linkages
   * 
   * @returns Array of all linkages
   */
  list(): NodeSemanticLinkage[] {
    return [...this.nodes.values()];
  }

  /**
   * Finds nodes that use a specific operation
   * 
   * @param opId - The operation ID
   * @returns Array of node types that use the operation
   */
  findNodesUsingOp(opId: string): string[] {
    return this.list()
      .filter(linkage => linkage.uses.includes(opId))
      .map(linkage => linkage.type);
  }

  /**
   * Validates all registered node linkages
   * 
   * @returns Validation results
   */
  validate(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const linkage of this.list()) {
      for (const opId of linkage.uses) {
        if (!operationRegistry.has(opId)) {
          errors.push(`Node ${linkage.type} uses unknown operation: ${opId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Exports registry as JSON
   * 
   * @returns JSON representation of the registry
   */
  toJSON(): Record<string, NodeSemanticLinkage> {
    const result: Record<string, NodeSemanticLinkage> = {};
    
    for (const linkage of this.list()) {
      result[linkage.type] = linkage;
    }
    
    return result;
  }
}

/**
 * Global node semantic registry instance
 */
export const nodeSemanticRegistry = new NodeSemanticRegistry();
