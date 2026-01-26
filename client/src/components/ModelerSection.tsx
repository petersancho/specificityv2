import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import WebGLViewerCanvas from "./WebGLViewerCanvas";
import Tooltip from "./ui/Tooltip";
import { useProjectStore } from "../store/useProjectStore";
import styles from "./ModelerSection.module.css";
import {
  COMMAND_DEFINITIONS,
  parseCommandInput,
  type CommandDefinition,
} from "../commands/registry";
import { COMMAND_DESCRIPTIONS } from "../data/commandDescriptions";
import type { Geometry, PolylineGeometry, Vec3 } from "../types";
import { centroid, sub, add, computeBestFitPlane } from "../geometry/math";

const geometryCommands = COMMAND_DEFINITIONS.filter(
  (command) => command.category === "geometry"
);
const SUPPORTED_PERFORM_COMMANDS = new Set([
  "undo",
  "redo",
  "copy",
  "paste",
  "duplicate",
  "delete",
  "focus",
  "frameall",
  "move",
  "rotate",
  "scale",
  "transform",
  "gumball",
  "interpolate",
  "loft",
  "surface",
  "extrude",
]);
const performCommands = COMMAND_DEFINITIONS.filter(
  (command) =>
    command.category === "performs" && SUPPORTED_PERFORM_COMMANDS.has(command.id)
);

type CommandRequest = {
  id: string;
  input: string;
  requestId: number;
};

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const renderCommandIcon = (commandId: string) => {
  switch (commandId) {
    case "point":
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
          <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
        </svg>
      );
    case "polyline":
      return (
        <svg {...iconProps} aria-hidden="true">
          <polyline points="4 18 9 8 15 14 20 6" />
          <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="9" cy="8" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="15" cy="14" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="20" cy="6" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "rectangle":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="5" y="6" width="14" height="12" rx="2" />
          <path d="M5 10h14M5 14h14" />
        </svg>
      );
    case "circle":
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "primitive":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M6 12h12M12 6v12" />
        </svg>
      );
    case "interpolate":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M4 16c3-6 9-8 16-8" />
          <circle cx="4" cy="16" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="10" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="20" cy="8" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "boolean":
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="10" cy="12" r="5" />
          <circle cx="14" cy="12" r="5" />
        </svg>
      );
    case "loft":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M6 7h12" />
          <path d="M4 12h16" />
          <path d="M6 17h12" />
        </svg>
      );
    case "surface":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="5" y="6" width="14" height="12" rx="2" />
          <path d="M5 10h14M10 6v12M14 6v12" />
        </svg>
      );
    case "extrude":
      return (
        <svg {...iconProps} aria-hidden="true">
          <rect x="7" y="9" width="10" height="10" rx="2" />
          <path d="M12 4v6M9 7l3-3 3 3" />
        </svg>
      );
    case "transform":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M12 4v16M4 12h16" />
          <path d="M12 4l-2 2M12 4l2 2M12 20l-2-2M12 20l2-2" />
          <path d="M4 12l2-2M4 12l2 2M20 12l-2-2M20 12l-2 2" />
        </svg>
      );
    case "morph":
      return (
        <svg {...iconProps} aria-hidden="true">
          <path d="M4 15c3-6 7-6 10 0s4 6 6 0" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps} aria-hidden="true">
          <circle cx="12" cy="12" r="6" />
        </svg>
      );
  }
};

type ModelerSectionProps = {
  onCaptureRequest?: (element: HTMLElement) => Promise<void> | void;
  captureDisabled?: boolean;
};

