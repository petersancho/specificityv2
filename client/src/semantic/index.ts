/**
 * Semantic layer for Lingua
 * 
 * This module provides the semantic infrastructure for:
 * - Operation registry and metadata (all domains: geometry, math, vector, etc.)
 * - Node-operation linkage
 * - Validation and documentation generation
 * - Runtime introspection
 * - LOC (Lingua Ontology Core) ontology system
 */

// Core semantic operations
export * from './semanticOp';
export * from './operationRegistry';
export * from './nodeSemantics';
export * from './semanticOpIds';
export * from './registerAllOps';

// LOC Ontology System (v2)
export { ontologyRegistry, OntologyRegistry, OntologyError } from './ontology/registry';
export { provenanceStore, withTrace, withTraceAsync, recordTrace } from './ontology/provenance';
export { analyzeCoverage } from './ontology/coverage';
export type { CoverageMetrics, DimensionScore, DomainMetrics } from './ontology/coverage';
export { seedOntology } from './ontology/seed';
export * from './ontology/types';

// Provenance metrics hook (replaces useSemanticMetrics)
export * from './useProvenanceMetrics';
