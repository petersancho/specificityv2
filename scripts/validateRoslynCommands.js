#!/usr/bin/env node
/**
 * Validate Roslyn commands for semantic correctness
 * 
 * This script:
 * 1. Loads command definitions from registry.ts
 * 2. Loads command descriptions from commandDescriptions.ts
 * 3. Validates consistency and semantic correctness
 * 4. Generates a report
 */

const fs = require("fs");
const path = require("path");

/**
 * Extract command definitions from registry.ts
 */
function extractCommandDefinitions(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  
  const commands = [];
  
  // Find COMMAND_DEFINITIONS array
  const defsMatch = content.match(/const COMMAND_DEFINITIONS[^=]*=\s*\[([\s\S]*?)\];/);
  if (!defsMatch) {
    console.error("Could not find COMMAND_DEFINITIONS");
    return commands;
  }
  
  // Parse command objects
  const defsText = defsMatch[1];
  const commandMatches = defsText.matchAll(/\{\s*id:\s*["']([^"']+)["'],\s*label:\s*["']([^"']+)["'],\s*category:\s*["']([^"']+)["'],\s*prompt:\s*["']([^"']+)["']\s*\}/g);
  
  for (const match of commandMatches) {
    commands.push({
      id: match[1],
      label: match[2],
      category: match[3],
      prompt: match[4],
    });
  }
  
  return commands;
}

/**
 * Extract command descriptions
 */
function extractCommandDescriptions(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  
  const descriptions = {};
  
  // Find COMMAND_DESCRIPTIONS object
  const descMatch = content.match(/export const COMMAND_DESCRIPTIONS[^=]*=\s*\{([\s\S]*?)\};/);
  if (!descMatch) {
    console.error("Could not find COMMAND_DESCRIPTIONS");
    return descriptions;
  }
  
  // Parse command description objects
  const descText = descMatch[1];
  const commandMatches = descText.matchAll(/["']([^"']+)["']:\s*\{[^}]*description:\s*["']([^"']+)["'][^}]*\}/g);
  
  for (const match of commandMatches) {
    descriptions[match[1]] = match[2];
  }
  
  return descriptions;
}

/**
 * Validate commands
 */
function validateCommands(commands, descriptions) {
  const issues = [];
  const warnings = [];
  
  // Check each command
  for (const cmd of commands) {
    // Check if description exists
    if (!descriptions[cmd.id]) {
      warnings.push({
        type: "missing_description",
        command: cmd.id,
        message: `Command "${cmd.id}" has no description in COMMAND_DESCRIPTIONS`,
      });
    }
    
    // Check category validity
    if (cmd.category !== "geometry" && cmd.category !== "performs") {
      issues.push({
        type: "invalid_category",
        command: cmd.id,
        message: `Command "${cmd.id}" has invalid category "${cmd.category}" (must be "geometry" or "performs")`,
      });
    }
    
    // Check prompt is not empty
    if (!cmd.prompt || cmd.prompt.trim() === "") {
      issues.push({
        type: "empty_prompt",
        command: cmd.id,
        message: `Command "${cmd.id}" has empty prompt`,
      });
    }
    
    // Check label is not empty
    if (!cmd.label || cmd.label.trim() === "") {
      issues.push({
        type: "empty_label",
        command: cmd.id,
        message: `Command "${cmd.id}" has empty label`,
      });
    }
    
    // Check ID matches label (lowercase, no spaces)
    const expectedId = cmd.label.toLowerCase().replace(/\s+/g, "");
    if (cmd.id !== expectedId && !cmd.id.includes("-")) {
      // Allow hyphenated IDs for multi-word commands
      warnings.push({
        type: "id_label_mismatch",
        command: cmd.id,
        message: `Command "${cmd.id}" label "${cmd.label}" doesn't match ID (expected "${expectedId}")`,
      });
    }
  }
  
  return { issues, warnings };
}

