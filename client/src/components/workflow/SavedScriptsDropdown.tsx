import { useState } from "react";
import Tooltip from "../ui/Tooltip";
import styles from "./SavedScriptsDropdown.module.css";

export type SavedScriptsDropdownProps = {
  onAddPhysicsRig: () => void;
  onAddEvolutionaryRig: () => void;
  onAddChemistryRig: () => void;
  onAddTopologyRig: () => void;
  onAddVoxelRig: () => void;
};

export const SavedScriptsDropdown = ({
  onAddPhysicsRig,
  onAddEvolutionaryRig,
  onAddChemistryRig,
  onAddTopologyRig,
  onAddVoxelRig,
}: SavedScriptsDropdownProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const scripts = [
    { label: "Physics Solver", onClick: onAddPhysicsRig },
    { label: "Evolutionary Solver", onClick: onAddEvolutionaryRig },
    { label: "Chemistry Solver", onClick: onAddChemistryRig },
    { label: "Topology Optimization", onClick: onAddTopologyRig },
    { label: "Voxel Solver", onClick: onAddVoxelRig },
  ];

  const header = (
    <button
      type="button"
      className={styles.header}
      onClick={() => setIsExpanded((prev) => !prev)}
      aria-expanded={isExpanded}
    >
      <div className={styles.headerText}>
        <span className={styles.title}>Saved Scripts</span>
      </div>
      <span className={styles.arrow}>{isExpanded ? "▴" : "▾"}</span>
    </button>
  );

  return (
    <div className={styles.dropdown}>
      <Tooltip
        content="Pre-built solver test rigs with all necessary nodes and connections"
        position="right"
      >
        {header}
      </Tooltip>

      {isExpanded && (
        <div className={styles.content}>
          {scripts.map((script) => (
            <button
              key={script.label}
              type="button"
              className={styles.scriptButton}
              onClick={script.onClick}
            >
              {script.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
