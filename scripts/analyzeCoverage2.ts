#!/usr/bin/env tsx
/**
 * Coverage 2.0 CLI
 *
 * Analyzes semantic coverage and checks CI gates.
 *
 * Usage:
 *   npm run analyze:coverage2
 *   npm run analyze:coverage2 -- --ci
 */

import {
  analyzeCoverage,
  formatCoverageReport,
  checkGates,
  DEFAULT_GATES,
} from '../client/src/semantic/ontology/coverage'

const args = process.argv.slice(2)
const ciMode = args.includes('--ci')

// Analyze coverage
console.log('Analyzing semantic coverage...\n')
const metrics = analyzeCoverage()

// Print report
console.log(formatCoverageReport(metrics))

// CI gate check
if (ciMode) {
  console.log('\nCI Gate Check:')
  console.log('─────────────────────────────────────────────────────────────────')

  const { passed, failures } = checkGates(metrics, DEFAULT_GATES)

  if (passed) {
    console.log('✅ All gates passed!')
    process.exit(0)
  } else {
    console.log('❌ Gates failed:')
    for (const f of failures) {
      console.log(`  - ${f}`)
    }
    process.exit(1)
  }
}
