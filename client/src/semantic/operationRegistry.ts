/**
 * Global registry for all semantic operations
 * 
 * This module provides a centralized registry for all semantic operations,
 * enabling validation, documentation generation, and runtime introspection.
 */

import type { SemanticOpFn, SemanticOpMeta, OpCategory, OpTag } from './semanticOp';

/**
 * Registry for semantic operations
 */
export class OperationRegistry {
  private ops = new Map<string, SemanticOpFn<any>>();
  private metadata = new Map<string, SemanticOpMeta>();

  /**
   * Registers a semantic operation (function with metadata)
   * 
   * @param op - The operation to register
   * @throws Error if operation ID is already registered
   */
  register(op: SemanticOpFn<any>): void {
    const id = op.meta.id;
    
    if (this.ops.has(id) || this.metadata.has(id)) {
      throw new Error(`Duplicate operation id: ${id}`);
    }
    
    this.ops.set(id, op);
    this.metadata.set(id, op.meta);
  }

  /**
   * Registers operation metadata only (for operations without wrapped functions)
   * 
   * @param meta - The operation metadata
   * @throws Error if operation ID is already registered
   */
  registerMeta(meta: SemanticOpMeta): void {
    const id = meta.id;
    
    if (this.ops.has(id) || this.metadata.has(id)) {
      throw new Error(`Duplicate operation id: ${id}`);
    }
    
    this.metadata.set(id, meta);
  }

  /**
   * Registers multiple operation metadata entries
   * 
   * @param metas - Array of operation metadata
   */
  registerMetaBatch(metas: readonly SemanticOpMeta[]): void {
    for (const meta of metas) {
      this.registerMeta(meta);
    }
  }

  /**
   * Gets an operation by ID
   * 
   * @param id - The operation ID
   * @returns The operation function
   * @throws Error if operation is not found
   */
  get(id: string): SemanticOpFn<any> {
    const op = this.ops.get(id);
    
    if (!op) {
      throw new Error(`Unknown operation id: ${id}`);
    }
    
    return op;
  }

  /**
   * Gets operation metadata by ID
   * 
   * @param id - The operation ID
   * @returns The operation metadata
   * @throws Error if operation is not found
   */
  getMeta(id: string): SemanticOpMeta {
    const meta = this.metadata.get(id);
    
    if (!meta) {
      throw new Error(`Unknown operation id: ${id}`);
    }
    
    return meta;
  }

  /**
   * Checks if an operation is registered
   * 
   * @param id - The operation ID
   * @returns True if operation is registered
   */
  has(id: string): boolean {
    return this.metadata.has(id);
  }

  /**
   * Lists all registered operations
   * 
   * @returns Array of all operations
   */
  list(): SemanticOpFn<any>[] {
    return Array.from(this.ops.values());
  }

  /**
   * Lists all operation metadata
   * 
   * @returns Array of all operation metadata
   */
  listMeta(): SemanticOpMeta[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Filters operations by category
   * 
   * @param category - The category to filter by
   * @returns Array of operations in the category
   */
  byCategory(category: OpCategory): SemanticOpFn<any>[] {
    return this.list().filter(op => op.meta.category === category);
  }

  /**
   * Filters operations by tag
   * 
   * @param tag - The tag to filter by
   * @returns Array of operations with the tag
   */
  byTag(tag: OpTag): SemanticOpFn<any>[] {
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
  toJSON(): Record<string, SemanticOpMeta> {
    const result: Record<string, SemanticOpMeta> = {};
    
    for (const meta of this.listMeta()) {
      result[meta.id] = meta;
    }
    
    return result;
  }

  /**
   * Gets dependency graph as DOT format
   * 
   * @returns DOT format string for visualization
   */
  toDOT(): string {
    const lines: string[] = ['digraph SemanticOperations {'];
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');
    lines.push('');

    // Add nodes
    for (const meta of this.listMeta()) {
      const label = meta.name.replace(/"/g, '\\"');
      const color = this.getCategoryColor(meta.category);
      lines.push(`  "${meta.id}" [label="${label}", fillcolor="${color}", style=filled];`);
    }

    lines.push('');

    // Add edges
    for (const meta of this.listMeta()) {
      if (meta.deps) {
        for (const depId of meta.deps) {
          lines.push(`  "${depId}" -> "${meta.id}";`);
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
      io: '#CCFFFF',             // Light cyan
      operator: '#FFE6E6',       // Light pink
      aggregation: '#E6FFE6',    // Light mint
      control: '#FFE6FF',        // Light magenta
      ui: '#E6E6FF',             // Light lavender
      creation: '#FFD9CC',       // Light peach
      operation: '#CCE6FF',      // Light sky blue
      conversion: '#E6FFCC'      // Light lime
    };
    return colors[category] || '#FFFFFF';
  }
}

/**
 * Global operation registry instance
 */
export const operationRegistry = new OperationRegistry();
