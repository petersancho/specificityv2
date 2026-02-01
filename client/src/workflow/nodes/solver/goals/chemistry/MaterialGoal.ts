import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";

type MaterialAssignment = {
  geometryId: string;
  material: string;
  weight?: number;
};

type MaterialDistributionSummary = {
  material: string;
  geometryCount: number;
  totalWeight: number;
  percentage: number;
};

const normalizeAssignmentEntries = (value: unknown): MaterialAssignment[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const candidate = entry as Record<string, unknown>;
        const geometryId =
          typeof candidate.geometryId === "string"
            ? candidate.geometryId
            : typeof candidate.geometry === "string"
              ? candidate.geometry
              : typeof candidate.geometryID === "string"
                ? candidate.geometryID
                : null;
        const material =
          typeof candidate.material === "string"
            ? candidate.material
            : typeof candidate.materialName === "string"
              ? candidate.materialName
              : typeof candidate.name === "string"
                ? candidate.name
                : null;
        if (!geometryId || !material) return null;
        const weight =
          typeof candidate.weight === "number"
            ? candidate.weight
            : typeof candidate.influence === "number"
              ? candidate.influence
              : typeof candidate.strength === "number"
                ? candidate.strength
                : undefined;
        return { geometryId, material, weight } satisfies MaterialAssignment;
      })
      .filter((entry): entry is MaterialAssignment => Boolean(entry));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.entries(record)
      .map(([geometryId, materialValue]) => {
        if (typeof materialValue !== "string") return null;
        return { geometryId, material: materialValue } satisfies MaterialAssignment;
      })
      .filter((entry): entry is MaterialAssignment => Boolean(entry));
  }
  return [];
};

const buildMaterialsText = (assignments: MaterialAssignment[]) => {
  if (assignments.length === 0) return "";
  const grouped = new Map<string, Set<string>>();
  assignments.forEach((assignment) => {
    const material = assignment.material.trim();
    const geometryId = assignment.geometryId.trim();
    if (!material || !geometryId) return;
    const group = grouped.get(material) ?? new Set<string>();
    group.add(geometryId);
    grouped.set(material, group);
  });
  const lines = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([material, ids]) => `${material}: ${Array.from(ids).sort().join(" ")}`);
  return lines.join("\n");
};

const computeMaterialDistribution = (assignments: MaterialAssignment[]): MaterialDistributionSummary[] => {
  if (assignments.length === 0) return [];
  
  const materialStats = new Map<string, { count: number; totalWeight: number }>();
  let grandTotalWeight = 0;
  
  assignments.forEach((assignment) => {
    const material = assignment.material.trim();
    const weight = assignment.weight ?? 1;
    const stats = materialStats.get(material) ?? { count: 0, totalWeight: 0 };
    stats.count += 1;
    stats.totalWeight += weight;
    grandTotalWeight += weight;
    materialStats.set(material, stats);
  });
  
  return Array.from(materialStats.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([material, stats]) => ({
      material,
      geometryCount: stats.count,
      totalWeight: stats.totalWeight,
      percentage: grandTotalWeight > 0 ? (stats.totalWeight / grandTotalWeight) * 100 : 0,
    }));
};

const generateDashboardText = (
  assignments: MaterialAssignment[],
  distribution: MaterialDistributionSummary[],
  showDetails: boolean
): string => {
  if (assignments.length === 0) {
    return "No materials assigned.\n\n" +
      "Connect geometry references to assign materials.\n" +
      "Use the assignments parameter to map geometries to materials.";
  }
  
  const lines: string[] = [];
  lines.push(`═══ Material Dashboard ═══`);
  lines.push(``);
  lines.push(`Total Assignments: ${assignments.length}`);
  lines.push(`Material Types: ${distribution.length}`);
  lines.push(``);
  lines.push(`--- Distribution ---`);
  
  distribution.forEach((entry) => {
    const bar = '█'.repeat(Math.round(entry.percentage / 5));
    lines.push(`${entry.material}: ${entry.percentage.toFixed(1)}% ${bar}`);
    if (showDetails) {
      lines.push(`  └─ ${entry.geometryCount} geometries, weight: ${entry.totalWeight.toFixed(2)}`);
    }
  });
  
  if (showDetails) {
    lines.push(``);
    lines.push(`--- Assignments ---`);
    assignments.slice(0, 10).forEach((assignment, index) => {
      const weightStr = assignment.weight !== undefined ? ` (w=${assignment.weight.toFixed(2)})` : "";
      lines.push(`${index + 1}. ${assignment.material}${weightStr}`);
      lines.push(`   → ${assignment.geometryId}`);
    });
    if (assignments.length > 10) {
      lines.push(`   ... and ${assignments.length - 10} more`);
    }
  }
  
  return lines.join("\n");
};

