import { useEffect, useRef } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { GeometryRenderAdapter, createLineBufferData } from "../geometry/renderAdapter";
import { generateBoxMesh } from "../geometry/mesh";
import { add, centroid, cross, length, normalize, scale, sub } from "../geometry/math";
import { WebGLRenderer, type Camera } from "../webgl/WebGLRenderer";
import type { Geometry, Vec3 } from "../types";
import type { GeometryBuffer } from "../webgl/BufferManager";

const ORBIT_SPEED = 0.006;
const PAN_SPEED = 0.0025;
const ZOOM_SPEED = 0.001;
const MIN_DISTANCE = 0.4;
const MAX_DISTANCE = 120;

const VIEW_COLORS = {
  mesh: [0.72, 0.71, 0.69] as [number, number, number],
  line: [0.2, 0.2, 0.2] as [number, number, number],
  selection: [0.85, 0.5, 0.25] as [number, number, number],
  ambient: [0.24, 0.24, 0.24] as [number, number, number],
  light: [0.9, 0.9, 0.9] as [number, number, number],
  lightPosition: [6, 9, 6] as [number, number, number],
};

type ViewerCanvasProps = {
  activeCommandId?: string | null;
  commandRequest?: { id: string; input: string; requestId: number } | null;
  primitiveSettings?: unknown;
  rectangleSettings?: unknown;
  circleSettings?: unknown;
  onCommandComplete?: (commandId: string) => void;
};

type DragState =
  | {
      mode: "orbit" | "pan";
      pointer: { x: number; y: number };
      startCamera: { position: Vec3; target: Vec3 };
      startAngles: { theta: number; phi: number; radius: number };
    }
  | { mode: "none" };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toCamera = (state: {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
  aspect: number;
}): Camera => ({
  position: [state.position.x, state.position.y, state.position.z],
  target: [state.target.x, state.target.y, state.target.z],
  up: [state.up.x, state.up.y, state.up.z],
  fov: toRadians(state.fov),
  aspect: state.aspect,
  near: 0.05,
  far: 200,
});

const getSpherical = (position: Vec3, target: Vec3) => {
  const offset = sub(position, target);
  const radius = length(offset) || 1;
  const theta = Math.atan2(offset.x, offset.z);
  const phi = Math.acos(clamp(offset.y / radius, -0.999, 0.999));
  return { radius, theta, phi };
};

const fromSpherical = (target: Vec3, radius: number, theta: number, phi: number): Vec3 => ({
  x: target.x + radius * Math.sin(phi) * Math.sin(theta),
  y: target.y + radius * Math.cos(phi),
  z: target.z + radius * Math.sin(phi) * Math.cos(theta),
});

const getCameraAxes = (position: Vec3, target: Vec3, up: Vec3) => {
  const forward = normalize(sub(target, position));
  const right = normalize(cross(forward, up));
  const trueUp = normalize(cross(right, forward));
  return { right, up: trueUp };
};

