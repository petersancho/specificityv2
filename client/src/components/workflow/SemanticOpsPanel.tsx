import React, { useMemo } from "react";
import { getSemanticOpMeta } from "../../semantic/semanticOpRegistry";
import { useSemanticMetrics } from "../../semantic/useSemanticMetrics";
import { getNodeDefinition } from "../../workflow/nodeRegistry";
import styles from "./SemanticOpsPanel.module.css";

type SemanticOpsPanelProps = {
  nodeId: string;
  nodeType: string;
  runId?: string;
};

export function SemanticOpsPanel({ nodeId, nodeType, runId = "default" }: SemanticOpsPanelProps) {
  const nodeDef = getNodeDefinition(nodeType);
  const semanticOps = nodeDef?.semanticOps ?? [];
  
  const { totals, totalOperations, totalDuration, totalErrors } = useSemanticMetrics({ 
    nodeId, 
    runId 
  });

  const hasMetrics = totalOperations > 0;

  const opsByCategory = useMemo(() => {
    const grouped: Record<string, Array<{ opId: string; meta: any }>> = {};
    
    semanticOps.forEach((opId: string) => {
      const meta = getSemanticOpMeta(opId);
      const category = meta.category || "other";
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      grouped[category].push({ opId, meta });
    });
    
    return grouped;
  }, [semanticOps]);

  const categoryOrder = ["initialize", "step", "analysis", "finalize", "optimization", "validation", "io", "other"];

  if (semanticOps.length === 0) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.title}>Semantic Operations</h3>
        <p className={styles.empty}>No semantic operations defined for this node.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Semantic Operations</h3>
        {hasMetrics && (
          <div className={styles.summary}>
            <span className={styles.summaryItem}>
              <strong>{totalOperations}</strong> ops
            </span>
            <span className={styles.summaryItem}>
              <strong>{Math.round(totalDuration)}ms</strong> total
            </span>
            {totalErrors > 0 && (
              <span className={`${styles.summaryItem} ${styles.error}`}>
                <strong>{totalErrors}</strong> errors
              </span>
            )}
          </div>
        )}
      </div>

      {categoryOrder.map(category => {
        const ops = opsByCategory[category];
        if (!ops || ops.length === 0) return null;

        return (
          <div key={category} className={styles.category}>
            <h4 className={styles.categoryTitle}>{category}</h4>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Operation</th>
                  {hasMetrics && (
                    <>
                      <th>Count</th>
                      <th>Avg (ms)</th>
                      <th>Total (ms)</th>
                      <th>Success</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {ops.map(({ opId, meta }) => {
                  const metrics = totals[opId];
                  const hasData = metrics && metrics.count > 0;

                  return (
                    <tr key={opId} title={meta.description || opId}>
                      <td className={styles.opLabel}>
                        <span className={styles.opName}>{meta.label}</span>
                        {meta.defaultCostUnit && (
                          <span className={styles.cost}>
                            cost: {meta.defaultCostUnit}
                          </span>
                        )}
                      </td>
                      {hasMetrics && (
                        <>
                          <td className={styles.metric}>
                            {hasData ? metrics.count : "-"}
                          </td>
                          <td className={styles.metric}>
                            {hasData ? Math.round(metrics.avgMs) : "-"}
                          </td>
                          <td className={styles.metric}>
                            {hasData ? Math.round(metrics.totalMs) : "-"}
                          </td>
                          <td className={styles.metric}>
                            {hasData ? (
                              <span className={metrics.successRate === 100 ? styles.success : styles.warning}>
                                {Math.round(metrics.successRate)}%
                              </span>
                            ) : "-"}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
