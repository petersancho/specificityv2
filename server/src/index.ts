import cors from "cors";
import express from "express";
import { createServer } from "http";
import { readFile, readdir, mkdir, stat, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

type Material = {
  id: string;
  name: string;
  density_kg_m3: number;
  category: string;
  source: string;
};

type ECCRecord = {
  id: string;
  materialId: string;
  ecc_kgco2e_per_kg: number;
  stage: string;
  source: string;
};

type Geometry = {
  id: string;
  type: string;
  position?: { x: number; y: number; z: number };
  layerId: string;
  area_m2?: number;
  thickness_m?: number;
};

type MaterialAssignment = {
  layerId?: string;
  geometryId?: string;
  materialId: string;
};

type WorkflowNodeData = {
  label?: string;
  geometryId?: string;
  area_m2?: number;
  volume_m3?: number;
  density_kg_m3?: number;
  thickness_m?: number;
  mass_kg?: number;
  ecc_kgco2e_per_kg?: number;
  materialId?: string;
  layerId?: string;
  metricName?: string;
  outputs?: Record<
    string,
    number | string | boolean | Array<number | string | boolean>
  >;
};

type WorkflowNode = {
  id: string;
  type?: string;
  data?: WorkflowNodeData;
  position?: { x: number; y: number };
};

type WorkflowEdge = {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

type WorkflowPayload = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

type WorkflowComputeRequest = {
  workflow?: WorkflowPayload;
  geometry?: Geometry[];
  layers?: Array<{ id: string; name: string; geometryIds: string[] }>;
  assignments?: MaterialAssignment[];
  materials?: Material[];
  ecc?: ECCRecord[];
};

type WorkflowMetrics = {
  mass_kg: number;
  materialGWP_kgCO2e: number;
  gwpIntensity_kgCO2e_per_kg: number;
  compositeGWP_kgCO2e: number;
  assemblyGWP_kgCO2e: number;
};

type ProjectSave = {
  id: string;
  name: string;
  savedAt: string;
  project: unknown;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");
const dataDir = path.join(serverRoot, "data");
const savesDir = path.join(serverRoot, "saves");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

const port = Number(process.env.PORT) || 3001;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "lingua-backend", port });
});

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
};

const safeId = (value: string) => value.replace(/[^a-zA-Z0-9-_]/g, "");

