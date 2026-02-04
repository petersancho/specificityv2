#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

interface SchemaParameter {
  name: string;
  type: string;
  unit?: string;
  default: any;
  description: string;
  constraints?: Array<{
    type: string;
    value?: any;
    message?: string;
  }>;
}

interface SchemaInput {
  name: string;
  type: string;
  description: string;
  required: boolean;
  validation?: string[];
}

interface SchemaOutput {
  name: string;
  type: string;
  description: string;
  postconditions?: string[];
}

interface SchemaInvariant {
  type: string;
  name: string;
  expression: string;
  description: string;
}

interface Schema {
  meta: {
    schemaVersion: string;
    linguaVersion: string;
    description: string;
  };
  operation: {
    id: string;
    name: string;
    domain: string;
    category: string;
    tags: string[];
  };
  parameters: SchemaParameter[];
  inputs: SchemaInput[];
  outputs: SchemaOutput[];
  invariants: SchemaInvariant[];
}

interface AgentCatalogEntry {
  operationId: string;
  name: string;
  domain: string;
  category: string;
  description: string;
  schemaVersion: string;
  schemaPath: string;
  
  parameters: {
    name: string;
    type: string;
    unit?: string;
    default: any;
    description: string;
    constraints: string[];
  }[];
  
  inputs: {
    name: string;
    type: string;
    description: string;
    required: boolean;
    validations: string[];
  }[];
  
  outputs: {
    name: string;
    type: string;
    description: string;
    postconditions: string[];
  }[];
  
  invariants: {
    type: 'precondition' | 'postcondition' | 'invariant';
    name: string;
    expression: string;
    description: string;
  }[];
  
  tags: string[];
  
  capabilities: {
    canValidateInputs: boolean;
    canValidateOutputs: boolean;
    hasInvariants: boolean;
    hasMathematicalModel: boolean;
    isVersioned: boolean;
  };
}

interface AgentCatalog {
  version: string;
  generated: string;
  description: string;
  operations: Record<string, AgentCatalogEntry>;
}

function loadSchema(schemaPath: string): Schema {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  return YAML.parse(content);
}

function generateCatalogEntry(schema: Schema, schemaPath: string): AgentCatalogEntry {
  return {
    operationId: schema.operation.id,
    name: schema.operation.name,
    domain: schema.operation.domain,
    category: schema.operation.category,
    description: schema.meta.description,
    schemaVersion: schema.meta.schemaVersion,
    schemaPath: schemaPath,
    
    parameters: schema.parameters.map(p => ({
      name: p.name,
      type: p.type,
      unit: p.unit,
      default: p.default,
      description: p.description,
      constraints: (p.constraints || []).map(c => {
        if (c.type === 'range') {
          return `${p.name} ∈ [${c.value[0]}, ${c.value[1]}]`;
        } else if (c.type === 'min') {
          return `${p.name} ≥ ${c.value}`;
        } else if (c.type === 'max') {
          return `${p.name} ≤ ${c.value}`;
        } else if (c.type === 'enum') {
          return `${p.name} ∈ {${c.value.join(', ')}}`;
        } else if (c.type === 'custom') {
          return c.message || 'custom constraint';
        }
        return 'unknown constraint';
      })
    })),
    
    inputs: schema.inputs.map(i => ({
      name: i.name,
      type: i.type,
      description: i.description,
      required: i.required,
      validations: i.validation || []
    })),
    
    outputs: schema.outputs.map(o => ({
      name: o.name,
      type: o.type,
      description: o.description,
      postconditions: o.postconditions || []
    })),
    
    invariants: schema.invariants.map(inv => ({
      type: inv.type as 'precondition' | 'postcondition' | 'invariant',
      name: inv.name,
      expression: inv.expression,
      description: inv.description
    })),
    
    tags: schema.operation.tags,
    
    capabilities: {
      canValidateInputs: schema.inputs.length > 0,
      canValidateOutputs: schema.outputs.length > 0,
      hasInvariants: schema.invariants.length > 0,
      hasMathematicalModel: schema.invariants.some(inv => inv.expression.length > 0),
      isVersioned: schema.meta.schemaVersion !== undefined
    }
  };
}

function generateAgentCatalog(): void {
  console.log('🤖 Generating AI Agent Catalog from YAML Schemas\n');
  console.log('=' .repeat(80));
  
  const schemasDir = path.join(process.cwd(), 'client/src/semantic/schemas');
  const outputPath = path.join(process.cwd(), 'docs/semantic/agent-catalog.json');
  
  const catalog: AgentCatalog = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    description: 'AI Agent-readable catalog of operations with semantic validation schemas',
    operations: {}
  };
  
  if (!fs.existsSync(schemasDir)) {
    console.error(`❌ Schemas directory not found: ${schemasDir}`);
    process.exit(1);
  }
  
  const schemaFiles = fs.readdirSync(schemasDir)
    .filter(f => f.endsWith('.schema.yml'));
  
  if (schemaFiles.length === 0) {
    console.warn('⚠️  No schema files found');
    process.exit(0);
  }
  
  console.log(`\n📂 Found ${schemaFiles.length} schema file(s):\n`);
  
  for (const file of schemaFiles) {
    const schemaPath = path.join(schemasDir, file);
    const relativePath = path.relative(process.cwd(), schemaPath);
    
    try {
      console.log(`  Processing ${file}...`);
      const schema = loadSchema(schemaPath);
      const entry = generateCatalogEntry(schema, relativePath);
      
      catalog.operations[entry.operationId] = entry;
      
      console.log(`    ✓ Operation: ${entry.operationId}`);
      console.log(`    ✓ Parameters: ${entry.parameters.length}`);
      console.log(`    ✓ Inputs: ${entry.inputs.length}`);
      console.log(`    ✓ Outputs: ${entry.outputs.length}`);
      console.log(`    ✓ Invariants: ${entry.invariants.length}`);
      console.log('');
      
    } catch (error) {
      console.error(`    ❌ Failed to process ${file}:`, error);
      process.exit(1);
    }
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));
  
  console.log('=' .repeat(80));
  console.log(`\n✅ Agent catalog generated: ${path.relative(process.cwd(), outputPath)}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Operations: ${Object.keys(catalog.operations).length}`);
  console.log(`   - Total Parameters: ${Object.values(catalog.operations).reduce((sum, op) => sum + op.parameters.length, 0)}`);
  console.log(`   - Total Invariants: ${Object.values(catalog.operations).reduce((sum, op) => sum + op.invariants.length, 0)}`);
  console.log(`   - Operations with Math Models: ${Object.values(catalog.operations).filter(op => op.capabilities.hasMathematicalModel).length}`);
  console.log('');
}

generateAgentCatalog();
