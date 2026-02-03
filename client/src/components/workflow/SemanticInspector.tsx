import { useMemo } from "react";
import { useSemanticRegistry } from "../../semantic/SemanticRegistryContext";
import { resolveNodeSemanticOps, getSemanticOpBadges } from "../../semantic/semanticUi";
import type { WorkflowNodeDefinition } from "../../workflow/registry/types";
import styles from "./SemanticInspector.module.css";

type SemanticInspectorProps = {
  definition: WorkflowNodeDefinition;
};

export const SemanticInspector = ({ definition }: SemanticInspectorProps) => {
  const registry = useSemanticRegistry();
  
  const resolved = useMemo(() => {
    return resolveNodeSemanticOps(registry, definition);
  }, [registry, definition]);

  if (resolved.metas.length === 0) {
    return null;
  }

  const badges = getSemanticOpBadges(resolved.stats);
  const categories = Array.from(resolved.byCategory.entries());

  return (
    <div className={styles.inspector}>
      <div className={styles.header}>
        <span className={styles.title}>Semantic Operations</span>
        <div className={styles.headerBadges}>
          {badges.map((badge, i) => (
            <span key={i} className={styles.badge} data-type={badge.type}>
              {badge.label}
            </span>
          ))}
        </div>
      </div>
      
      {categories.map(([category, ops]) => (
        <div key={category} className={styles.category}>
          <div className={styles.categoryHeader}>
            <span className={styles.categoryName}>{category}</span>
            <span className={styles.categoryCount}>{ops.length}</span>
          </div>
          
          <div className={styles.operations}>
            {ops.map(({ id, meta }) => (
              <div key={id} className={styles.operation}>
                <div className={styles.operationHeader}>
                  <span className={styles.operationId}>{id}</span>
                  <div className={styles.operationTags}>
                    {meta.cost && (
                      <span 
                        className={styles.tag} 
                        data-type="cost"
                        data-cost={meta.cost}
                      >
                        {meta.cost}
                      </span>
                    )}
                    {meta.complexity && (
                      <span className={styles.tag} data-type="complexity">
                        {meta.complexity}
                      </span>
                    )}
                  </div>
                </div>
                
                {meta.summary && (
                  <p className={styles.operationSummary}>{meta.summary}</p>
                )}
                
                <div className={styles.operationMeta}>
                  {meta.pure === false && (
                    <span className={styles.metaItem} data-warning="true">
                      ⚠ Impure
                    </span>
                  )}
                  {meta.deterministic === false && (
                    <span className={styles.metaItem} data-warning="true">
                      ⚠ Non-deterministic
                    </span>
                  )}
                  {meta.sideEffects && meta.sideEffects.length > 0 && (
                    <span className={styles.metaItem} data-warning="true">
                      Side effects: {meta.sideEffects.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {resolved.missing.length > 0 && (
        <div className={styles.missing}>
          <span className={styles.missingLabel}>Missing operations:</span>
          <span className={styles.missingList}>{resolved.missing.join(", ")}</span>
        </div>
      )}
    </div>
  );
};