const WebGLViewerCanvas = (_props: ViewerCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const adapterRef = useRef<GeometryRenderAdapter | null>(null);
  const geometryRef = useRef<Geometry[]>([]);
  const cameraRef = useRef(useProjectStore.getState().camera);
  const selectionRef = useRef(useProjectStore.getState().selectedGeometryIds);
  const hiddenRef = useRef(useProjectStore.getState().hiddenGeometryIds);
  const viewSettingsRef = useRef(useProjectStore.getState().viewSettings);
  const displayModeRef = useRef(useProjectStore.getState().displayMode);
  const dragRef = useRef<DragState>({ mode: "none" });

  const geometry = useProjectStore((state) => state.geometry);
  const camera = useProjectStore((state) => state.camera);
  const selectedGeometryIds = useProjectStore((state) => state.selectedGeometryIds);
  const hiddenGeometryIds = useProjectStore((state) => state.hiddenGeometryIds);
  const viewSettings = useProjectStore((state) => state.viewSettings);
  const displayMode = useProjectStore((state) => state.displayMode);
  const setCameraState = useProjectStore((state) => state.setCameraState);

  useEffect(() => {
    geometryRef.current = geometry;
  }, [geometry]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    selectionRef.current = selectedGeometryIds;
  }, [selectedGeometryIds]);

  useEffect(() => {
    hiddenRef.current = hiddenGeometryIds;
  }, [hiddenGeometryIds]);

  useEffect(() => {
    viewSettingsRef.current = viewSettings;
  }, [viewSettings]);

  useEffect(() => {
    displayModeRef.current = displayMode;
  }, [displayMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new WebGLRenderer(canvas);
    const adapter = new GeometryRenderAdapter(renderer, (id) =>
      geometryRef.current.find((item) => item.id === id)
    );
    rendererRef.current = renderer;
    adapterRef.current = adapter;

    return () => {
      renderer.dispose();
      adapter.dispose();
    };
  }, []);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    const geometryIds = new Set(geometry.map((item) => item.id));
    geometry.forEach((item) => adapter.updateGeometry(item));

    adapter.getAllRenderables().forEach((renderable) => {
      if (!geometryIds.has(renderable.id)) {
        adapter.removeGeometry(renderable.id);
      }
    });
  }, [geometry]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      renderer.setSize(canvas.width, canvas.height);
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const startCamera = {
        position: { ...cameraRef.current.position },
        target: { ...cameraRef.current.target },
      };
      const startAngles = getSpherical(startCamera.position, startCamera.target);

      const mode = event.button === 1 || event.button === 2 ? "pan" : "orbit";
      dragRef.current = { mode, pointer: { x, y }, startCamera, startAngles };
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (drag.mode === "none") return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dx = x - drag.pointer.x;
      const dy = y - drag.pointer.y;

      if (drag.mode === "orbit") {
        const nextTheta = drag.startAngles.theta - dx * ORBIT_SPEED;
        const nextPhi = clamp(drag.startAngles.phi - dy * ORBIT_SPEED, 0.1, Math.PI - 0.1);
        const nextPosition = fromSpherical(
          drag.startCamera.target,
          drag.startAngles.radius,
          nextTheta,
          nextPhi
        );
        setCameraState({ position: nextPosition });
        return;
      }

      const radius = drag.startAngles.radius;
      const panScale = radius * PAN_SPEED;
      const { right, up } = getCameraAxes(
        drag.startCamera.position,
        drag.startCamera.target,
        cameraRef.current.up
      );
      const offset = add(scale(right, -dx * panScale), scale(up, dy * panScale));
      setCameraState({
        position: add(drag.startCamera.position, offset),
        target: add(drag.startCamera.target, offset),
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      dragRef.current = { mode: "none" };
      canvas.releasePointerCapture(event.pointerId);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY;
      const current = cameraRef.current;
      const offset = sub(current.position, current.target);
      const radius = length(offset);
      const nextRadius = clamp(radius * (1 + delta * ZOOM_SPEED * current.zoomSpeed), MIN_DISTANCE, MAX_DISTANCE);
      const direction = normalize(offset);
      const nextPosition = add(current.target, scale(direction, nextRadius));
      setCameraState({ position: nextPosition });
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [setCameraState]);

  useEffect(() => {
    let frameId: number;

    const render = () => {
      const renderer = rendererRef.current;
      const adapter = adapterRef.current;
      const canvas = canvasRef.current;
      if (!renderer || !adapter || !canvas) {
        frameId = requestAnimationFrame(render);
        return;
      }

      renderer.setBackfaceCulling(viewSettingsRef.current.backfaceCulling);
      renderer.clear();

      const cameraState = cameraRef.current;
      const cameraPayload = toCamera({
        position: cameraState.position,
        target: cameraState.target,
        up: cameraState.up,
        fov: cameraState.fov,
        aspect: canvas.width / canvas.height,
      });

      const selection = new Set(selectionRef.current);
      const hidden = new Set(hiddenRef.current);
      const isGhosted = displayModeRef.current === "ghosted";

      adapter.getAllRenderables().forEach((renderable) => {
        if (hidden.has(renderable.id)) return;
        const isSelected = selection.has(renderable.id);
        if (renderable.type === "polyline") {
          renderer.renderLine(renderable.buffer, cameraPayload, {
            lineWidth: 2 * (window.devicePixelRatio || 1),
            resolution: [canvas.width, canvas.height],
            lineColor: VIEW_COLORS.line,
            selectionHighlight: VIEW_COLORS.selection,
            isSelected: isSelected ? 1 : 0,
          });
          return;
        }

        renderer.renderGeometry(renderable.buffer, cameraPayload, {
          materialColor: VIEW_COLORS.mesh,
          lightPosition: VIEW_COLORS.lightPosition,
          lightColor: VIEW_COLORS.light,
          ambientColor: VIEW_COLORS.ambient,
          selectionHighlight: VIEW_COLORS.selection,
          isSelected: isSelected ? 1 : 0,
          opacity: isGhosted ? 0.35 : 1,
        });
      });

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
};

export default WebGLViewerCanvas;
