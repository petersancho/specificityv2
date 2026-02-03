import { useMemo } from "react";
import type { NodeType } from "../../store/useProjectStore";
import { getNodeDefinition, resolveNodePorts, type WorkflowPortSpec } from "./nodeCatalog";
import { NODE_IMPLEMENTATION_NOTES } from "./nodeImplementationNotes";
import styles from "./NodeDetailsPanel.module.css";

interface NodeDetailsPanelProps {
  nodeType: NodeType;
}

export function NodeDetailsPanel({ nodeType }: NodeDetailsPanelProps) {
  const definition = useMemo(() => getNodeDefinition(nodeType), [nodeType]);
  const implementationNotes = useMemo(() => NODE_IMPLEMENTATION_NOTES[nodeType], [nodeType]);
  const ports = useMemo(() => {
    if (!definition) return { inputs: [], outputs: [] };
    const resolved = resolveNodePorts({ type: nodeType, data: { label: definition.label } });
    return {
      inputs: Array.isArray(resolved.inputs) ? resolved.inputs : [],
      outputs: Array.isArray(resolved.outputs) ? resolved.outputs : [],
    };
  }, [definition, nodeType]);

  if (!definition) return null;

  const shortDescription = definition.display?.description ?? definition.description;
  const hasSimulator = Boolean(definition.customUI?.dashboardButton);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>About This Node</h3>
        {hasSimulator && (
          <span className={styles.badge} data-type="simulator">
            Has Simulator
          </span>
        )}
      </div>

      {shortDescription && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Description</h4>
          <p className={styles.description}>{shortDescription}</p>
        </div>
      )}

      {implementationNotes && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Usage Guide</h4>
          <p className={styles.notes}>{implementationNotes}</p>
        </div>
      )}

      {ports.inputs.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Inputs</h4>
          <ul className={styles.portList}>
            {ports.inputs.map((input: WorkflowPortSpec) => (
              <li key={input.key} className={styles.portItem}>
                <span className={styles.portName}>{input.label}</span>
                <span className={styles.portType}>{input.type}</span>
                {input.required && <span className={styles.portRequired}>required</span>}
                {input.description && (
                  <p className={styles.portDescription}>{input.description}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ports.outputs.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Outputs</h4>
          <ul className={styles.portList}>
            {ports.outputs.map((output: WorkflowPortSpec) => (
              <li key={output.key} className={styles.portItem}>
                <span className={styles.portName}>{output.label}</span>
                <span className={styles.portType}>{output.type}</span>
                {output.description && (
                  <p className={styles.portDescription}>{output.description}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
