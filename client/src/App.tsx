import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import TopBar from "./components/TopBar";
import ModelerSection from "./components/ModelerSection";
import WorkflowSection from "./components/workflow/WorkflowSection";
import { useProjectStore } from "./store/useProjectStore";
import { buildApiUrl, SOCKET_URL } from "./config/runtime";
import logoSpecificitySymbol from "./assets/logo-specificity-symbol.svg";
import styles from "./App.module.css";

type Theme = "light" | "dark";

type PanelId = "roslyn" | "numerica";

type PanelState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PanelBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const PANEL_GAP = 120;
const CANVAS_GRID_SIZE = 84; // keep in sync with --canvas-grid-size in CSS
const CANVAS_TILE_COUNT = 40;
const CANVAS_WORLD_HALF = (CANVAS_GRID_SIZE * CANVAS_TILE_COUNT) / 2;

const INITIAL_PANELS: Record<PanelId, PanelState> = (() => {
  const roslyn = { width: 980, height: 680 };
  const numerica = { width: 940, height: 640 };
  const totalWidth = roslyn.width + numerica.width + PANEL_GAP;
  const leftEdge = CANVAS_WORLD_HALF - totalWidth / 2;
  const centerY = CANVAS_WORLD_HALF;
  return {
    roslyn: {
      x: leftEdge,
      y: centerY - roslyn.height / 2,
      width: roslyn.width,
      height: roslyn.height,
    },
    numerica: {
      x: leftEdge + roslyn.width + PANEL_GAP,
      y: centerY - numerica.height / 2,
      width: numerica.width,
      height: numerica.height,
    },
  };
})();

const computePanelBounds = (
  panelMap: Record<PanelId, PanelState>
): PanelBounds | null => {
  const panelValues = Object.values(panelMap);
  if (panelValues.length === 0) return null;
  return panelValues.reduce(
    (acc, panel) => {
      const minX = Math.min(acc.minX, panel.x);
      const minY = Math.min(acc.minY, panel.y);
      const maxX = Math.max(acc.maxX, panel.x + panel.width);
      const maxY = Math.max(acc.maxY, panel.y + panel.height);
      return { minX, minY, maxX, maxY };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );
};

const computeViewportDimensions = (rect?: DOMRect) => {
  const fallbackWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const fallbackHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  return {
    width: rect?.width ?? fallbackWidth,
    height: rect?.height ?? fallbackHeight,
  };
};

const computeCenteredOffset = (bounds: PanelBounds, rect?: DOMRect) => {
  const { width, height } = computeViewportDimensions(rect);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    x: width / 2 + CANVAS_WORLD_HALF - centerX,
    y: height / 2 + CANVAS_WORLD_HALF - centerY,
  };
};

const computeRoslynCenteredOffset = (
  panelMap: Record<PanelId, PanelState>,
  rect?: DOMRect
) => {
  const { width, height } = computeViewportDimensions(rect);
  const roslyn = panelMap.roslyn;
  if (roslyn) {
    const centerX = roslyn.x + roslyn.width / 2;
    const centerY = roslyn.y + roslyn.height / 2;
    return {
      x: width / 2 + CANVAS_WORLD_HALF - centerX,
      y: height / 2 + CANVAS_WORLD_HALF - centerY,
    };
  }
  const bounds = computePanelBounds(panelMap);
  if (!bounds) return { x: CANVAS_WORLD_HALF, y: CANVAS_WORLD_HALF };
  return computeCenteredOffset(bounds, rect);
};

const getInitialWorkspaceOffset = () => computeRoslynCenteredOffset(INITIAL_PANELS);

type DragState =
  | {
      kind: "pan";
      startPointer: { x: number; y: number };
      startOffset: { x: number; y: number };
    }
  | {
      kind: "move";
      panelId: PanelId;
      startPointer: { x: number; y: number };
      startPanel: PanelState;
    }
  | {
      kind: "resize";
      panelId: PanelId;
      startPointer: { x: number; y: number };
      startPanel: PanelState;
    };

const PANEL_MIN_WIDTH = 640;
const PANEL_MIN_HEIGHT = 420;
const PANEL_MAX_WIDTH = 2000;
const PANEL_MAX_HEIGHT = 1200;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const shouldIgnoreWorkspaceInput = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("[data-no-workspace-pan]"));
};

const PANEL_DRAG_SELECTOR = "[data-panel-drag='true']";

const THEME_STORAGE_KEY = "specificity-theme";

