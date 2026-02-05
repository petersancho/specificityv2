import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import Tooltip from "../ui/Tooltip";
import styles from "./SavedScriptsDropdown.module.css";

export type SavedScriptsDropdownProps = {
  onAddPhysicsRig: () => void;
  onAddEvolutionaryRig: () => void;
  onAddChemistryRig: () => void;
  onAddTopologyRig: () => void;
  onAddVoxelRig: () => void;
};

type SavedScriptSpec = {
  id: "chemistry" | "physics" | "topology" | "voxel" | "evolutionary";
  label: string;
  subtitle: string;
  purpose: string;
  flow: Array<{ label: string; detail: string }>;
  onClick: () => void;
};

export const SavedScriptsDropdown = ({
  onAddPhysicsRig,
  onAddEvolutionaryRig,
  onAddChemistryRig,
  onAddTopologyRig,
  onAddVoxelRig,
}: SavedScriptsDropdownProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const activationRef = useRef(0);
  const handleScriptActivate = (
    event:
      | PointerEvent<HTMLButtonElement>
      | MouseEvent<HTMLButtonElement>
      | KeyboardEvent<HTMLButtonElement>,
    action: () => void
  ) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopPropagation();
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    if (now - activationRef.current < 250) {
      console.log('[DROPDOWN] Debounced duplicate click (< 250ms)');
      return;
    }
    activationRef.current = now;
    console.log('[DROPDOWN] Activating script action');
    action();
    setIsExpanded(false);
  };

  const scripts: SavedScriptSpec[] = [
    {
      id: "physics",
      label: "Physics Solver",
      subtitle: "Stress Analysis",
      purpose: "Run a cantilever canopy test to visualize stress, displacement, and stability.",
      flow: [
        { label: "Inputs", detail: "Domain mesh + supports + loads" },
        { label: "Goals", detail: "Volume + stiffness targets" },
        { label: "Solver", detail: "FEA equilibrium solve" },
        { label: "Outputs", detail: "Deformed mesh + diagnostics" },
      ],
      onClick: onAddPhysicsRig,
    },
    {
      id: "evolutionary",
      label: "Evolutionary Solver",
      subtitle: "Generative Search",
      purpose: "Evolve geometry parameters to explore multi-goal fitness tradeoffs.",
      flow: [
        { label: "Inputs", detail: "Domain mesh + evolutionary settings" },
        { label: "Goals", detail: "Fitness metrics + constraints" },
        { label: "Solver", detail: "Genetic search" },
        { label: "Outputs", detail: "Best candidate + metrics" },
      ],
      onClick: onAddEvolutionaryRig,
    },
    {
      id: "chemistry",
      label: "Chemistry Solver",
      subtitle: "Material Transmutation",
      purpose: "Blend steel, ceramic, and glass into a graded, thermal-optimized field.",
      flow: [
        { label: "Inputs", detail: "Domain geometry + material seeds" },
        { label: "Goals", detail: "Mass, blend, thermal, transparency" },
        { label: "Solver", detail: "Particle diffusion + mixing" },
        { label: "Outputs", detail: "Graded mesh + diagnostics" },
      ],
      onClick: onAddChemistryRig,
    },
    {
      id: "topology",
      label: "Topology Optimization",
      subtitle: "Mass Reduction",
      purpose: "Carve away mass while preserving stiffness under load.",
      flow: [
        { label: "Inputs", detail: "Domain mesh + loads + anchors" },
        { label: "Goals", detail: "Stiffness + volume targets" },
        { label: "Solver", detail: "Density field optimization" },
        { label: "Outputs", detail: "Isosurface mesh + density field" },
      ],
      onClick: onAddTopologyRig,
    },
    {
      id: "voxel",
      label: "Voxel Solver",
      subtitle: "Volumetric Grid",
      purpose: "Discretize geometry into voxels for field-based simulation.",
      flow: [
        { label: "Inputs", detail: "Domain geometry + resolution" },
        { label: "Goals", detail: "Optional analysis constraints" },
        { label: "Solver", detail: "Voxel grid builder" },
        { label: "Outputs", detail: "Voxel grid + preview mesh" },
      ],
      onClick: onAddVoxelRig,
    },
  ];

  const header = (
    <button
      type="button"
      className={styles.header}
      onClick={() => setIsExpanded((prev) => !prev)}
      aria-expanded={isExpanded}
    >
      <div className={styles.headerText}>
        <span className={styles.title}>Solver Rigs</span>
      </div>
      <span className={styles.arrow}>{isExpanded ? "▴" : "▾"}</span>
    </button>
  );

  return (
    <div className={styles.dropdown}>
      <Tooltip
        content="Pre-wired solver rigs with semantic flow, auto-run, and simulator dashboards."
        position="right"
      >
        {header}
      </Tooltip>

      {isExpanded && (
        <div className={styles.content}>
          <div className={styles.intro}>
            Solver rigs drop a full graph at your view center. Run Graph to compute outputs,
            then open the simulator dashboard to inspect results.
          </div>
          {scripts.map((script) => (
            <button
              key={script.id}
              type="button"
              className={styles.scriptButton}
              onClick={(event) => handleScriptActivate(event, script.onClick)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  handleScriptActivate(event, script.onClick);
                }
              }}
            >
              <div className={styles.scriptHeader}>
                <span className={styles.scriptLabel}>{script.label}</span>
                <span className={styles.scriptSubtitle}>{script.subtitle}</span>
              </div>
              <div className={styles.scriptPurpose}>{script.purpose}</div>
              <div className={styles.scriptFlow}>
                {script.flow.map((item) => (
                  <div key={`${script.id}-${item.label}`} className={styles.flowItem}>
                    <span className={styles.flowLabel}>{item.label}</span>
                    <span className={styles.flowDetail}>{item.detail}</span>
                  </div>
                ))}
              </div>
              <div className={styles.scriptMeta}>Add rig, run graph, open simulator</div>
            </button>
          ))}
          <div className={styles.hint}>
            Each rig is ready to edit. Swap goals, adjust parameters, then re-run to explore your
            own solver setup.
          </div>
        </div>
      )}
    </div>
  );
};
