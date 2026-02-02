#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AnalysisResult {
  operations: {
    total: number;
    byDomain: Record<string, number>;
    byCategory: Record<string, number>;
  };
  nodes: {
    total: number;
    withSemanticOps: number;
    withoutSemanticOps: number;
    byCategory: Record<string, number>;
    withSemanticOpsByCategory: Record<string, number>;
  };
  commands: {
    total: number;
    withSemantics: number;
    aliases: number;
  };
  coverage: {
    nodesCovered: number;
    nodesTotal: number;
    coveragePercent: number;
    commandsCovered: number;
    commandsTotal: number;
    commandCoveragePercent: number;
  };
  uiToBackendLinkage: {
    commandsLinked: number;
    nodesLinked: number;
    operationsAvailable: number;
    totalLinkagePoints: number;
  };
}

async function analyzeSemanticSystem(): Promise<AnalysisResult> {
  console.log('🔍 Comprehensive Semantic Analysis\n');
  console.log('═'.repeat(60));
  
  // Load operations
  const operationsPath = path.join(__dirname, '../docs/semantic/operations.json');
  const operationsData = JSON.parse(fs.readFileSync(operationsPath, 'utf8'));
  const operations = Object.values(operationsData);
  
  // Load node linkages
  const nodeSemanticOpsPath = path.join(__dirname, '../docs/semantic/node-semantic-ops.json');
  const nodeSemanticOps = JSON.parse(fs.readFileSync(nodeSemanticOpsPath, 'utf8'));
  const nodeLinkages = Object.keys(nodeSemanticOps);
  
  // Load command semantics
  const commandSemanticsPath = path.join(__dirname, '../docs/semantic/command-semantics.json');
  const commandSemantics = JSON.parse(fs.readFileSync(commandSemanticsPath, 'utf8'));
  
  // Load node registry to count total nodes
  const nodeRegistryPath = path.join(__dirname, '../client/src/workflow/nodeRegistry.ts');
  const nodeRegistryContent = fs.readFileSync(nodeRegistryPath, 'utf8');
  
  // Count nodes by category
  const categoryMatches = nodeRegistryContent.matchAll(/category: ["']([^"']+)["']/g);
  const nodesByCategory: Record<string, number> = {};
  let totalNodes = 0;
  
  for (const match of categoryMatches) {
    const category = match[1];
    nodesByCategory[category] = (nodesByCategory[category] || 0) + 1;
    totalNodes++;
  }
  
  // Analyze operations
  const operationsByDomain: Record<string, number> = {};
  const operationsByCategory: Record<string, number> = {};
  
  for (const op of operations) {
    operationsByDomain[op.domain] = (operationsByDomain[op.domain] || 0) + 1;
    operationsByCategory[op.category] = (operationsByCategory[op.category] || 0) + 1;
  }
  
  // Analyze nodes with semanticOps
  const nodesWithSemanticOps = nodeLinkages.length;
  const nodesWithSemanticOpsByCategory: Record<string, number> = {};
  
  // Count nodes with semanticOps by category
  const semanticOpsMatches = nodeRegistryContent.matchAll(
    /type: ["']([^"']+)["'][^}]*category: ["']([^"']+)["'][^}]*semanticOps:/gs
  );
  
  for (const match of semanticOpsMatches) {
    const category = match[2];
    nodesWithSemanticOpsByCategory[category] = (nodesWithSemanticOpsByCategory[category] || 0) + 1;
  }
  
  // Analyze commands
  const totalCommands = commandSemantics.commands?.length || 0;
  const commandsWithSemantics = commandSemantics.commands?.filter(
    (cmd: any) => cmd.semantic && cmd.semantic.ops && cmd.semantic.ops.length > 0
  ).length || 0;
  const totalAliases = commandSemantics.aliases?.length || 0;
  
  // Calculate coverage
  const nodesCovered = nodesWithSemanticOps;
  const nodesTotal = totalNodes;
  const coveragePercent = (nodesCovered / nodesTotal) * 100;
  
  const commandsCovered = commandsWithSemantics;
  const commandsTotal = totalCommands;
  const commandCoveragePercent = (commandsCovered / commandsTotal) * 100;
  
  // UI to Backend Linkage
  const commandsLinked = commandsWithSemantics;
  const nodesLinked = nodesWithSemanticOps;
  const operationsAvailable = operations.length;
  const totalLinkagePoints = commandsLinked + nodesLinked;
  
  const result: AnalysisResult = {
    operations: {
      total: operations.length,
      byDomain: operationsByDomain,
      byCategory: operationsByCategory,
    },
    nodes: {
      total: totalNodes,
      withSemanticOps: nodesWithSemanticOps,
      withoutSemanticOps: totalNodes - nodesWithSemanticOps,
      byCategory: nodesByCategory,
      withSemanticOpsByCategory: nodesWithSemanticOpsByCategory,
    },
    commands: {
      total: totalCommands,
      withSemantics: commandsWithSemantics,
      aliases: totalAliases,
    },
    coverage: {
      nodesCovered,
      nodesTotal,
      coveragePercent,
      commandsCovered,
      commandsTotal,
      commandCoveragePercent,
    },
    uiToBackendLinkage: {
      commandsLinked,
      nodesLinked,
      operationsAvailable,
      totalLinkagePoints,
    },
  };
  
  return result;
}

