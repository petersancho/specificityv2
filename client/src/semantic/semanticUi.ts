import type { OperationRegistry } from "./operationRegistry";
import type { SemanticOpMeta } from "./semanticOp";
import type { WorkflowNodeDefinition } from "../workflow/registry/types";
import type { SemanticOpId } from "./semanticOpIds";

export interface ResolvedSemanticOp {
  id: string;
  meta: SemanticOpMeta;
}

export interface NodeSemanticOpsResult {
  ids: readonly SemanticOpId[];
  metas: ResolvedSemanticOp[];
  missing: string[];
  byCategory: Map<string, ResolvedSemanticOp[]>;
  stats: {
    total: number;
    highCost: number;
    hasSideEffects: number;
    nonDeterministic: number;
    impure: number;
  };
}

function safeGetMeta(registry: OperationRegistry, id: string): SemanticOpMeta | null {
  try {
    return registry.getMeta(id);
  } catch {
    return null;
  }
}

export function resolveNodeSemanticOps(
  registry: OperationRegistry,
  def?: WorkflowNodeDefinition
): NodeSemanticOpsResult {
  const ids = def?.semanticOps ?? [];
  const resolved: ResolvedSemanticOp[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const meta = safeGetMeta(registry, id);
    if (meta) {
      resolved.push({ id, meta });
    } else {
      missing.push(id);
    }
  }

  resolved.sort((a, b) =>
    (a.meta.category ?? "").localeCompare(b.meta.category ?? "") ||
    a.id.localeCompare(b.id)
  );

  const byCategory = new Map<string, ResolvedSemanticOp[]>();
  for (const op of resolved) {
    const cat = op.meta.category ?? "other";
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(op);
  }

  const stats = {
    total: resolved.length,
    highCost: resolved.filter(op => op.meta.cost === "high").length,
    hasSideEffects: resolved.filter(op => op.meta.sideEffects && op.meta.sideEffects.length > 0).length,
    nonDeterministic: resolved.filter(op => op.meta.deterministic === false).length,
    impure: resolved.filter(op => op.meta.pure === false).length,
  };

  return { ids, metas: resolved, missing, byCategory, stats };
}

export function formatSemanticOpSummary(op: ResolvedSemanticOp): string {
  const parts: string[] = [op.id];
  
  if (op.meta.summary) {
    parts.push(`— ${op.meta.summary}`);
  } else if (op.meta.category) {
    parts.push(`[${op.meta.category}]`);
  }
  
  const badges: string[] = [];
  if (op.meta.cost === "high") badges.push("HIGH");
  if (op.meta.sideEffects && op.meta.sideEffects.length > 0) badges.push("SE");
  if (op.meta.deterministic === false) badges.push("ND");
  if (op.meta.pure === false) badges.push("IMPURE");
  
  if (badges.length > 0) {
    parts.push(`[${badges.join(", ")}]`);
  }
  
  return parts.join(" ");
}

export function getSemanticOpBadges(stats: NodeSemanticOpsResult["stats"]) {
  const badges: Array<{ label: string; type: "info" | "warning" | "error" }> = [];
  
  if (stats.total > 0) {
    badges.push({ label: `${stats.total} ops`, type: "info" });
  }
  
  if (stats.highCost > 0) {
    badges.push({ label: `${stats.highCost} high cost`, type: "warning" });
  }
  
  if (stats.hasSideEffects > 0) {
    badges.push({ label: `${stats.hasSideEffects} side effects`, type: "warning" });
  }
  
  if (stats.nonDeterministic > 0) {
    badges.push({ label: `${stats.nonDeterministic} non-deterministic`, type: "warning" });
  }
  
  if (stats.impure > 0) {
    badges.push({ label: `${stats.impure} impure`, type: "error" });
  }
  
  return badges;
}

export function searchSemanticOps(
  registry: OperationRegistry,
  query: string
): SemanticOpMeta[] {
  const lowerQuery = query.toLowerCase();
  return registry.listMeta().filter(meta => {
    return (
      meta.id.toLowerCase().includes(lowerQuery) ||
      meta.summary?.toLowerCase().includes(lowerQuery) ||
      meta.category?.toLowerCase().includes(lowerQuery) ||
      meta.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  });
}

export function filterSemanticOps(
  metas: SemanticOpMeta[],
  filters: {
    category?: string;
    cost?: "low" | "medium" | "high";
    pure?: boolean;
    deterministic?: boolean;
    hasSideEffects?: boolean;
    tags?: string[];
  }
): SemanticOpMeta[] {
  return metas.filter(meta => {
    if (filters.category && meta.category !== filters.category) return false;
    if (filters.cost && meta.cost !== filters.cost) return false;
    if (filters.pure !== undefined && meta.pure !== filters.pure) return false;
    if (filters.deterministic !== undefined && meta.deterministic !== filters.deterministic) return false;
    if (filters.hasSideEffects !== undefined) {
      const hasSE = meta.sideEffects && meta.sideEffects.length > 0;
      if (hasSE !== filters.hasSideEffects) return false;
    }
    if (filters.tags && filters.tags.length > 0) {
      if (!meta.tags || !filters.tags.some(tag => meta.tags!.includes(tag as any))) {
        return false;
      }
    }
    return true;
  });
}