const ModelerSection = ({ onCaptureRequest, captureDisabled }: ModelerSectionProps) => {
  const geometry = useProjectStore((state) => state.geometry);
  const layers = useProjectStore((state) => state.layers);
  const assignments = useProjectStore((state) => state.assignments);
  const materials = useProjectStore((state) => state.materials);
  const selectionMode = useProjectStore((state) => state.selectionMode);
  const setSelectionMode = useProjectStore((state) => state.setSelectionMode);
  const componentSelection = useProjectStore(
    (state) => state.componentSelection
  );
  const setComponentSelection = useProjectStore(
    (state) => state.setComponentSelection
  );
  const addGeometryReferenceNode = useProjectStore(
    (state) => state.addGeometryReferenceNode
  );
  const workflowNodes = useProjectStore((state) => state.workflow.nodes);
  const renameLayer = useProjectStore((state) => state.renameLayer);
  const renameSceneNode = useProjectStore((state) => state.renameSceneNode);
  const transformOrientation = useProjectStore(
    (state) => state.transformOrientation
  );
  const setTransformOrientation = useProjectStore(
    (state) => state.setTransformOrientation
  );
  const pivot = useProjectStore((state) => state.pivot);
  const setPivotMode = useProjectStore((state) => state.setPivotMode);
  const displayMode = useProjectStore((state) => state.displayMode);
  const setDisplayMode = useProjectStore((state) => state.setDisplayMode);
  const viewSettings = useProjectStore((state) => state.viewSettings);
  const setViewSettings = useProjectStore((state) => state.setViewSettings);
  const snapSettings = useProjectStore((state) => state.snapSettings);
  const setSnapSettings = useProjectStore((state) => state.setSnapSettings);
  const gridSettings = useProjectStore((state) => state.gridSettings);
  const setGridSettings = useProjectStore((state) => state.setGridSettings);
  const setCPlane = useProjectStore((state) => state.setCPlane);
  const resetCPlane = useProjectStore((state) => state.resetCPlane);
  const cameraState = useProjectStore((state) => state.camera);
  const setCameraPreset = useProjectStore((state) => state.setCameraPreset);
  const setCameraState = useProjectStore((state) => state.setCameraState);
  const undoModeler = useProjectStore((state) => state.undoModeler);
  const redoModeler = useProjectStore((state) => state.redoModeler);
  const clipboard = useProjectStore((state) => state.clipboard);
  const setClipboard = useProjectStore((state) => state.setClipboard);
  const addGeometryItems = useProjectStore((state) => state.addGeometryItems);
  const deleteGeometry = useProjectStore((state) => state.deleteGeometry);
  const hiddenGeometryIds = useProjectStore((state) => state.hiddenGeometryIds);
  const lockedGeometryIds = useProjectStore((state) => state.lockedGeometryIds);
  const toggleGeometryVisibility = useProjectStore(
    (state) => state.toggleGeometryVisibility
  );
  const toggleGeometryLock = useProjectStore((state) => state.toggleGeometryLock);
  const sceneNodes = useProjectStore((state) => state.sceneNodes);
  const createGroup = useProjectStore((state) => state.createGroup);
  const ungroup = useProjectStore((state) => state.ungroup);
  const selectedGeometryIds = useProjectStore(
    (state) => state.selectedGeometryIds
  );
  const selectGeometry = useProjectStore((state) => state.selectGeometry);
  const setSelectedGeometryIds = useProjectStore(
    (state) => state.setSelectedGeometryIds
  );
  const setMaterialAssignment = useProjectStore(
    (state) => state.setMaterialAssignment
  );
  const [activeCommand, setActiveCommand] = useState<CommandDefinition | null>(
    null
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [primitiveSettings, setPrimitiveSettings] = useState({
    kind: "box" as "box" | "sphere" | "cylinder" | "torus",
    size: 1,
    radius: 0.5,
    height: 1,
    tube: 0.2,
    radialSegments: 24,
    tubularSegments: 36,
  });
  const [rectangleSettings, setRectangleSettings] = useState({
    width: 1.6,
    height: 1,
  });
  const [circleSettings, setCircleSettings] = useState({
    radius: 0.8,
    segments: 32,
  });
  const [commandInput, setCommandInput] = useState("");
  const [commandError, setCommandError] = useState("");
  const [commandRequest, setCommandRequest] = useState<CommandRequest | null>(
    null
  );
  const commandRequestIdRef = useRef(0);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [footerRoot, setFooterRoot] = useState<HTMLElement | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFooterRoot(document.getElementById("workspace-footer-root"));
  }, []);

  const selectedPolylines = useMemo(
    () =>
      selectedGeometryIds
        .map((id) => geometry.find((item) => item.id === id))
        .filter((item): item is PolylineGeometry => item?.type === "polyline"),
    [geometry, selectedGeometryIds]
  );

  const loftSelectionState = useMemo<{ ready: boolean; message: string }>(() => {
    if (selectionMode !== "object") {
      return {
        ready: false,
        message: "Switch the selection filter to Object to loft curves.",
      };
    }
    if (selectedPolylines.length === 0) {
      return { ready: false, message: "Select at least two polylines to loft." };
    }
    if (selectedPolylines.length === 1) {
      return { ready: false, message: "Select one more polyline to loft." };
    }
    return { ready: true, message: "" };
  }, [selectionMode, selectedPolylines.length]);

  const primarySelectedGeometryId =
    selectedGeometryIds[selectedGeometryIds.length - 1] ?? null;

  const referencedGeometryIds = useMemo(() => {
    const ids = new Set<string>();
    workflowNodes.forEach((node) => {
      if (node.type === "geometryReference" && node.data?.geometryId) {
        ids.add(node.data.geometryId);
      }
    });
    return ids;
  }, [workflowNodes]);

  const selectedGeometry =
    geometry.find((item) => item.id === primarySelectedGeometryId) ?? geometry[0];
  const selectedGeometryLabel =
    selectionMode !== "object"
      ? componentSelection.length > 0
        ? `${componentSelection.length} ${selectionMode} selected`
        : "None"
      : selectedGeometryIds.length > 1
        ? `${selectedGeometryIds.length} selected`
        : selectedGeometry?.id ?? "None";
  const selectedLayer = layers.find(
    (layer) => layer.id === selectedGeometry?.layerId
  );
  const assignedGeometryMaterialId = assignments.find(
    (assignment) => assignment.geometryId === selectedGeometry?.id
  )?.materialId;
  const assignedLayerMaterialId = assignments.find(
    (assignment) => assignment.layerId === selectedLayer?.id
  )?.materialId;
  const assignedMaterialId =
    assignedGeometryMaterialId ?? assignedLayerMaterialId ?? materials[0]?.id;
  const selectedMaterial = materials.find(
    (material) => material.id === assignedMaterialId
  );
  const selectedMaterialLabel =
    selectedMaterial?.name ?? (materials.length === 0 ? "Loading..." : "Unassigned");

  const extrudeCommand = useMemo(
    () => COMMAND_DEFINITIONS.find((command) => command.id === "extrude") ?? null,
    []
  );

  const activeSnapsLabel = useMemo(() => {
    const labels = [
      snapSettings.grid ? "grid" : null,
      snapSettings.vertices ? "vertex" : null,
      snapSettings.endpoints ? "endpoint" : null,
      snapSettings.midpoints ? "midpoint" : null,
      snapSettings.intersections ? "intersection" : null,
      snapSettings.perpendicular ? "perpendicular" : null,
      snapSettings.tangent ? "tangent" : null,
    ].filter(Boolean);
    return labels.length > 0 ? labels.join(", ") : "none";
  }, [snapSettings]);

  const hasExtrudeProfile = useMemo(
    () =>
      selectedGeometryIds.some(
        (id) => geometry.find((item) => item.id === id)?.type === "polyline"
      ),
    [geometry, selectedGeometryIds]
  );

  const geometryMap = useMemo(
    () => new Map(geometry.map((item) => [item.id, item])),
    [geometry]
  );
  const vertexMap = useMemo(
    () =>
      new Map(
        geometry
          .filter((item) => item.type === "vertex")
          .map((item) => [item.id, item])
      ),
    [geometry]
  );

  const selectionPoints = useMemo(() => {
    const points: Vec3[] = [];
    selectedGeometryIds.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item) return;
      if (item.type === "vertex") {
        points.push(item.position);
        return;
      }
      if (item.type === "polyline") {
        item.vertexIds.forEach((vertexId) => {
          const vertex = vertexMap.get(vertexId);
          if (vertex) points.push(vertex.position);
        });
        return;
      }
      if ("mesh" in item) {
        for (let i = 0; i < item.mesh.positions.length; i += 3) {
          points.push({
            x: item.mesh.positions[i],
            y: item.mesh.positions[i + 1],
            z: item.mesh.positions[i + 2],
          });
        }
      }
    });
    return points;
  }, [geometryMap, vertexMap, selectedGeometryIds]);

  const canAlignSelectionPlane = selectionPoints.length >= 3;

  useEffect(() => {
    if (snapSettings.gridStep === gridSettings.spacing) return;
    setSnapSettings({ gridStep: gridSettings.spacing });
  }, [gridSettings.spacing, snapSettings.gridStep, setSnapSettings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activeCommand) {
        setActiveCommand(null);
      }
      if (commandError) {
        setCommandError("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCommand, commandError]);

  useEffect(() => {
    if (activeCommand?.id !== "loft") return;
    setCommandError(loftSelectionState.ready ? "" : loftSelectionState.message);
  }, [activeCommand?.id, loftSelectionState.ready, loftSelectionState.message]);

  const activateCommand = (command: CommandDefinition) => {
    setActiveCommand(command);
    setCommandError("");
  };

  const createGeometryId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const collectGeometryDependencies = (ids: string[]) => {
    const collected = new Set<string>();
    const stack = [...ids];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || collected.has(current)) continue;
      const item = geometryMap.get(current);
      if (!item) continue;
      collected.add(current);
      if (item.type === "polyline") {
        item.vertexIds.forEach((vertexId) => stack.push(vertexId));
      }
      if (item.type === "surface") {
        item.loops.forEach((loop) => loop.forEach((vertexId) => stack.push(vertexId)));
      }
      if (item.type === "loft") {
        item.sectionIds.forEach((sectionId) => stack.push(sectionId));
      }
      if (item.type === "extrude") {
        item.profileIds.forEach((profileId) => stack.push(profileId));
      }
    }
    return Array.from(collected);
  };

  const computeSelectionPivot = (ids: string[]): Vec3 => {
    const points: Vec3[] = [];
    ids.forEach((id) => {
      const item = geometryMap.get(id);
      if (!item) return;
      if (item.type === "vertex") {
        points.push(item.position);
        return;
      }
      if (item.type === "polyline") {
        item.vertexIds.forEach((vertexId) => {
          const vertex = vertexMap.get(vertexId);
          if (vertex) points.push(vertex.position);
        });
        return;
      }
      if ("mesh" in item) {
        for (let i = 0; i < item.mesh.positions.length; i += 3) {
          points.push({
            x: item.mesh.positions[i],
            y: item.mesh.positions[i + 1],
            z: item.mesh.positions[i + 2],
          });
        }
      }
    });
    return points.length > 0 ? centroid(points) : { x: 0, y: 0, z: 0 };
  };

  const copySelection = () => {
    if (selectedGeometryIds.length === 0) return;
    const ids = collectGeometryDependencies(selectedGeometryIds);
    const payload = ids
      .map((id) => geometryMap.get(id))
      .filter(Boolean) as Geometry[];
    setClipboard({
      geometry: payload.map((item) => structuredClone(item)),
      layers: layers.map((layer) => structuredClone(layer)),
      assignments: assignments.map((assignment) => structuredClone(assignment)),
      selectedGeometryIds: [...selectedGeometryIds],
      pivot: computeSelectionPivot(selectedGeometryIds),
    });
  };

  const pasteSelection = (mode: "inplace" | "cursor" | "origin") => {
    if (!clipboard || clipboard.geometry.length === 0) return;
    const previousSelection = [...selectedGeometryIds];
    const idMap = new Map<string, string>();
    const cloned = clipboard.geometry.map((item) => {
      const prefix =
        item.type === "vertex"
          ? "vertex"
          : item.type === "polyline"
            ? "polyline"
            : item.type === "surface"
              ? "surface"
              : item.type === "loft"
                ? "loft"
                : "extrude";
      const nextId = createGeometryId(prefix);
      idMap.set(item.id, nextId);
      return { ...structuredClone(item), id: nextId };
    });

    const remapped = cloned.map((item) => {
      if (item.type === "polyline") {
        return {
          ...item,
          vertexIds: item.vertexIds.map((id) => idMap.get(id) ?? id),
        };
      }
      if (item.type === "surface") {
        return {
          ...item,
          loops: item.loops.map((loop) => loop.map((id) => idMap.get(id) ?? id)),
        };
      }
      if (item.type === "loft") {
        return {
          ...item,
          sectionIds: item.sectionIds.map((id) => idMap.get(id) ?? id),
        };
      }
      if (item.type === "extrude") {
        return {
          ...item,
          profileIds: item.profileIds.map((id) => idMap.get(id) ?? id),
        };
      }
      return item;
    });

    const pivotTarget =
      mode === "origin"
        ? { x: 0, y: 0, z: 0 }
        : mode === "cursor" && pivot.cursorPosition
          ? pivot.cursorPosition
          : mode === "cursor"
            ? cameraState.target
            : clipboard.pivot;
    const delta = sub(pivotTarget, clipboard.pivot);
    const translated = remapped.map((item) => {
      if (item.type === "vertex") {
        return {
          ...item,
          position: add(item.position, delta),
        };
      }
      if ("mesh" in item) {
        const positions = item.mesh.positions.slice();
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += delta.x;
          positions[i + 1] += delta.y;
          positions[i + 2] += delta.z;
        }
        return {
          ...item,
          mesh: { ...item.mesh, positions },
        };
      }
      return item;
    });

    addGeometryItems(translated, {
      selectIds: translated.map((item) => item.id),
      recordHistory: true,
    });
    setActiveCommand(COMMAND_DEFINITIONS.find((c) => c.id === "move") ?? null);
    dispatchCommandRequest(
      "move",
      `start ids=${translated.map((item) => item.id).join(",")} prev=${previousSelection.join(",")}`
    );
  };

  const duplicateSelection = () => {
    copySelection();
    pasteSelection("cursor");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoModeler();
        } else {
          undoModeler();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redoModeler();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "v") {
        event.preventDefault();
        pasteSelection("cursor");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (key === "f") {
        event.preventDefault();
        if (event.shiftKey) {
          dispatchCommandRequest("frameall", "");
        } else {
          dispatchCommandRequest("focus", "");
        }
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copySelection, pasteSelection, duplicateSelection, undoModeler, redoModeler]);

  const sceneNodeMap = useMemo(
    () => new Map(sceneNodes.map((node) => [node.id, node])),
    [sceneNodes]
  );

  const handleCapture = async () => {
    if (!viewerRef.current || !onCaptureRequest) return;
    const container = viewerRef.current;
    const prevStyles = {
      width: container.style.width,
      height: container.style.height,
      position: container.style.position,
      left: container.style.left,
      top: container.style.top,
      zIndex: container.style.zIndex,
    };
    container.classList.add(styles.captureActive);
    container.style.width = "1600px";
    container.style.height = "900px";
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.zIndex = "-1";
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      await onCaptureRequest(container);
    } finally {
      container.classList.remove(styles.captureActive);
      container.style.width = prevStyles.width;
      container.style.height = prevStyles.height;
      container.style.position = prevStyles.position;
      container.style.left = prevStyles.left;
      container.style.top = prevStyles.top;
      container.style.zIndex = prevStyles.zIndex;
    }
  };

  const collectGroupGeometryIds = (groupId: string) => {
    const ids: string[] = [];
    const visit = (nodeId: string) => {
      const node = sceneNodeMap.get(nodeId);
      if (!node) return;
      if (node.type === "geometry" && node.geometryId) {
        ids.push(node.geometryId);
      }
      node.childIds.forEach((childId) => visit(childId));
    };
    visit(groupId);
    return ids;
  };

  const setGroupVisibility = (groupId: string, visible: boolean) => {
    const ids = collectGroupGeometryIds(groupId);
    ids.forEach((id) => toggleGeometryVisibility(id, visible));
  };

  const setGroupLock = (groupId: string, locked: boolean) => {
    const ids = collectGroupGeometryIds(groupId);
    ids.forEach((id) => toggleGeometryLock(id, locked));
  };

  const showAllGeometry = () => {
    geometry.forEach((item) => toggleGeometryVisibility(item.id, true));
  };

  const hideSelection = () => {
    selectedGeometryIds.forEach((id) => toggleGeometryVisibility(id, false));
  };

  const isolateSelection = () => {
    geometry.forEach((item) =>
      toggleGeometryVisibility(item.id, selectedGeometryIds.includes(item.id))
    );
  };

  const lockSelection = () => {
    selectedGeometryIds.forEach((id) => toggleGeometryLock(id, true));
  };

  const unlockAllGeometry = () => {
    geometry.forEach((item) => toggleGeometryLock(item.id, false));
  };

  const renderSceneNode = (nodeId: string, depth = 0) => {
    const node = sceneNodeMap.get(nodeId);
    if (!node) return null;
    const isGeometry = node.type === "geometry";
    const geometryId = node.geometryId ?? "";
    const groupIds = !isGeometry ? collectGroupGeometryIds(node.id) : [];
    const isHidden = isGeometry
      ? hiddenGeometryIds.includes(geometryId)
      : groupIds.length > 0 && groupIds.every((id) => hiddenGeometryIds.includes(id));
    const isLocked = isGeometry
      ? lockedGeometryIds.includes(geometryId)
      : groupIds.length > 0 && groupIds.every((id) => lockedGeometryIds.includes(id));
    const isSelected = isGeometry && selectedGeometryIds.includes(geometryId);
    return (
      <div key={node.id}>
        <div
          className={`${styles.outlinerItem} ${
            isSelected || node.id === selectedGroupId ? styles.outlinerItemActive : ""
          }`}
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <button
            type="button"
            className={styles.outlinerLabel}
            onClick={() => {
              if (isGeometry) {
                if (!isLocked) {
                  selectGeometry(geometryId, false);
                  const moveCommand = COMMAND_DEFINITIONS.find(
                    (command) => command.id === "move"
                  );
                  if (moveCommand) {
                    activateCommand(moveCommand);
                  }
                  dispatchCommandRequest("move", "start");
                }
                return;
              }
            setSelectedGroupId(node.id);
            setSelectedGeometryIds(collectGroupGeometryIds(node.id));
            }}
            onDoubleClick={() => {
              const nextName = window.prompt("Rename", node.name);
              if (nextName && nextName.trim()) {
                renameSceneNode(node.id, nextName.trim());
              }
            }}
          >
            {node.name}
          </button>
          <div className={styles.outlinerActions}>
            <button
              type="button"
              className={styles.outlinerAction}
              onClick={() => {
                if (isGeometry) {
                  toggleGeometryVisibility(geometryId);
                } else {
                  setGroupVisibility(node.id, isHidden);
                }
              }}
            >
              {isHidden ? "Show" : "Hide"}
            </button>
            <button
              type="button"
              className={styles.outlinerAction}
              onClick={() => {
                if (isGeometry) {
                  toggleGeometryLock(geometryId);
                } else {
                  setGroupLock(node.id, !isLocked);
                }
              }}
            >
              {isLocked ? "Unlock" : "Lock"}
            </button>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>C-Plane</span>
            <div className={styles.commandActions}>
              <button
                type="button"
                className={styles.commandAction}
                onClick={() => resetCPlane()}
              >
                World XY
              </button>
              <button
                type="button"
                className={styles.commandAction}
                onClick={() =>
                  setCPlane({
                    origin: { x: 0, y: 0, z: 0 },
                    normal: { x: 0, y: 0, z: 1 },
                    xAxis: { x: 1, y: 0, z: 0 },
                    yAxis: { x: 0, y: 1, z: 0 },
                  })
                }
              >
                World XZ
              </button>
              <button
                type="button"
                className={styles.commandAction}
                onClick={() =>
                  setCPlane({
                    origin: { x: 0, y: 0, z: 0 },
                    normal: { x: 1, y: 0, z: 0 },
                    xAxis: { x: 0, y: 1, z: 0 },
                    yAxis: { x: 0, y: 0, z: 1 },
                  })
                }
              >
                World YZ
              </button>
              <button
                type="button"
                className={styles.commandActionPrimary}
                disabled={!canAlignSelectionPlane}
                onClick={() => {
                  if (!canAlignSelectionPlane) return;
                  const plane = computeBestFitPlane(selectionPoints);
                  setCPlane(plane);
                }}
              >
                Align Selection
              </button>
            </div>
          </div>
        </div>
        {node.childIds.map((childId) => renderSceneNode(childId, depth + 1))}
      </div>
    );
  };

  const ensurePlanarDefaults = () => {
    resetCPlane(undefined, { recordHistory: false });
    setSnapSettings({ grid: true });
    setTransformOrientation("cplane");
  };

  const handleCommandClick = (command: CommandDefinition) => {
    if (command.id === "undo") {
      undoModeler();
      return;
    }
    if (command.id === "redo") {
      redoModeler();
      return;
    }
    if (command.id === "copy") {
      copySelection();
      return;
    }
    if (command.id === "paste") {
      pasteSelection("cursor");
      return;
    }
    if (command.id === "duplicate") {
      duplicateSelection();
      return;
    }
    if (command.id === "focus" || command.id === "frameall") {
      dispatchCommandRequest(command.id, "");
      return;
    }
    if (command.id === "delete") {
      if (selectedGeometryIds.length > 0) {
        const shouldDelete =
          selectedGeometryIds.length > 20
            ? window.confirm(
                `Delete ${selectedGeometryIds.length} items? This cannot be undone without undo.`
              )
            : true;
        if (shouldDelete) {
          deleteGeometry(selectedGeometryIds);
        }
      }
      return;
    }
    if (command.id === "rectangle" || command.id === "circle") {
      ensurePlanarDefaults();
    }
    activateCommand(command);
    setCommandInput("");
    if (command.id === "loft" && !loftSelectionState.ready) {
      setCommandError(loftSelectionState.message);
    } else {
      setCommandError("");
    }
  };

  const dispatchCommandRequest = (id: string, input: string) => {
    commandRequestIdRef.current += 1;
    setCommandRequest({ id, input, requestId: commandRequestIdRef.current });
  };

  const handleConfirmActiveCommand = () => {
    if (!activeCommand) return;
    if (activeCommand.id === "loft" && !loftSelectionState.ready) {
      setCommandError(loftSelectionState.message);
      return;
    }
    dispatchCommandRequest(activeCommand.id, "accept");
  };

  const parseNumeric = (value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const parseFirstNumber = (input: string) => {
    const match = input.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/i);
    return match ? Number(match[0]) : null;
  };

  const updatePrimitiveFromInput = (input: string) => {
    const lower = input.toLowerCase();
    setPrimitiveSettings((prev) => {
      const next = { ...prev };
      if (lower.includes("sphere")) next.kind = "sphere";
      if (lower.includes("box") || lower.includes("cube")) next.kind = "box";
      if (lower.includes("cylinder")) next.kind = "cylinder";
      if (lower.includes("torus") || lower.includes("toroid")) next.kind = "torus";
      const sizeMatch = input.match(/size\s*=?\s*(-?\d*\.?\d+)/i);
      if (sizeMatch) {
        next.size = parseNumeric(sizeMatch[1], next.size);
      }
      const radiusMatch =
        input.match(/radius\s*=?\s*(-?\d*\.?\d+)/i) ??
        input.match(/\br\s*=?\s*(-?\d*\.?\d+)/i);
      if (radiusMatch) {
        next.radius = parseNumeric(radiusMatch[1], next.radius);
      }
      const heightMatch = input.match(/height\s*=?\s*(-?\d*\.?\d+)/i);
      if (heightMatch) {
        next.height = parseNumeric(heightMatch[1], next.height);
      }
      const tubeMatch = input.match(/tube\s*=?\s*(-?\d*\.?\d+)/i);
      if (tubeMatch) {
        next.tube = parseNumeric(tubeMatch[1], next.tube);
      }
      const radialMatch = input.match(/segments\s*=?\s*(\d+)/i);
      if (radialMatch) {
        next.radialSegments = Math.max(
          6,
          Math.round(parseNumeric(radialMatch[1], next.radialSegments))
        );
      }
      const tubularMatch = input.match(/tubular\s*=?\s*(\d+)/i);
      if (tubularMatch) {
        next.tubularSegments = Math.max(
          8,
          Math.round(parseNumeric(tubularMatch[1], next.tubularSegments))
        );
      }
      const fallbackNumber = parseFirstNumber(input);
      if (fallbackNumber != null && !sizeMatch && !radiusMatch) {
        next.size = fallbackNumber;
      }
      return next;
    });
  };

  const updateRectangleFromInput = (input: string) => {
    const widthMatch = input.match(/width\s*=?\s*(-?\d*\.?\d+)/i);
    const heightMatch = input.match(/height\s*=?\s*(-?\d*\.?\d+)/i);
    const numbers = (input.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi) ?? []).map(
      (value) => Number(value)
    );
    setRectangleSettings((prev) => ({
      width: widthMatch
        ? parseNumeric(widthMatch[1], prev.width)
        : numbers[0] ?? prev.width,
      height: heightMatch
        ? parseNumeric(heightMatch[1], prev.height)
        : numbers[1] ?? prev.height,
    }));
  };

  const updateCircleFromInput = (input: string) => {
    const radiusMatch = input.match(/radius\s*=?\s*(-?\d*\.?\d+)/i);
    const segmentsMatch = input.match(/segments\s*=?\s*(\d+)/i);
    const fallback = parseFirstNumber(input);
    setCircleSettings((prev) => ({
      radius: radiusMatch
        ? parseNumeric(radiusMatch[1], prev.radius)
        : fallback ?? prev.radius,
      segments: segmentsMatch
        ? Math.max(8, Math.round(parseNumeric(segmentsMatch[1], prev.segments)))
        : prev.segments,
    }));
  };

  const handleCommandSubmit = () => {
    const trimmed = commandInput.trim();
    
    if (!trimmed) return;
    const parsed = parseCommandInput(commandInput);
    if (parsed.command) {
      const commandId = parsed.command.id;
      const args = parsed.args ?? "";
      const lower = args.toLowerCase();
      if (commandId === "primitive") {
        updatePrimitiveFromInput(commandInput);
        activateCommand(parsed.command);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "rectangle") {
        updateRectangleFromInput(args || commandInput);
        activateCommand(parsed.command);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "circle") {
        updateCircleFromInput(args || commandInput);
        activateCommand(parsed.command);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "undo") {
        undoModeler();
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "redo") {
        redoModeler();
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "copy") {
        copySelection();
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "paste") {
        const mode = lower.includes("inplace")
          ? "inplace"
          : lower.includes("origin")
            ? "origin"
            : "cursor";
        pasteSelection(mode);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "duplicate") {
        duplicateSelection();
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "focus" || commandId === "frameall") {
        dispatchCommandRequest(commandId, "");
        setActiveCommand(null);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "delete") {
        if (selectedGeometryIds.length > 0) {
          const shouldDelete =
            selectedGeometryIds.length > 20
              ? window.confirm(
                  `Delete ${selectedGeometryIds.length} items? This cannot be undone without undo.`
                )
              : true;
          if (shouldDelete) {
            deleteGeometry(selectedGeometryIds);
          }
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "selectionfilter") {
        if (lower.includes("vertex")) setSelectionMode("vertex");
        else if (lower.includes("edge")) setSelectionMode("edge");
        else if (lower.includes("face")) setSelectionMode("face");
        else setSelectionMode("object");
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "snapping") {
        setSnapSettings({
          grid: lower.includes("grid") ? !lower.includes("nogrid") : snapSettings.grid,
          vertices: lower.includes("vertex")
            ? !lower.includes("novertex")
            : snapSettings.vertices,
          endpoints: lower.includes("endpoint")
            ? !lower.includes("noendpoint")
            : snapSettings.endpoints,
          midpoints: lower.includes("midpoint")
            ? !lower.includes("nomidpoint")
            : snapSettings.midpoints,
          intersections: lower.includes("intersection")
            ? !lower.includes("nointersection")
            : snapSettings.intersections,
          perpendicular: lower.includes("perpendicular")
            ? !lower.includes("noperpendicular")
            : snapSettings.perpendicular,
          tangent: lower.includes("tangent")
            ? !lower.includes("notangent")
            : snapSettings.tangent,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "grid") {
        const spacingMatch = lower.match(/spacing\s*=?\s*(-?\d*\.?\d+)/);
        const unitsMatch = lower.match(/units\s*=?\s*([a-z]+)/);
        setGridSettings({
          spacing: spacingMatch ? Number(spacingMatch[1]) : gridSettings.spacing,
          units: unitsMatch ? unitsMatch[1] : gridSettings.units,
          adaptive: lower.includes("adaptive")
            ? !lower.includes("noadaptive")
            : gridSettings.adaptive,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "display") {
        if (lower.includes("wire")) setDisplayMode("wireframe");
        else if (lower.includes("ghost")) setDisplayMode("ghosted");
        else if (lower.includes("edge")) setDisplayMode("shaded_edges");
        else setDisplayMode("shaded");
        if (lower.includes("backface")) {
          setViewSettings({ backfaceCulling: !lower.includes("nobackface") });
        }
        if (lower.includes("normals")) {
          setViewSettings({ showNormals: !lower.includes("nonormals") });
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "isolate") {
        if (lower.includes("show")) {
          showAllGeometry();
        } else if (lower.includes("unlock")) {
          unlockAllGeometry();
        } else if (lower.includes("lock")) {
          lockSelection();
        } else if (lower.includes("hide")) {
          hideSelection();
        } else {
          isolateSelection();
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "camera") {
        if (lower.includes("maya")) setCameraPreset("maya");
        else if (lower.includes("rhino")) setCameraPreset("rhino");
        else if (lower.includes("custom")) setCameraPreset("custom");
        else setCameraPreset("blender");
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "view") {
        const dist = Math.max(
          0.1,
          Math.sqrt(
            Math.pow(cameraState.position.x - cameraState.target.x, 2) +
              Math.pow(cameraState.position.y - cameraState.target.y, 2) +
              Math.pow(cameraState.position.z - cameraState.target.z, 2)
          )
        );
        if (lower.includes("top")) {
          setCameraState({
            position: {
              x: cameraState.target.x,
              y: cameraState.target.y + dist,
              z: cameraState.target.z,
            },
          });
        } else if (lower.includes("front")) {
          setCameraState({
            position: {
              x: cameraState.target.x,
              y: cameraState.target.y,
              z: cameraState.target.z + dist,
            },
          });
        } else if (lower.includes("right")) {
          setCameraState({
            position: {
              x: cameraState.target.x + dist,
              y: cameraState.target.y,
              z: cameraState.target.z,
            },
          });
        } else if (lower.includes("persp")) {
          setCameraState({ fov: 50 });
        } else if (lower.includes("ortho")) {
          setCameraState({ fov: 20 });
        }
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "orbit") {
        const speedMatch = lower.match(/speed\s*=?\s*(-?\d*\.?\d+)/);
        setCameraState({
          orbitSpeed: speedMatch ? Number(speedMatch[1]) : cameraState.orbitSpeed,
          upright: lower.includes("upright")
            ? true
            : lower.includes("noupright")
              ? false
              : cameraState.upright,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "pan") {
        const speedMatch = lower.match(/speed\s*=?\s*(-?\d*\.?\d+)/);
        setCameraState({
          panSpeed: speedMatch ? Number(speedMatch[1]) : cameraState.panSpeed,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "zoom") {
        const speedMatch = lower.match(/speed\s*=?\s*(-?\d*\.?\d+)/);
        setCameraState({
          zoomSpeed: speedMatch ? Number(speedMatch[1]) : cameraState.zoomSpeed,
          invertZoom: lower.includes("invert")
            ? true
            : lower.includes("normal")
              ? false
              : cameraState.invertZoom,
          zoomToCursor: lower.includes("cursor")
            ? true
            : lower.includes("nocursor")
              ? false
              : cameraState.zoomToCursor,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "pivot") {
        if (lower.includes("world")) setPivotMode("world");
        else if (lower.includes("origin")) setPivotMode("origin");
        else if (lower.includes("cursor")) setPivotMode("cursor");
        else if (lower.includes("picked")) setPivotMode("picked");
        else setPivotMode("selection");
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "status") {
        setShowStatusBar((prev) => !prev);
        setCommandInput("");
        setCommandError("");
        return;
      }
      if (commandId === "tolerance") {
        const absMatch = lower.match(/abs(?:olute)?\s*=?\s*(-?\d*\.?\d+)/);
        const angleMatch = lower.match(/angle\s*=?\s*(-?\d*\.?\d+)/);
        setSnapSettings({
          gridStep: absMatch ? Number(absMatch[1]) : snapSettings.gridStep,
          angleStep: angleMatch ? Number(angleMatch[1]) : snapSettings.angleStep,
        });
        setCommandInput("");
        setCommandError("");
        return;
      }
      activateCommand(parsed.command);
      dispatchCommandRequest(commandId, args);
      setCommandInput("");
      if (commandId === "loft" && !loftSelectionState.ready) {
        setCommandError(loftSelectionState.message);
      } else {
        setCommandError("");
      }
      return;
    }
    if (activeCommand) {
      dispatchCommandRequest(activeCommand.id, trimmed);
      setCommandInput("");
      if (activeCommand.id !== "loft") {
        setCommandError("");
      }
      return;
    }
    setCommandError("Command not recognized.");
  };

  const confirmableCommandIds = new Set([
    "polyline",
    "loft",
    "surface",
    "extrude",
    "move",
    "rotate",
    "scale",
    "transform",
  ]);
  const canConfirmCommand =
    activeCommand && confirmableCommandIds.has(activeCommand.id);

  const selectionAlreadyLinked = useMemo(() => {
    if (!primarySelectedGeometryId) return false;
    return referencedGeometryIds.has(primarySelectedGeometryId);
  }, [primarySelectedGeometryId, referencedGeometryIds]);

  const handleSendSelectionToWorkflow = () => {
    if (!primarySelectedGeometryId || selectionAlreadyLinked) return;
    addGeometryReferenceNode(primarySelectedGeometryId);
  };

  const formatGeometryType = (type?: Geometry["type"]) => {
    switch (type) {
      case "vertex":
        return "Point";
      case "polyline":
        return "Polyline";
      case "surface":
        return "Surface";
      case "loft":
        return "Loft";
      case "extrude":
        return "Extrude";
      default:
        return "Geometry";
    }
  };

  const statusBlocks = [
    { label: "Selected", value: selectedGeometryLabel },
    { label: "Mode", value: activeCommand?.label ?? "Idle" },
    { label: "Layer", value: selectedLayer?.name ?? "Default" },
    { label: "Material", value: selectedMaterialLabel },
    { label: "Filter", value: selectionMode },
    { label: "Pivot", value: pivot.mode },
    { label: "Orient", value: transformOrientation },
    { label: "Snaps", value: activeSnapsLabel },
  ];

  const footerContent = (
    <footer className={styles.footerBar}>
      <div className={styles.footerGroup}>
        {[
          { key: "⌘Z", label: "Undo" },
          { key: "⌘⇧Z", label: "Redo" },
        ].map((shortcut) => (
          <span key={shortcut.key} className={styles.footerKey}>
            <strong>{shortcut.key}</strong>
            <small>{shortcut.label}</small>
          </span>
        ))}
      </div>
      <div className={`${styles.footerGroup} ${styles.footerCenter}`}>
        <span className={styles.footerChip}>
          Grid: {gridSettings.spacing}
          {gridSettings.units}
        </span>
        <span className={styles.footerChip}>Snaps: {activeSnapsLabel}</span>
      </div>
      <div className={styles.footerGroup}>
        <span className={styles.footerChip}>Selected: {selectedGeometryLabel}</span>
        <span className={styles.footerChip}>Mode: {activeCommand?.label ?? "Idle"}</span>
        <span className={styles.footerChip}>Filter: {selectionMode}</span>
      </div>
    </footer>
  );

  return (
    <>
      <section className={styles.section}>
        <div className={styles.header}>
          <div>
            <h2>Roslyn</h2>
            <p>Parametric modeling and geometry orchestration.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.badge}>Live Geometry</div>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={handleCapture}
              disabled={captureDisabled}
            >
              {captureDisabled ? "Capturing…" : "Screenshot Render"}
            </button>
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.commandBar}>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Command Line</span>
            <div className={styles.commandInputRow}>
              <input
                ref={commandInputRef}
                className={styles.commandInput}
                value={commandInput}
                onChange={(event) => {
                  setCommandInput(event.target.value);
                  if (commandError) setCommandError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCommandSubmit();
                  }
                }}
                placeholder="Type a command (e.g. polyline, move, extrude distance=1)"
              />
              <button
                type="button"
                className={styles.commandActionPrimary}
                onClick={handleCommandSubmit}
              >
                Run
              </button>
            </div>
            {commandError && (
              <span className={styles.commandErrorText}>{commandError}</span>
            )}
            <span className={styles.commandHint}>
              Use the tool buttons below to activate commands or type to adjust settings.
            </span>
          </div>
          {activeCommand && (
            <div className={styles.railSection}>
              <span className={styles.railTitle}>Active Command</span>
              <div className={styles.activeCommandCard}>
                <span className={styles.activeCommandName}>
                  {activeCommand.label}
                </span>
                <span className={styles.activeCommandPrompt}>
                  {activeCommand.prompt}
                </span>
                <div className={styles.commandActions}>
                  {activeCommand.id === "gumball" && extrudeCommand && hasExtrudeProfile && (
                    <button
                      type="button"
                      className={styles.commandActionPrimary}
                      onClick={() => handleCommandClick(extrudeCommand)}
                    >
                      Extrude
                    </button>
                  )}
                  {componentSelection.length === 0 && loftSelectionState.ready && (
                      <button
                        type="button"
                        className={styles.commandActionPrimary}
                        onClick={() => {
                          const loftCommand = COMMAND_DEFINITIONS.find(
                            (command) => command.id === "loft"
                          );
                          if (loftCommand) handleCommandClick(loftCommand);
                        }}
                      >
                        Loft Selection
                      </button>
                    )}
                  {selectionMode !== "edge" && (
                    <button
                      type="button"
                      className={styles.commandAction}
                      onClick={() => setSelectionMode("edge")}
                    >
                      Edge Filter
                    </button>
                  )}
                  {canConfirmCommand && (
                    <>
                      <button
                        type="button"
                        className={styles.commandActionPrimary}
                        onClick={handleConfirmActiveCommand}
                      >
                        Finish
                      </button>
                      <button
                        type="button"
                        className={styles.commandAction}
                        onClick={() =>
                          dispatchCommandRequest(activeCommand.id, "cancel")
                        }
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={styles.commandAction}
                    onClick={() => setActiveCommand(null)}
                  >
                    Exit
                  </button>
                </div>
                <span className={styles.commandHint}>Press Esc to exit command.</span>
              </div>
            </div>
          )}
          {activeCommand?.id === "primitive" && (
            <div className={styles.railSection}>
              <span className={styles.railTitle}>Primitive Options</span>
              <label className={styles.field}>
                <span>Type</span>
                <select
                  className={styles.fieldInput}
                  value={primitiveSettings.kind}
                  onChange={(event) =>
                    setPrimitiveSettings((prev) => ({
                      ...prev,
                      kind: event.target.value as typeof prev.kind,
                    }))
                  }
                >
                  <option value="box">Box</option>
                  <option value="sphere">Sphere</option>
                  <option value="cylinder">Cylinder</option>
                  <option value="torus">Torus</option>
                </select>
              </label>
              {primitiveSettings.kind === "box" && (
                <label className={styles.field}>
                  <span>Size</span>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={primitiveSettings.size}
                    onChange={(event) =>
                      setPrimitiveSettings((prev) => ({
                        ...prev,
                        size: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              )}
              {primitiveSettings.kind === "sphere" && (
                <label className={styles.field}>
                  <span>Radius</span>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={primitiveSettings.radius}
                    onChange={(event) =>
                      setPrimitiveSettings((prev) => ({
                        ...prev,
                        radius: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              )}
              {primitiveSettings.kind === "cylinder" && (
                <>
                  <label className={styles.field}>
                    <span>Radius</span>
                    <input
                      className={styles.fieldInput}
                      type="number"
                      min="0.01"
                      step="0.1"
                      value={primitiveSettings.radius}
                      onChange={(event) =>
                        setPrimitiveSettings((prev) => ({
                          ...prev,
                          radius: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Height</span>
                    <input
                      className={styles.fieldInput}
                      type="number"
                      min="0.01"
                      step="0.1"
                      value={primitiveSettings.height}
                      onChange={(event) =>
                        setPrimitiveSettings((prev) => ({
                          ...prev,
                          height: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </>
              )}
              {primitiveSettings.kind === "torus" && (
                <>
                  <label className={styles.field}>
                    <span>Radius</span>
                    <input
                      className={styles.fieldInput}
                      type="number"
                      min="0.01"
                      step="0.1"
                      value={primitiveSettings.radius}
                      onChange={(event) =>
                        setPrimitiveSettings((prev) => ({
                          ...prev,
                          radius: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Tube</span>
                    <input
                      className={styles.fieldInput}
                      type="number"
                      min="0.01"
                      step="0.05"
                      value={primitiveSettings.tube}
                      onChange={(event) =>
                        setPrimitiveSettings((prev) => ({
                          ...prev,
                          tube: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </>
              )}
              <label className={styles.field}>
                <span>Segments</span>
                <input
                  className={styles.fieldInput}
                  type="number"
                  min="6"
                  step="1"
                  value={primitiveSettings.radialSegments}
                  onChange={(event) =>
                    setPrimitiveSettings((prev) => ({
                      ...prev,
                      radialSegments: Math.max(6, Math.round(Number(event.target.value))),
                    }))
                  }
                />
              </label>
              {primitiveSettings.kind === "torus" && (
                <label className={styles.field}>
                  <span>Tubular Segments</span>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    min="8"
                    step="1"
                    value={primitiveSettings.tubularSegments}
                    onChange={(event) =>
                      setPrimitiveSettings((prev) => ({
                        ...prev,
                        tubularSegments: Math.max(
                          8,
                          Math.round(Number(event.target.value))
                        ),
                      }))
                    }
                  />
                </label>
              )}
            </div>
          )}
          {activeCommand?.id === "rectangle" && (
            <div className={styles.railSection}>
              <span className={styles.railTitle}>Rectangle Options</span>
              <label className={styles.field}>
                <span>Width</span>
                <input
                  className={styles.fieldInput}
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={rectangleSettings.width}
                  onChange={(event) =>
                    setRectangleSettings((prev) => ({
                      ...prev,
                      width: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Height</span>
                <input
                  className={styles.fieldInput}
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={rectangleSettings.height}
                  onChange={(event) =>
                    setRectangleSettings((prev) => ({
                      ...prev,
                      height: Number(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
          )}
          {activeCommand?.id === "circle" && (
            <div className={styles.railSection}>
              <span className={styles.railTitle}>Circle Options</span>
              <label className={styles.field}>
                <span>Radius</span>
                <input
                  className={styles.fieldInput}
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={circleSettings.radius}
                  onChange={(event) =>
                    setCircleSettings((prev) => ({
                      ...prev,
                      radius: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Segments</span>
                <input
                  className={styles.fieldInput}
                  type="number"
                  min="8"
                  step="1"
                  value={circleSettings.segments}
                  onChange={(event) =>
                    setCircleSettings((prev) => ({
                      ...prev,
                      segments: Math.max(8, Math.round(Number(event.target.value))),
                    }))
                  }
                />
              </label>
            </div>
          )}
          <div className={styles.commandGroup}>
            <span className={styles.commandGroupTitle}>Geometry</span>
            <div className={styles.commandGrid}>
              {geometryCommands.map((command) => {
                const meta = COMMAND_DESCRIPTIONS[command.id];
                return (
                  <Tooltip
                    key={command.id}
                    content={meta?.description ?? command.prompt}
                    shortcut={meta?.shortcut}
                    position="bottom"
                  >
                    <button
                      type="button"
                      className={`${styles.commandIconButton} ${
                        activeCommand?.id === command.id
                          ? styles.commandIconActive
                          : ""
                      }`}
                      onClick={() => handleCommandClick(command)}
                      aria-label={command.label}
                    >
                      <span className={styles.commandIcon}>
                        {renderCommandIcon(command.id)}
                      </span>
                      <span className={styles.commandLabel}>{command.label}</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <div className={styles.commandGroup}>
            <span className={styles.commandGroupTitle}>Performs</span>
            <div className={styles.commandGrid}>
              {performCommands.map((command) => {
                const meta = COMMAND_DESCRIPTIONS[command.id];
                return (
                  <Tooltip
                    key={command.id}
                    content={meta?.description ?? command.prompt}
                    shortcut={meta?.shortcut}
                    position="bottom"
                  >
                    <button
                      type="button"
                      className={`${styles.commandIconButton} ${
                        activeCommand?.id === command.id
                          ? styles.commandIconActive
                          : ""
                      }`}
                      onClick={() => handleCommandClick(command)}
                      aria-label={command.label}
                    >
                      <span className={styles.commandIcon}>
                        {renderCommandIcon(command.id)}
                      </span>
                      <span className={styles.commandLabel}>{command.label}</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Workflow</span>
            <div className={styles.commandActions}>
              <button
                type="button"
                className={styles.commandActionPrimary}
                onClick={handleSendSelectionToWorkflow}
                disabled={!primarySelectedGeometryId || selectionAlreadyLinked}
              >
                Reference Active
              </button>
              <button
                type="button"
                className={styles.commandAction}
                onClick={() => {
                  selectedGeometryIds.forEach((id) => {
                    if (!referencedGeometryIds.has(id)) {
                      addGeometryReferenceNode(id);
                    }
                  });
                }}
                disabled={selectedGeometryIds.every((id) => referencedGeometryIds.has(id))}
              >
                Reference All
              </button>
            </div>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Render</span>
            <label className={styles.field}>
              <span>Material</span>
              <select
                value={assignedMaterialId ?? ""}
                onChange={(event) => {
                  if (selectedGeometry) {
                    setMaterialAssignment({
                      geometryId: selectedGeometry.id,
                      layerId: selectedLayer?.id,
                      materialId: event.target.value,
                    });
                    return;
                  }
                  if (!selectedLayer) return;
                  setMaterialAssignment({
                    layerId: selectedLayer.id,
                    materialId: event.target.value,
                  });
                }}
              >
                {materials.length === 0 && (
                  <option value="">Loading materials...</option>
                )}
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Selection</span>
            <label className={styles.field}>
              <span>Filter</span>
              <select
                value={selectionMode}
                onChange={(event) =>
                  setSelectionMode(event.target.value as typeof selectionMode)
                }
              >
                <option value="object">Object</option>
                <option value="vertex">Vertex</option>
                <option value="edge">Edge</option>
                <option value="face">Face</option>
              </select>
            </label>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Transform</span>
            <label className={styles.field}>
              <span>Orientation</span>
              <select
                value={transformOrientation}
                onChange={(event) =>
                  setTransformOrientation(
                    event.target.value as typeof transformOrientation
                  )
                }
              >
                <option value="world">World</option>
                <option value="local">Local</option>
                <option value="cplane">C-Plane</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Pivot</span>
              <select
                value={pivot.mode}
                onChange={(event) =>
                  setPivotMode(event.target.value as typeof pivot.mode)
                }
              >
                <option value="selection">Selection</option>
                <option value="world">World</option>
                <option value="picked">Picked</option>
                <option value="cursor">Cursor</option>
                <option value="origin">Origin</option>
              </select>
            </label>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Display</span>
            <label className={styles.field}>
              <span>Mode</span>
              <select
                value={displayMode}
                onChange={(event) =>
                  setDisplayMode(event.target.value as typeof displayMode)
                }
              >
                <option value="shaded">Shaded</option>
                <option value="shaded_edges">Shaded + Edges</option>
                <option value="wireframe">Wireframe</option>
                <option value="ghosted">Ghosted</option>
              </select>
            </label>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Grid / Units</span>
            <label className={styles.field}>
              <span>Spacing</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="0.1"
                value={gridSettings.spacing}
                onChange={(event) =>
                  setGridSettings({ spacing: Number(event.target.value) })
                }
              />
            </label>
            <label className={styles.field}>
              <span>Units</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={gridSettings.units}
                onChange={(event) =>
                  setGridSettings({ units: event.target.value })
                }
              />
            </label>
            <label className={styles.snapOption}>
              <input
                type="checkbox"
                checked={gridSettings.adaptive}
                onChange={(event) =>
                  setGridSettings({ adaptive: event.target.checked })
                }
              />
              Adaptive Grid
            </label>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Camera</span>
            <label className={styles.field}>
              <span>Preset</span>
              <select
                value={cameraState.preset}
                onChange={(event) =>
                  setCameraPreset(event.target.value as typeof cameraState.preset)
                }
              >
                <option value="blender">Blender</option>
                <option value="maya">Maya</option>
                <option value="rhino">Rhino</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className={styles.snapOption}>
              <input
                type="checkbox"
                checked={cameraState.zoomToCursor}
                onChange={(event) =>
                  setCameraState({ zoomToCursor: event.target.checked })
                }
              />
              Zoom to Cursor
            </label>
            <label className={styles.snapOption}>
              <input
                type="checkbox"
                checked={cameraState.invertZoom}
                onChange={(event) =>
                  setCameraState({ invertZoom: event.target.checked })
                }
              />
              Invert Zoom
            </label>
            <label className={styles.snapOption}>
              <input
                type="checkbox"
                checked={cameraState.upright}
                onChange={(event) =>
                  setCameraState({ upright: event.target.checked })
                }
              />
              Upright
            </label>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Tolerance</span>
            <label className={styles.field}>
              <span>Grid Step</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="0.01"
                value={snapSettings.gridStep}
                onChange={(event) =>
                  setSnapSettings({ gridStep: Number(event.target.value) })
                }
              />
            </label>
            <label className={styles.field}>
              <span>Angle Step</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="1"
                value={snapSettings.angleStep}
                onChange={(event) =>
                  setSnapSettings({ angleStep: Number(event.target.value) })
                }
              />
            </label>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Outliner</span>
            <div className={styles.outlinerControls}>
              <button
                type="button"
                className={styles.outlinerAction}
                onClick={() => {
                  if (selectedGeometryIds.length === 0) return;
                  const name = `Group ${sceneNodes.length + 1}`;
                  createGroup(name, selectedGeometryIds);
                }}
              >
                Group
              </button>
              <button
                type="button"
                className={styles.outlinerAction}
                onClick={() => {
                  if (!selectedGroupId) return;
                  ungroup(selectedGroupId);
                  setSelectedGroupId(null);
                }}
                disabled={!selectedGroupId}
              >
                Ungroup
              </button>
            </div>
            <div className={styles.outlinerList}>
              {sceneNodes
                .filter((node) => !node.parentId)
                .map((node) => renderSceneNode(node.id, 0))}
            </div>
          </div>
          <div className={styles.railSection}>
            <span className={styles.railTitle}>Layers</span>
            <div className={styles.outlinerList}>
              {layers.map((layer) => (
                <div key={layer.id} className={styles.outlinerItem}>
                  <button
                    type="button"
                    className={styles.outlinerLabel}
                    onDoubleClick={() => {
                      const nextName = window.prompt("Rename layer", layer.name);
                      if (nextName && nextName.trim()) {
                        renameLayer(layer.id, nextName.trim());
                      }
                    }}
                  >
                    {layer.name}
                  </button>
                  <div className={styles.outlinerActions}>
                    <button
                      type="button"
                      className={styles.outlinerAction}
                      onClick={() => {
                        const isHidden = layer.geometryIds.every((id) =>
                          hiddenGeometryIds.includes(id)
                        );
                        layer.geometryIds.forEach((id) =>
                          toggleGeometryVisibility(id, isHidden)
                        );
                      }}
                    >
                      {layer.geometryIds.every((id) =>
                        hiddenGeometryIds.includes(id)
                      )
                        ? "Show"
                        : "Hide"}
                    </button>
                    <button
                      type="button"
                      className={styles.outlinerAction}
                      onClick={() => {
                        const isLocked = layer.geometryIds.every((id) =>
                          lockedGeometryIds.includes(id)
                        );
                        layer.geometryIds.forEach((id) =>
                          toggleGeometryLock(id, !isLocked)
                        );
                      }}
                    >
                      {layer.geometryIds.every((id) =>
                        lockedGeometryIds.includes(id)
                      )
                        ? "Unlock"
                        : "Lock"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
          <div className={styles.viewer} data-panel-drag="true" ref={viewerRef}>
            <div
              className={styles.viewerInner}
              onContextMenu={(event) => event.preventDefault()}
              data-no-workspace-pan
              data-panel-drag="true"
            >
              <WebGLViewerCanvas
                activeCommandId={activeCommand?.id ?? null}
                commandRequest={commandRequest}
                primitiveSettings={primitiveSettings}
                rectangleSettings={rectangleSettings}
                circleSettings={circleSettings}
              />
            </div>
          </div>
        </div>
      </section>
      {footerRoot && showStatusBar && createPortal(footerContent, footerRoot)}
    </>
  );
}

export default ModelerSection;
