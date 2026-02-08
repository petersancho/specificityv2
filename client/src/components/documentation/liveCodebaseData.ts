export type SectionItem = {
  label: string
  detail: string
  path?: string
}

export type CodeSection = {
  id: string
  title: string
  description: string
  accent: string
  note: string
  items: SectionItem[]
}

export const codeSections: CodeSection[] = [
  {
    id: "client",
    title: "Client Entry & State",
    description: "React shell, Zustand store, shared types",
    accent: "#bf0d0d",
    note: "Always start here if you need to understand how Roslyn + Numerica synchronize state.",
    items: [
      { label: "client/src/main.tsx", detail: "Vite entry mounting <App />", path: "client/src/main.tsx" },
      { label: "client/src/App.tsx", detail: "Dual-panel layout, docs/workspace routing", path: "client/src/App.tsx" },
      { label: "client/src/store/useProjectStore.ts", detail: "Global geometry/workflow state", path: "client/src/store/useProjectStore.ts" },
      { label: "client/src/types.ts", detail: "Shared geometry + workflow types", path: "client/src/types.ts" },
    ],
  },
  {
    id: "roslyn",
    title: "Roslyn Stack",
    description: "Direct modeling viewport, WebGL renderer, geometry kernel",
    accent: "#8c0808",
    note: "Use these files when debugging camera, rendering, or geometry adapters.",
    items: [
      { label: "client/src/components/WebGLViewerCanvas.tsx", detail: "Camera, selection, overlays", path: "client/src/components/WebGLViewerCanvas.tsx" },
      { label: "client/src/components/ModelerSection.tsx", detail: "Roslyn chrome + command palette", path: "client/src/components/ModelerSection.tsx" },
      { label: "client/src/webgl/WebGLRenderer.ts", detail: "Shader orchestration, passes", path: "client/src/webgl/WebGLRenderer.ts" },
      { label: "client/src/geometry/renderAdapter.ts", detail: "Geometry → GPU buffers", path: "client/src/geometry/renderAdapter.ts" },
      { label: "client/src/geometry/", detail: "Kernel (mesh ops, tessellation, hit-tests)", path: "client/src/geometry" },
    ],
  },
  {
    id: "numerica",
    title: "Numerica Stack",
    description: "Workflow canvas, node registry, solvers",
    accent: "#4d0000",
    note: "All workflow behavior is defined here—great for ontology/runtime links.",
    items: [
      { label: "client/src/components/workflow/WorkflowSection.tsx", detail: "Palette, dashboards", path: "client/src/components/workflow/WorkflowSection.tsx" },
      { label: "client/src/components/workflow/NumericalCanvas.tsx", detail: "Canvas renderer", path: "client/src/components/workflow/NumericalCanvas.tsx" },
      { label: "client/src/workflow/nodeRegistry.ts", detail: "170+ node definitions", path: "client/src/workflow/nodeRegistry.ts" },
      { label: "client/src/workflow/workflowEngine.ts", detail: "Evaluation + caching", path: "client/src/workflow/workflowEngine.ts" },
      { label: "client/src/workflow/nodes/solver/", detail: "Physics, Chemistry, Topology, Voxel", path: "client/src/workflow/nodes/solver" },
    ],
  },
  {
    id: "semantic",
    title: "Semantic System",
    description: "Ontology registry, operation metadata, command semantics",
    accent: "#111111",
    note: "Use these files to trace ontology coverage or command→operation mapping.",
    items: [
      { label: "client/src/semantic/ops/*.ts", detail: "297+ semantic operations", path: "client/src/semantic/ops" },
      { label: "client/src/semantic/ontology/registry.ts", detail: "LOC registry", path: "client/src/semantic/ontology/registry.ts" },
      { label: "client/src/semantic/operationRegistry.ts", detail: "Legacy registry API", path: "client/src/semantic/operationRegistry.ts" },
      { label: "client/src/commands/commandSemantics.ts", detail: "Command → operation links", path: "client/src/commands/commandSemantics.ts" },
    ],
  },
  {
    id: "server",
    title: "Server",
    description: "Workflow compute API, persistence",
    accent: "#2b2b2b",
    note: "Server files mirror Numerica's evaluation to support headless runs.",
    items: [
      { label: "server/src/index.ts", detail: "Express + Socket.IO", path: "server/src/index.ts" },
      { label: "server/src/workflow/", detail: "Server-side evaluation helpers", path: "server/src/workflow" },
    ],
  },
  {
    id: "docs",
    title: "Scripts & Docs",
    description: "Validation + ontology artifacts",
    accent: "#d72626",
    note: "Reference scripts/docs when running CI or updating semantic catalogs.",
    items: [
      { label: "scripts/validateSemanticLinkage.ts", detail: "Node/command coverage", path: "scripts/validateSemanticLinkage.ts" },
      { label: "scripts/validateCommandSemantics.ts", detail: "Command catalog", path: "scripts/validateCommandSemantics.ts" },
      { label: "docs/LIVE_CODEBASE.md", detail: "High-level structure", path: "docs/LIVE_CODEBASE.md" },
      { label: "docs/LIVE_CODEBASE_DETAILS.md", detail: "File-by-file map", path: "docs/LIVE_CODEBASE_DETAILS.md" },
      { label: "docs/AGENTS.md", detail: "Rules + Definition of Done", path: "docs/AGENTS.md" },
    ],
  },
]

export const liveFileOptions = [
  {
    label: "client/src/App.tsx",
    path: "client/src/App.tsx",
    note: "Composition root managing Roslyn + Numerica layout and routing",
  },
  {
    label: "client/src/store/useProjectStore.ts",
    path: "client/src/store/useProjectStore.ts",
    note: "Single source of truth for every subsystem",
  },
  {
    label: "client/src/components/workflow/NumericalCanvas.tsx",
    path: "client/src/components/workflow/NumericalCanvas.tsx",
    note: "HTML canvas renderer for Numerica nodes",
  },
  {
    label: "client/src/workflow/nodeRegistry.ts",
    path: "client/src/workflow/nodeRegistry.ts",
    note: "Authoritative node catalog and semanticOps mapping",
  },
  {
    label: "client/src/semantic/ontology/registry.ts",
    path: "client/src/semantic/ontology/registry.ts",
    note: "Ontology registry API",
  },
  {
    label: "server/src/index.ts",
    path: "server/src/index.ts",
    note: "Express + workflow compute entry",
  },
]
