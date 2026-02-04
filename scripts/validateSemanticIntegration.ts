#!/usr/bin/env npx tsx

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  context?: any;
}

interface ValidationResult {
  success: boolean;
  issues: ValidationIssue[];
}

function loadJSON(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function loadYAML(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  return YAML.parse(content);
}

function validateSemanticIntegration(): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  console.log('🔍 Validating Semantic Integration\n');
  console.log('=' .repeat(80));
  
  const agentCatalogPath = path.join(process.cwd(), 'docs/semantic/agent-catalog.json');
  const operationsPath = path.join(process.cwd(), 'docs/semantic/operations.json');
  const agentCapabilitiesPath = path.join(process.cwd(), 'docs/semantic/agent_capabilities.json');
  const schemasDir = path.join(process.cwd(), 'client/src/semantic/schemas');
  
  if (!fs.existsSync(agentCatalogPath)) {
    issues.push({
      severity: 'error',
      category: 'missing_file',
      message: 'Agent catalog not found. Run: npm run generate:agent-catalog'
    });
    return { success: false, issues };
  }
  
  const agentCatalog = loadJSON(agentCatalogPath);
  const operations = loadJSON(operationsPath);
  const agentCapabilities = loadJSON(agentCapabilitiesPath);
  
  console.log('\n📊 Loaded Semantic Files:\n');
  console.log(`  ✓ Agent Catalog: ${Object.keys(agentCatalog.operations).length} operations`);
  console.log(`  ✓ Operations Registry: ${Object.keys(operations).length} operations`);
  console.log(`  ✓ Agent Capabilities: ${Object.keys(agentCapabilities.capabilities || agentCapabilities).length} capabilities`);
  
  console.log('\n🔗 Validating Cross-References:\n');
  
  for (const [opId, catalogEntry] of Object.entries(agentCatalog.operations) as [string, any][]) {
    console.log(`  Checking ${opId}...`);
    
    if (!operations[opId]) {
      issues.push({
        severity: 'error',
        category: 'missing_operation',
        message: `Operation ${opId} in agent catalog but not in operations.json`,
        context: { operationId: opId }
      });
      console.log(`    ❌ Not found in operations.json`);
    } else {
      console.log(`    ✓ Found in operations.json`);
      
      const op = operations[opId];
      if (op.domain !== catalogEntry.domain) {
        issues.push({
          severity: 'warning',
          category: 'domain_mismatch',
          message: `Domain mismatch for ${opId}: catalog="${catalogEntry.domain}", operations="${op.domain}"`,
          context: { operationId: opId }
        });
        console.log(`    ⚠️  Domain mismatch: "${catalogEntry.domain}" vs "${op.domain}"`);
      }
    }
    
    const capabilities = agentCapabilities.capabilities || agentCapabilities;
    if (!capabilities[opId]) {
      issues.push({
        severity: 'warning',
        category: 'missing_capability',
        message: `Operation ${opId} not in agent_capabilities.json`,
        context: { operationId: opId }
      });
      console.log(`    ⚠️  Not found in agent_capabilities.json`);
    } else {
      console.log(`    ✓ Found in agent_capabilities.json`);
    }
    
    const schemaPath = path.join(process.cwd(), catalogEntry.schemaPath);
    if (!fs.existsSync(schemaPath)) {
      issues.push({
        severity: 'error',
        category: 'missing_schema',
        message: `Schema file not found: ${catalogEntry.schemaPath}`,
        context: { operationId: opId, schemaPath: catalogEntry.schemaPath }
      });
      console.log(`    ❌ Schema file not found: ${catalogEntry.schemaPath}`);
    } else {
      console.log(`    ✓ Schema file exists`);
      
      try {
        const schema = loadYAML(schemaPath);
        
        if (schema.operation.id !== opId) {
          issues.push({
            severity: 'error',
            category: 'id_mismatch',
            message: `Schema operation.id "${schema.operation.id}" doesn't match catalog key "${opId}"`,
            context: { operationId: opId, schemaId: schema.operation.id }
          });
          console.log(`    ❌ Schema ID mismatch: "${schema.operation.id}" vs "${opId}"`);
        } else {
          console.log(`    ✓ Schema ID matches`);
        }
        
        if (catalogEntry.parameters.length !== schema.parameters.length) {
          issues.push({
            severity: 'warning',
            category: 'parameter_count_mismatch',
            message: `Parameter count mismatch for ${opId}: catalog=${catalogEntry.parameters.length}, schema=${schema.parameters.length}`,
            context: { operationId: opId }
          });
          console.log(`    ⚠️  Parameter count mismatch: ${catalogEntry.parameters.length} vs ${schema.parameters.length}`);
        } else {
          console.log(`    ✓ Parameter count matches (${catalogEntry.parameters.length})`);
        }
        
        if (catalogEntry.invariants.length !== schema.invariants.length) {
          issues.push({
            severity: 'warning',
            category: 'invariant_count_mismatch',
            message: `Invariant count mismatch for ${opId}: catalog=${catalogEntry.invariants.length}, schema=${schema.invariants.length}`,
            context: { operationId: opId }
          });
          console.log(`    ⚠️  Invariant count mismatch: ${catalogEntry.invariants.length} vs ${schema.invariants.length}`);
        } else {
          console.log(`    ✓ Invariant count matches (${catalogEntry.invariants.length})`);
        }
        
      } catch (error) {
        issues.push({
          severity: 'error',
          category: 'schema_parse_error',
          message: `Failed to parse schema: ${error}`,
          context: { operationId: opId, schemaPath: catalogEntry.schemaPath }
        });
        console.log(`    ❌ Failed to parse schema: ${error}`);
      }
    }
    
    console.log('');
  }
  
  console.log('🔍 Validating Ontological Completeness:\n');
  
  for (const [opId, catalogEntry] of Object.entries(agentCatalog.operations) as [string, any][]) {
    console.log(`  ${opId}:`);
    
    const capabilities = catalogEntry.capabilities;
    
    if (!capabilities.canValidateInputs) {
      issues.push({
        severity: 'info',
        category: 'no_input_validation',
        message: `Operation ${opId} has no input validation`,
        context: { operationId: opId }
      });
      console.log(`    ℹ️  No input validation`);
    } else {
      console.log(`    ✓ Can validate inputs (${catalogEntry.inputs.length} inputs)`);
    }
    
    if (!capabilities.canValidateOutputs) {
      issues.push({
        severity: 'info',
        category: 'no_output_validation',
        message: `Operation ${opId} has no output validation`,
        context: { operationId: opId }
      });
      console.log(`    ℹ️  No output validation`);
    } else {
      console.log(`    ✓ Can validate outputs (${catalogEntry.outputs.length} outputs)`);
    }
    
    if (!capabilities.hasInvariants) {
      issues.push({
        severity: 'warning',
        category: 'no_invariants',
        message: `Operation ${opId} has no mathematical invariants`,
        context: { operationId: opId }
      });
      console.log(`    ⚠️  No mathematical invariants`);
    } else {
      console.log(`    ✓ Has invariants (${catalogEntry.invariants.length} invariants)`);
      
      const preconditions = catalogEntry.invariants.filter((inv: any) => inv.type === 'precondition').length;
      const postconditions = catalogEntry.invariants.filter((inv: any) => inv.type === 'postcondition').length;
      const invariants = catalogEntry.invariants.filter((inv: any) => inv.type === 'invariant').length;
      
      console.log(`      - ${preconditions} precondition(s)`);
      console.log(`      - ${postconditions} postcondition(s)`);
      console.log(`      - ${invariants} invariant(s)`);
    }
    
    if (!capabilities.hasMathematicalModel) {
      issues.push({
        severity: 'warning',
        category: 'no_math_model',
        message: `Operation ${opId} has no mathematical model`,
        context: { operationId: opId }
      });
      console.log(`    ⚠️  No mathematical model`);
    } else {
      console.log(`    ✓ Has mathematical model`);
    }
    
    if (!capabilities.isVersioned) {
      issues.push({
        severity: 'warning',
        category: 'not_versioned',
        message: `Operation ${opId} is not versioned`,
        context: { operationId: opId }
      });
      console.log(`    ⚠️  Not versioned`);
    } else {
      console.log(`    ✓ Versioned (${catalogEntry.schemaVersion})`);
    }
    
    console.log('');
  }
  
  console.log('=' .repeat(80));
  console.log('\n📋 Validation Summary\n');
  
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');
  
  if (errors.length > 0) {
    console.log(`❌ Errors (${errors.length}):`);
    errors.forEach(e => console.log(`  - [${e.category}] ${e.message}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(w => console.log(`  - [${w.category}] ${w.message}`));
    console.log('');
  }
  
  if (infos.length > 0) {
    console.log(`ℹ️  Info (${infos.length}):`);
    infos.forEach(i => console.log(`  - [${i.category}] ${i.message}`));
    console.log('');
  }
  
  const success = errors.length === 0;
  
  if (success) {
    console.log('✅ All semantic integration validations passed!\n');
    console.log('🤖 AI agents can now:');
    console.log('   - Discover operations through agent-catalog.json');
    console.log('   - Validate parameters using YAML schemas');
    console.log('   - Understand mathematical constraints via invariants');
    console.log('   - Navigate the codebase ontologically');
    console.log('   - Suggest fixes based on validation rules');
    console.log('');
  } else {
    console.log('❌ Semantic integration validation failed!\n');
  }
  
  return { success, issues };
}

const result = validateSemanticIntegration();
process.exit(result.success ? 0 : 1);