const toNumber = (value: number | string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const computeWorkflow = ({
  workflow,
  geometry = [],
  materials = [],
  ecc = [],
}: WorkflowComputeRequest) => {
  const nodes = workflow?.nodes ?? [];
  const edges = workflow?.edges ?? [];
  const outputMap: Record<string, Record<string, number | string | Array<number | string>>> =
    {};

  const getIncomingValues = (nodeId: string) => {
    const incoming = edges.filter((edge) => edge.target === nodeId);
    const inputs: Record<string, Array<number | string>> = {};
    incoming.forEach((edge) => {
      const sourceKey = edge.sourceHandle ?? "value";
      const targetKey = edge.targetHandle ?? sourceKey;
      const value = outputMap[edge.source]?.[sourceKey];
      if (value !== undefined) {
        const nextValues = Array.isArray(value) ? value : [value];
        inputs[targetKey] = [...(inputs[targetKey] ?? []), ...nextValues];
      }
    });
    return inputs;
  };

  const resolveGeometry = (geometryId?: string) =>
    geometry.find((item) => item.id === geometryId) ?? geometry[0];

  const resolveMaterial = (materialId?: string) =>
    materials.find((material) => material.id === materialId) ?? materials[0];

  const toStringInput = (values?: Array<number | string>) => {
    const match = values?.find((value) => typeof value === "string");
    return typeof match === "string" ? match : undefined;
  };

  for (let pass = 0; pass < 4; pass += 1) {
    nodes.forEach((node) => {
      const inputs = getIncomingValues(node.id);
      const data = node.data ?? { label: node.type ?? "Node" };
      const outputs: Record<string, number | string | Array<number | string>> = {};

      if (node.type === "point") {
        const geometryId =
          toStringInput(inputs.geometryId) ?? data.geometryId ?? geometry[0]?.id;
        const item = resolveGeometry(geometryId);
        if (item) {
          outputs.geometryId = item.id;
          outputs.layerId = item.layerId;
          if (item.position) {
            outputs.position = `${item.position.x.toFixed(
              2
            )}, ${item.position.y.toFixed(2)}, ${item.position.z.toFixed(2)}`;
          }
        }
      }

      if (node.type === "geometry") {
        const geometryId =
          toStringInput(inputs.geometryId) ?? data.geometryId ?? geometry[0]?.id;
        const item = resolveGeometry(geometryId);
        outputs.geometryId = item?.id ?? geometryId ?? "";
        outputs.layerId = item?.layerId ?? "";
        outputs.area_m2 = toNumber(inputs.area_m2?.[0] ?? data.area_m2);
        outputs.volume_m3 = toNumber(inputs.volume_m3?.[0] ?? data.volume_m3);
      }

      if (node.type === "area") {
        outputs.area_m2 = toNumber(inputs.area_m2?.[0] ?? data.area_m2);
      }

      if (node.type === "density") {
        const materialId =
          toStringInput(inputs.materialId) ?? data.materialId ?? materials[0]?.id;
        const material = resolveMaterial(materialId);
        outputs.materialId = material?.id ?? materialId ?? "";
        outputs.density_kg_m3 = toNumber(
          inputs.density_kg_m3?.[0] ?? data.density_kg_m3 ?? material?.density_kg_m3
        );
      }

      if (node.type === "gwpMaterial") {
        const density = toNumber(inputs.density_kg_m3?.[0] ?? data.density_kg_m3);
        const area = toNumber(inputs.area_m2?.[0] ?? data.area_m2);
        const volume = toNumber(inputs.volume_m3?.[0] ?? data.volume_m3);
        const massInput = toNumber(inputs.mass_kg?.[0]);
        const thickness = toNumber(data.thickness_m ?? 1);
        const eccValue = toNumber(
          inputs.ecc_kgco2e_per_kg?.[0] ?? data.ecc_kgco2e_per_kg
        );
        const mass =
          massInput > 0
            ? massInput
            : volume > 0 && density > 0
              ? volume * density
              : area > 0 && density > 0
                ? area * thickness * density
                : 0;
        outputs.mass_kg = mass;
        outputs.materialGWP_kgCO2e = mass * eccValue;
      }

      if (node.type === "gwpIntensity") {
        const gwp = toNumber(
          inputs.materialGWP_kgCO2e?.[0] ?? inputs.gwp_kgCO2e?.[0]
        );
        const mass = toNumber(inputs.mass_kg?.[0] ?? data.mass_kg);
        outputs.gwpIntensity_kgCO2e_per_kg = mass > 0 ? gwp / mass : 0;
      }

      if (node.type === "gwpComposite") {
        const values = [
          ...(inputs.materialGWP_kgCO2e ?? []),
          ...(inputs.gwp_kgCO2e ?? []),
          ...(inputs.compositeGWP_kgCO2e ?? []),
        ];
        outputs.compositeGWP_kgCO2e = values.reduce<number>(
          (sum, value) => sum + toNumber(value),
          0
        );
      }

      if (node.type === "gwpAssembly") {
        const values = [
          ...(inputs.compositeGWP_kgCO2e ?? []),
          ...(inputs.gwp_kgCO2e ?? []),
          ...(inputs.materialGWP_kgCO2e ?? []),
        ];
        outputs.assemblyGWP_kgCO2e = values.reduce<number>(
          (sum, value) => sum + toNumber(value),
          0
        );
      }

      if (node.type === "results") {
        Object.entries(inputs).forEach(([key, values]) => {
          outputs[key] = values.length > 1 ? values : values[0];
        });
      }

      outputMap[node.id] = outputs;
    });
  }

  const nextNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      outputs: outputMap[node.id] ?? {},
    },
  }));

  const sumOutputs = (key: string) =>
    nextNodes.reduce((sum, node) => {
      const value = node.data?.outputs?.[key];
      return typeof value === "number" ? sum + value : sum;
    }, 0);

  const massTotal = sumOutputs("mass_kg");
  const materialTotal = sumOutputs("materialGWP_kgCO2e");
  const compositeTotal = sumOutputs("compositeGWP_kgCO2e");
  const assemblyTotal = sumOutputs("assemblyGWP_kgCO2e");

  const intensityNodes = nextNodes
    .map((node) => node.data?.outputs?.gwpIntensity_kgCO2e_per_kg)
    .filter((value) => typeof value === "number") as number[];

  const metrics: WorkflowMetrics = {
    mass_kg: massTotal,
    materialGWP_kgCO2e: materialTotal,
    gwpIntensity_kgCO2e_per_kg:
      massTotal > 0
        ? materialTotal / massTotal
        : intensityNodes.length > 0
          ? intensityNodes.reduce((sum, value) => sum + value, 0) /
            intensityNodes.length
          : 0,
    compositeGWP_kgCO2e: compositeTotal > 0 ? compositeTotal : materialTotal,
    assemblyGWP_kgCO2e:
      assemblyTotal > 0
        ? assemblyTotal
        : compositeTotal > 0
          ? compositeTotal
          : materialTotal,
  };

  const dataValues: Record<string, number> = {};
  nextNodes
    .filter((node) => node.type === "results")
    .forEach((node, index) => {
      const labelBase =
        node.data?.metricName?.trim() ||
        node.data?.label ||
        `Results ${index + 1}`;
      const outputs = node.data?.outputs ?? {};
      Object.entries(outputs).forEach(([key, value]) => {
        if (typeof value === "number") {
          dataValues[`${labelBase} • ${key}`] = value;
        }
      });
    });

  return { nodes: nextNodes, dataValues, metrics };
};

