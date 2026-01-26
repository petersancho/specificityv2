import { type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Handle, Position, type HandleProps, type NodeProps } from "reactflow";
import { useProjectStore } from "../../store/useProjectStore";
import type { WorkflowNodeData } from "../../types";
import styles from "./WorkflowNodes.module.css";

type NodeShellProps = {
  label: string;
  icon: ReactNode;
  children?: ReactNode;
  variant?: string;
};

const NodeShell = ({ label, icon, children, variant }: NodeShellProps) => (
  <div className={styles.nodeCard} data-variant={variant} aria-label={label}>
    <div className={styles.nodeLabel}>{label}</div>
    <div className={styles.nodeIcon}>{icon}</div>
    {children}
  </div>
);

const triggerRightClickConnect = (event: ReactPointerEvent<HTMLDivElement>) => {
  if (event.button !== 2) return;
  event.preventDefault();
  event.stopPropagation();
  const eventInit = {
    bubbles: true,
    cancelable: true,
    clientX: event.clientX,
    clientY: event.clientY,
    screenX: event.screenX,
    screenY: event.screenY,
    button: 0,
    buttons: 1,
  };
  try {
    event.currentTarget.dispatchEvent(
      new PointerEvent("pointerdown", {
        ...eventInit,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
      })
    );
  } catch {
    event.currentTarget.dispatchEvent(new MouseEvent("mousedown", eventInit));
  }
};

type CustomHandleProps = HandleProps & { className?: string };

const RightClickHandle = ({ type, className, ...props }: CustomHandleProps) => (
  <Handle
    {...props}
    type={type}
    className={`${styles.handle} ${
      type === "target" ? styles.handleTarget : styles.handleSource
    } ${className ?? ""}`}
    onPointerDown={triggerRightClickConnect}
    onContextMenu={(event) => event.preventDefault()}
  />
);

const icons = {
  geometryReference: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  ),
  point: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    </svg>
  ),
  polyline: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="4 18 9 8 15 14 20 6" />
      <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="20" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  surface: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="6" width="14" height="12" rx="2" />
      <path d="M5 10h14M10 6v12M14 6v12" />
    </svg>
  ),
};

export const GeometryReferenceNode = ({
  id,
  data,
}: NodeProps<WorkflowNodeData>) => {
  const geometry = useProjectStore((state) => state.geometry);
  const updateNodeData = useProjectStore((state) => state.updateNodeData);
  return (
    <NodeShell
      label={data.label ?? "Geometry Reference"}
      icon={icons.geometryReference}
      variant="source"
    >
      <label className={styles.nodeField}>
        <span>Geometry</span>
        <select
          value={data.geometryId ?? ""}
          onChange={(event) =>
            updateNodeData(id, { geometryId: event.target.value })
          }
        >
          {geometry.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id}
            </option>
          ))}
        </select>
      </label>
      <RightClickHandle
        type="source"
        id="geometryId"
        position={Position.Right}
      />
    </NodeShell>
  );
};

export const PointNode = ({ id, data }: NodeProps<WorkflowNodeData>) => {
  const updateNodeData = useProjectStore((state) => state.updateNodeData);
  const point = data.point ?? { x: 0, y: 0, z: 0 };
  return (
    <NodeShell label={data.label ?? "Point"} icon={icons.point} variant="source">
      <div className={styles.nodeRow}>
        <label className={styles.nodeFieldInline}>
          X
          <input
            type="number"
            value={point.x}
            onChange={(event) =>
              updateNodeData(id, {
                point: { ...point, x: Number(event.target.value) },
              })
            }
          />
        </label>
        <label className={styles.nodeFieldInline}>
          Y
          <input
            type="number"
            value={point.y}
            onChange={(event) =>
              updateNodeData(id, {
                point: { ...point, y: Number(event.target.value) },
              })
            }
          />
        </label>
        <label className={styles.nodeFieldInline}>
          Z
          <input
            type="number"
            value={point.z}
            onChange={(event) =>
              updateNodeData(id, {
                point: { ...point, z: Number(event.target.value) },
              })
            }
          />
        </label>
      </div>
      <RightClickHandle type="source" id="geometryId" position={Position.Right} />
    </NodeShell>
  );
};

export const PolylineNode = ({ id, data }: NodeProps<WorkflowNodeData>) => {
  const updateNodeData = useProjectStore((state) => state.updateNodeData);
  return (
    <NodeShell label={data.label ?? "Polyline"} icon={icons.polyline} variant="source">
      <label className={styles.nodeField}>
        <span>Points</span>
        <textarea
          rows={3}
          value={data.pointsText ?? ""}
          onChange={(event) =>
            updateNodeData(id, { pointsText: event.target.value })
          }
          placeholder="0 0 0  1 0 0  1 0 1"
        />
      </label>
      <label className={styles.nodeCheckbox}>
        <input
          type="checkbox"
          checked={Boolean(data.closed)}
          onChange={(event) =>
            updateNodeData(id, { closed: event.target.checked })
          }
        />
        Closed
      </label>
      <RightClickHandle type="source" id="geometryId" position={Position.Right} />
    </NodeShell>
  );
};

export const SurfaceNode = ({ id, data }: NodeProps<WorkflowNodeData>) => {
  const updateNodeData = useProjectStore((state) => state.updateNodeData);
  return (
    <NodeShell label={data.label ?? "Surface"} icon={icons.surface} variant="source">
      <label className={styles.nodeField}>
        <span>Loop Points</span>
        <textarea
          rows={3}
          value={data.pointsText ?? ""}
          onChange={(event) =>
            updateNodeData(id, { pointsText: event.target.value })
          }
          placeholder="0 0 0  1 0 0  1 0 1  0 0 1"
        />
      </label>
      <RightClickHandle type="source" id="geometryId" position={Position.Right} />
    </NodeShell>
  );
};
