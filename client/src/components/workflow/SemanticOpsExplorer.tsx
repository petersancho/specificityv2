import { useState, useMemo } from "react";
import { useSemanticRegistry } from "../../semantic/SemanticRegistryContext";
import { searchSemanticOps, filterSemanticOps } from "../../semantic/semanticUi";
import type { SemanticOpMeta } from "../../semantic/semanticOp";
import { NODE_DEFINITIONS } from "./nodeCatalog";
import styles from "./SemanticOpsExplorer.module.css";

type SemanticOpsExplorerProps = {
  onClose: () => void;
};

export const SemanticOpsExplorer = ({ onClose }: SemanticOpsExplorerProps) => {
  const registry = useSemanticRegistry();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedCost, setSelectedCost] = useState<string>("");
  const [selectedOp, setSelectedOp] = useState<SemanticOpMeta | null>(null);

  const allOps = useMemo(() => registry.listMeta(), [registry]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allOps.forEach(op => {
      if (op.category) cats.add(op.category);
    });
    return Array.from(cats).sort();
  }, [allOps]);

  const filteredOps = useMemo(() => {
    let ops = searchQuery ? searchSemanticOps(registry, searchQuery) : allOps;
    
    const filters: any = {};
    if (selectedCategory) filters.category = selectedCategory;
    if (selectedCost) filters.cost = selectedCost;
    
    if (Object.keys(filters).length > 0) {
      ops = filterSemanticOps(ops, filters);
    }
    
    return ops.sort((a, b) => a.id.localeCompare(b.id));
  }, [registry, allOps, searchQuery, selectedCategory, selectedCost]);

  const nodesUsingOp = useMemo(() => {
    if (!selectedOp) return [];
    
    return Object.values(NODE_DEFINITIONS)
      .filter(def => def.semanticOps?.includes(selectedOp.id as any))
      .map(def => ({
        type: def.type,
        label: def.label,
        category: def.category
      }));
  }, [selectedOp]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Semantic Operations Explorer</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.sidebar}>
            <div className={styles.searchSection}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search operations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filtersSection}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Category</label>
                <select
                  className={styles.filterSelect}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Cost</label>
                <select
                  className={styles.filterSelect}
                  value={selectedCost}
                  onChange={(e) => setSelectedCost(e.target.value)}
                >
                  <option value="">All Costs</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Total:</span>
                <span className={styles.statValue}>{allOps.length}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Filtered:</span>
                <span className={styles.statValue}>{filteredOps.length}</span>
              </div>
            </div>

            <div className={styles.opsList}>
              {filteredOps.map(op => (
                <div
                  key={op.id}
                  className={`${styles.opItem} ${selectedOp?.id === op.id ? styles.opItemSelected : ""}`}
                  onClick={() => setSelectedOp(op)}
                >
                  <div className={styles.opItemHeader}>
                    <span className={styles.opItemId}>{op.id}</span>
                    {op.cost && (
                      <span className={styles.opItemCost} data-cost={op.cost}>
                        {op.cost}
                      </span>
                    )}
                  </div>
                  {op.summary && (
                    <div className={styles.opItemSummary}>{op.summary}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.details}>
            {selectedOp ? (
              <>
                <div className={styles.detailsHeader}>
                  <h3 className={styles.detailsTitle}>{selectedOp.id}</h3>
                  <div className={styles.detailsTags}>
                    {selectedOp.category && (
                      <span className={styles.detailsTag} data-type="category">
                        {selectedOp.category}
                      </span>
                    )}
                    {selectedOp.cost && (
                      <span className={styles.detailsTag} data-type="cost" data-cost={selectedOp.cost}>
                        {selectedOp.cost}
                      </span>
                    )}
                    {selectedOp.complexity && (
                      <span className={styles.detailsTag} data-type="complexity">
                        {selectedOp.complexity}
                      </span>
                    )}
                  </div>
                </div>

                {selectedOp.summary && (
                  <div className={styles.detailsSection}>
                    <h4 className={styles.detailsSectionTitle}>Summary</h4>
                    <p className={styles.detailsSummary}>{selectedOp.summary}</p>
                  </div>
                )}

                <div className={styles.detailsSection}>
                  <h4 className={styles.detailsSectionTitle}>Properties</h4>
                  <div className={styles.detailsProperties}>
                    <div className={styles.detailsProperty}>
                      <span className={styles.detailsPropertyLabel}>Pure:</span>
                      <span className={styles.detailsPropertyValue}>
                        {selectedOp.pure === undefined ? "—" : selectedOp.pure ? "✓ Yes" : "✗ No"}
                      </span>
                    </div>
                    <div className={styles.detailsProperty}>
                      <span className={styles.detailsPropertyLabel}>Deterministic:</span>
                      <span className={styles.detailsPropertyValue}>
                        {selectedOp.deterministic === undefined ? "—" : selectedOp.deterministic ? "✓ Yes" : "✗ No"}
                      </span>
                    </div>
                    {selectedOp.sideEffects && selectedOp.sideEffects.length > 0 && (
                      <div className={styles.detailsProperty}>
                        <span className={styles.detailsPropertyLabel}>Side Effects:</span>
                        <span className={styles.detailsPropertyValue}>
                          {selectedOp.sideEffects.join(", ")}
                        </span>
                      </div>
                    )}
                    {selectedOp.tags && selectedOp.tags.length > 0 && (
                      <div className={styles.detailsProperty}>
                        <span className={styles.detailsPropertyLabel}>Tags:</span>
                        <span className={styles.detailsPropertyValue}>
                          {selectedOp.tags.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedOp.deps && selectedOp.deps.length > 0 && (
                  <div className={styles.detailsSection}>
                    <h4 className={styles.detailsSectionTitle}>Dependencies</h4>
                    <div className={styles.detailsDeps}>
                      {selectedOp.deps.map(depId => (
                        <div key={depId} className={styles.detailsDepItem}>
                          {depId}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {nodesUsingOp.length > 0 && (
                  <div className={styles.detailsSection}>
                    <h4 className={styles.detailsSectionTitle}>
                      Nodes Using This Operation ({nodesUsingOp.length})
                    </h4>
                    <div className={styles.detailsNodes}>
                      {nodesUsingOp.map(node => (
                        <div key={node.type} className={styles.detailsNodeItem}>
                          <span className={styles.detailsNodeLabel}>{node.label}</span>
                          <span className={styles.detailsNodeCategory}>{node.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.detailsEmpty}>
                <p>Select an operation to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
