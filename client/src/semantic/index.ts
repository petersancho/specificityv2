/**
 * Semantic layer for Lingua
 * 
 * This module provides the semantic infrastructure for:
 * - Operation registry and metadata (all domains: geometry, math, vector, etc.)
 * - Node-operation linkage
 * - Validation and documentation generation
 * - Runtime introspection
 */

export * from './semanticOp';
export * from './operationRegistry';
export * from './nodeSemantics';
export * from './semanticOpIds';
export * from './registerAllOps';
export * from './uiSemantics';
export * from './uiColorTokens';
export * from './uiShadowTokens';
export * from './uiSpacingTokens';
export * from './uiStickerRegistry';
export * from './uiSemanticRegistry';
