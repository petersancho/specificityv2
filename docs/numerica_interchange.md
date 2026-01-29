# Numerica Interchange (Import/Export)

Updated: 2026-01-29

This document explains how Numerica exchanges data with external tools.

## 1) Geometry Types and Interchange

Numerica handles:

- **Mesh** (triangles) — best for export and downstream DCC tools
- **NURBS** (curves/surfaces) — best for CAD workflows
- **B‑Rep** (solids) — best for manufacturing‑grade solids

Conversions are explicit and lossy depending on direction.

## 2) Import Nodes

- **STL Import** (`stlImport`)
  - Input: file
  - Output: geometry
  - Notes: STL is mesh‑only; no NURBS or B‑Rep data.

## 3) Export Nodes

- **STL Export** (`stlExport`)
  - Input: geometry
  - Output: file blob
  - Notes: converts geometry to mesh before export.

## 4) Mesh Conversion Nodes

- **Mesh Convert** (`meshConvert`)
- **Mesh to B‑Rep** (`meshtobrep` command)
- **B‑Rep to Mesh** (`breptomesh` command)
- **Mesh to NURBS** (`nurbsrestore` command)

Use conversion nodes and commands together:

```
NURBS → Mesh Convert → STL Export
```

## 5) Common Pitfalls

- Exporting NURBS without conversion → fails or produces empty mesh.
- Low tessellation quality → faceted exports.
- B‑Rep conversions can lose topology semantics.

