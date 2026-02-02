#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const nodeRegistryPath = path.join(__dirname, '../client/src/workflow/nodeRegistry.ts');
const content = fs.readFileSync(nodeRegistryPath, 'utf8');

const categories = {};
const matches = content.matchAll(/category: ["']([^"']+)["']/g);

for (const match of matches) {
  const cat = match[1];
  categories[cat] = (categories[cat] || 0) + 1;
}

const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);

console.log('\n📊 Node Categories:\n');
sorted.forEach(([cat, count]) => {
  console.log(`  ${count.toString().padStart(3)} ${cat}`);
});

console.log(`\n  Total: ${sorted.reduce((sum, [, count]) => sum + count, 0)} nodes`);
