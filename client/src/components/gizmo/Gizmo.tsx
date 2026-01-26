import { useEffect, useMemo, useRef, useState } from "react";
import { Billboard, Line } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import type { Basis } from "../../geometry/transform";
import type { TransformMode, Vec3 } from "../../types";

export type GizmoHandle = {
  kind: "axis" | "plane" | "screen" | "rotate" | "scale" | "extrude";
  axis?: "x" | "y" | "z";
  plane?: "xy" | "yz" | "xz";
};

type GizmoProps = {
  pivot: Vec3;
  orientation: Basis;
  mode: TransformMode | "gumball";
  onStart: (handle: GizmoHandle, event: ThreeEvent<PointerEvent>) => void;
  onDrag?: (event: ThreeEvent<PointerEvent>) => void;
  onEnd?: (event: ThreeEvent<PointerEvent>) => void;
  visible: boolean;
  showExtrude?: boolean;
};

const AXIS_COLORS: Record<"x" | "y" | "z", string> = {
  x: "#ef4444",
  y: "#22c55e",
  z: "#3b82f6",
};

const planeColor = "#facc15";
const screenColor = "#f97316";
const extrudeColor = "#f97316";

const HOVER_AXIS_COLOR = "#fde047";
const HOVER_ROTATE_COLOR = "#fbbf24";

const AxisLine = ({
  axis,
  length,
  color,
}: {
  axis: "x" | "y" | "z";
  length: number;
  color?: string;
}) => (
  <Line
    points={
      axis === "x"
        ? [
            [0, 0, 0],
            [length, 0, 0],
          ]
        : axis === "y"
          ? [
              [0, 0, 0],
              [0, length, 0],
            ]
          : [
              [0, 0, 0],
              [0, 0, length],
            ]
    }
    color={color ?? AXIS_COLORS[axis]}
    lineWidth={3}
  />
);

type AxisMaterial = MeshBasicMaterial | MeshStandardMaterial;

const AxisHandle = ({
  axis,
  length,
  radius,
  shaftGeometry,
  headGeometry,
  material,
  hitGeometry,
  hitMaterial,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerOver,
  onPointerOut,
}: {
  axis: "x" | "y" | "z";
  length: number;
  radius: number;
  shaftGeometry: CylinderGeometry;
  headGeometry: ConeGeometry;
  material: AxisMaterial;
  hitGeometry: CylinderGeometry;
  hitMaterial: MeshBasicMaterial;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) => {
  const rotation =
    axis === "x"
      ? [0, 0, -Math.PI / 2]
      : axis === "y"
        ? [0, 0, 0]
        : [Math.PI / 2, 0, 0];
  const headLength = radius * 5.5;
  const shaftLength = Math.max(length - headLength, radius * 2.5);
  const hitLength = shaftLength + headLength;
  const hitRadius = Math.max(radius * 5.5, 0.18);
  return (
    <group rotation={rotation as [number, number, number]}>
      <mesh
        geometry={shaftGeometry}
        material={material}
        position={[0, shaftLength / 2, 0]}
        scale={[1, shaftLength, 1]}
      />
      <mesh
        geometry={headGeometry}
        material={material}
        position={[0, shaftLength + headLength / 2, 0]}
        scale={[1, headLength, 1]}
      />
      <mesh
        geometry={hitGeometry}
        material={hitMaterial}
        position={[0, hitLength / 2, 0]}
        scale={[hitRadius, hitLength, hitRadius]}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.nativeEvent?.preventDefault?.();
          onPointerDown(event);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          onPointerMove?.(event);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          onPointerUp?.(event);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onPointerOver();
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onPointerOut();
        }}
      />
    </group>
  );
};