const getStoredTheme = (): Theme | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch (error) {
    return null;
  }
};

const getPreferredTheme = (): Theme => {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
};


const App = () => {
  const [status, setStatus] = useState("Ready");
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());
  const [workspaceScale, setWorkspaceScale] = useState(1);
  const [workspaceOffset, setWorkspaceOffset] = useState(getInitialWorkspaceOffset);
  const [panels, setPanels] = useState<Record<PanelId, PanelState>>(INITIAL_PANELS);
  const [workspaceLocked, setWorkspaceLocked] = useState(false);
  const [showIntroOverlay, setShowIntroOverlay] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturePreview, setCapturePreview] = useState<{ url: string; label: string } | null>(null);

  const setMaterials = useProjectStore((state) => state.setMaterials);
  const setSaves = useProjectStore((state) => state.setSaves);
  const loadProject = useProjectStore((state) => state.loadProject);
  const projectName = useProjectStore((state) => state.projectName);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const saves = useProjectStore((state) => state.saves);
  const currentSaveId = useProjectStore((state) => state.currentSaveId);
  const setCurrentSaveId = useProjectStore((state) => state.setCurrentSaveId);

  const projectPayload = useProjectStore((state) => ({
    geometry: state.geometry,
    layers: state.layers,
    assignments: state.assignments,
    workflow: state.workflow,
  }));

  const projectKey = useMemo(
    () => JSON.stringify(projectPayload),
    [projectPayload]
  );

  const socketRef = useRef<Socket | null>(null);
  const isRemoteUpdate = useRef(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const panelStageRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const workspaceScaleRef = useRef(workspaceScale);
  const hasCenteredPanelsRef = useRef(false);

  useEffect(() => {
    workspaceScaleRef.current = workspaceScale;
  }, [workspaceScale]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowIntroOverlay(false), 1500);
    return () => window.clearTimeout(timeout);
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await fetch(buildApiUrl("/materials"));
      const data = await response.json();
      setMaterials(data);
    } catch (error) {
      setStatus("Failed to load materials");
    }
  };


  const fetchSaves = async () => {
    try {
      const response = await fetch(buildApiUrl("/saves"));
      if (!response.ok) {
        setStatus("Failed to load saves");
        return;
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        setStatus("Failed to load saves");
        return;
      }
      setSaves(data);
    } catch (error) {
      setStatus("Failed to load saves");
    }
  };

  const saveProject = async () => {
    setStatus("Saving...");
    try {
      const response = await fetch(buildApiUrl("/saves"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentSaveId,
          name: projectName,
          project: projectPayload,
        }),
      });
      if (!response.ok) {
        setStatus("Save failed");
        return;
      }
      const data = await response.json();
      if (data.id) {
        setCurrentSaveId(data.id);
        setStatus(`Saved ${new Date().toLocaleTimeString()}`);
        fetchSaves();
      } else {
        setStatus("Save failed");
      }
    } catch (error) {
      setStatus("Save failed");
    }
  };

  const loadSelected = async () => {
    if (!currentSaveId) return;
    setStatus("Loading...");
    const response = await fetch(buildApiUrl(`/saves/${currentSaveId}`));
    if (!response.ok) {
      setStatus("Load failed");
      return;
    }
    const data = await response.json();
    if (data?.project) {
      isRemoteUpdate.current = true;
      loadProject(data.project);
      setProjectName(data.name ?? projectName);
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 0);
      setStatus("Loaded");
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    fetchMaterials();
    fetchSaves();
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    const socket = SOCKET_URL
      ? io(SOCKET_URL, { path: "/socket.io" })
      : io({ path: "/socket.io" });
    socketRef.current = socket;
    socket.on("project:update", (project) => {
      if (!project) return;
      isRemoteUpdate.current = true;
      loadProject(project);
      setStatus("Synced");
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 0);
    });
    return () => {
      socket.disconnect();
    };
  }, [loadProject]);

  useEffect(() => {
    if (!socketRef.current || isRemoteUpdate.current) return;
    socketRef.current.emit("project:update", projectPayload);
  }, [projectKey]);

  useLayoutEffect(() => {
    if (hasCenteredPanelsRef.current) return;
    if (!workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    setWorkspaceOffset(computeRoslynCenteredOffset(panels, rect));
    hasCenteredPanelsRef.current = true;
  }, [panels]);

  const updatePanel = (panelId: PanelId, next: PanelState) => {
    setPanels((prev) => ({
      ...prev,
      [panelId]: next,
    }));
  };

  const handlePointerMove = (event: PointerEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    event.preventDefault();
    if (dragState.kind === "pan") {
      const dx = event.clientX - dragState.startPointer.x;
      const dy = event.clientY - dragState.startPointer.y;
      setWorkspaceOffset({
        x: dragState.startOffset.x + dx,
        y: dragState.startOffset.y + dy,
      });
      return;
    }
    const dx = (event.clientX - dragState.startPointer.x) / workspaceScaleRef.current;
    const dy = (event.clientY - dragState.startPointer.y) / workspaceScaleRef.current;
    if (dragState.kind === "move") {
      updatePanel(dragState.panelId, {
        ...dragState.startPanel,
        x: dragState.startPanel.x + dx,
        y: dragState.startPanel.y + dy,
      });
      return;
    }
    const nextWidth = clamp(
      dragState.startPanel.width + dx,
      PANEL_MIN_WIDTH,
      PANEL_MAX_WIDTH
    );
    const nextHeight = clamp(
      dragState.startPanel.height + dy,
      PANEL_MIN_HEIGHT,
      PANEL_MAX_HEIGHT
    );
    updatePanel(dragState.panelId, {
      ...dragState.startPanel,
      width: nextWidth,
      height: nextHeight,
    });
  };

  const stopDragging = () => {
    dragStateRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDragging);
    window.removeEventListener("pointercancel", stopDragging);
  };

  const startDragging = (state: DragState) => {
    dragStateRef.current = state;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  };

  const panelTitles: Record<PanelId, string> = {
    roslyn: "Roslyn",
    numerica: "Numerica",
  };

  const handleWorkspacePointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (workspaceLocked) return;
    const target = event.target as HTMLElement;
    if (target.closest(`[data-panel-id]`)) return;
    if (shouldIgnoreWorkspaceInput(target)) return;
    if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;
    event.preventDefault();
    startDragging({
      kind: "pan",
      startPointer: { x: event.clientX, y: event.clientY },
      startOffset: workspaceOffset,
    });
  };

  const handleWorkspaceContextMenu = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
  };

  const handlePanelPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    panelId: PanelId
  ) => {
    event.preventDefault();
    event.stopPropagation();
    startDragging({
      kind: "move",
      panelId,
      startPointer: { x: event.clientX, y: event.clientY },
      startPanel: panels[panelId],
    });
  };

  const handlePanelSurfacePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    panelId: PanelId
  ) => {
    if (event.button !== 0) return;
    if (workspaceLocked) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest(PANEL_DRAG_SELECTOR)) return;
    event.preventDefault();
    event.stopPropagation();
    startDragging({
      kind: "move",
      panelId,
      startPointer: { x: event.clientX, y: event.clientY },
      startPanel: panels[panelId],
    });
  };

  const handlePanelResizePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    panelId: PanelId
  ) => {
    event.preventDefault();
    event.stopPropagation();
    startDragging({
      kind: "resize",
      panelId,
      startPointer: { x: event.clientX, y: event.clientY },
      startPanel: panels[panelId],
    });
  };

  const applyZoom = (nextScale: number, anchor: { x: number; y: number }) => {
    const clamped = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
    const worldX = (anchor.x - workspaceOffset.x) / workspaceScale;
    const worldY = (anchor.y - workspaceOffset.y) / workspaceScale;
    setWorkspaceScale(clamped);
    setWorkspaceOffset({
      x: anchor.x - worldX * clamped,
      y: anchor.y - worldY * clamped,
    });
  };

  const handleWorkspaceWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (workspaceLocked) return;
    event.preventDefault();
    if (shouldIgnoreWorkspaceInput(event.target)) return;
    if (!workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const delta = event.deltaY;
    const zoomFactor = delta > 0 ? 0.99 : 1.01;
    applyZoom(workspaceScale * zoomFactor, pointer);
  };

  const handleZoomButton = (direction: "in" | "out") => {
    if (workspaceLocked) return;
    if (!workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const anchor = { x: rect.width / 2, y: rect.height / 2 };
    const deltaScale = direction === "in" ? 1.01 : 0.99;
    applyZoom(workspaceScale * deltaScale, anchor);
  };

  const captureElement = async (target: HTMLElement, label: string) => {
    setIsCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const exportScale = Math.min(4, (window.devicePixelRatio || 1) * 2);
      const canvas = await html2canvas(target, {
        backgroundColor: null,
        scale: exportScale,
      });
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      setCapturePreview({ url: dataUrl, label });
    } catch (error) {
      console.error("Failed to capture screenshot", error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadCapture = () => {
    if (!capturePreview) return;
    const link = document.createElement("a");
    link.href = capturePreview.url;
    link.download = `${capturePreview.label.replace(/\s+/g, "-").toLowerCase()}-capture.png`;
    link.click();
  };

  return (
    <div className={styles.app}>
      {showIntroOverlay && (
        <div className={styles.introOverlay} aria-hidden="true">
          <img
            src={logoSpecificitySymbol}
            alt=""
            className={styles.introOverlaySymbol}
          />
        </div>
      )}
      <TopBar
        saves={saves}
        selectedSaveId={currentSaveId ?? ""}
        status={status}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onSave={saveProject}
        onLoad={loadSelected}
        onSelectSave={(value) => setCurrentSaveId(value)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className={styles.workspace}>
        <div className={styles.canvasToolbar}>
          <div className={styles.toolbarGroup}>
            <span className={styles.toolbarTitle}>Workspace</span>
            <span className={styles.toolbarHint}>
              Scroll to zoom, drag background to pan, drag panels to reposition.
            </span>
          </div>
          <div className={styles.zoomGroup}>
            <button
              type="button"
              className={`${styles.lockButton} ${workspaceLocked ? styles.lockButtonActive : ""}`}
              onClick={() => setWorkspaceLocked((prev) => !prev)}
            >
              {workspaceLocked ? "Unlock Canvas" : "Lock Canvas"}
            </button>
            <button
              type="button"
              className={styles.zoomButton}
              onClick={() => handleZoomButton("out")}
            >
              −
            </button>
            <span className={styles.zoomValue}>{Math.round(workspaceScale * 100)}%</span>
            <button
              type="button"
              className={styles.zoomButton}
              onClick={() => handleZoomButton("in")}
            >
              +
            </button>
          </div>
        </div>

        <div
          ref={workspaceRef}
          className={styles.canvas}
          onWheel={handleWorkspaceWheel}
          onPointerDown={handleWorkspacePointerDown}
          onContextMenu={handleWorkspaceContextMenu}
        >
          <div
            ref={panelStageRef}
            className={styles.panelStage}
            style={{
              transform: `translate(-50%, -50%) translate(${workspaceOffset.x}px, ${workspaceOffset.y}px) scale(${workspaceScale})`,
            }}
          >
            {Object.entries(panels).map(([panelId, panelState]) => (
              <div
                key={panelId}
                data-panel-id={panelId}
                className={styles.panel}
                onPointerDown={(event) =>
                  handlePanelSurfacePointerDown(event, panelId as PanelId)
                }
                style={{
                  width: `${panelState.width}px`,
                  height: `${panelState.height}px`,
                  left: `${panelState.x}px`,
                  top: `${panelState.y}px`,
                }}
              >
                <div
                  className={styles.panelHandle}
                  onPointerDown={(event) =>
                    handlePanelPointerDown(event, panelId as PanelId)
                  }
                >
                  {panelTitles[panelId as PanelId]}
                </div>
                <div className={styles.panelContent}>
                  {panelId === "roslyn" ? (
                    <ModelerSection
                      onCaptureRequest={(element) => captureElement(element, "Roslyn")}
                      captureDisabled={isCapturing}
                    />
                  ) : (
                    <WorkflowSection
                      onCaptureRequest={(element) => captureElement(element, "Numerica")}
                      captureDisabled={isCapturing}
                    />
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Resize panel"
                  className={styles.resizeHandle}
                  onPointerDown={(event) =>
                    handlePanelResizePointerDown(event, panelId as PanelId)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </main>
      {capturePreview && (
        <div className={styles.captureModal} role="dialog" aria-modal="true">
          <div className={styles.captureModalContent}>
            <div className={styles.captureModalHeader}>
              <span>Preview · {capturePreview.label}</span>
              <button
                type="button"
                className={styles.captureModalClose}
                onClick={() => setCapturePreview(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.captureModalBody}>
              <img src={capturePreview.url} alt="Screenshot preview" />
            </div>
            <div className={styles.captureModalActions}>
              <button
                type="button"
                className={styles.captureButton}
                onClick={handleDownloadCapture}
              >
                Download PNG
              </button>
              <button
                type="button"
                className={styles.captureSecondaryButton}
                onClick={() => setCapturePreview(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div id="workspace-footer-root" className={styles.workspaceFooterRoot} />

    </div>
  );
};

export default App;