export const ChemistryMaterialGoalNode: WorkflowNodeDefinition = {
  type: "chemistryMaterialGoal",
  label: "Material Dashboard",
  shortLabel: "Material",
  description: "Assigns materials to solver geometry inputs with monitoring dashboard.",
  category: "goal",
  iconId: "goal",
  display: {
    nameGreek: "Ὕλη",
    nameEnglish: "Material",
    romanization: "Hýlē",
    description: "Material assignment dashboard for chemistry solver monitoring.",
  },
  inputs: [
    {
      key: "solverStatus",
      label: "Solver Status",
      type: "string",
      required: false,
      description: "Connect to solver status output for live monitoring.",
    },
    {
      key: "particleCount",
      label: "Particle Count",
      type: "number",
      required: false,
      description: "Connect to solver particle count for monitoring.",
    },
    {
      key: "totalEnergy",
      label: "Total Energy",
      type: "number",
      required: false,
      description: "Connect to solver energy output for convergence tracking.",
    },
    {
      key: "diagnostics",
      label: "Diagnostics",
      type: "any",
      required: false,
      description: "Connect to solver diagnostics for detailed monitoring.",
    },
  ],
  outputs: [
    {
      key: "materialsText",
      label: "Materials Text",
      type: "string",
      description: "Line-based material assignment text for the solver.",
    },
    {
      key: "distribution",
      label: "Distribution",
      type: "any",
      description: "Material distribution summary with percentages.",
    },
    {
      key: "assignmentCount",
      label: "Assignment Count",
      type: "number",
      description: "Total number of material assignments.",
    },
    {
      key: "materialCount",
      label: "Material Types",
      type: "number",
      description: "Number of unique material types.",
    },
    {
      key: "dashboardText",
      label: "Dashboard",
      type: "string",
      description: "Formatted dashboard text for monitoring.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      description: "Material goal status indicator.",
    },
  ],
  parameters: [
    {
      key: "assignments",
      label: "Assignments",
      type: "textarea",
      defaultValue: "",
      description: "JSON array of { geometryId, material, weight? } assignments.",
    },
    {
      key: "showDetails",
      label: "Show Details",
      type: "boolean",
      defaultValue: true,
      description: "Include detailed assignment list in dashboard.",
    },
    {
      key: "autoMonitor",
      label: "Auto Monitor",
      type: "boolean",
      defaultValue: true,
      description: "Automatically display solver status when connected.",
    },
  ],
  primaryOutputKey: "materialsText",
  compute: ({ inputs, parameters }) => {
    // Parse assignments from parameter or input
    let assignmentsInput = parameters.assignments;
    if (typeof assignmentsInput === "string" && assignmentsInput.trim().length > 0) {
      try {
        assignmentsInput = JSON.parse(assignmentsInput);
      } catch {
        // Keep as string if not valid JSON
      }
    }
    
    const assignments = normalizeAssignmentEntries(assignmentsInput);
    const materialsText = buildMaterialsText(assignments);
    const distribution = computeMaterialDistribution(assignments);
    const showDetails = parameters.showDetails !== false;
    
    // Build dashboard with solver status if available
    let dashboardText = generateDashboardText(assignments, distribution, showDetails);
    
    // Append solver monitoring info if connected
    const solverStatus = typeof inputs.solverStatus === "string" ? inputs.solverStatus : null;
    const particleCount = typeof inputs.particleCount === "number" ? inputs.particleCount : null;
    const totalEnergy = typeof inputs.totalEnergy === "number" ? inputs.totalEnergy : null;
    const diagnostics = inputs.diagnostics as Record<string, unknown> | null;
    
    if (parameters.autoMonitor !== false && (solverStatus || particleCount !== null || totalEnergy !== null)) {
      dashboardText += "\n\n═══ Solver Status ═══\n";
      if (solverStatus) {
        dashboardText += `Status: ${solverStatus}\n`;
      }
      if (particleCount !== null) {
        dashboardText += `Particles: ${particleCount.toLocaleString()}\n`;
      }
      if (totalEnergy !== null) {
        dashboardText += `Energy: ${totalEnergy.toFixed(6)}\n`;
      }
      if (diagnostics && typeof diagnostics === "object") {
        const iterations = (diagnostics as Record<string, unknown>).iterations;
        const warnings = (diagnostics as Record<string, unknown>).warnings;
        if (typeof iterations === "number") {
          dashboardText += `Iterations: ${iterations}\n`;
        }
        if (Array.isArray(warnings) && warnings.length > 0) {
          dashboardText += `\nWarnings:\n`;
          warnings.slice(0, 5).forEach((w) => {
            dashboardText += `  ⚠ ${w}\n`;
          });
        }
      }
    }
    
    // Determine status
    let status = "ready";
    if (assignments.length === 0) {
      status = "no-assignments";
    } else if (solverStatus === "complete") {
      status = "complete";
    } else if (solverStatus === "running" || solverStatus === "computing") {
      status = "running";
    } else if (solverStatus === "error" || solverStatus === "failed") {
      status = "error";
    }
    
    return {
      materialsText,
      distribution,
      assignmentCount: assignments.length,
      materialCount: distribution.length,
      dashboardText,
      status,
    };
  },
};
