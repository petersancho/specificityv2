import { useEffect, useMemo, useRef } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { GeometryRenderAdapter, type RenderableGeometry } from "../../geometry/renderAdapter";
import { add, cross, dot, length, normalize, scale, sub } from "../../geometry/math";
import { WebGLRenderer, type Camera } from "../../webgl/WebGLRenderer";
import {
  VIEW_STYLE,
  adjustForSelection,
  clamp01,
  darkenColor,
  lerp,
  mixColor,
  smoothstep,
} from "../../webgl/viewProfile";
import type { Geometry, Vec3 } from "../../types";
import type { GeometryBuffer } from "../../webgl/BufferManager";

const ORBIT_SPEED = 0.006;
const PAN_SPEED = 0.0025;
const ZOOM_SPEED = 0.001;
const MIN_DISTANCE = 0.4;
const MAX_DISTANCE = 120;
const GRID_EXTENT_MULTIPLIER = 120;
const GRID_MINOR_STEP = 1;
const GRID_OFFSET_Y = -0.002;

type CameraState = {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
  zoomSpeed: number;
};

type Bounds = { min: Vec3; max: Vec3 };

const DEFAULT_CAMERA: CameraState = {
  position: { x: 2, y: 2, z: 2 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  fov: 28,
  zoomSpeed: 1,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const toCamera = (state: CameraState & { aspect: number }): Camera => ({
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

const computeBoundsForGeometry = (
  item: Geometry,
  geometryById: Map<string, Geometry>
): Bounds | null => {
  const min = {
    x: Number.POSITIVE_INFINITY,
    y: Number.POSITIVE_INFINITY,
    z: Number.POSITIVE_INFINITY,
  };
  const max = {
    x: Number.NEGATIVE_INFINITY,
    y: Number.NEGATIVE_INFINITY,
    z: Number.NEGATIVE_INFINITY,
  };
  let hasPoint = false;

  const includePoint = (point: Vec3) => {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
    hasPoint = true;
  };

  if (item.type === "vertex") {
    includePoint(item.position);
  } else if (item.type === "polyline") {
    item.vertexIds.forEach((vertexId) => {
      const vertex = geometryById.get(vertexId);
      if (vertex?.type === "vertex") includePoint(vertex.position);
    });
  } else if ("mesh" in item && item.mesh?.positions) {
    for (let i = 0; i < item.mesh.positions.length; i += 3) {
      includePoint({
        x: item.mesh.positions[i],
        y: item.mesh.positions[i + 1],
        z: item.mesh.positions[i + 2],
      });
    }
  }

  if (!hasPoint) return null;
  return { min, max };
};

const buildGridGeometry = (spacing: number, majorLinesEvery: number) => {
  const safeSpacing = Math.max(spacing, 0.01);
  const safeMajorEvery = Math.max(majorLinesEvery, 1);
  const extent = safeSpacing * GRID_EXTENT_MULTIPLIER;
  const lineCount = Math.floor(extent / safeSpacing);

  const minorPositions: number[] = [];
  const minorIndices: number[] = [];
  const majorPositions: number[] = [];
  const majorIndices: number[] = [];

  const pushLine = (
    positions: number[],
    indices: number[],
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number
  ) => {
    const index = positions.length / 3;
    positions.push(ax, ay, az, bx, by, bz);
    indices.push(index, index + 1);
  };

  for (let i = -lineCount; i <= lineCount; i += GRID_MINOR_STEP) {
    const coord = i * safeSpacing;
    const isMajor = i % safeMajorEvery === 0;
    const targetPositions = isMajor ? majorPositions : minorPositions;
    const targetIndices = isMajor ? majorIndices : minorIndices;

    pushLine(
      targetPositions,
      targetIndices,
      -extent,
      GRID_OFFSET_Y,
      coord,
      extent,
      GRID_OFFSET_Y,
      coord
    );
    pushLine(
      targetPositions,
      targetIndices,
      coord,
      GRID_OFFSET_Y,
      -extent,
      coord,
      GRID_OFFSET_Y,
      extent
    );
  }

  return {
    minor: {
      positions: new Float32Array(minorPositions),
      indices: new Uint16Array(minorIndices),
    },
    major: {
      positions: new Float32Array(majorPositions),
      indices: new Uint16Array(majorIndices),
    },
  };
};

type WorkflowGeometryViewerProps = {
  geometryId: string | null;
};

const WorkflowGeometryViewer = ({ geometryId }: WorkflowGeometryViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const adapterRef = useRef<GeometryRenderAdapter | null>(null);
  const gridMinorBufferRef = useRef<GeometryBuffer | null>(null);
  const gridMajorBufferRef = useRef<GeometryBuffer | null>(null);
  const resizeRef = useRef<(() => void) | null>(null);
  const activeGeometryIdRef = useRef<string | null>(null);
  const cameraRef = useRef<CameraState>({ ...DEFAULT_CAMERA });

  const geometry = useProjectStore((state) => state.geometry);
  const gridSettings = useProjectStore((state) => state.gridSettings);
  const viewSolidity = useProjectStore((state) => state.viewSolidity);
  const viewSettings = useProjectStore((state) => state.viewSettings);
  const selectedGeometryIds = useProjectStore((state) => state.selectedGeometryIds);
  const hiddenGeometryIds = useProjectStore((state) => state.hiddenGeometryIds);

  const geometryRef = useRef(geometry);

  useEffect(() => {
    geometryRef.current = geometry;
  }, [geometry]);

  const viewSolidityRef = useRef(viewSolidity);
  const viewSettingsRef = useRef(viewSettings);
  const selectedRef = useRef(selectedGeometryIds);
  const hiddenRef = useRef(hiddenGeometryIds);

  useEffect(() => {
    viewSolidityRef.current = viewSolidity;
  }, [viewSolidity]);

  useEffect(() => {
    resizeRef.current?.();
  }, [viewSolidity]);

  useEffect(() => {
    viewSettingsRef.current = viewSettings;
  }, [viewSettings]);

  useEffect(() => {
    selectedRef.current = selectedGeometryIds;
  }, [selectedGeometryIds]);

  useEffect(() => {
    hiddenRef.current = hiddenGeometryIds;
  }, [hiddenGeometryIds]);

  const geometryById = useMemo(
    () => new Map(geometry.map((item) => [item.id, item])),
    [geometry]
  );

  const resolvedGeometry = geometryId ? geometryById.get(geometryId) ?? null : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new WebGLRenderer(canvas);
    rendererRef.current = renderer;
    const adapter = new GeometryRenderAdapter(renderer, (id) =>
      geometryRef.current.find((item) => item.id === id)
    );
    adapterRef.current = adapter;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const baseDpr = window.devicePixelRatio || 1;
      const solidity = clamp01(viewSolidityRef.current);
      const solidBlend = smoothstep(0.55, 1, solidity);
      const renderScale = lerp(1, VIEW_STYLE.solidRenderScale, solidBlend);
      const dpr = baseDpr * renderScale;
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
      renderer.setSize(canvas.width, canvas.height);
    };

    resize();
    resizeRef.current = resize;
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      renderer.dispose();
      adapter.dispose();
      rendererRef.current = null;
      adapterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const { minor, major } = buildGridGeometry(
      gridSettings.spacing,
      gridSettings.majorLinesEvery
    );
    const minorBufferId = "workflow-grid__minor";
    const majorBufferId = "workflow-grid__major";

    const minorBuffer =
      gridMinorBufferRef.current ?? renderer.createGeometryBuffer(minorBufferId);
    minorBuffer.setData({
      positions: minor.positions,
      indices: minor.indices,
    });
    gridMinorBufferRef.current = minorBuffer;

    const majorBuffer =
      gridMajorBufferRef.current ?? renderer.createGeometryBuffer(majorBufferId);
    majorBuffer.setData({
      positions: major.positions,
      indices: major.indices,
    });
    gridMajorBufferRef.current = majorBuffer;

    return () => {
      renderer.deleteGeometryBuffer(minorBufferId);
      renderer.deleteGeometryBuffer(majorBufferId);
      gridMinorBufferRef.current = null;
      gridMajorBufferRef.current = null;
    };
  }, [gridSettings]);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    if (!geometryId) {
      if (activeGeometryIdRef.current) {
        adapter.removeGeometry(activeGeometryIdRef.current);
        activeGeometryIdRef.current = null;
      }
      return;
    }

    const item = geometryById.get(geometryId);
    if (!item) {
      if (activeGeometryIdRef.current) {
        adapter.removeGeometry(activeGeometryIdRef.current);
        activeGeometryIdRef.current = null;
      }
      return;
    }

    if (activeGeometryIdRef.current && activeGeometryIdRef.current !== item.id) {
      adapter.removeGeometry(activeGeometryIdRef.current);
    }

    adapter.updateGeometry(item);
    activeGeometryIdRef.current = item.id;
  }, [geometryById, geometryId, geometry]);

  useEffect(() => {
    if (!resolvedGeometry) return;
    const bounds = computeBoundsForGeometry(resolvedGeometry, geometryById);
    if (!bounds) return;

    const size = {
      x: bounds.max.x - bounds.min.x,
      y: bounds.max.y - bounds.min.y,
      z: bounds.max.z - bounds.min.z,
    };
    const center = {
      x: (bounds.min.x + bounds.max.x) * 0.5,
      y: (bounds.min.y + bounds.max.y) * 0.5,
      z: (bounds.min.z + bounds.max.z) * 0.5,
    };
    const maxSize = Math.max(size.x, size.y, size.z, 0.001);
    const fov = toRadians(cameraRef.current.fov);
    const distance = (maxSize / (2 * Math.tan(fov / 2))) * 1.4;
    const currentDirection = normalize(
      sub(cameraRef.current.position, cameraRef.current.target)
    );
    const safeDirection =
      length(currentDirection) > 0.0001 ? currentDirection : { x: 1, y: 1, z: 1 };
    cameraRef.current = {
      ...cameraRef.current,
      position: add(center, scale(safeDirection, distance)),
      target: center,
    };
  }, [geometryById, resolvedGeometry]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dragState = { mode: "none" as "none" | "orbit" | "pan" };
    let startPointer = { x: 0, y: 0 };
    let startCamera = {
      position: { ...cameraRef.current.position },
      target: { ...cameraRef.current.target },
    };
    let startAngles = getSpherical(cameraRef.current.position, cameraRef.current.target);

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === 2) {
        dragState.mode = "pan";
      } else {
        dragState.mode = "orbit";
      }
      startPointer = { x: event.clientX, y: event.clientY };
      startCamera = {
        position: { ...cameraRef.current.position },
        target: { ...cameraRef.current.target },
      };
      startAngles = getSpherical(startCamera.position, startCamera.target);
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (dragState.mode === "none") return;
      const dx = event.clientX - startPointer.x;
      const dy = event.clientY - startPointer.y;

      if (dragState.mode === "orbit") {
        const nextTheta = startAngles.theta - dx * ORBIT_SPEED;
        const nextPhi = clamp(startAngles.phi - dy * ORBIT_SPEED, 0.1, Math.PI - 0.1);
        cameraRef.current = {
          ...cameraRef.current,
          position: fromSpherical(startCamera.target, startAngles.radius, nextTheta, nextPhi),
        };
        return;
      }

      const radius = startAngles.radius;
      const panScale = radius * PAN_SPEED;
      const { right, up } = getCameraAxes(
        startCamera.position,
        startCamera.target,
        cameraRef.current.up
      );
      const offset = add(scale(right, -dx * panScale), scale(up, dy * panScale));
      cameraRef.current = {
        ...cameraRef.current,
        position: add(startCamera.position, offset),
        target: add(startCamera.target, offset),
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      dragState.mode = "none";
      canvas.releasePointerCapture(event.pointerId);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY;
      const current = cameraRef.current;
      const offset = sub(current.position, current.target);
      const radius = length(offset);
      const nextRadius = clamp(
        radius * (1 + delta * ZOOM_SPEED * current.zoomSpeed),
        MIN_DISTANCE,
        MAX_DISTANCE
      );
      const direction = normalize(offset);
      cameraRef.current = {
        ...cameraRef.current,
        position: add(current.target, scale(direction, nextRadius)),
      };
    };

    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

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

      renderer.setClearColor(VIEW_STYLE.clearColor);
      renderer.clear();

      const cameraPayload = toCamera({
        ...cameraRef.current,
        aspect: canvas.width / canvas.height,
      });

      const viewSolidity = clamp01(viewSolidityRef.current);
      const smoothSolidity = smoothstep(0, 1, viewSolidity);
      const solidBlend = smoothSolidity;
      const baseMeshOpacity = Math.pow(smoothSolidity, 1.12);
      const showMesh = baseMeshOpacity > 0.02;
      const nonSolidBlend = 1 - smoothSolidity;
      const edgeFade = smoothSolidity;
      const wireframeBoost = Math.pow(1 - smoothSolidity, 1.25);
      renderer.setBackfaceCulling(false);
      const showEdges = true;
      const renderScale = lerp(1, VIEW_STYLE.solidRenderScale, solidBlend);
      const dpr = (window.devicePixelRatio || 1) * renderScale;
      const edgePrimaryWidth = VIEW_STYLE.edgePrimaryWidth * dpr;
      const edgeSecondaryWidth = VIEW_STYLE.edgeSecondaryWidth * dpr;
      const edgeTertiaryWidth = VIEW_STYLE.edgeTertiaryWidth * dpr;
      const edgeBias = lerp(0.00022, 0.00045, edgeFade);
      const edgeOpacityScale = lerp(1, 0.8, edgeFade);
      const edgeInternalScale = lerp(1, 0.7, edgeFade);
      const edgeAAStrength = lerp(0.22, 1.0, smoothSolidity);
      const edgePixelSnap = lerp(0.65, 0.0, smoothSolidity);

      if (gridMinorBufferRef.current) {
        renderer.renderEdges(gridMinorBufferRef.current, cameraPayload, {
          edgeColor: VIEW_STYLE.gridMinor,
          opacity: 0.35,
          dashEnabled: 0,
        });
      }
      if (gridMajorBufferRef.current) {
        renderer.renderEdges(gridMajorBufferRef.current, cameraPayload, {
          edgeColor: VIEW_STYLE.gridMajor,
          opacity: 0.5,
          dashEnabled: 0,
        });
      }

      const selected = new Set(selectedRef.current);
      const hidden = new Set(hiddenRef.current);
      const hasSelection = selected.size > 0;
      const viewDir = normalize(sub(cameraRef.current.target, cameraRef.current.position));
      const renderables = adapter
        .getAllRenderables()
        .filter((renderable) => !hidden.has(renderable.id));
      const meshRenderables = renderables
        .filter((renderable) => renderable.type !== "polyline")
        .map((renderable) => {
          const item = geometryRef.current.find((entry) => entry.id === renderable.id);
          const center = item
            ? (() => {
                if (item.type === "vertex") return item.position;
                if (item.type === "polyline") {
                  const points = item.vertexIds
                    .map((id) => geometryRef.current.find((g) => g.id === id))
                    .filter((g): g is Geometry => Boolean(g));
                  if (points.length === 0) return { x: 0, y: 0, z: 0 };
                  const sum = points.reduce(
                    (acc, entry) => {
                      if (entry.type === "vertex") {
                        acc.x += entry.position.x;
                        acc.y += entry.position.y;
                        acc.z += entry.position.z;
                      }
                      return acc;
                    },
                    { x: 0, y: 0, z: 0 }
                  );
                  const count = Math.max(1, points.length);
                  return { x: sum.x / count, y: sum.y / count, z: sum.z / count };
                }
                if ("mesh" in item) {
                  const positions = item.mesh.positions;
                  const count = Math.max(1, positions.length / 3);
                  let sx = 0;
                  let sy = 0;
                  let sz = 0;
                  for (let i = 0; i < positions.length; i += 3) {
                    sx += positions[i];
                    sy += positions[i + 1];
                    sz += positions[i + 2];
                  }
                  return { x: sx / count, y: sy / count, z: sz / count };
                }
                return { x: 0, y: 0, z: 0 };
              })()
            : { x: 0, y: 0, z: 0 };
          const depth = dot(sub(center, cameraRef.current.position), viewDir);
          return { renderable, depth };
        })
        .sort((a, b) => b.depth - a.depth);

      const renderMesh = (renderable: RenderableGeometry, isSelected: boolean) => {
        if (showMesh && baseMeshOpacity > 0) {
          const materialColor = adjustForSelection(VIEW_STYLE.mesh, isSelected, hasSelection);
          const selectionFactor = hasSelection
            ? lerp(
                1,
                isSelected
                  ? 1.02
                  : baseMeshOpacity > 0.7
                    ? 0.9
                    : 0.75,
                clamp01(nonSolidBlend)
              )
            : 1;
          const opacity = clamp(
            baseMeshOpacity * selectionFactor,
            0.2,
            1
          );
          renderer.renderGeometry(renderable.buffer, cameraPayload, {
            materialColor,
            lightPosition: VIEW_STYLE.lightPosition,
            lightColor: VIEW_STYLE.light,
            ambientColor: VIEW_STYLE.ambient,
            cameraPosition: cameraPayload.position,
            ambientStrength: VIEW_STYLE.ambientStrength,
            selectionHighlight: VIEW_STYLE.selection,
            isSelected: isSelected ? 0.6 : 0,
            sheenIntensity: viewSettingsRef.current.sheen ?? 0.08,
            opacity,
          });
        }
      };

      const renderMeshEdges = (renderable: RenderableGeometry, isSelected: boolean) => {
        if (!showEdges) return;
        const edgeBuffer = renderable.edgeBuffer;
        const edgeLineBuffers = renderable.edgeLineBuffers;
        const edgeBase = darkenColor(
          adjustForSelection(VIEW_STYLE.mesh, isSelected, hasSelection),
          0.22
        );
        const edgeInternalColor = mixColor(edgeBase, [1, 1, 1], 0.28);
        const edgeCreaseColor = edgeBase;
        const edgeSilhouetteColor = darkenColor(edgeBase, 0.2);
        const internalWidthScale = lerp(1, 0.9, wireframeBoost);
        const creaseWidthScale = lerp(1, 1.12, wireframeBoost * 0.7);
        const silhouetteWidthScale = lerp(1, 1.5, wireframeBoost);
        const edgeWidths: [number, number, number] = [
          edgeTertiaryWidth * internalWidthScale,
          edgeSecondaryWidth * creaseWidthScale,
          edgePrimaryWidth * silhouetteWidthScale,
        ];
        const internalOpacityScale = lerp(1, 0.55, wireframeBoost);
        const creaseOpacityScale = lerp(1, 0.8, wireframeBoost * 0.6);
        const silhouetteOpacityScale = lerp(1, 1.15, wireframeBoost);
        const edgeOpacities: [number, number, number] = [
          Math.min(
            1,
            VIEW_STYLE.edgeTertiaryOpacity *
              edgeOpacityScale *
              edgeInternalScale *
              internalOpacityScale
          ),
          Math.min(
            1,
            VIEW_STYLE.edgeSecondaryOpacity *
              edgeOpacityScale *
              creaseOpacityScale
          ),
          Math.min(
            1,
            VIEW_STYLE.edgePrimaryOpacity *
              edgeOpacityScale *
              silhouetteOpacityScale
          ),
        ];

        if (edgeLineBuffers && edgeLineBuffers.length > 0) {
          edgeLineBuffers.forEach((edgeLineBuffer) => {
            renderer.renderEdgeLines(
              edgeLineBuffer,
              cameraPayload,
              {
                resolution: [canvas.width, canvas.height],
                edgeWidths,
                edgeOpacities,
                edgeColorInternal: edgeInternalColor,
                edgeColorCrease: edgeCreaseColor,
                edgeColorSilhouette: edgeSilhouetteColor,
                depthBias: edgeBias,
                edgeAAStrength,
                edgePixelSnap,
              },
              {
                depthFunc: "lequal",
                depthMask: false,
                blend: true,
              }
            );
          });
        } else if (edgeBuffer) {
          renderer.renderEdges(
            edgeBuffer,
            cameraPayload,
            {
              edgeColor: edgeCreaseColor,
              opacity: 1,
              dashEnabled: 0,
              depthBias: edgeBias,
              lineWidth: 3.2 * dpr,
            },
            { depthFunc: "lequal" }
          );
        }
      };

      const polylineRenderables = renderables.filter(
        (renderable) => renderable.type === "polyline"
      );
      const renderPolyline = (renderable: RenderableGeometry, isSelected: boolean) => {
        const lineColor = darkenColor(
          adjustForSelection(VIEW_STYLE.mesh, isSelected, hasSelection),
          0.22
        );
        renderer.renderLine(
          renderable.buffer,
          cameraPayload,
          {
            lineWidth: 6 * dpr,
            resolution: [canvas.width, canvas.height],
            lineColor,
            lineOpacity: 1,
            depthBias: edgeBias,
            selectionHighlight: [0, 0, 0],
            isSelected: 0,
          },
          { depthFunc: "lequal", depthMask: false }
        );
      };

      meshRenderables.forEach(({ renderable }) => {
        const isSelected = selected.has(renderable.id);
        renderMesh(renderable, isSelected);
        renderMeshEdges(renderable, isSelected);
      });
      polylineRenderables.forEach((renderable) => {
        const isSelected = selected.has(renderable.id);
        renderPolyline(renderable, isSelected);
      });

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const showPlaceholder = !resolvedGeometry;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        background: "rgba(245, 244, 241, 0.9)",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {showPlaceholder ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(30, 30, 30, 0.55)",
            background: "rgba(245, 244, 241, 0.7)",
            pointerEvents: "none",
          }}
        >
          No geometry
        </div>
      ) : null}
    </div>
  );
};

export default WorkflowGeometryViewer;
