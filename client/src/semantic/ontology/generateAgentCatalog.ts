/**
 * Agent Catalog Generator
 *
 * Generates agent_capabilities.json from the ontology registry.
 * This catalog enables LLM agents to discover and invoke Lingua operations.
 *
 * Usage:
 *   npx ts-node client/src/semantic/ontology/generateAgentCatalog.ts
 *
 * Output:
 *   docs/semantic/agent_capabilities.json
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'

import { ontologyRegistry } from './registry'
import { migrateOpsModule } from './migration'
import type { AgentCapabilitiesCatalog } from './types'

// Import all operation modules
import * as mathOps from '../ops/mathOps'
import * as vectorOps from '../ops/vectorOps'
import * as logicOps from '../ops/logicOps'
import * as dataOps from '../ops/dataOps'
import * as stringOps from '../ops/stringOps'
import * as colorOps from '../ops/colorOps'
import * as geometryOps from '../ops/geometryOps'
import * as solverOps from '../ops/solverOps'
import * as workflowOps from '../ops/workflowOps'
import * as commandOps from '../ops/commandOps'

// =============================================================================
// MIGRATION: Register all legacy operations
// =============================================================================

function registerAllOperations(): void {
  const modules = [
    { name: 'math', ops: mathOps },
    { name: 'vector', ops: vectorOps },
    { name: 'logic', ops: logicOps },
    { name: 'data', ops: dataOps },
    { name: 'string', ops: stringOps },
    { name: 'color', ops: colorOps },
    { name: 'geometry', ops: geometryOps },
    { name: 'solver', ops: solverOps },
    { name: 'workflow', ops: workflowOps },
    { name: 'command', ops: commandOps },
  ]

  let totalOps = 0
  for (const { name, ops } of modules) {
    const migrated = migrateOpsModule(ops as Record<string, unknown>)
    for (const op of migrated) {
      try {
        ontologyRegistry.registerOperation(op)
        totalOps++
      } catch (e) {
        // Skip duplicates (already registered via seed)
        if (!(e instanceof Error && e.message.includes('Duplicate'))) {
          throw e
        }
      }
    }
    console.log(`  Registered ${migrated.length} operations from ${name}Ops`)
  }

  console.log(`Total operations registered: ${totalOps}`)
}

// =============================================================================
// CATALOG GENERATION
// =============================================================================

function generateCatalog(): AgentCapabilitiesCatalog {
  return ontologyRegistry.toAgentCatalog()
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
  console.log('Generating Agent Capabilities Catalog...\n')

  // Register all operations
  console.log('Registering operations:')
  registerAllOperations()
  console.log()

  // Validate ontology
  const errors = ontologyRegistry.validate()
  if (errors.length > 0) {
    console.warn(`Warning: ${errors.length} validation errors:`)
    for (const err of errors.slice(0, 10)) {
      console.warn(`  - ${err.message}`)
    }
    if (errors.length > 10) {
      console.warn(`  ... and ${errors.length - 10} more`)
    }
    console.log()
  }

  // Generate catalog
  console.log('Generating catalog...')
  const catalog = generateCatalog()

  // Output path
  const outputDir = join(process.cwd(), 'docs', 'semantic')
  const outputPath = join(outputDir, 'agent_capabilities.json')

  // Ensure directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Write catalog
  writeFileSync(outputPath, JSON.stringify(catalog, null, 2))
  console.log(`Wrote catalog to: ${outputPath}`)

  // Print stats
  const stats = ontologyRegistry.stats()
  console.log('\nOntology Statistics:')
  console.log(`  Operations: ${stats.operations}`)
  console.log(`  Data Types: ${stats.datatypes}`)
  console.log(`  Units: ${stats.units}`)
  console.log(`  Solvers: ${stats.solvers}`)
  console.log(`  Goals: ${stats.goals}`)
  console.log(`  Pure Operations: ${stats.pureOps}`)
  console.log(`  Deterministic Operations: ${stats.deterministicOps}`)
  console.log('\nOperations by Domain:')
  for (const [domain, count] of Object.entries(stats.operationsByDomain)) {
    console.log(`  ${domain}: ${count}`)
  }
  console.log('\nOperations by Safety Class:')
  for (const [safety, count] of Object.entries(stats.operationsBySafety)) {
    console.log(`  ${safety}: ${count}`)
  }
}

// Run the generator
main()

export { registerAllOperations, generateCatalog }