/**
 * Generate report
 */
function generateReport(commands, descriptions, validation) {
  let report = "# Roslyn Command Validation Report\n\n";
  
  report += `**Total Commands:** ${commands.length}\n`;
  report += `**Commands with Descriptions:** ${Object.keys(descriptions).length}\n`;
  report += `**Issues Found:** ${validation.issues.length}\n`;
  report += `**Warnings:** ${validation.warnings.length}\n\n`;
  
  // Summary by category
  const byCategory = {};
  for (const cmd of commands) {
    if (!byCategory[cmd.category]) {
      byCategory[cmd.category] = [];
    }
    byCategory[cmd.category].push(cmd);
  }
  
  report += "## Commands by Category\n\n";
  for (const [category, cmds] of Object.entries(byCategory)) {
    report += `### ${category} (${cmds.length} commands)\n\n`;
    for (const cmd of cmds) {
      const hasDesc = descriptions[cmd.id] ? "✅" : "⚠️";
      report += `- ${hasDesc} **${cmd.id}** - ${cmd.label}\n`;
      report += `  - Prompt: "${cmd.prompt}"\n`;
      if (descriptions[cmd.id]) {
        report += `  - Description: "${descriptions[cmd.id]}"\n`;
      }
    }
    report += "\n";
  }
  
  // Issues
  if (validation.issues.length > 0) {
    report += "## ❌ Issues\n\n";
    for (const issue of validation.issues) {
      report += `- **${issue.type}**: ${issue.message}\n`;
    }
    report += "\n";
  }
  
  // Warnings
  if (validation.warnings.length > 0) {
    report += "## ⚠️ Warnings\n\n";
    for (const warning of validation.warnings) {
      report += `- **${warning.type}**: ${warning.message}\n`;
    }
    report += "\n";
  }
  
  // Validation status
  if (validation.issues.length === 0) {
    report += "## ✅ Validation Passed\n\n";
    report += "All commands have valid structure and semantics.\n";
  } else {
    report += "## ❌ Validation Failed\n\n";
    report += `Found ${validation.issues.length} issues that must be fixed.\n`;
  }
  
  return report;
}

/**
 * Main execution
 */
function main() {
  const registryPath = path.join(process.cwd(), "client/src/commands/registry.ts");
  const descriptionsPath = path.join(process.cwd(), "client/src/data/commandDescriptions.ts");
  
  console.log("Validating Roslyn commands...");
  
  // Extract data
  const commands = extractCommandDefinitions(registryPath);
  const descriptions = extractCommandDescriptions(descriptionsPath);
  
  console.log(`Found ${commands.length} commands`);
  console.log(`Found ${Object.keys(descriptions).length} descriptions`);
  
  // Validate
  const validation = validateCommands(commands, descriptions);
  
  console.log(`Issues: ${validation.issues.length}`);
  console.log(`Warnings: ${validation.warnings.length}`);
  
  // Generate report
  const report = generateReport(commands, descriptions, validation);
  const reportPath = path.join(process.cwd(), "docs/semantic/roslyn-command-validation.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`Report written to ${reportPath}`);
  
  // Generate JSON
  const json = JSON.stringify(
    {
      commands: commands.map(cmd => ({
        ...cmd,
        description: descriptions[cmd.id] || null,
      })),
      validation: {
        issues: validation.issues.length,
        warnings: validation.warnings.length,
        passed: validation.issues.length === 0,
      },
    },
    null,
    2
  );
  const jsonPath = path.join(process.cwd(), "docs/semantic/roslyn-commands.json");
  fs.writeFileSync(jsonPath, json);
  console.log(`JSON written to ${jsonPath}`);
  
  // Exit with error code if validation failed
  if (validation.issues.length > 0) {
    console.log("\n❌ Validation failed!");
    process.exit(1);
  } else {
    console.log("\n✅ Validation passed!");
    process.exit(0);
  }
}

main();