function printResults(result: AnalysisResult): void {
  console.log('\n📊 OPERATIONS\n');
  console.log(`  Total: ${result.operations.total}`);
  console.log('\n  By Domain:');
  Object.entries(result.operations.byDomain)
    .sort((a, b) => b[1] - a[1])
    .forEach(([domain, count]) => {
      console.log(`    ${count.toString().padStart(3)} ${domain}`);
    });
  
  console.log('\n  By Category:');
  Object.entries(result.operations.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`    ${count.toString().padStart(3)} ${category}`);
    });
  
  console.log('\n📊 NODES\n');
  console.log(`  Total: ${result.nodes.total}`);
  console.log(`  With semanticOps: ${result.nodes.withSemanticOps} (${result.coverage.coveragePercent.toFixed(1)}%)`);
  console.log(`  Without semanticOps: ${result.nodes.withoutSemanticOps} (${(100 - result.coverage.coveragePercent).toFixed(1)}%)`);
  
  console.log('\n  By Category:');
  Object.entries(result.nodes.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const withSemanticOps = result.nodes.withSemanticOpsByCategory[category] || 0;
      const percent = count > 0 ? ((withSemanticOps / count) * 100).toFixed(0) : '0';
      console.log(`    ${count.toString().padStart(3)} ${category.padEnd(15)} (${withSemanticOps} with semanticOps, ${percent}%)`);
    });
  
  console.log('\n📊 COMMANDS\n');
  console.log(`  Total: ${result.commands.total}`);
  console.log(`  With semantics: ${result.commands.withSemantics} (${result.coverage.commandCoveragePercent.toFixed(1)}%)`);
  console.log(`  Aliases: ${result.commands.aliases}`);
  
  console.log('\n📊 COVERAGE\n');
  console.log(`  Nodes: ${result.coverage.nodesCovered}/${result.coverage.nodesTotal} (${result.coverage.coveragePercent.toFixed(1)}%)`);
  console.log(`  Commands: ${result.coverage.commandsCovered}/${result.coverage.commandsTotal} (${result.coverage.commandCoveragePercent.toFixed(1)}%)`);
  
  console.log('\n📊 UI TO BACKEND LINKAGE\n');
  console.log(`  Commands linked: ${result.uiToBackendLinkage.commandsLinked}`);
  console.log(`  Nodes linked: ${result.uiToBackendLinkage.nodesLinked}`);
  console.log(`  Operations available: ${result.uiToBackendLinkage.operationsAvailable}`);
  console.log(`  Total linkage points: ${result.uiToBackendLinkage.totalLinkagePoints}`);
  
  console.log('\n═'.repeat(60));
  console.log('\n✅ Analysis complete!\n');
}

async function main() {
  try {
    const result = await analyzeSemanticSystem();
    printResults(result);
    
    // Write results to file
    const outputPath = path.join(__dirname, '../docs/semantic/comprehensive-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`📝 Results written to ${outputPath}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