const AxisCap = ({
  axis,
  length,
  size,
  color,
  boxGeometry,
  hitGeometry,
  hitMaterial,
  hitScale = 1.8,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerOver,
  onPointerOut,
}: {
  axis: "x" | "y" | "z";
  length: number;
  size: number;
  color: string;
  boxGeometry: BoxGeometry;
  hitGeometry: BoxGeometry;
  hitMaterial: MeshBasicMaterial;
  hitScale?: number;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) => (
  <group
    position={
      axis === "x"
        ? [length, 0, 0]
        : axis === "y"
          ? [0, length, 0]
          : [0, 0, length]
    }
  >
    <mesh scale={[size, size, size]}>
      <primitive object={boxGeometry} attach="geometry" />
      <meshBasicMaterial color={color} />
    </mesh>
    <mesh
      geometry={hitGeometry}
      material={hitMaterial}
      scale={[size * hitScale * 2, size * hitScale * 2, size * hitScale * 2]}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.nativeEvent?.preventDefault?.();
        onPointerDown(event);
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        onPointerMove?.(event);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        onPointerUp?.(event);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver();
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
    />
  </group>
);

const PlaneHandle = ({
  plane,
  size,
  geometry,
  material,
  hitGeometry,
  hitMaterial,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerOver,
  onPointerOut,
}: {
  plane: "xy" | "yz" | "xz";
  size: number;
  geometry: PlaneGeometry;
  material: MeshBasicMaterial;
  hitGeometry: PlaneGeometry;
  hitMaterial: MeshBasicMaterial;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) => {
  const position =
    plane === "xy" ? [size * 0.6, size * 0.6, 0] : plane === "yz"
      ? [0, size * 0.6, size * 0.6]
      : [size * 0.6, 0, size * 0.6];
  const rotation =
    plane === "xy"
      ? [0, 0, 0]
      : plane === "yz"
        ? [0, Math.PI / 2, 0]
        : [Math.PI / 2, 0, 0];
  return (
    <group
      position={position as [number, number, number]}
      rotation={rotation as [number, number, number]}
      scale={[size, size, size]}
    >
      <mesh>
        <primitive object={geometry} attach="geometry" />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh
        geometry={hitGeometry}
        material={hitMaterial}
        scale={[2.3, 2.3, 2.3]}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.nativeEvent?.preventDefault?.();
          onPointerDown(event);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          onPointerMove?.(event);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onPointerOver();
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onPointerOut();
        }}
      />
    </group>
  );
};

type RotateMaterial = MeshBasicMaterial | MeshStandardMaterial;

const RotateHandle = ({
  axis,
  radius,
  geometry,
  material,
  hitGeometry,
  hitMaterial,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerOver,
  onPointerOut,
}: {
  axis: "x" | "y" | "z";
  radius: number;
  geometry: TorusGeometry;
  material: AxisMaterial;
  hitGeometry: TorusGeometry;
  hitMaterial: MeshBasicMaterial;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) => {
  const rotation =
    axis === "x"
      ? [0, Math.PI / 2, 0]
      : axis === "y"
        ? [Math.PI / 2, 0, 0]
        : [0, 0, 0];
  const scale = radius / 0.9;
  return (
    <group rotation={rotation as [number, number, number]} scale={[scale, scale, scale]}>
      <mesh>
        <primitive object={geometry} attach="geometry" />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh
        geometry={hitGeometry}
        material={hitMaterial}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.nativeEvent?.preventDefault?.();
          onPointerDown(event);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          onPointerMove?.(event);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          onPointerUp?.(event);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onPointerOver();
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onPointerOut();
        }}
      />
    </group>
  );
};

