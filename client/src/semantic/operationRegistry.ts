/**
 * Global registry for geometry operations
 * 
 * This module provides a centralized registry for all geometry operations,
 * enabling validation, documentation generation, and runtime introspection.
 */

import type { GeometryOpFn, GeometryOpMeta, OpCategory, OpTag } from './geometryOp';

/**
 * Registry for geometry operations
 */
export class OperationRegistry {
  private ops = new Map<string, GeometryOpFn<any>>();

  /**
   * Registers a geometry operation
   * 
   * @param op - The operation to register
   * @throws Error if operation ID is already registered
   */
  register(op: GeometryOpFn<any>): void {
    const id = op.meta.id;
    
    if (this.ops.has(id)) {
      throw new Error(`Duplicate operation id: ${id}`);
    }
    
    this.ops.set(id, op);
  }

  /**
   * Gets an operation by ID
   * 
   * @param id - The operation ID
   * @returns The operation function
   * @throws Error if operation is not found
   */
  get(id: string): GeometryOpFn<any> {
    const op = this.ops.get(id);
    
    if (!op) {
      throw new Error(`Unknown operation id: ${id}`);
    }
    
    return op;
  }

  /**
   * Checks if an operation is registered
   * 
   * @param id - The operation ID
   * @returns True if operation is registered
   */
  has(id: string): boolean {
    return this.ops.has(id);
  }

  /**
   * Lists all registered operations
   * 
   * @returns Array of all operations
   */
  list(): GeometryOpFn<any>[] {
    return [...this.ops.values()];
  }

  /**
   * Lists all operation metadata
   * 
   * @returns Array of all operation metadata
   */
  listMeta(): GeometryOpMeta[] {
    return this.list().map(op => op.meta);
  }

  /**
   * Filters operations by category
   * 
   * @param category - The category to filter by
   * @returns Array of operations in the category
   */
  byCategory(category: OpCategory): GeometryOpFn<any>[] {
    return this.list().filter(op => op.meta.category === category);
  }

  /**
   * Filters operations by tag
   * 
   * @param tag - The tag to filter by
   * @returns Array of operations with the tag
   */
  byTag(tag: OpTag): GeometryOpFn<any>[] {
    return this.list().filter(op => op.meta.tags.includes(tag));
  }

  /**
   * Validates the registry
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

    for (const op of this.list()) {
      const meta = op.meta;

      // Check for missing optional fields
      if (!meta.summary) {
        warnings.push(`Operation ${meta.id} is missing a summary`);
      }

      if (!meta.complexity) {
        warnings.push(`Operation ${meta.id} is missing complexity information`);
      }

      // Check for invalid dependencies
      if (meta.deps) {
        for (const depId of meta.deps) {
          if (!this.has(depId)) {
            errors.push(`Operation ${meta.id} depends on unknown operation ${depId}`);
          }
        }
      }

      // Check for circular dependencies (simple check)
      if (meta.deps && meta.deps.includes(meta.id)) {
        errors.push(`Operation ${meta.id} has a circular dependency on itself`);
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
  toJSON(): Record<string, GeometryOpMeta> {
    const result: Record<string, GeometryOpMeta> = {};
    
    for (const op of this.list()) {
      result[op.meta.id] = op.meta;
    }
    
    return result;
  }

  /**
   * Gets dependency graph as DOT format
   * 
   * @returns DOT format string for visualization
   */
  toDOT(): string {
    const lines: string[] = ['digraph GeometryOperations {'];
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');
    lines.push('');

    // Add nodes
    for (const op of this.list()) {
      const label = op.meta.name.replace(/"/g, '\\"');
      const color = this.getCategoryColor(op.meta.category);
      lines.push(`  "${op.meta.id}" [label="${label}", fillcolor="${color}", style=filled];`);
    }

    lines.push('');

    // Add edges
    for (const op of this.list()) {
      if (op.meta.deps) {
        for (const depId of op.meta.deps) {
          lines.push(`  "${depId}" -> "${op.meta.id}";`);
        }
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  private getCategoryColor(category: OpCategory): string {
    const colors: Record<OpCategory, string> = {
      primitive: '#FFE6CC',      // Light orange
      modifier: '#CCE5FF',       // Light blue
      tessellation: '#E6CCFF',   // Light purple
      transform: '#CCFFCC',      // Light green
      analysis: '#FFCCCC',       // Light red
      utility: '#FFFFCC',        // Light yellow
      io: '#CCFFFF'              // Light cyan
    };
    return colors[category] || '#FFFFFF';
  }
}

/**
 * Global operation registry instance
 */
export const operationRegistry = new OperationRegistry();