app.get("/api/materials", async (_req, res) => {
  try {
    const materials = await readJson<Material[]>(
      path.join(dataDir, "materials.json")
    );
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: "Failed to read materials dataset." });
  }
});

app.get("/api/ecc", async (_req, res) => {
  try {
    const ecc = await readJson<ECCRecord[]>(path.join(dataDir, "ecc.json"));
    res.json(ecc);
  } catch (error) {
    res.status(500).json({ error: "Failed to read ECC dataset." });
  }
});

app.post("/api/workflow/compute", (req, res) => {
  const payload = req.body as WorkflowComputeRequest | undefined;
  if (!payload?.workflow) {
    res.status(400).json({ error: "Workflow payload required." });
    return;
  }
  const computed = computeWorkflow(payload);
  res.json(computed);
});

app.get("/api/saves", async (_req, res) => {
  try {
    await mkdir(savesDir, { recursive: true });
    const files = (await readdir(savesDir)).filter(
      (file) => file.endsWith(".json") && !file.startsWith("._")
    );
    const entries = await Promise.all(
      files.map(async (file) => {
        try {
          const id = file.replace(/\.json$/, "");
          const info = await stat(path.join(savesDir, file));
          const saved = await readJson<ProjectSave>(path.join(savesDir, file));
          return {
            id: saved?.id ?? id,
            name: saved?.name ?? id,
            savedAt: saved?.savedAt ?? info.mtime.toISOString(),
          };
        } catch (error) {
          return null;
        }
      })
    );
    const validEntries = entries.filter(
      (entry): entry is { id: string; name: string; savedAt: string } =>
        Boolean(entry)
    );
    res.json(validEntries);
  } catch (error) {
    res.status(500).json({ error: "Failed to list saves." });
  }
});

app.get("/api/saves/:id", async (req, res) => {
  const id = safeId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid save id." });
    return;
  }
  try {
    const filePath = path.join(savesDir, `${id}.json`);
    const saved = await readJson<ProjectSave>(filePath);
    res.json(saved);
  } catch (error) {
    res.status(404).json({ error: "Save not found." });
  }
});

app.post("/api/saves", async (req, res) => {
  const { id, name, project } = req.body ?? {};
  if (!project) {
    res.status(400).json({ error: "Project payload required." });
    return;
  }
  const generatedId =
    safeId(id ?? "") || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const saveRecord: ProjectSave = {
    id: generatedId,
    name: name ?? "Untitled Project",
    savedAt: new Date().toISOString(),
    project,
  };
  try {
    await mkdir(savesDir, { recursive: true });
    await writeFile(
      path.join(savesDir, `${generatedId}.json`),
      JSON.stringify(saveRecord, null, 2),
      "utf-8"
    );
    res.json({ id: generatedId });
  } catch (error) {
    res.status(500).json({ error: "Failed to save project." });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
  },
});

let currentProject: unknown = null;

io.on("connection", (socket) => {
  socket.emit("project:update", currentProject);
  socket.on("project:update", (project) => {
    currentProject = project;
    socket.broadcast.emit("project:update", project);
  });
});

httpServer.listen(port, () => {
  console.log(`Lingua server running on http://localhost:${port}`);
});