export const Gizmo = ({
  pivot,
  orientation,
  mode,
  onStart,
  onDrag,
  onEnd,
  visible,
  showExtrude,
}: GizmoProps) => {
  const { camera, size } = useThree();
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const worldPosition = new Vector3(pivot.x, pivot.y, pivot.z);
    const distance = camera.position.distanceTo(worldPosition);
    if (!("fov" in camera)) return;
    const fov = camera.fov;
    const height = 2 * Math.tan((fov * Math.PI) / 360) * distance;
    const worldPerPixel = height / size.height;
    const scale = worldPerPixel * 110;
    groupRef.current.scale.setScalar(scale);
  });

  const matrix = useMemo(() => {
    const basisMatrix = new Matrix4();
    basisMatrix.makeBasis(
      new Vector3(orientation.xAxis.x, orientation.xAxis.y, orientation.xAxis.z),
      new Vector3(orientation.yAxis.x, orientation.yAxis.y, orientation.yAxis.z),
      new Vector3(orientation.zAxis.x, orientation.zAxis.y, orientation.zAxis.z)
    );
    basisMatrix.setPosition(
      new Vector3(pivot.x, pivot.y, pivot.z)
    );
    return basisMatrix;
  }, [pivot, orientation]);

  if (!visible) return null;

  const axisMaterial = useMemo(
    () => ({
      x: new MeshStandardMaterial({ color: AXIS_COLORS.x, roughness: 0.35, metalness: 0.25 }),
      y: new MeshStandardMaterial({ color: AXIS_COLORS.y, roughness: 0.35, metalness: 0.25 }),
      z: new MeshStandardMaterial({ color: AXIS_COLORS.z, roughness: 0.35, metalness: 0.25 }),
    }),
    []
  );
  const hitMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    []
  );
  const planeMaterial = useMemo(
    () => new MeshBasicMaterial({ color: planeColor, transparent: true, opacity: 0.5 }),
    []
  );
  const rotateMaterial = useMemo<Record<"x" | "y" | "z", AxisMaterial>>(
    () => ({
      x: new MeshStandardMaterial({ color: AXIS_COLORS.x, roughness: 0.25, metalness: 0.6 }),
      y: new MeshStandardMaterial({ color: AXIS_COLORS.y, roughness: 0.25, metalness: 0.6 }),
      z: new MeshStandardMaterial({ color: AXIS_COLORS.z, roughness: 0.25, metalness: 0.6 }),
    }),
    []
  );
  const extrudeMaterial = useMemo(
    () => new MeshBasicMaterial({ color: extrudeColor }),
    []
  );
  const shaftGeometry = useMemo(() => new CylinderGeometry(0.06, 0.06, 1, 36, 1, true), []);
  const headGeometry = useMemo(() => new ConeGeometry(0.12, 1, 48), []);
  const planeGeometry = useMemo(() => new PlaneGeometry(1, 1), []);
  const axisCapGeometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const scaleCenterGeometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const rotateGeometry = useMemo(() => new TorusGeometry(0.9, 0.07, 32, 96), []);
  const hitAxisGeometry = useMemo(() => new CylinderGeometry(1, 1, 1, 14), []);
  const hitPlaneGeometry = useMemo(() => new PlaneGeometry(1, 1), []);
  const hitBoxGeometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const hitRotateGeometry = useMemo(() => new TorusGeometry(0.9, 0.24, 24, 72), []);

  useEffect(() => {
    return () => {
      shaftGeometry.dispose();
      headGeometry.dispose();
      planeGeometry.dispose();
      axisCapGeometry.dispose();
      scaleCenterGeometry.dispose();
      rotateGeometry.dispose();
      hitAxisGeometry.dispose();
      hitPlaneGeometry.dispose();
      hitBoxGeometry.dispose();
      hitRotateGeometry.dispose();
      hitMaterial.dispose();
      planeMaterial.dispose();
      extrudeMaterial.dispose();
      axisMaterial.x.dispose();
      axisMaterial.y.dispose();
      axisMaterial.z.dispose();
      rotateMaterial.x.dispose();
      rotateMaterial.y.dispose();
      rotateMaterial.z.dispose();
    };
  }, [
    shaftGeometry,
    headGeometry,
    planeGeometry,
    axisCapGeometry,
    scaleCenterGeometry,
    rotateGeometry,
    hitAxisGeometry,
    hitPlaneGeometry,
    hitBoxGeometry,
    hitRotateGeometry,
    hitMaterial,
    planeMaterial,
    extrudeMaterial,
    axisMaterial,
    rotateMaterial,
  ]);

  const showMove = mode === "move" || mode === "gumball";
  const showRotate = mode === "rotate" || mode === "gumball";
  const showScale = mode === "scale" || mode === "gumball";
  const showExtrudeHandle = showExtrude && mode === "gumball";

  const handleHover = (id: string | null) => {
    setHovered(id);
  };

  axisMaterial.x.color.set(hovered === "move-x" ? HOVER_AXIS_COLOR : AXIS_COLORS.x);
  axisMaterial.y.color.set(hovered === "move-y" ? HOVER_AXIS_COLOR : AXIS_COLORS.y);
  axisMaterial.z.color.set(hovered === "move-z" ? HOVER_AXIS_COLOR : AXIS_COLORS.z);

  rotateMaterial.x.color.set(hovered === "rotate-x" ? HOVER_ROTATE_COLOR : AXIS_COLORS.x);
  rotateMaterial.y.color.set(hovered === "rotate-y" ? HOVER_ROTATE_COLOR : AXIS_COLORS.y);
  rotateMaterial.z.color.set(hovered === "rotate-z" ? HOVER_ROTATE_COLOR : AXIS_COLORS.z);

  const handlePointerDown = (handle: GizmoHandle, event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    event.nativeEvent?.preventDefault?.();
    onStart(handle, event);
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onDrag?.(event);
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onEnd?.(event);
  };

  return (
    <group ref={groupRef} matrix={matrix} matrixAutoUpdate={false}>
      {showMove && (
        <>
          {(["x", "y", "z"] as const).map((axis) => (
            <group key={`move-${axis}`}>
              <AxisLine
                axis={axis}
                length={1.9}
                color={hovered === `move-${axis}` ? HOVER_AXIS_COLOR : AXIS_COLORS[axis]}
              />
              <AxisHandle
                axis={axis}
                length={1.9}
                radius={0.1}
                shaftGeometry={shaftGeometry}
                headGeometry={headGeometry}
                material={axisMaterial[axis]}
                hitGeometry={hitAxisGeometry}
                hitMaterial={hitMaterial}
                onPointerDown={(event) => handlePointerDown({ kind: "axis", axis }, event)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerOver={() => handleHover(`move-${axis}`)}
                onPointerOut={() => handleHover(null)}
              />
            </group>
          ))}
          {(["xy", "yz", "xz"] as const).map((plane) => (
            <PlaneHandle
              key={`move-${plane}`}
              plane={plane}
              size={0.95}
              geometry={planeGeometry}
              material={planeMaterial}
              hitGeometry={hitPlaneGeometry}
              hitMaterial={hitMaterial}
              onPointerDown={(event) => handlePointerDown({ kind: "plane", plane }, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerOver={() => handleHover(`move-${plane}`)}
              onPointerOut={() => handleHover(null)}
            />
          ))}
          <Billboard>
            <group>
              <mesh>
                <planeGeometry args={[0.35, 0.35]} />
                <meshBasicMaterial color={screenColor} transparent opacity={0.7} />
              </mesh>
              <mesh
                geometry={hitPlaneGeometry}
                material={hitMaterial}
                scale={[0.6, 0.6, 0.6]}
                onPointerDown={(event) => handlePointerDown({ kind: "screen" }, event)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerOver={(event) => handleHover("move-screen")}
                onPointerOut={(event) => handleHover(null)}
              />
            </group>
          </Billboard>
        </>
      )}
      {showRotate && (
        <>
          {(["x", "y", "z"] as const).map((axis) => (
            <RotateHandle
              key={`rotate-${axis}`}
              axis={axis}
              radius={0.9}
              geometry={rotateGeometry}
              material={rotateMaterial[axis]}
              hitGeometry={hitRotateGeometry}
              hitMaterial={hitMaterial}
              onPointerDown={(event) => handlePointerDown({ kind: "rotate", axis }, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerOver={() => handleHover(`rotate-${axis}`)}
              onPointerOut={() => handleHover(null)}
            />
          ))}
        </>
      )}
      {showScale && (
        <>
          {(["x", "y", "z"] as const).map((axis) => (
            <AxisCap
              key={`scale-${axis}`}
              axis={axis}
              length={1.1}
              size={0.26}
              color={hovered === `scale-${axis}` ? "#fbbf24" : AXIS_COLORS[axis]}
              boxGeometry={axisCapGeometry}
              hitGeometry={hitBoxGeometry}
              hitMaterial={hitMaterial}
              hitScale={2.6}
              onPointerDown={(event) => handlePointerDown({ kind: "scale", axis }, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerOver={() => handleHover(`scale-${axis}`)}
              onPointerOut={() => handleHover(null)}
            />
          ))}
          {(["xy", "yz", "xz"] as const).map((plane) => (
            <PlaneHandle
              key={`scale-${plane}`}
              plane={plane}
              size={0.55}
              geometry={planeGeometry}
              material={planeMaterial}
              hitGeometry={hitPlaneGeometry}
              hitMaterial={hitMaterial}
              onPointerDown={(event) => handlePointerDown({ kind: "plane", plane }, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerOver={() => handleHover(`scale-${plane}`)}
              onPointerOut={() => handleHover(null)}
            />
          ))}
          <mesh
            onPointerDown={(event) => handlePointerDown({ kind: "scale" }, event)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOver={() => handleHover("scale-uniform")}
            onPointerOut={() => handleHover(null)}
            scale={[0.26, 0.26, 0.26]}
          >
            <primitive object={scaleCenterGeometry} attach="geometry" />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
        </>
      )}
      {showExtrudeHandle && (
        <group>
          <Line points={[[0, 0, 0], [0, 0, 1.4]]} color={extrudeColor} lineWidth={3} />
          <AxisCap
            axis="z"
            length={1.4}
            size={0.3}
            color={hovered === "extrude" ? "#fb923c" : extrudeColor}
            boxGeometry={axisCapGeometry}
            hitGeometry={hitBoxGeometry}
            hitMaterial={hitMaterial}
            hitScale={3}
            onPointerDown={(event) => handlePointerDown({ kind: "extrude", axis: "z" }, event)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOver={() => handleHover("extrude")}
            onPointerOut={() => handleHover(null)}
          />
        </group>
      )}
    </group>
  );
};
