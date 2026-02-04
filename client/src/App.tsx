import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import WebGLAppTopBar from "./components/WebGLAppTopBar";
import DocumentationPage from "./components/DocumentationPage";
import ModelerSection from "./components/ModelerSection";
import WorkflowSection from "./components/workflow/WorkflowSection";
import WebGLButton from "./components/ui/WebGLButton";
import { useProjectStore } from "./store/useProjectStore";
import { buildApiUrl, SOCKET_URL } from "./config/runtime";
import logoLinguaSymbol from "./assets/logos/logo-lingua-symbol.svg";
import styles from "./App.module.css";

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

type AppPage = "workspace" | "docs";

const resolvePageFromHash = (hash: string): AppPage => {
  const normalized = hash.toLowerCase();
  if (normalized.includes("docs")) return "docs";
  return "workspace";
};

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

const App = () => {
  const [status, setStatus] = useState("Ready");
  const [currentHash, setCurrentHash] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.location.hash;
  });
  const [workspaceScale, setWorkspaceScale] = useState(1);
  const [workspaceOffset, setWorkspaceOffset] = useState(getInitialWorkspaceOffset);
  const [panels, setPanels] = useState<Record<PanelId, PanelState>>(INITIAL_PANELS);
  const [workspaceLocked, setWorkspaceLocked] = useState(false);
  const [fullscreenPanel, setFullscreenPanel] = useState<PanelId | null>(null);
  const [showIntroOverlay, setShowIntroOverlay] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturePreview, setCapturePreview] = useState<{ url: string; label: string } | null>(null);

  const setMaterials = useProjectStore((state) => state.setMaterials);
  const loadProject = useProjectStore((state) => state.loadProject);

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

  useEffect(() => {
    fetchMaterials();
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = "light";
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!fullscreenPanel) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenPanel(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenPanel]);

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
    if (shouldIgnoreWorkspaceInput(target)) return;
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
    const hiddenCanvases: Array<{
      element: HTMLCanvasElement;
      previousVisibility: string;
      previousCaptureHide?: string;
    }> = [];
    try {
      const html2canvas = (await import("html2canvas")).default;
      const scaleOverride = Number(target.dataset.captureScale);
      const defaultScale = Math.min(4, (window.devicePixelRatio || 1) * 2);
      const exportScale =
        Number.isFinite(scaleOverride) && scaleOverride > 0
          ? scaleOverride
          : defaultScale;
      const backgroundMode = target.dataset.captureBackground;
      const backgroundColor =
        backgroundMode === "white" ? "#ffffff" : null;
      const captureMode = target.dataset.captureMode;
      if (captureMode === "roslyn") {
        target.querySelectorAll<HTMLCanvasElement>("canvas").forEach((canvas) => {
          hiddenCanvases.push({
            element: canvas,
            previousVisibility: canvas.style.visibility,
            previousCaptureHide: canvas.dataset.captureHide,
          });
          canvas.style.visibility = "hidden";
          canvas.dataset.captureHide = "true";
        });
      }

      const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = src;
        });

      const captureWebGLCanvases =
        captureMode === "roslyn"
          ? Array.from(target.querySelectorAll("canvas"))
          : [];
      const targetRect = target.getBoundingClientRect();
      const webglSnapshots = await Promise.all(
        captureWebGLCanvases.map(async (canvas) => {
          try {
            const rect = canvas.getBoundingClientRect();
            const url = canvas.toDataURL("image/png");
            return {
              url,
              x: rect.left - targetRect.left,
              y: rect.top - targetRect.top,
              width: rect.width,
              height: rect.height,
            };
          } catch (error) {
            console.warn("Failed to capture WebGL canvas", error);
            return null;
          }
        })
      );
      const validSnapshots = webglSnapshots.filter(
        (snapshot): snapshot is {
          url: string;
          x: number;
          y: number;
          width: number;
          height: number;
        } => Boolean(snapshot)
      );

      const skipCanvas = captureMode === "roslyn";
      const captureRootId = `${label.toLowerCase()}-${Date.now()}`;
      target.dataset.captureRoot = captureRootId;

      let colorResolveCtx: CanvasRenderingContext2D | null = null;
      const resolveColorValue = (value: string) => {
        if (typeof document === "undefined") return null;
        if (!colorResolveCtx) {
          const canvas = document.createElement("canvas");
          canvas.width = 2;
          canvas.height = 2;
          colorResolveCtx = canvas.getContext("2d");
        }
        if (!colorResolveCtx) return null;
        const prev = colorResolveCtx.fillStyle;
        colorResolveCtx.fillStyle = "#000";
        colorResolveCtx.fillStyle = value;
        const resolved = colorResolveCtx.fillStyle;
        colorResolveCtx.fillStyle = prev;
        if (resolved === "#000" && value.trim() !== "#000" && value.trim() !== "rgb(0, 0, 0)") {
          return null;
        }
        return resolved;
      };

      const sanitizeCloneColors = (doc: Document) => {
        if (captureMode !== "roslyn") return;
        const root = doc.querySelector<HTMLElement>(`[data-capture-root="${captureRootId}"]`);
        if (!root) return;
        const view = doc.defaultView;
        if (!view) return;
        const COLOR_PROPS = [
          "color",
          "background-color",
          "border-top-color",
          "border-right-color",
          "border-bottom-color",
          "border-left-color",
          "outline-color",
          "text-decoration-color",
          "caret-color",
          "column-rule-color",
        ];
        const SHADOW_PROPS = ["box-shadow", "text-shadow"];
        const BG_PROPS = ["background-image", "border-image-source"];
        const elements = root.querySelectorAll<HTMLElement>("*");
        elements.forEach((el) => {
          const styles = view.getComputedStyle(el);
          COLOR_PROPS.forEach((prop) => {
            const value = styles.getPropertyValue(prop);
            if (!value) return;
            if (value.includes("color(") || value.includes("color-mix(")) {
              const resolved = resolveColorValue(value);
              el.style.setProperty(prop, resolved ?? "transparent", "important");
            }
          });
          SHADOW_PROPS.forEach((prop) => {
            const value = styles.getPropertyValue(prop);
            if (!value) return;
            if (value.includes("color(") || value.includes("color-mix(")) {
              el.style.setProperty(prop, "none", "important");
            }
          });
          BG_PROPS.forEach((prop) => {
            const value = styles.getPropertyValue(prop);
            if (!value) return;
            if (value.includes("color(") || value.includes("color-mix(")) {
              el.style.setProperty(prop, "none", "important");
            }
          });
        });
      };

      const overlayCanvas = await html2canvas(target, {
        backgroundColor: captureMode === "roslyn" ? null : backgroundColor,
        scale: exportScale,
        foreignObjectRendering: captureMode === "roslyn",
        useCORS: true,
        onclone: sanitizeCloneColors,
        ignoreElements: (element) =>
          element instanceof HTMLElement &&
          (element.dataset.captureHide === "true" ||
            (skipCanvas && element.tagName === "CANVAS")),
      });

      let outputCanvas = overlayCanvas;
      if (captureMode === "roslyn" && validSnapshots.length > 0) {
        const composite = document.createElement("canvas");
        composite.width = overlayCanvas.width;
        composite.height = overlayCanvas.height;
        const ctx = composite.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          if (backgroundColor) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, composite.width, composite.height);
          }
          const imageResults = await Promise.allSettled(
            validSnapshots.map(async (snapshot) => ({
              image: await loadImage(snapshot.url),
              snapshot,
            }))
          );
          const images = imageResults
            .filter(
              (
                result
              ): result is PromiseFulfilledResult<{
                image: HTMLImageElement;
                snapshot: {
                  url: string;
                  x: number;
                  y: number;
                  width: number;
                  height: number;
                };
              }> => result.status === "fulfilled"
            )
            .map((result) => result.value);
          images.forEach(({ image, snapshot }) => {
            ctx.drawImage(
              image,
              snapshot.x * exportScale,
              snapshot.y * exportScale,
              snapshot.width * exportScale,
              snapshot.height * exportScale
            );
          });
          ctx.drawImage(overlayCanvas, 0, 0);
          outputCanvas = composite;
        }
      }

      const dataUrl = outputCanvas.toDataURL("image/png", 1.0);
      setCapturePreview({ url: dataUrl, label });
    } catch (error) {
      console.error("Failed to capture screenshot", error);
    } finally {
      hiddenCanvases.forEach(({ element, previousVisibility, previousCaptureHide }) => {
        element.style.visibility = previousVisibility;
        if (previousCaptureHide !== undefined) {
          element.dataset.captureHide = previousCaptureHide;
        } else {
          delete element.dataset.captureHide;
        }
      });
      delete target.dataset.captureRoot;
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

  const toggleFullscreen = (panelId: PanelId) => {
    setFullscreenPanel((current) => (current === panelId ? null : panelId));
  };

  const isFullscreen = fullscreenPanel !== null;
  const activePage = resolvePageFromHash(currentHash);
  const isDocsPage = activePage === "docs";

  return (
    <div className={styles.app} data-page={activePage}>
      {showIntroOverlay && (
        <div className={styles.introOverlay} aria-hidden="true">
          <img
            src={logoLinguaSymbol}
            alt=""
            className={styles.introOverlaySymbol}
          />
        </div>
      )}
      {!isFullscreen && (
        <WebGLAppTopBar
          status={status}
          docsHref={isDocsPage ? "#/" : "#/docs"}
          docsActive={isDocsPage}
        />
      )}

      {isDocsPage ? (
        <main className={styles.docsMain}>
          <DocumentationPage hash={currentHash} />
        </main>
      ) : (
        <main className={styles.workspace}>
          <div className={styles.stackLayout} data-fullscreen={fullscreenPanel ?? "none"}>
            <div
              className={`${styles.fullPanel} ${styles.roslynPanel}`}
              data-panel="roslyn"
            >
              <ModelerSection
                onCaptureRequest={(element) => captureElement(element, "Roslyn")}
                captureDisabled={isCapturing}
                isFullscreen={fullscreenPanel === "roslyn"}
                onToggleFullscreen={() => toggleFullscreen("roslyn")}
              />
            </div>
            <div
              className={`${styles.fullPanel} ${styles.numericaPanel}`}
              data-panel="numerica"
            >
              <WorkflowSection
                onCaptureRequest={(element) => captureElement(element, "Numerica")}
                captureDisabled={isCapturing}
                isFullscreen={fullscreenPanel === "numerica"}
                onToggleFullscreen={() => toggleFullscreen("numerica")}
              />
            </div>
          </div>
        </main>
      )}
      {capturePreview && (
        <div className={styles.captureModal} role="dialog" aria-modal="true">
          <div className={styles.captureModalContent}>
            <div className={styles.captureModalHeader}>
              <span>Preview · {capturePreview.label}</span>
              <WebGLButton
                className={styles.captureModalClose}
                onClick={() => setCapturePreview(null)}
                label="Close capture preview"
                iconId="close"
                hideLabel
                variant="ghost"
                shape="pill"
                tooltip="Close preview"
              />
            </div>
            <div className={styles.captureModalBody}>
              <img src={capturePreview.url} alt="Screenshot preview" />
            </div>
            <div className={styles.captureModalActions}>
              <WebGLButton
                className={styles.captureButton}
                onClick={handleDownloadCapture}
                label="Download PNG"
                shortLabel="PNG"
                iconId="download"
                variant="primary"
                tooltip="Download PNG"
              />
              <WebGLButton
                className={styles.captureSecondaryButton}
                onClick={() => setCapturePreview(null)}
                label="Close preview"
                iconId="close"
                variant="secondary"
                tooltip="Close preview"
              />
            </div>
          </div>
        </div>
      )}
      <div id="workspace-footer-root" className={styles.workspaceFooterRoot} />

    </div>
  );
};

export default App;
