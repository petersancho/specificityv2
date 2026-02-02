/**
 * Validates semantic linkage between Roslyn commands and semantic operations
 * 
 * This script:
 * - Validates that all commands have semantic metadata
 * - Validates that all referenced semantic operations exist
 * - Validates that command aliases resolve correctly
 * - Generates documentation
 */

import * as fs from 'fs';
import * as path from 'path';

// Import command infrastructure
import { COMMAND_DEFINITIONS, COMMAND_ALIASES } from '../client/src/commands/registry';
import { COMMAND_SEMANTICS } from '../client/src/commands/commandSemantics';
import { SEMANTIC_OP_ID_SET } from '../client/src/semantic/semanticOpIds';

// Import all semantic operations (auto-registers on import)
import '../client/src/semantic/registerAllOps';

const DOCS_DIR = path.join(__dirname, '../docs/semantic');

function main() {
  console.log('🔍 Validating command semantics...\n');

  // Ensure docs directory exists
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate that all commands have semantic metadata
  console.log('📋 Validating command coverage...');
  const commandIds = new Set(COMMAND_DEFINITIONS.map(cmd => cmd.id));
  const semanticCommandIds = new Set(Object.keys(COMMAND_SEMANTICS));
  
  let commandsWithSemantics = 0;
  let commandsWithoutSemantics = 0;
  
  for (const cmd of COMMAND_DEFINITIONS) {
    if (COMMAND_SEMANTICS[cmd.id]) {
      commandsWithSemantics++;
    } else {
      commandsWithoutSemantics++;
      warnings.push(`Command '${cmd.id}' (${cmd.label}) has no semantic metadata`);
    }
  }
  
  console.log(`  ✓ ${COMMAND_DEFINITIONS.length} commands in registry`);
  console.log(`  ✓ ${commandsWithSemantics} commands with semantic metadata`);
  if (commandsWithoutSemantics > 0) {
    console.log(`  ⚠️  ${commandsWithoutSemantics} commands without semantic metadata`);
  }

  // 2. Validate that all semantic operations exist
  console.log('\n🔗 Validating semantic operation references...');
  let totalOpReferences = 0;
  let invalidOpReferences = 0;
  
  for (const [commandId, semantic] of Object.entries(COMMAND_SEMANTICS)) {
    if (semantic.kind === "operation") {
      for (const opId of semantic.ops) {
        totalOpReferences++;
        if (!SEMANTIC_OP_ID_SET.has(opId)) {
          invalidOpReferences++;
          errors.push(`Command '${commandId}' references unknown semantic op: ${opId}`);
        }
      }
    }
  }
  
  console.log(`  ✓ ${totalOpReferences} semantic operation references`);
  if (invalidOpReferences > 0) {
    console.log(`  ❌ ${invalidOpReferences} invalid operation references`);
  }

  // 3. Validate command aliases
  console.log('\n🔀 Validating command aliases...');
  const aliasEntries = Object.entries(COMMAND_ALIASES);
  let validAliases = 0;
  let invalidAliases = 0;
  
  for (const [alias, target] of aliasEntries) {
    if (commandIds.has(target)) {
      validAliases++;
    } else {
      invalidAliases++;
      errors.push(`Alias '${alias}' points to unknown command: ${target}`);
    }
  }
  
  console.log(`  ✓ ${aliasEntries.length} command aliases`);
  console.log(`  ✓ ${validAliases} valid aliases`);
  if (invalidAliases > 0) {
    console.log(`  ❌ ${invalidAliases} invalid aliases`);
  }

  // 4. Generate documentation
  console.log('\n📝 Generating documentation...');
  
  // Command semantics JSON
  const commandSemanticsDoc = {
    commands: COMMAND_DEFINITIONS.map(cmd => ({
      id: cmd.id,
      label: cmd.label,
      category: cmd.category,
      semantic: COMMAND_SEMANTICS[cmd.id] || { kind: "unknown" },
    })),
    statistics: {
      totalCommands: COMMAND_DEFINITIONS.length,
      commandsWithSemantics: commandsWithSemantics,
      commandsWithoutSemantics: commandsWithoutSemantics,
      totalAliases: aliasEntries.length,
      totalOpReferences: totalOpReferences,
    },
  };
  
  fs.writeFileSync(
    path.join(DOCS_DIR, 'command-semantics.json'),
    JSON.stringify(commandSemanticsDoc, null, 2),
    'utf8'
  );
  console.log(`  ✓ Written ${path.join(DOCS_DIR, 'command-semantics.json')}`);
  
  // Command-operation linkages
  const commandOpLinkages: Record<string, string[]> = {};
  for (const [commandId, semantic] of Object.entries(COMMAND_SEMANTICS)) {
    if (semantic.kind === "operation") {
      commandOpLinkages[commandId] = [...semantic.ops];
    }
  }
  
  fs.writeFileSync(
    path.join(DOCS_DIR, 'command-operation-linkages.json'),
    JSON.stringify(commandOpLinkages, null, 2),
    'utf8'
  );
  console.log(`  ✓ Written ${path.join(DOCS_DIR, 'command-operation-linkages.json')}`);

  // Summary
  console.log('\n✨ Summary:');
  console.log(`  Commands: ${COMMAND_DEFINITIONS.length}`);
  console.log(`  Commands with semantics: ${commandsWithSemantics}`);
  console.log(`  Commands without semantics: ${commandsWithoutSemantics}`);
  console.log(`  Aliases: ${aliasEntries.length}`);
  console.log(`  Semantic operation references: ${totalOpReferences}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log(`  Errors: ${errors.length}`);

  // Print warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }

  // Print errors
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`  - ${e}`));
    console.log('\n❌ Validation failed!');
    process.exit(1);
  }

  console.log('\n✅ Validation passed!');
}

main();
