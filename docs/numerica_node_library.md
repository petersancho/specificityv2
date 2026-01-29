# Numerica Node Library Reference

Updated: 2026-01-29

This reference is generated from the node registry. Each node includes inputs, outputs, defaults, and guidance.

## Data

### Geometry Reference (`geometryReference`)

- Category: Data
- Purpose: Reference existing geometry into the graph.

When to use it:
- Reference existing geometry into the graph.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |

Examples:
- Example: Geometry Reference → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Data category for adjacent workflows.

---

### Text (`text`)

- Category: Data
- Purpose: Floating canvas text with a handwritten style.

When to use it:
- Floating canvas text with a handwritten style.

Inputs:
- None

Outputs:
- None

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Text | string | Text |  |  |
| Size | number | 24 | min 8, max 96, step 1 |  |

Examples:
- Example: Text → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Data category for adjacent workflows.

---

### Group (`group`)

- Category: Data
- Purpose: Organize nodes visually inside a shared container.

When to use it:
- Organize nodes visually inside a shared container.

Inputs:
- None

Outputs:
- None

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Title | string | Group |  |  |
| Color | color | #f5f2ee |  |  |

Examples:
- Example: Group → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Data category for adjacent workflows.

---

### Panel (`panel`)

- Category: Data
- Purpose: Read-only viewer for upstream outputs or fallback text.

When to use it:
- Read-only viewer for upstream outputs or fallback text.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Data | any |  | Multi |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Data | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Text | textarea |  |  |  |
| Max Lines | number | 200 | min 1, max 200, step 1 |  |
| Show Index | boolean | true |  |  |
| Index Start | number | 0 | step 1 |  |
| Indent | number | 2 | min 0, max 8, step 1 |  |

Examples:
- Example: Panel → Panel → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Data category for adjacent workflows.

---

### Text Note (`textNote`)

- Category: Data
- Purpose: Display + pass through data with a freeform note.

When to use it:
- Display + pass through data with a freeform note.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Data | any |  | Multi |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Data | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Text | textarea | Edit me! |  |  |
| Max Lines | number | 10 | min 1, max 200, step 1 |  |
| Show Index | boolean | false |  |  |
| Index Start | number | 0 | step 1 |  |
| Indent | number | 2 | min 0, max 8, step 1 |  |

Examples:
- Example: Panel → Text Note → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Data category for adjacent workflows.

---

### Color Picker (`colorPicker`)

- Category: Data
- Purpose: Pick a color swatch and output RGB + hex.

When to use it:
- Pick a color swatch and output RGB + hex.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Color | vector |  |
| Hex | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Color | color | #2EA3A8 |  |  |

Examples:
- Example: Color Picker → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Data category for adjacent workflows.

---

### Annotations (`annotations`)

- Category: Data
- Purpose: Attach annotation text to a point or geometry.

When to use it:
- Attach annotation text to a point or geometry.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  |  |  |
| Anchor | vector |  |  |  |
| Text | string | Annotation | Param: text |  |
| Size | number | 1 | Param: size |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Annotation | any |  |
| Geometry | geometry |  |
| Anchor | vector |  |
| Text | string |  |
| Size | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Anchor X | number | 0 | step 0.1 |  |
| Anchor Y | number | 0 | step 0.1 |  |
| Anchor Z | number | 0 | step 0.1 |  |
| Text | string | Annotation |  |  |
| Size | number | 1 | step 0.1 |  |

Examples:
- Example: Geometry Reference → Annotations → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Data category for adjacent workflows.

---

## Math

### Slider (`slider`)

- Category: Math
- Purpose: A draggable slider that outputs a numeric value.

When to use it:
- A draggable slider that outputs a numeric value.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Value | number | 50 | step 1 |  |
| Min | number | 0 |  |  |
| Max | number | 100 |  |  |
| Step | number | 1 | min 0.001 |  |
| Snap | select | step | options 2 |  |

Examples:
- Example: Slider → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Number (`number`)

- Category: Math
- Purpose: Emit a constant numeric value.

When to use it:
- Emit a constant numeric value.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Value | number | 1 | step 0.1 |  |

Examples:
- Example: Number → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Add (`add`)

- Category: Math
- Purpose: Add two numeric values.

When to use it:
- Add two numeric values.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | number | 0 | Required, Param: a |  |
| B | number | 0 | Required, Param: b |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | number |  |

Examples:
- Example: Number or Slider → Add → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Subtract (`subtract`)

- Category: Math
- Purpose: Subtract B from A.

When to use it:
- Subtract B from A.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | number | 0 | Required, Param: a |  |
| B | number | 0 | Required, Param: b |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | number |  |

Examples:
- Example: Number or Slider → Subtract → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Multiply (`multiply`)

- Category: Math
- Purpose: Multiply two numeric values.

When to use it:
- Multiply two numeric values.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | number | 0 | Required, Param: a |  |
| B | number | 0 | Required, Param: b |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | number |  |

Examples:
- Example: Number or Slider → Multiply → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Divide (`divide`)

- Category: Math
- Purpose: Divide A by B with stability checks.

When to use it:
- Divide A by B with stability checks.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | number | 0 | Required, Param: a |  |
| B | number | 0 | Required, Param: b |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | number |  |

Examples:
- Example: Number or Slider → Divide → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Clamp (`clamp`)

- Category: Math
- Purpose: Clamp a value between a minimum and maximum.

When to use it:
- Clamp a value between a minimum and maximum.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Value | number | 0 | Param: value |  |
| Min | number | 0 | Param: min |  |
| Max | number | 1 | Param: max |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | number |  |

Examples:
- Example: Number or Slider → Clamp → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Min (`min`)

- Category: Math
- Purpose: Return the smaller of two values.

When to use it:
- Return the smaller of two values.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | number | 0 | Required, Param: a |  |
| B | number | 0 | Required, Param: b |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | number |  |

Examples:
- Example: Number or Slider → Min → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Max (`max`)

- Category: Math
- Purpose: Return the larger of two values.

When to use it:
- Return the larger of two values.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | number | 0 | Required, Param: a |  |
| B | number | 0 | Required, Param: b |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | number |  |

Examples:
- Example: Number or Slider → Max → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Expression (`expression`)

- Category: Math
- Purpose: Evaluate a mathematical expression.

When to use it:
- Evaluate a mathematical expression.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| a | number | 0 | Param: a |  |
| b | number | 0 | Param: b |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Expression | string | a + b |  |  |

Examples:
- Example: Number or Slider → Expression → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

### Scalar Functions (`scalarFunctions`)

- Category: Math
- Purpose: Apply common scalar functions to a value.

When to use it:
- Apply common scalar functions to a value.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Value | number | 0 | Param: value |  |
| Exponent | number | 2 | Param: exponent |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Function | select | abs | options 11 |  |

Examples:
- Example: Number or Slider → Scalar Functions → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Math category for adjacent workflows.

---

## Modifiers

### Custom Material (`customMaterial`)

- Category: Modifiers
- Purpose: Apply a custom render color to geometry.

When to use it:
- Apply a custom render color to geometry.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required, Param: geometryId |  |
| Color | vector | #2EA3A8 | Param: color |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Color | vector |  |
| Hex | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Color | color | #2EA3A8 |  |  |

Examples:
- Example: Geometry Reference → Custom Material → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Modifiers category for adjacent workflows.

---

### Offset (`offset`)

- Category: Modifiers
- Purpose: Offset a curve by a given distance.

When to use it:
- Offset a curve by a given distance.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |
| Distance | number | 1 | Param: distance |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Offset | geometry |  |
| Points | any |  |
| Distance | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Distance | number | 1 | step 0.1 |  |
| Samples | number | 32 | min 8, max 128, step 1 |  |

Examples:
- Example: Geometry Reference → Offset → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Modifiers category for adjacent workflows.

---

### Fillet (`fillet`)

- Category: Modifiers
- Purpose: Round corners on curves or edges.

When to use it:
- Round corners on curves or edges.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |
| Radius | number | 0.5 | Param: radius |  |
| Segments | number | 6 | Param: segments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Radius | number |  |
| Segments | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Radius | number | 0.5 | step 0.1 |  |
| Segments | number | 6 | min 1, max 32, step 1 |  |

Examples:
- Example: Geometry Reference → Fillet → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Modifiers category for adjacent workflows.

---

### Plasticwrap (`plasticwrap`)

- Category: Modifiers
- Purpose: Shrinkwrap geometry onto a target with a projection distance.

When to use it:
- Shrinkwrap geometry onto a target with a projection distance.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |
| Target | geometry |  | Required |  |
| Distance | number | 0.25 | Param: distance |  |
| Smooth | number | 0.5 | Param: smooth |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Target | geometry |  |
| Distance | number |  |
| Smooth | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Distance | number | 0.25 | step 0.05 |  |
| Smooth | number | 0.5 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Geometry Reference → Plasticwrap → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Modifiers category for adjacent workflows.

---

## Analysis

### Geometry Viewer (`geometryViewer`)

- Category: Analysis
- Purpose: Preview geometry in a mini viewport.

When to use it:
- Preview geometry in a mini viewport.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  |  |  |

Outputs:
- None

Examples:
- Example: Geometry Reference → Geometry Viewer → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Filter (`previewFilter`)

- Category: Analysis
- Purpose: Roslyn preview filters for Custom Preview nodes.

When to use it:
- Roslyn preview filters for Custom Preview nodes.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Filter | any | Preview filter settings payload. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Display Mode | select | shaded | options 5 |  |
| Solidity | slider | 0.7 | min 0, max 1, step 0.05 |  |
| Sheen | slider | 0.08 | min 0, max 1, step 0.01 |  |
| Backface Culling | boolean | true |  |  |
| Show Normals | boolean | false |  |  |

Examples:
- Example: Filter → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Custom Preview (`customPreview`)

- Category: Analysis
- Purpose: Preview geometry with a custom filter payload.

When to use it:
- Preview geometry with a custom filter payload.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  |  |  |
| Filter | any |  |  | Preview filter settings from a Filter node. |

Outputs:
- None

Examples:
- Example: Geometry Reference → Custom Preview → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Metadata Panel (`metadataPanel`)

- Category: Analysis
- Purpose: Inspect geometry metadata and attributes.

When to use it:
- Inspect geometry metadata and attributes.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Metadata | any |  |
| Id | string |  |
| Type | string |  |
| Layer | string |  |
| Area | number |  |
| Thickness | number |  |

Examples:
- Example: Geometry Reference → Metadata Panel → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### List Sum (`listSum`)

- Category: Analysis
- Purpose: Sum numeric values from a list.

When to use it:
- Sum numeric values from a list.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Sum | number |  |
| Count | number |  |

Examples:
- Example: Panel → List Sum → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### List Average (`listAverage`)

- Category: Analysis
- Purpose: Average numeric values from a list.

When to use it:
- Average numeric values from a list.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Average | number |  |
| Sum | number |  |
| Count | number |  |

Examples:
- Example: Panel → List Average → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### List Min (`listMin`)

- Category: Analysis
- Purpose: Find the minimum numeric value in a list.

When to use it:
- Find the minimum numeric value in a list.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Min | number |  |
| Count | number |  |

Examples:
- Example: Panel → List Min → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### List Max (`listMax`)

- Category: Analysis
- Purpose: Find the maximum numeric value in a list.

When to use it:
- Find the maximum numeric value in a list.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Max | number |  |
| Count | number |  |

Examples:
- Example: Panel → List Max → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### List Median (`listMedian`)

- Category: Analysis
- Purpose: Find the median numeric value in a list.

When to use it:
- Find the median numeric value in a list.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Median | number |  |
| Count | number |  |

Examples:
- Example: Panel → List Median → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### List Std Dev (`listStdDev`)

- Category: Analysis
- Purpose: Compute the population standard deviation of a list.

When to use it:
- Compute the population standard deviation of a list.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Std Dev | number |  |
| Variance | number |  |
| Count | number |  |

Examples:
- Example: Panel → List Std Dev → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Geometry Info (`geometryInfo`)

- Category: Analysis
- Purpose: Summarize geometry type and core element counts.

When to use it:
- Summarize geometry type and core element counts.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Type | string |  |
| Vertices | number |  |
| Edges | number |  |
| Faces | number |  |
| Control Pts | number |  |
| Normals | number |  |

Examples:
- Example: Geometry Reference → Geometry Info → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Geometry Vertices (`geometryVertices`)

- Category: Analysis
- Purpose: Extract vertex positions from geometry as a list.

When to use it:
- Extract vertex positions from geometry as a list.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vertices | any |  |
| Count | number |  |

Examples:
- Example: Geometry Reference → Geometry Vertices → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Geometry Edges (`geometryEdges`)

- Category: Analysis
- Purpose: Extract edge segments as vector pairs.

When to use it:
- Extract edge segments as vector pairs.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Edges | any |  |
| Count | number |  |

Examples:
- Example: Geometry Reference → Geometry Edges → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Geometry Faces (`geometryFaces`)

- Category: Analysis
- Purpose: Extract face centroids from mesh geometry.

When to use it:
- Extract face centroids from mesh geometry.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Faces | any |  |
| Count | number |  |

Examples:
- Example: Geometry Reference → Geometry Faces → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Geometry Normals (`geometryNormals`)

- Category: Analysis
- Purpose: Extract normals from mesh geometry.

When to use it:
- Extract normals from mesh geometry.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Normals | any |  |
| Count | number |  |

Examples:
- Example: Geometry Reference → Geometry Normals → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Control Points (`geometryControlPoints`)

- Category: Analysis
- Purpose: Extract control points or defining points from geometry.

When to use it:
- Extract control points or defining points from geometry.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Points | any |  |
| Count | number |  |

Examples:
- Example: Geometry Reference → Control Points → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Proximity 3D (`proximity3d`)

- Category: Analysis
- Purpose: Find nearby points in 3D and output connection pairs.

When to use it:
- Find nearby points in 3D and output connection pairs.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | any |  | Required |  |
| Radius | number | 1 | Param: radius |  |
| Max Neighbors | number | 4 | Param: maxNeighbors |  |
| Unique Pairs | boolean | true | Param: uniquePairs |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Segments | any |  |
| Pairs | any |  |
| Distances | any |  |
| Count | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Radius | number | 1 | min 0, step 0.1 |  |
| Max Neighbors | number | 4 | min 1, max 32, step 1 |  |
| Unique Pairs | boolean | true |  |  |

Examples:
- Example: Panel → Proximity 3D → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Proximity 2D (`proximity2d`)

- Category: Analysis
- Purpose: Find nearby points in 2D (projected) and output connection pairs.

When to use it:
- Find nearby points in 2D (projected) and output connection pairs.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | any |  | Required |  |
| Radius | number | 1 | Param: radius |  |
| Max Neighbors | number | 4 | Param: maxNeighbors |  |
| Plane | string | xz | Param: plane |  |
| Unique Pairs | boolean | true | Param: uniquePairs |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Segments | any |  |
| Pairs | any |  |
| Distances | any |  |
| Count | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Radius | number | 1 | min 0, step 0.1 |  |
| Max Neighbors | number | 4 | min 1, max 32, step 1 |  |
| Plane | select | xz | options 3 |  |
| Unique Pairs | boolean | true |  |  |

Examples:
- Example: Panel → Proximity 2D → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

### Curve Proximity (`curveProximity`)

- Category: Analysis
- Purpose: Find closest points on a curve for a list of points.

When to use it:
- Find closest points on a curve for a list of points.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Curve | geometry |  | Required |  |
| Points | any |  | Required |  |
| Max Distance | number | 0 | Param: maxDistance |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Closest Points | any |  |
| Distances | any |  |
| Segment Index | any |  |
| Count | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Max Distance | number | 0 | min 0, step 0.1 |  |

Examples:
- Example: Geometry Reference → Curve Proximity → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Analysis category for adjacent workflows.

---

## Mesh

### Mesh Convert (`meshConvert`)

- Category: Mesh
- Purpose: Convert geometry into a mesh for export.

When to use it:
- Convert geometry into a mesh for export.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |
| Thickness | number | 0.1 | Param: distance |  |
| Direction | vector |  |  |  |
| Capped | boolean | true | Param: capped |  |
| Vertex Radius | number | 0.1 | Param: radius |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Source Type | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Thickness | number | 0.1 | min 0, step 0.05 |  |
| Direction X | number | 0 | step 0.1 |  |
| Direction Y | number | 1 | step 0.1 |  |
| Direction Z | number | 0 | step 0.1 |  |
| Capped | boolean | true |  |  |
| Vertex Radius | number | 0.1 | min 0, step 0.05 |  |

Examples:
- Example: Geometry Reference → Mesh Convert → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Mesh category for adjacent workflows.

---

### NURBS to Mesh (`nurbsToMesh`)

- Category: Mesh
- Purpose: Convert NURBS curves or surfaces into a mesh.

When to use it:
- Convert NURBS curves or surfaces into a mesh.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| NURBS | geometry |  | Required |  |
| Thickness | number | 0.1 | Param: distance |  |
| Direction | vector |  |  |  |
| Capped | boolean | true | Param: capped |  |
| Vertex Radius | number | 0.1 | Param: radius |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Source Type | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Thickness | number | 0.1 | min 0, step 0.05 |  |
| Direction X | number | 0 | step 0.1 |  |
| Direction Y | number | 1 | step 0.1 |  |
| Direction Z | number | 0 | step 0.1 |  |
| Capped | boolean | true |  |  |
| Vertex Radius | number | 0.1 | min 0, step 0.05 |  |

Examples:
- Example: Geometry Reference → NURBS to Mesh → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Mesh category for adjacent workflows.

---

### B-Rep to Mesh (`brepToMesh`)

- Category: Mesh
- Purpose: Tessellate a B-Rep into a renderable mesh.

When to use it:
- Tessellate a B-Rep into a renderable mesh.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| B-Rep | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Source Type | string |  |

Examples:
- Example: Geometry Reference → B-Rep to Mesh → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Mesh category for adjacent workflows.

---

### Mesh to B-Rep (`meshToBrep`)

- Category: Mesh
- Purpose: Convert a mesh into a triangle-based B-Rep.

When to use it:
- Convert a mesh into a triangle-based B-Rep.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| B-Rep | geometry |  |
| B-Rep Data | any |  |
| Mesh | any |  |
| Source Type | string |  |

Examples:
- Example: Geometry Reference → Mesh to B-Rep → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Mesh category for adjacent workflows.

---

### Pipe Merge (`pipeMerge`)

- Category: Mesh
- Purpose: Merge multiple pipe meshes, with optional joint spheres.

When to use it:
- Merge multiple pipe meshes, with optional joint spheres.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Pipes | geometry |  | Required, Multi |  |
| Joints | any |  |  |  |
| Joint Radius | number | 0 | Param: jointRadius |  |
| Radial Segments | number | 16 | Param: radialSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Merged | geometry |  |
| Mesh | any |  |
| Pipe Count | number |  |
| Joint Count | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Joint Radius | number | 0 | min 0, step 0.05 |  |
| Radial Segments | number | 16 | min 6, max 64, step 2 |  |

Examples:
- Example: Geometry Reference → Pipe Merge → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Mesh category for adjacent workflows.

---

### Fillet Edges (`filletEdges`)

- Category: Mesh
- Purpose: Round selected mesh edges by a given radius.

When to use it:
- Round selected mesh edges by a given radius.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |
| Edges | any |  |  |  |
| Radius | number | 0.5 | Param: radius |  |
| Segments | number | 6 | Param: segments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Edges | any |  |
| Edge Count | number |  |
| Radius | number |  |
| Segments | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Radius | number | 0.5 | step 0.1 |  |
| Segments | number | 6 | min 1, max 32, step 1 |  |

Examples:
- Example: Geometry Reference → Fillet Edges → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Mesh category for adjacent workflows.

---

### Thicken Mesh (`thickenMesh`)

- Category: Mesh
- Purpose: Add thickness to a mesh by offsetting inward/outward.

When to use it:
- Add thickness to a mesh by offsetting inward/outward.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Thickness | number | 1 | Param: thickness |  |
| Sides | string | both | Param: sides |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Thickness | number |  |
| Sides | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Thickness | number | 1 | step 0.1 |  |
| Sides | select | both | options 3 |  |

Examples:
- Example: Geometry Reference → Thicken Mesh → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Mesh category for adjacent workflows.

---

### Solid (`solid`)

- Category: Mesh
- Purpose: Cap a surface or open mesh into a closed solid.

When to use it:
- Cap a surface or open mesh into a closed solid.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |
| Cap Mode | string | auto | Param: capMode |  |
| Tolerance | number | 0.01 | Param: tolerance |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Cap Mode | string |  |
| Tolerance | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Cap Mode | select | auto | options 3 |  |
| Tolerance | number | 0.01 | step 0.001 |  |

Examples:
- Example: Geometry Reference → Solid → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Mesh category for adjacent workflows.

---

## Tessellation

### Subdivide Mesh (`subdivideMesh`)

- Category: Tessellation
- Purpose: Subdivide a mesh using linear, Catmull-Clark, Loop, or adaptive schemes.

When to use it:
- Subdivide a mesh using linear, Catmull-Clark, Loop, or adaptive schemes.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Iterations | number | 1 | Param: iterations |  |
| Scheme | string | catmull-clark | Param: scheme |  |
| Preserve Boundary | boolean | true | Param: preserveBoundary |  |
| Max Edge | number | 0.5 | Param: maxEdgeLength |  |
| Curvature Angle | number | 15 | Param: curvatureAngle |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |
| Iterations | number |  |
| Scheme | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Iterations | number | 1 | min 1, max 6, step 1 |  |
| Scheme | select | catmull-clark | options 4 |  |
| Preserve Boundary | boolean | true |  |  |
| Max Edge Length | number | 0.5 | min 0, step 0.05 |  |
| Curvature Angle (deg) | number | 15 | min 0, max 90, step 1 |  |

Examples:
- Example: Geometry Reference → Subdivide Mesh → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Dual Mesh (`dualMesh`)

- Category: Tessellation
- Purpose: Flip faces and vertices to create a dual mesh.

When to use it:
- Flip faces and vertices to create a dual mesh.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Examples:
- Example: Geometry Reference → Dual Mesh → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Inset Faces (`insetFaces`)

- Category: Tessellation
- Purpose: Inset mesh faces to create panels and borders.

When to use it:
- Inset mesh faces to create panels and borders.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Amount | number | 0.1 | Param: amount |  |
| Mode | string | uniform | Param: mode |  |
| Faces | any |  |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Inner Faces | any |  |
| Border Faces | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Amount | number | 0.1 | min 0, max 0.95, step 0.01 |  |
| Mode | select | uniform | options 2 |  |

Examples:
- Example: Geometry Reference → Inset Faces → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Extrude Faces (`extrudeFaces`)

- Category: Tessellation
- Purpose: Extrude selected faces along normals or a fixed axis.

When to use it:
- Extrude selected faces along normals or a fixed axis.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Distance | number | 0.1 | Param: distance |  |
| Mode | string | normal | Param: mode |  |
| Direction | vector |  |  |  |
| Faces | any |  |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Distance | number | 0.1 | step 0.05 |  |
| Mode | select | normal | options 2 |  |
| Direction X | number | 0 | step 0.1 |  |
| Direction Y | number | 1 | step 0.1 |  |
| Direction Z | number | 0 | step 0.1 |  |

Examples:
- Example: Geometry Reference → Extrude Faces → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Mesh Relax (`meshRelax`)

- Category: Tessellation
- Purpose: Smooth a mesh with Laplacian relaxation.

When to use it:
- Smooth a mesh with Laplacian relaxation.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Iterations | number | 2 | Param: iterations |  |
| Strength | number | 0.5 | Param: strength |  |
| Preserve Boundary | boolean | true | Param: preserveBoundary |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Iterations | number | 2 | min 1, max 20, step 1 |  |
| Strength | number | 0.5 | min 0, max 1, step 0.05 |  |
| Preserve Boundary | boolean | true |  |  |

Examples:
- Example: Geometry Reference → Mesh Relax → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Select Faces (`selectFaces`)

- Category: Tessellation
- Purpose: Select mesh faces by area, normal direction, or index pattern.

When to use it:
- Select mesh faces by area, normal direction, or index pattern.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Criteria | string | area | Param: criteria |  |
| Threshold | number | 0.1 | Param: threshold |  |
| Direction | vector |  |  |  |
| Step | number | 2 | Param: step |  |
| Offset | number | 0 | Param: offset |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Faces | any |  |
| Count | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Criteria | select | area | options 3 |  |
| Threshold | number | 0.1 | step 0.05 |  |
| Direction X | number | 0 | step 0.1 |  |
| Direction Y | number | 1 | step 0.1 |  |
| Direction Z | number | 0 | step 0.1 |  |
| Step | number | 2 | min 1, step 1 |  |
| Offset | number | 0 | min 0, step 1 |  |

Examples:
- Example: Geometry Reference → Select Faces → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Mesh Boolean (`meshBoolean`)

- Category: Tessellation
- Purpose: Combine two meshes with union, difference, or intersection.

When to use it:
- Combine two meshes with union, difference, or intersection.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | geometry |  | Required |  |
| B | geometry |  | Required |  |
| Operation | string | union | Param: operation |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |
| Operation | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Operation | select | union | options 3 |  |

Examples:
- Example: Geometry Reference → Mesh Boolean → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Triangulate Mesh (`triangulateMesh`)

- Category: Tessellation
- Purpose: Convert all faces to triangles.

When to use it:
- Convert all faces to triangles.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Examples:
- Example: Geometry Reference → Triangulate Mesh → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Geodesic Sphere (`geodesicSphere`)

- Category: Tessellation
- Purpose: Generate a geodesic sphere mesh.

When to use it:
- Generate a geodesic sphere mesh.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Radius | number | 1 | Param: radius |  |
| Frequency | number | 2 | Param: frequency |  |
| Base | string | icosahedron | Param: method |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Radius | number | 1 | min 0.01, step 0.1 |  |
| Frequency | number | 2 | min 1, max 12, step 1 |  |
| Base | select | icosahedron | options 2 |  |

Examples:
- Example: Number or Slider → Geodesic Sphere → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Voronoi Pattern (`voronoiPattern`)

- Category: Tessellation
- Purpose: Generate a Voronoi pattern from a boundary surface.

When to use it:
- Generate a Voronoi pattern from a boundary surface.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Boundary | geometry |  | Required |  |
| Cells | number | 30 | Param: numCells |  |
| Relax | number | 2 | Param: relaxIterations |  |
| Seeds | any |  |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Cells | number | 30 | min 1, max 200, step 1 |  |
| Relax Iterations | number | 2 | min 0, max 10, step 1 |  |

Examples:
- Example: Geometry Reference → Voronoi Pattern → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Hexagonal Tiling (`hexagonalTiling`)

- Category: Tessellation
- Purpose: Generate a hexagonal tiling over a surface plane.

When to use it:
- Generate a hexagonal tiling over a surface plane.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Surface | geometry |  | Required |  |
| Cell Size | number | 0.5 | Param: cellSize |  |
| Orientation | number | 0 | Param: orientation |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Cell Size | number | 0.5 | min 0.05, step 0.05 |  |
| Orientation | number | 0 | step 5 |  |

Examples:
- Example: Geometry Reference → Hexagonal Tiling → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Offset Pattern (`offsetPattern`)

- Category: Tessellation
- Purpose: Inset and extrude faces to create panelized patterns.

When to use it:
- Inset and extrude faces to create panelized patterns.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Inset | number | 0.1 | Param: insetAmount |  |
| Extrude | number | 0.1 | Param: extrudeDepth |  |
| Border | number | 0 | Param: borderWidth |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Inset Amount | number | 0.1 | min 0, max 0.95, step 0.01 |  |
| Extrude Depth | number | 0.1 | step 0.05 |  |
| Border Width | number | 0 | min 0, max 0.95, step 0.01 |  |

Examples:
- Example: Geometry Reference → Offset Pattern → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Mesh Repair (`meshRepair`)

- Category: Tessellation
- Purpose: Repair holes and weld close vertices.

When to use it:
- Repair holes and weld close vertices.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Fill Holes | boolean | true | Param: fillHoles |  |
| Weld Tol | number | 0.001 | Param: weldTolerance |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Fill Holes | boolean | true |  |  |
| Weld Tolerance | number | 0.001 | min 0, step 0.0005 |  |

Examples:
- Example: Geometry Reference → Mesh Repair → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Generate UVs (`meshUVs`)

- Category: Tessellation
- Purpose: Generate UV coordinates for a mesh.

When to use it:
- Generate UV coordinates for a mesh.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Mode | string | planar | Param: mode |  |
| Axis | vector |  |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mode | select | planar | options 3 |  |
| Axis X | number | 0 | step 0.1 |  |
| Axis Y | number | 1 | step 0.1 |  |
| Axis Z | number | 0 | step 0.1 |  |

Examples:
- Example: Geometry Reference → Generate UVs → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Mesh Decimate (`meshDecimate`)

- Category: Tessellation
- Purpose: Reduce mesh density via vertex clustering.

When to use it:
- Reduce mesh density via vertex clustering.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Target Faces | number | 1000 | Param: targetFaceCount |  |
| Cell Size | number | 0 | Param: cellSize |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Target Faces | number | 1000 | min 10, step 10 |  |
| Cell Size | number | 0 | min 0, step 0.05 |  |

Examples:
- Example: Geometry Reference → Mesh Decimate → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

### Quad Remesh (`quadRemesh`)

- Category: Tessellation
- Purpose: Merge adjacent triangles into quad-dominant faces.

When to use it:
- Merge adjacent triangles into quad-dominant faces.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mesh | geometry |  | Required |  |
| Max Angle | number | 15 | Param: maxAngle |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| Mesh Data | any |  |
| Tessellation | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Max Angle (deg) | number | 15 | min 0, max 90, step 1 |  |

Examples:
- Example: Geometry Reference → Quad Remesh → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Tessellation category for adjacent workflows.

---

## Interchange

### STL Import (`stlImport`)

- Category: Interchange
- Purpose: Import STL geometry into the scene.

When to use it:
- Import STL geometry into the scene.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mesh | geometry |  |
| File | string |  |
| Status | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| STL File | file |  |  |  |
| Import | boolean | false |  |  |
| Scale | number | 1 | min 0, step 0.001 |  |

Examples:
- Example: STL Import → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Interchange category for adjacent workflows.

---

### STL Export (`stlExport`)

- Category: Interchange
- Purpose: Export geometry to an STL file.

When to use it:
- Export geometry to an STL file.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required, Multi |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry List | any |  |
| Count | number |  |
| Status | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Export | boolean | false |  |  |
| File Name | string | lingua-export |  |  |
| Scale | number | 1 | min 0, step 0.001 |  |

Examples:
- Example: Geometry Reference → STL Export → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Interchange category for adjacent workflows.

---

## Basics

### Origin (`origin`)

- Category: Basics
- Purpose: Emit the world origin vector (0, 0, 0).

When to use it:
- Emit the world origin vector (0, 0, 0).

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Origin | vector |  |

Examples:
- Example: Origin → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Basics category for adjacent workflows.

---

### Unit X (`unitX`)

- Category: Basics
- Purpose: Emit the unit X axis vector.

When to use it:
- Emit the unit X axis vector.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| X | vector |  |

Examples:
- Example: Unit X → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Basics category for adjacent workflows.

---

### Unit Y (`unitY`)

- Category: Basics
- Purpose: Emit the unit Y axis vector.

When to use it:
- Emit the unit Y axis vector.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Y | vector |  |

Examples:
- Example: Unit Y → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Basics category for adjacent workflows.

---

### Unit Z (`unitZ`)

- Category: Basics
- Purpose: Emit the unit Z axis vector.

When to use it:
- Emit the unit Z axis vector.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Z | vector |  |

Examples:
- Example: Unit Z → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Basics category for adjacent workflows.

---

### Unit XYZ (`unitXYZ`)

- Category: Basics
- Purpose: Emit a unit vector with all components equal to one.

When to use it:
- Emit a unit vector with all components equal to one.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| XYZ | vector |  |

Examples:
- Example: Unit XYZ → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Basics category for adjacent workflows.

---

### Move Vector (`moveVector`)

- Category: Basics
- Purpose: Move a vector by an offset vector.

When to use it:
- Move a vector by an offset vector.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector | vector |  | Required |  |
| Offset | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |
| Offset | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector X | number | 0 | step 0.1 |  |
| Vector Y | number | 0 | step 0.1 |  |
| Vector Z | number | 0 | step 0.1 |  |
| Offset X | number | 1 | step 0.1 |  |
| Offset Y | number | 0 | step 0.1 |  |
| Offset Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Move Vector → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Basics category for adjacent workflows.

---

### Scale Vector (`scaleVector`)

- Category: Basics
- Purpose: Scale a vector by a scalar multiplier.

When to use it:
- Scale a vector by a scalar multiplier.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector | vector |  | Required |  |
| Scale | number | 1 | Param: scale |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |
| Scale | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector X | number | 1 | step 0.1 |  |
| Vector Y | number | 0 | step 0.1 |  |
| Vector Z | number | 0 | step 0.1 |  |
| Scale | number | 1 | step 0.1 |  |

Examples:
- Example: Vector Construct → Scale Vector → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Basics category for adjacent workflows.

---

## Lists

### List Create (`listCreate`)

- Category: Lists
- Purpose: Collect values into a list for downstream data operations.

When to use it:
- Collect values into a list for downstream data operations.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Items | any |  | Multi | Connect values to gather into the list. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| List | any |  |
| Count | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Items | string | 0, 1, 2 |  | Comma or newline separated values. |

Examples:
- Example: Panel → List Create → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Lists category for adjacent workflows.

---

### List Length (`listLength`)

- Category: Lists
- Purpose: Return the number of items in a list.

When to use it:
- Return the number of items in a list.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Length | number |  |

Examples:
- Example: Panel → List Length → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Lists category for adjacent workflows.

---

### List Item (`listItem`)

- Category: Lists
- Purpose: Pick a single item by index with clamp or wrap behavior.

When to use it:
- Pick a single item by index with clamp or wrap behavior.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |
| Index | number | 0 | Param: index |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Item | any |  |
| Index | number |  |
| Length | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Index | number | 0 | step 1 |  |
| Wrap | boolean | false |  | Wrap the index rather than clamping it. |

Examples:
- Example: Panel → List Item → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Lists category for adjacent workflows.

---

### List Index Of (`listIndexOf`)

- Category: Lists
- Purpose: Find the index of an item in a list using deep comparison.

When to use it:
- Find the index of an item in a list using deep comparison.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |
| Item | any | 0 | Param: itemText |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Index | number |  |
| Found | boolean |  |
| Item | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Item | string | 0 |  | Used when no Item input is connected. |

Examples:
- Example: Panel → List Index Of → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Lists category for adjacent workflows.

---

### List Partition (`listPartition`)

- Category: Lists
- Purpose: Split a list into partitions of fixed size and step.

When to use it:
- Split a list into partitions of fixed size and step.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |
| Size | number | 3 | Param: size |  |
| Step | number | 3 | Param: step |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Partitions | any |  |
| Count | number |  |
| Size | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 3 | min 1, step 1 |  |
| Step | number | 3 | min 1, step 1 |  |
| Keep Remainder | boolean | true |  |  |

Examples:
- Example: Panel → List Partition → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Lists category for adjacent workflows.

---

### List Flatten (`listFlatten`)

- Category: Lists
- Purpose: Flatten nested lists by a specified depth.

When to use it:
- Flatten nested lists by a specified depth.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |
| Depth | number | 2 | Param: depth |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| List | any |  |
| Length | number |  |
| Depth | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Depth | number | 2 | min 1, step 1 |  |

Examples:
- Example: Panel → List Flatten → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Lists category for adjacent workflows.

---

### List Slice (`listSlice`)

- Category: Lists
- Purpose: Extract a slice of a list with start, end, and step.

When to use it:
- Extract a slice of a list with start, end, and step.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |
| Start | number | 0 | Param: start |  |
| End | number | -1 | Param: end |  |
| Step | number | 1 | Param: step |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| List | any |  |
| Length | number |  |
| Start | number |  |
| End | number |  |
| Step | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Start | number | 0 | step 1 |  |
| End | number | -1 | step 1 |  |
| Step | number | 1 | min 1, step 1 |  |

Examples:
- Example: Panel → List Slice → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Lists category for adjacent workflows.

---

### List Reverse (`listReverse`)

- Category: Lists
- Purpose: Reverse the order of items in a list.

When to use it:
- Reverse the order of items in a list.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| List | any |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| List | any |  |
| Length | number |  |

Examples:
- Example: Panel → List Reverse → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Lists category for adjacent workflows.

---

## Ranges

### Range (`range`)

- Category: Ranges
- Purpose: Generate a numeric sequence from Start to End using Step.

When to use it:
- Generate a numeric sequence from Start to End using Step.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Start | number | 0 | Param: start |  |
| End | number | 10 | Param: end |  |
| Step | number | 1 | Param: step |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| List | any |  |
| Count | number |  |
| Step | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Start | number | 0 | step 1 |  |
| End | number | 10 | step 1 |  |
| Step | number | 1 | step 0.5 |  |

Examples:
- Example: Number or Slider → Range → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Ranges category for adjacent workflows.

---

### Linspace (`linspace`)

- Category: Ranges
- Purpose: Generate evenly spaced values between Start and End.

When to use it:
- Generate evenly spaced values between Start and End.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Start | number | 0 | Param: start |  |
| End | number | 1 | Param: end |  |
| Count | number | 5 | Param: count |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| List | any |  |
| Count | number |  |
| Step | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Start | number | 0 | step 0.5 |  |
| End | number | 1 | step 0.5 |  |
| Count | number | 5 | min 1, step 1 |  |

Examples:
- Example: Number or Slider → Linspace → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Ranges category for adjacent workflows.

---

### Remap (`remap`)

- Category: Ranges
- Purpose: Remap a value from one range to another.

When to use it:
- Remap a value from one range to another.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Value | number | 0 | Param: value |  |
| From Min | number | 0 | Param: sourceMin |  |
| From Max | number | 1 | Param: sourceMax |  |
| To Min | number | 0 | Param: targetMin |  |
| To Max | number | 10 | Param: targetMax |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |
| T | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Value | number | 0 | step 0.1 |  |
| From Min | number | 0 | step 0.1 |  |
| From Max | number | 1 | step 0.1 |  |
| To Min | number | 0 | step 0.1 |  |
| To Max | number | 10 | step 0.1 |  |
| Clamp | boolean | true |  |  |

Examples:
- Example: Number or Slider → Remap → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Ranges category for adjacent workflows.

---

### Random (`random`)

- Category: Ranges
- Purpose: Emit a deterministic random number from a seed.

When to use it:
- Emit a deterministic random number from a seed.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Seed | number | 1 | Param: seed |  |
| Min | number | 0 | Param: min |  |
| Max | number | 1 | Param: max |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |
| Raw | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Seed | number | 1 | step 1 |  |
| Min | number | 0 | step 0.1 |  |
| Max | number | 1 | step 0.1 |  |

Examples:
- Example: Number or Slider → Random → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Ranges category for adjacent workflows.

---

### Repeat (`repeat`)

- Category: Ranges
- Purpose: Repeat a value a specified number of times.

When to use it:
- Repeat a value a specified number of times.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Value | any | 0 | Param: valueText |  |
| Count | number | 5 | Param: count |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| List | any |  |
| Count | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Value | string | 0 |  |  |
| Count | number | 5 | min 1, max 2048, step 1 |  |

Examples:
- Example: Panel → Repeat → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Ranges category for adjacent workflows.

---

## Arrays

### Linear Array (`linearArray`)

- Category: Arrays
- Purpose: Duplicate points along a direction at a fixed spacing.

When to use it:
- Duplicate points along a direction at a fixed spacing.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Base | vector |  | Required |  |
| Direction | vector |  | Required |  |
| Spacing | number | 1 | Param: spacing |  |
| Count | number | 5 | Param: count |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Points | any |  |
| Count | number |  |
| Step | vector |  |
| Spacing | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Base X | number | 0 | step 0.1 |  |
| Base Y | number | 0 | step 0.1 |  |
| Base Z | number | 0 | step 0.1 |  |
| Direction X | number | 1 | step 0.1 |  |
| Direction Y | number | 0 | step 0.1 |  |
| Direction Z | number | 0 | step 0.1 |  |
| Spacing | number | 1 | step 0.1 |  |
| Count | number | 5 | min 1, max 2048, step 1 |  |
| Centered | boolean | false |  |  |

Examples:
- Example: Vector Construct → Linear Array → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Arrays category for adjacent workflows.

---

### Polar Array (`polarArray`)

- Category: Arrays
- Purpose: Distribute points around an axis with a sweep angle.

When to use it:
- Distribute points around an axis with a sweep angle.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Center | vector |  | Required |  |
| Axis | vector |  | Required |  |
| Reference | vector |  |  |  |
| Radius | number | 5 | Param: radius |  |
| Count | number | 8 | Param: count |  |
| Start | number | 0 | Param: startAngle |  |
| Sweep | number | 360 | Param: sweep |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Points | any |  |
| Angles | any |  |
| Count | number |  |
| Step | number |  |
| Radius | number |  |
| Axis | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Center X | number | 0 | step 0.1 |  |
| Center Y | number | 0 | step 0.1 |  |
| Center Z | number | 0 | step 0.1 |  |
| Axis X | number | 0 | step 0.1 |  |
| Axis Y | number | 0 | step 0.1 |  |
| Axis Z | number | 1 | step 0.1 |  |
| Reference X | number | 1 | step 0.1 |  |
| Reference Y | number | 0 | step 0.1 |  |
| Reference Z | number | 0 | step 0.1 |  |
| Radius | number | 5 | min 0, step 0.5 |  |
| Count | number | 8 | min 1, max 2048, step 1 |  |
| Start Angle | number | 0 | step 5 |  |
| Sweep | number | 360 | step 5 |  |
| Include End | boolean | false |  |  |

Examples:
- Example: Vector Construct → Polar Array → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Arrays category for adjacent workflows.

---

### Grid Array (`gridArray`)

- Category: Arrays
- Purpose: Create a rectangular grid of points from two axes.

When to use it:
- Create a rectangular grid of points from two axes.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Origin | vector |  | Required |  |
| X Axis | vector |  | Required |  |
| Y Axis | vector |  | Required |  |
| X Spacing | number | 1 | Param: xSpacing |  |
| Y Spacing | number | 1 | Param: ySpacing |  |
| X Count | number | 4 | Param: xCount |  |
| Y Count | number | 4 | Param: yCount |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Points | any |  |
| Grid | any |  |
| Count | number |  |
| X Count | number |  |
| Y Count | number |  |
| X Step | vector |  |
| Y Step | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Origin X | number | 0 | step 0.1 |  |
| Origin Y | number | 0 | step 0.1 |  |
| Origin Z | number | 0 | step 0.1 |  |
| X Axis X | number | 1 | step 0.1 |  |
| X Axis Y | number | 0 | step 0.1 |  |
| X Axis Z | number | 0 | step 0.1 |  |
| Y Axis X | number | 0 | step 0.1 |  |
| Y Axis Y | number | 1 | step 0.1 |  |
| Y Axis Z | number | 0 | step 0.1 |  |
| X Spacing | number | 1 | step 0.1 |  |
| Y Spacing | number | 1 | step 0.1 |  |
| X Count | number | 4 | min 1, max 2048, step 1 |  |
| Y Count | number | 4 | min 1, max 2048, step 1 |  |
| Centered | boolean | false |  |  |

Examples:
- Example: Vector Construct → Grid Array → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Arrays category for adjacent workflows.

---

### Geometry Array (`geometryArray`)

- Category: Arrays
- Purpose: Duplicate geometry in linear, grid, or polar patterns.

When to use it:
- Duplicate geometry in linear, grid, or polar patterns.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |
| Mode | string | linear | Param: mode |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Source | geometry |  |
| Geometry List | any |  |
| Count | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mode | select | linear | options 3 |  |
| Direction X | number | 1 | step 0.1 |  |
| Direction Y | number | 0 | step 0.1 |  |
| Direction Z | number | 0 | step 0.1 |  |
| Spacing | number | 1 | min 0, step 0.1 |  |
| Count | number | 4 | min 1, max 64, step 1 |  |
| X Axis X | number | 1 | step 0.1 |  |
| X Axis Y | number | 0 | step 0.1 |  |
| X Axis Z | number | 0 | step 0.1 |  |
| Y Axis X | number | 0 | step 0.1 |  |
| Y Axis Y | number | 1 | step 0.1 |  |
| Y Axis Z | number | 0 | step 0.1 |  |
| X Spacing | number | 1 | min 0, step 0.1 |  |
| Y Spacing | number | 1 | min 0, step 0.1 |  |
| X Count | number | 3 | min 1, max 32, step 1 |  |
| Y Count | number | 3 | min 1, max 32, step 1 |  |
| Center X | number | 0 | step 0.1 |  |
| Center Y | number | 0 | step 0.1 |  |
| Center Z | number | 0 | step 0.1 |  |
| Axis X | number | 0 | step 0.1 |  |
| Axis Y | number | 1 | step 0.1 |  |
| Axis Z | number | 0 | step 0.1 |  |
| Start Angle | number | 0 | step 5 |  |
| Sweep | number | 360 | step 5 |  |
| Include End | boolean | false |  |  |

Examples:
- Example: Geometry Reference → Geometry Array → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Arrays category for adjacent workflows.

---

## Measurement

### Measurement (`measurement`)

- Category: Measurement
- Purpose: Measure length, area, volume, or bounds.

When to use it:
- Measure length, area, volume, or bounds.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |
| Length | number |  |
| Area | number |  |
| Volume | number |  |
| Bounds Min | vector |  |
| Bounds Max | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Property | select | length | options 6 |  |

Examples:
- Example: Geometry Reference → Measurement → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Measurement category for adjacent workflows.

---

### Dimensions (`dimensions`)

- Category: Measurement
- Purpose: Measure bounding box dimensions for geometry.

When to use it:
- Measure bounding box dimensions for geometry.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Size | vector |  |
| Width | number |  |
| Height | number |  |
| Depth | number |  |
| Diagonal | number |  |
| Bounds Min | vector |  |
| Bounds Max | vector |  |

Examples:
- Example: Geometry Reference → Dimensions → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Measurement category for adjacent workflows.

---

## Signals

### Sine Wave (`sineWave`)

- Category: Signals
- Purpose: Generate a sine wave signal.

When to use it:
- Generate a sine wave signal.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| T | number | 0 |  |  |
| Amplitude | number | 1 |  |  |
| Frequency | number | 1 |  |  |
| Phase | number | 0 |  |  |
| Offset | number | 0 |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |
| T | number |  |

Examples:
- Example: Number or Slider → Sine Wave → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Signals category for adjacent workflows.

---

### Cosine Wave (`cosineWave`)

- Category: Signals
- Purpose: Generate a cosine wave signal.

When to use it:
- Generate a cosine wave signal.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| T | number | 0 |  |  |
| Amplitude | number | 1 |  |  |
| Frequency | number | 1 |  |  |
| Phase | number | 0 |  |  |
| Offset | number | 0 |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |
| T | number |  |

Examples:
- Example: Number or Slider → Cosine Wave → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Signals category for adjacent workflows.

---

### Sawtooth Wave (`sawtoothWave`)

- Category: Signals
- Purpose: Generate a sawtooth wave signal in the -1 to 1 range.

When to use it:
- Generate a sawtooth wave signal in the -1 to 1 range.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| T | number | 0 |  |  |
| Amplitude | number | 1 |  |  |
| Frequency | number | 1 |  |  |
| Phase | number | 0 |  |  |
| Offset | number | 0 |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |
| T | number |  |

Examples:
- Example: Number or Slider → Sawtooth Wave → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Signals category for adjacent workflows.

---

### Triangle Wave (`triangleWave`)

- Category: Signals
- Purpose: Generate a triangle wave signal in the -1 to 1 range.

When to use it:
- Generate a triangle wave signal in the -1 to 1 range.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| T | number | 0 |  |  |
| Amplitude | number | 1 |  |  |
| Frequency | number | 1 |  |  |
| Phase | number | 0 |  |  |
| Offset | number | 0 |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |
| T | number |  |

Examples:
- Example: Number or Slider → Triangle Wave → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Signals category for adjacent workflows.

---

### Square Wave (`squareWave`)

- Category: Signals
- Purpose: Generate a square wave signal with adjustable duty cycle.

When to use it:
- Generate a square wave signal with adjustable duty cycle.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| T | number | 0 |  |  |
| Amplitude | number | 1 |  |  |
| Frequency | number | 1 |  |  |
| Phase | number | 0 |  |  |
| Offset | number | 0 |  |  |
| Duty | number | 0.5 |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Value | number |  |
| T | number |  |

Examples:
- Example: Number or Slider → Square Wave → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Signals category for adjacent workflows.

---

## Primitives

### Point Generator (`point`)

- Category: Primitives
- Purpose: Create a point from coordinates.

When to use it:
- Create a point from coordinates.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| X | number | 0 | Param: x |  |
| Y | number | 0 | Param: y |  |
| Z | number | 0 | Param: z |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Point | geometry |  |
| Position | vector |  |
| X | number |  |
| Y | number |  |
| Z | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| X | number | 0 | step 0.1 |  |
| Y | number | 0 | step 0.1 |  |
| Z | number | 0 | step 0.1 |  |

Examples:
- Example: Number or Slider → Point Generator → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Point Cloud (`pointCloud`)

- Category: Primitives
- Purpose: Create a point cloud from a list of points or geometry.

When to use it:
- Create a point cloud from a list of points or geometry.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | any |  | Multi | Accepts Vec3 objects, [x,y,z] arrays, flat XYZ lists, or geometry ids. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Geometry List | any |  |
| Points | any |  |
| Count | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | textarea |  |  |  |
| Max Points | number | 256 | min 1, max 2048, step 1 |  |

Examples:
- Example: Panel → Point Cloud → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Primitive (`primitive`)

- Category: Primitives
- Purpose: Create a parametric primitive shape.

When to use it:
- Create a parametric primitive shape.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Kind | string | box | Param: kind |  |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Kind | string |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Kind | select | box | options 33 |  |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Text Note → Primitive → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Box Builder (`box`)

- Category: Primitives
- Purpose: Create a box primitive.

When to use it:
- Create a box primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Corner | any |  |  |  |
| Width | number | 1 | Param: boxWidth |  |
| Height | number | 1 | Param: boxHeight |  |
| Depth | number | 1 | Param: boxDepth |  |
| Center Mode | boolean | false | Param: centerMode |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Box | geometry |  |
| Volume | number |  |
| Corner | vector |  |
| Width | number |  |
| Height | number |  |
| Depth | number |  |
| Center Mode | boolean |  |
| Representation | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Corner X | number | 0 | step 0.1 |  |
| Corner Y | number | 0 | step 0.1 |  |
| Corner Z | number | 0 | step 0.1 |  |
| Representation | select | mesh | options 2 |  |
| Width | number | 1 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Depth | number | 1 | min 0.01, step 0.1 |  |
| Center Mode | boolean | false |  |  |

Examples:
- Example: Panel → Box Builder → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Sphere (`sphere`)

- Category: Primitives
- Purpose: Create a sphere primitive.

When to use it:
- Create a sphere primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Center | any |  |  |  |
| Radius | number | 0.5 | Param: sphereRadius |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Sphere | geometry |  |
| Volume | number |  |
| Center | vector |  |
| Radius | number |  |
| Representation | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Center X | number | 0 | step 0.1 |  |
| Center Y | number | 0 | step 0.1 |  |
| Center Z | number | 0 | step 0.1 |  |
| Representation | select | mesh | options 2 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |

Examples:
- Example: Panel → Sphere → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Cylinder (`cylinder`)

- Category: Primitives
- Purpose: Create a Cylinder primitive.

When to use it:
- Create a Cylinder primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Cylinder | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Cylinder → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Torus (`torus`)

- Category: Primitives
- Purpose: Create a Torus primitive.

When to use it:
- Create a Torus primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Torus | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Torus → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Pyramid (`pyramid`)

- Category: Primitives
- Purpose: Create a Pyramid primitive.

When to use it:
- Create a Pyramid primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Pyramid | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Pyramid → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Tetrahedron (`tetrahedron`)

- Category: Primitives
- Purpose: Create a Tetrahedron primitive.

When to use it:
- Create a Tetrahedron primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Tetrahedron | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Tetrahedron → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Octahedron (`octahedron`)

- Category: Primitives
- Purpose: Create a Octahedron primitive.

When to use it:
- Create a Octahedron primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Octahedron | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Octahedron → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Icosahedron (`icosahedron`)

- Category: Primitives
- Purpose: Create a Icosahedron primitive.

When to use it:
- Create a Icosahedron primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Icosahedron | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Icosahedron → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Dodecahedron (`dodecahedron`)

- Category: Primitives
- Purpose: Create a Dodecahedron primitive.

When to use it:
- Create a Dodecahedron primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Dodecahedron | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Dodecahedron → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Hemisphere (`hemisphere`)

- Category: Primitives
- Purpose: Create a Hemisphere primitive.

When to use it:
- Create a Hemisphere primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Hemisphere | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Hemisphere → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Capsule (`capsule`)

- Category: Primitives
- Purpose: Create a Capsule primitive.

When to use it:
- Create a Capsule primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Capsule | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Capsule → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Disk (`disk`)

- Category: Primitives
- Purpose: Create a Disk primitive.

When to use it:
- Create a Disk primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Disk | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Disk → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Ring / Annulus (`ring`)

- Category: Primitives
- Purpose: Create a Ring / Annulus primitive.

When to use it:
- Create a Ring / Annulus primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Ring / Annulus | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Ring / Annulus → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Triangular Prism (`triangular-prism`)

- Category: Primitives
- Purpose: Create a Triangular Prism primitive.

When to use it:
- Create a Triangular Prism primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Triangular Prism | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Triangular Prism → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Hexagonal Prism (`hexagonal-prism`)

- Category: Primitives
- Purpose: Create a Hexagonal Prism primitive.

When to use it:
- Create a Hexagonal Prism primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Hexagonal Prism | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Hexagonal Prism → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Pentagonal Prism (`pentagonal-prism`)

- Category: Primitives
- Purpose: Create a Pentagonal Prism primitive.

When to use it:
- Create a Pentagonal Prism primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Pentagonal Prism | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Pentagonal Prism → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Torus Knot (`torus-knot`)

- Category: Primitives
- Purpose: Create a Torus Knot primitive.

When to use it:
- Create a Torus Knot primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Torus Knot | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Torus Knot → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Utah Teapot (`utah-teapot`)

- Category: Primitives
- Purpose: Create a Utah Teapot primitive.

When to use it:
- Create a Utah Teapot primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Utah Teapot | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Utah Teapot → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Frustum (`frustum`)

- Category: Primitives
- Purpose: Create a Frustum primitive.

When to use it:
- Create a Frustum primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Frustum | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Frustum → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Mobius Strip (`mobius-strip`)

- Category: Primitives
- Purpose: Create a Mobius Strip primitive.

When to use it:
- Create a Mobius Strip primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Mobius Strip | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Mobius Strip → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Ellipsoid (`ellipsoid`)

- Category: Primitives
- Purpose: Create a Ellipsoid primitive.

When to use it:
- Create a Ellipsoid primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Ellipsoid | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Ellipsoid → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Wedge (`wedge`)

- Category: Primitives
- Purpose: Create a Wedge primitive.

When to use it:
- Create a Wedge primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Wedge | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Wedge → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Spherical Cap / Dome (`spherical-cap`)

- Category: Primitives
- Purpose: Create a Spherical Cap / Dome primitive.

When to use it:
- Create a Spherical Cap / Dome primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Spherical Cap / Dome | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Spherical Cap / Dome → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Bipyramid (`bipyramid`)

- Category: Primitives
- Purpose: Create a Bipyramid primitive.

When to use it:
- Create a Bipyramid primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Bipyramid | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Bipyramid → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Rhombic Dodecahedron (`rhombic-dodecahedron`)

- Category: Primitives
- Purpose: Create a Rhombic Dodecahedron primitive.

When to use it:
- Create a Rhombic Dodecahedron primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Rhombic Dodecahedron | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Rhombic Dodecahedron → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Truncated Cube (`truncated-cube`)

- Category: Primitives
- Purpose: Create a Truncated Cube primitive.

When to use it:
- Create a Truncated Cube primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Truncated Cube | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Truncated Cube → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Truncated Octahedron (`truncated-octahedron`)

- Category: Primitives
- Purpose: Create a Truncated Octahedron primitive.

When to use it:
- Create a Truncated Octahedron primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Truncated Octahedron | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Truncated Octahedron → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Truncated Icosahedron (`truncated-icosahedron`)

- Category: Primitives
- Purpose: Create a Truncated Icosahedron primitive.

When to use it:
- Create a Truncated Icosahedron primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Truncated Icosahedron | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Truncated Icosahedron → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Pipe / Hollow Cylinder (`pipe`)

- Category: Primitives
- Purpose: Create a Pipe / Hollow Cylinder primitive.

When to use it:
- Create a Pipe / Hollow Cylinder primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Pipe / Hollow Cylinder | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Pipe / Hollow Cylinder → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Superellipsoid (`superellipsoid`)

- Category: Primitives
- Purpose: Create a Superellipsoid primitive.

When to use it:
- Create a Superellipsoid primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Superellipsoid | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Superellipsoid → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Hyperbolic Paraboloid (`hyperbolic-paraboloid`)

- Category: Primitives
- Purpose: Create a Hyperbolic Paraboloid primitive.

When to use it:
- Create a Hyperbolic Paraboloid primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Hyperbolic Paraboloid | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Hyperbolic Paraboloid → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### Geodesic Dome (`geodesic-dome`)

- Category: Primitives
- Purpose: Create a Geodesic Dome primitive.

When to use it:
- Create a Geodesic Dome primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geodesic Dome | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → Geodesic Dome → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

### One-Sheet Hyperboloid (`one-sheet-hyperboloid`)

- Category: Primitives
- Purpose: Create a One-Sheet Hyperboloid primitive.

When to use it:
- Create a One-Sheet Hyperboloid primitive.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Size | number | 1 | Param: size |  |
| Radius | number | 0.5 | Param: radius |  |
| Height | number | 1 | Param: height |  |
| Tube | number | 0.2 | Param: tube |  |
| Inner Radius | number | 0.25 | Param: innerRadius |  |
| Top Radius | number | 0.2 | Param: topRadius |  |
| Cap Height | number | 0.4 | Param: capHeight |  |
| Detail | number | 1 | Param: detail |  |
| Exponent 1 | number | 2 | Param: exponent1 |  |
| Exponent 2 | number | 2 | Param: exponent2 |  |
| Radial Segments | number | 24 | Param: radialSegments |  |
| Tubular Segments | number | 36 | Param: tubularSegments |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| One-Sheet Hyperboloid | geometry |  |
| Representation | string |  |
| Params | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Representation | select | mesh | options 2 |  |
| Size | number | 1 | min 0.01, step 0.1 |  |
| Radius | number | 0.5 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |
| Tube | number | 0.2 | min 0.01, step 0.05 |  |
| Inner Radius | number | 0.25 | min 0.01, step 0.05 |  |
| Top Radius | number | 0.2 | min 0.01, step 0.05 |  |
| Cap Height | number | 0.4 | min 0.01, step 0.05 |  |
| Detail | number | 1 | min 0, max 6, step 1 |  |
| Exponent 1 | number | 2 | min 0.2, step 0.1 |  |
| Exponent 2 | number | 2 | min 0.2, step 0.1 |  |
| Radial Segments | number | 24 | min 6, max 128, step 1 |  |
| Tubular Segments | number | 36 | min 6, max 128, step 1 |  |

Examples:
- Example: Number or Slider → One-Sheet Hyperboloid → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Primitives category for adjacent workflows.

---

## Curves

### Line (`line`)

- Category: Curves
- Purpose: Create a straight line between two points.

When to use it:
- Create a straight line between two points.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Start | any |  |  |  |
| End | any |  |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Line | geometry |  |
| Points | any |  |
| Start | vector |  |
| End | vector |  |
| Length | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | textarea | 0 0 0  1 0 0 |  |  |

Examples:
- Example: Panel → Line → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Curves category for adjacent workflows.

---

### Rectangle (`rectangle`)

- Category: Curves
- Purpose: Create a rectangle on the construction plane.

When to use it:
- Create a rectangle on the construction plane.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Center | vector |  |  |  |
| Width | number | 1 | Param: width |  |
| Height | number | 1 | Param: height |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Rectangle | geometry |  |
| Center | vector |  |
| Width | number |  |
| Height | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Center X | number | 0 | step 0.1 |  |
| Center Y | number | 0 | step 0.1 |  |
| Center Z | number | 0 | step 0.1 |  |
| Width | number | 1 | min 0.01, step 0.1 |  |
| Height | number | 1 | min 0.01, step 0.1 |  |

Examples:
- Example: Vector Construct → Rectangle → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Curves category for adjacent workflows.

---

### Polyline (`polyline`)

- Category: Curves
- Purpose: Connect points into a polyline.

When to use it:
- Connect points into a polyline.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | any |  | Multi |  |
| Closed | boolean | false | Param: closed |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Polyline | geometry |  |
| Points | any |  |
| Closed | boolean |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | textarea | 0 0 0  1 0 0  1 0 1 |  |  |
| Closed | boolean | false |  |  |

Examples:
- Example: Panel → Polyline → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Curves category for adjacent workflows.

---

## NURBS

### Circle (`circle`)

- Category: NURBS
- Purpose: Create a circular curve on the construction plane.

When to use it:
- Create a circular curve on the construction plane.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Center | vector |  |  |  |
| Radius | number | 1 | Param: radius |  |
| Segments | number | 48 | Param: segments |  |
| Normal | vector |  |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Circle | geometry |  |
| Center | vector |  |
| Radius | number |  |
| Segments | number |  |
| Normal | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Center X | number | 0 | step 0.1 |  |
| Center Y | number | 0 | step 0.1 |  |
| Center Z | number | 0 | step 0.1 |  |
| Radius | number | 1 | min 0.01, step 0.1 |  |
| Segments | number | 48 | min 12, max 128, step 2 |  |
| Normal X | number | 0 | step 0.1 |  |
| Normal Y | number | 1 | step 0.1 |  |
| Normal Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Circle → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the NURBS category for adjacent workflows.

---

### Arc (`arc`)

- Category: NURBS
- Purpose: Create a circular arc through three points.

When to use it:
- Create a circular arc through three points.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Start | any |  |  |  |
| End | any |  |  |  |
| Through | any |  |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Arc | geometry |  |
| Start | vector |  |
| End | vector |  |
| Through | vector |  |
| Points | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | textarea | 0 0 0  1 0 0  0.5 0 0.6 |  |  |

Examples:
- Example: Panel → Arc → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the NURBS category for adjacent workflows.

---

### Curve (`curve`)

- Category: NURBS
- Purpose: Create a smooth curve through points.

When to use it:
- Create a smooth curve through points.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | any |  | Multi |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Curve | geometry |  |
| Points | any |  |
| Degree | number |  |
| Resolution | number |  |
| Closed | boolean |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | textarea | 0 0 0  1 0 0  1 0 1  0 0 1 |  |  |
| Degree | number | 3 | min 1, max 3, step 1 | Curve degree (1=linear, 3=cubic). |
| Resolution | number | 64 | min 16, max 256, step 4 | Number of sampled points for display. |
| Closed | boolean | false |  | Close the curve into a loop. |

Examples:
- Example: Panel → Curve → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the NURBS category for adjacent workflows.

---

## BREP

### Surface (`surface`)

- Category: BREP
- Purpose: Generate a surface from boundary curves.

When to use it:
- Generate a surface from boundary curves.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Boundary | any |  | Multi |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Surface | geometry |  |
| Points | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Points | textarea | 0 0 0  1 0 0  1 0 1  0 0 1 |  |  |

Examples:
- Example: Panel → Surface → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the BREP category for adjacent workflows.

---

### Loft (`loft`)

- Category: BREP
- Purpose: Create a surface through a series of section curves.

When to use it:
- Create a surface through a series of section curves.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Sections | geometry |  | Required, Multi |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Loft | geometry |  |
| Mesh | any |  |
| Sections | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Degree | number | 3 | min 1, max 3, step 1 |  |
| Closed | boolean | false |  |  |
| Section Closed | boolean | false |  |  |
| Samples | number | 24 | min 8, max 128, step 1 |  |

Examples:
- Example: Geometry Reference → Loft → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the BREP category for adjacent workflows.

---

### Extrude (`extrude`)

- Category: BREP
- Purpose: Extrude a profile curve along a direction.

When to use it:
- Extrude a profile curve along a direction.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Profile | geometry |  | Required |  |
| Distance | number | 1 | Param: distance |  |
| Direction | vector |  |  |  |
| Capped | boolean | true | Param: capped |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Extrude | geometry |  |
| Mesh | any |  |
| Distance | number |  |
| Direction | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Distance | number | 1 | min 0, step 0.1 |  |
| Direction X | number | 0 | step 0.1 |  |
| Direction Y | number | 1 | step 0.1 |  |
| Direction Z | number | 0 | step 0.1 |  |
| Capped | boolean | true |  |  |

Examples:
- Example: Geometry Reference → Extrude → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the BREP category for adjacent workflows.

---

### Pipe (`pipeSweep`)

- Category: BREP
- Purpose: Generate pipe meshes from segments, paths, or curve geometry.

When to use it:
- Generate pipe meshes from segments, paths, or curve geometry.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Segments | any |  |  |  |
| Path | any |  |  |  |
| Geometry | geometry |  | Multi |  |
| Radius | number | 0.1 | Param: radius |  |
| Inner Radius | number | 0 | Param: innerRadius |  |
| Radial Segments | number | 16 | Param: radialSegments |  |
| Closed Path | boolean | false | Param: closed |  |
| Joint Radius | number | 0 | Param: jointRadius |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Pipe | geometry |  |
| Mesh | any |  |
| Segments | number |  |
| Joints | number |  |
| Joint Points | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Radius | number | 0.1 | min 0, step 0.05 |  |
| Inner Radius | number | 0 | min 0, step 0.05 |  |
| Radial Segments | number | 16 | min 6, max 64, step 2 |  |
| Closed Path | boolean | false |  |  |
| Joint Radius | number | 0 | min 0, step 0.05 |  |

Examples:
- Example: Panel → Pipe → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the BREP category for adjacent workflows.

---

### Boolean (`boolean`)

- Category: BREP
- Purpose: Combine two solids with union, difference, or intersection.

When to use it:
- Combine two solids with union, difference, or intersection.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | geometry |  | Required |  |
| B | geometry |  | Required |  |
| Operation | string | union | Param: operation |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | geometry |  |
| Mesh | any |  |
| Operation | string |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Operation | select | union | options 3 |  |

Examples:
- Example: Geometry Reference → Boolean → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the BREP category for adjacent workflows.

---

### Offset Surface (`offsetSurface`)

- Category: BREP
- Purpose: Offset a surface along its normals by a distance.

When to use it:
- Offset a surface along its normals by a distance.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Surface | geometry |  | Required |  |
| Distance | number | 0.5 | Param: distance |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Surface | geometry |  |
| Distance | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Distance | number | 0.5 | step 0.1 |  |

Examples:
- Example: Geometry Reference → Offset Surface → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the BREP category for adjacent workflows.

---

## Voxel

### Voxelize Geometry (`voxelizeGeometry`)

- Category: Voxel / Voxel Utilities
- Purpose: Convert geometry into a voxel grid domain.

When to use it:
- Convert geometry into a voxel grid domain.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required | Geometry to voxelize into a cubic grid. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Grid | any | Voxel grid with bounds, cell size, and densities. |
| Density | any | Flattened density array in X-fast order. |
| Resolution | number | Grid resolution per axis. |
| Cell | vector | Size of a single voxel cell. |
| Bounds Min | vector | Minimum corner of the voxel bounds. |
| Bounds Max | vector | Maximum corner of the voxel bounds. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Resolution | number | 12 | min 4, max 36, step 1 | Number of voxels per axis. Higher values capture more detail. |
| Padding | number | 0.2 | min 0, max 10, step 0.1 | Extra space added around the geometry bounds. |
| Mode | select | solid | options 2 | Solid fills the bounds; Surface marks cells near samples. |
| Surface Thickness | number | 1 | min 0, max 4, step 1 | Voxel layers painted around surface samples. |

Examples:
- Example: Geometry Reference → Voxelize Geometry → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Voxel category for adjacent workflows.

---

### Extract Isosurface (`extractIsosurface`)

- Category: Voxel / Voxel Utilities
- Purpose: Create a mesh from a voxel density field.

When to use it:
- Create a mesh from a voxel density field.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Voxel Grid | any |  | Required | Voxel grid or density array to extract from. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry | Geometry id that receives the extracted mesh. |
| Mesh | any | Generated render mesh for the isosurface. |
| Cells | number | Total voxels evaluated in the grid. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Iso Value | number | 0.5 | min 0, max 1, step 0.05 | Density threshold for extracting occupied cells. |
| Resolution | number | 12 | min 4, max 36, step 1 | Resolution used when the input is a raw density list. |

Examples:
- Example: Panel → Extract Isosurface → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Voxel category for adjacent workflows.

---

### Topology Optimize (`topologyOptimize`)

- Category: Voxel / Voxel Utilities
- Purpose: Authoritative topology optimization settings and progress metadata.

When to use it:
- Authoritative topology optimization settings and progress metadata.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Domain | geometry |  |  | Optional design domain reference. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Domain | geometry | Domain geometry id forwarded from input. |
| VF | number | Target solid volume fraction (0-1). |
| Penalty | number | SIMP penalty exponent for stiffness. |
| Radius | number | Neighborhood radius for density filtering. |
| Max Iter | number | Maximum solver iterations. |
| Tolerance | number | Convergence tolerance for stopping criteria. |
| Iter | number | Current iteration index from progress tracking. |
| Objective | number | Objective value (lower is better). |
| Constraint | number | Volume constraint residual. |
| Status | string | Status string (waiting-for-domain, missing-domain, complete). |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Volume Fraction | number | 0.4 | min 0.05, max 0.95, step 0.01 | Target solid volume fraction (0-1). |
| Penalty Exponent | number | 3 | min 1, max 6, step 0.1 | SIMP penalty exponent for stiffness. |
| Filter Radius | number | 1.5 | min 0, max 8, step 0.1 | Neighborhood radius for density smoothing. |
| Max Iterations | number | 80 | min 1, max 400, step 1 | Maximum number of optimization steps. |
| Convergence Tolerance | number | 0.001 | min 0.000001, max 0.1, step 0.0005 | Stop when changes fall below this value. |

Examples:
- Example: Geometry Reference → Topology Optimize → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Voxel category for adjacent workflows.

---

### Topology Solver (`topologySolver`)

- Category: Voxel / Voxel Utilities
- Purpose: Fast density solver prototype for a geometry domain.

When to use it:
- Fast density solver prototype for a geometry domain.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Domain | geometry |  |  | Geometry domain used to fit bounds when no grid is supplied. |
| Voxel Grid | any |  |  | Optional voxel grid domain. Bounds are reused; resolution snaps to cubic max. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Density | any | Solved density field in X-fast order. |
| Voxel Grid | any | Voxel grid with updated densities. |
| Best | number | Best score (1 - objective). |
| Objective | number | Objective value (lower is better). |
| Constraint | number | Volume constraint residual. |
| Iterations | number | Iterations executed. |
| Resolution | number | Resolution used for the solve. |
| Status | string | Solver status string. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Volume Fraction | number | 0.4 | min 0.05, max 0.95, step 0.01 | Target solid volume fraction (0-1). |
| Penalty Exponent | number | 3 | min 1, max 6, step 0.1 | SIMP penalty exponent for stiffness. |
| Filter Radius | number | 2 | min 0, max 8, step 0.1 | Neighborhood radius in voxels (0 disables filtering). |
| Iterations | number | 40 | min 1, max 120, step 1 | Solver iterations to run. |
| Resolution | number | 12 | min 4, max 36, step 1 | Grid resolution when no voxel grid input is provided. |

Examples:
- Example: Geometry Reference → Topology Solver → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Voxel category for adjacent workflows.

---

## Solver

### Ἐπιλύτης Βιολογίας (`biologicalSolver`)

- Category: Solver / Biological Solver
- Display: Greek: Ἐπιλύτης Βιολογίας | English: Branching Growth | Romanization: Epilýtēs Biologías
- Purpose: Goal-weighted evolutionary search over vector genomes with a fast fitness proxy.

When to use it:
- Goal-weighted evolutionary search over vector genomes with a fast fitness proxy.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Goals | goal |  | Multi | Biological goal specifications. |
| Domain | geometry |  |  | Optional geometry reference that seeds the search. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Best | number | Best fitness score found. |
| Genome | vector | Best genome vector. |
| Eval | number | Total fitness evaluations performed. |
| Population | number | Population size used. |
| Generations | number | Generations executed. |
| Mutation | number | Mutation rate used. |
| Status | string | Solver status string. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Fitness Bias | number | 0 | step 0.1 | Bias term added to the fitness function. |
| Population | number | 32 | min 8, max 96, step 1 | Number of genomes per generation. |
| Generations | number | 24 | min 1, max 80, step 1 | Number of generations to evolve. |
| Mutation Rate | number | 0.18 | min 0.01, max 0.95, step 0.01 | Mutation probability per gene. |
| Seed | number | 1 | step 1 | Deterministic seed for repeatable runs. |

Examples:
- Example: Goal Node → Ἐπιλύτης Βιολογίας → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Connecting goals from the wrong solver family.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Solver category for adjacent workflows.

---

### Ἐπιλύτης Χημείας (`chemistrySolver`)

- Category: Solver / Chemistry Solver
- Display: Greek: Ἐπιλύτης Χημείας | English: Chemistry Solver | Romanization: Epilýtēs Chēmeías
- Purpose: Material transmutation solver for functionally graded blends.

When to use it:
- Material transmutation solver for functionally graded blends.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Domain | geometry |  | Required | Spatial domain for material distribution. |
| Materials | any |  | Multi | Material assignment list or geometry ids. |
| Materials Text | string |  |  | Optional JSON or line-based material assignments. |
| Seeds | any |  | Multi | Optional seed points or geometry ids to bias nucleation. |
| Goals | goal |  | Multi | Chemistry goal specifications. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry | Preview geometry id. |
| Preview Mesh | any | Preview mesh generated from the material field. |
| Particles | any | Particle cloud with material concentrations. |
| Field | any | Voxel field with per-material channels. |
| History | any | Energy history per iteration. |
| Best State | any | Snapshot of the lowest-energy particle state. |
| Materials | any | Resolved material library used for this solve. |
| Energy | number | Total energy value from the latest iteration. |
| Status | string | Solver status string. |
| Diagnostics | any | Solver diagnostics and warnings. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Particle Count | number | 2000 | min 100, max 20000, step 50 |  |
| Iterations | number | 60 | min 1, max 500, step 1 |  |
| Field Resolution | number | 32 | min 8, max 96, step 1 |  |
| Iso Value | number | 0.35 | min 0, max 1, step 0.05 |  |
| Convergence Tolerance | number | 0.001 | min 0.00001, max 0.05, step 0.0001 |  |
| Blend Strength | number | 0.6 | min 0, max 2, step 0.05 |  |
| History Limit | number | 200 | min 10, max 1000, step 10 |  |
| Seed | number | 1 | step 1 |  |
| Material Order | string | Steel, Ceramic, Glass |  |  |
| Materials | textarea |  |  | Optional JSON or line-based material assignments. |
| Seed Material | string | Steel |  |  |
| Seed Strength | number | 0.85 | min 0, max 1, step 0.05 |  |
| Seed Radius | number | 0.25 | min 0, max 10, step 0.05 |  |
| Seeds | textarea |  |  |  |

Examples:
- Example: Geometry Reference → Ἐπιλύτης Χημείας → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Connecting goals from the wrong solver family.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Solver category for adjacent workflows.

---

### Ἐπιλύτης Φυσικῆς (`physicsSolver`)

- Category: Solver / Physics Solver
- Display: Greek: Ἐπιλύτης Φυσικῆς | English: Physics Solver | Romanization: Epilýtēs Physikês
- Purpose: Computes physical equilibrium states for structural systems.

When to use it:
- Computes physical equilibrium states for structural systems.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Goals | goal |  | Required, Multi | Goal specifications for physics solver. |
| Base Mesh | geometry |  | Required | Structural mesh to analyze. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry | Deformed geometry id. |
| Deformed Mesh | any | Deformed mesh data. |
| Result | solverResult | Solver result payload. |
| Animation | animation | Animation frames for dynamic or modal analysis. |
| Stress Field | any | Per-element stress values. |
| Displacements | any | Per-vertex displacement vectors. |
| Diagnostics | any | Solver diagnostics and performance metrics. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Max Iterations | number | 1000 | min 10, max 10000 |  |
| Convergence Tolerance | number | 0.000001 | min 1e-12, max 0.01 |  |
| Analysis Type | select | static | options 3 |  |
| Animation Frames | number | 60 | min 10, max 300 |  |
| Time Step (s) | number | 0.01 | min 0.001, max 1 |  |
| Max Deformation | number | 10 | min 0.1, max 100 |  |
| Max Stress (Pa) | number | 1000000000 | min 1000000, max 1000000000000 |  |
| Use GPU | boolean | true |  |  |
| Chunk Size | number | 1000 | min 100, max 10000 |  |

Examples:
- Example: Goal Node → Ἐπιλύτης Φυσικῆς → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Connecting goals from the wrong solver family.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Solver category for adjacent workflows.

---

### Biological Solver (`biologicalEvolutionSolver`)

- Category: Solver / Biological Solver
- Display: English: Biological Solver
- Purpose: Interactive evolutionary solver for genome-driven design exploration.

When to use it:
- Interactive evolutionary solver for genome-driven design exploration.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Genome | genomeSpec |  | Required | Genome specification from Genome Collector. |
| Geometry | phenotypeSpec |  | Required | Phenotype specification from Geometry Phenotype. |
| Performs | fitnessSpec |  |  | Fitness specification from Performs Fitness. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Best | any | Best individual found across all generations. |
| Population Bests | any | Top individuals per generation. |
| History | any | Full evolutionary history and statistics. |
| Gallery | any | Gallery metadata for all individuals. |

Examples:
- Example: Genome Collector → Biological Solver → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Solver category for adjacent workflows.

---

### Ἐπιλύτης Φογκελ (`voxelSolver`)

- Category: Solver / Voxel Solver
- Display: Greek: Ἐπιλύτης Φογκελ | English: Voxel Solver | Romanization: Epilýtēs Fogkel
- Purpose: Voxel solver (topology density) prototype.

When to use it:
- Voxel solver (topology density) prototype.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Domain | geometry |  |  | Geometry domain used to fit bounds when no grid is supplied. |
| Voxel Grid | any |  |  | Optional voxel grid domain. Bounds are reused; resolution snaps to cubic max. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Density | any | Solved density field in X-fast order. |
| Voxel Grid | any | Voxel grid with updated densities. |
| Best | number | Best score (1 - objective). |
| Objective | number | Objective value (lower is better). |
| Constraint | number | Volume constraint residual. |
| Iterations | number | Iterations executed. |
| Resolution | number | Resolution used for the solve. |
| Status | string | Solver status string. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Volume Fraction | number | 0.4 | min 0.05, max 0.95, step 0.01 | Target solid volume fraction (0-1). |
| Penalty Exponent | number | 3 | min 1, max 6, step 0.1 | SIMP penalty exponent for stiffness. |
| Filter Radius | number | 2 | min 0, max 8, step 0.1 | Neighborhood radius in voxels (0 disables filtering). |
| Iterations | number | 40 | min 1, max 120, step 1 | Solver iterations to run. |
| Resolution | number | 12 | min 4, max 36, step 1 | Grid resolution when no voxel grid input is provided. |

Examples:
- Example: Geometry Reference → Ἐπιλύτης Φογκελ → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Performance notes: Performance: This node can be compute-heavy. Reduce resolution or preview settings when iterating.

Related nodes:
- See other nodes in the Solver category for adjacent workflows.

---

## Logic

### Conditional (`conditional`)

- Category: Logic
- Purpose: Select between two values using a condition.

When to use it:
- Select between two values using a condition.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Condition | boolean | true | Param: condition |  |
| A | number | 1 | Param: left |  |
| B | number | 0 | Param: right |  |
| True | any | 1 | Param: trueValue |  |
| False | any | 0 | Param: falseValue |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Result | any |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mode | select | boolean | options 5 |  |

Examples:
- Example: Boolean Toggle → Conditional → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Logic category for adjacent workflows.

---

## Euclidean

### Vector Compose (`vectorConstruct`)

- Category: Euclidean
- Purpose: Compose a vector from X, Y, and Z scalar inputs.

When to use it:
- Compose a vector from X, Y, and Z scalar inputs.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| X | number | 0 | Param: x |  |
| Y | number | 0 | Param: y |  |
| Z | number | 0 | Param: z |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| X | number | 0 | step 0.1 |  |
| Y | number | 0 | step 0.1 |  |
| Z | number | 0 | step 0.1 |  |

Examples:
- Example: Number or Slider → Vector Compose → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Decompose (`vectorDeconstruct`)

- Category: Euclidean
- Purpose: Break a vector into its scalar components.

When to use it:
- Break a vector into its scalar components.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| X | number |  |
| Y | number |  |
| Z | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector X | number | 0 | step 0.1 |  |
| Vector Y | number | 0 | step 0.1 |  |
| Vector Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Decompose → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Add (`vectorAdd`)

- Category: Euclidean
- Purpose: Add two vectors component-wise.

When to use it:
- Add two vectors component-wise.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | vector |  | Required |  |
| B | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A X | number | 0 | step 0.1 |  |
| A Y | number | 0 | step 0.1 |  |
| A Z | number | 0 | step 0.1 |  |
| B X | number | 1 | step 0.1 |  |
| B Y | number | 0 | step 0.1 |  |
| B Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Add → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Subtract (`vectorSubtract`)

- Category: Euclidean
- Purpose: Subtract vector B from vector A.

When to use it:
- Subtract vector B from vector A.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | vector |  | Required |  |
| B | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A X | number | 1 | step 0.1 |  |
| A Y | number | 0 | step 0.1 |  |
| A Z | number | 0 | step 0.1 |  |
| B X | number | 0 | step 0.1 |  |
| B Y | number | 0 | step 0.1 |  |
| B Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Subtract → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Length (`vectorLength`)

- Category: Euclidean
- Purpose: Measure the magnitude of a vector.

When to use it:
- Measure the magnitude of a vector.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Length | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector X | number | 1 | step 0.1 |  |
| Vector Y | number | 0 | step 0.1 |  |
| Vector Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Length → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Normalize (`vectorNormalize`)

- Category: Euclidean
- Purpose: Convert a vector to unit length.

When to use it:
- Convert a vector to unit length.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Unit | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector X | number | 1 | step 0.1 |  |
| Vector Y | number | 0 | step 0.1 |  |
| Vector Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Normalize → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Dot (`vectorDot`)

- Category: Euclidean
- Purpose: Compute the dot product between two vectors.

When to use it:
- Compute the dot product between two vectors.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | vector |  | Required |  |
| B | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Dot | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A X | number | 1 | step 0.1 |  |
| A Y | number | 0 | step 0.1 |  |
| A Z | number | 0 | step 0.1 |  |
| B X | number | 1 | step 0.1 |  |
| B Y | number | 0 | step 0.1 |  |
| B Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Dot → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Cross (`vectorCross`)

- Category: Euclidean
- Purpose: Compute the cross product between two vectors.

When to use it:
- Compute the cross product between two vectors.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | vector |  | Required |  |
| B | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A X | number | 1 | step 0.1 |  |
| A Y | number | 0 | step 0.1 |  |
| A Z | number | 0 | step 0.1 |  |
| B X | number | 0 | step 0.1 |  |
| B Y | number | 1 | step 0.1 |  |
| B Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Cross → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Distance (`distance`)

- Category: Euclidean
- Purpose: Measure the distance between two points or vectors.

When to use it:
- Measure the distance between two points or vectors.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | vector |  | Required |  |
| B | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Distance | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A X | number | 0 | step 0.1 |  |
| A Y | number | 0 | step 0.1 |  |
| A Z | number | 0 | step 0.1 |  |
| B X | number | 1 | step 0.1 |  |
| B Y | number | 0 | step 0.1 |  |
| B Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Distance → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector From Points (`vectorFromPoints`)

- Category: Euclidean
- Purpose: Create a direction vector that points from A to B.

When to use it:
- Create a direction vector that points from A to B.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | vector |  | Required |  |
| B | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |
| Length | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Start X | number | 0 | step 0.1 |  |
| Start Y | number | 0 | step 0.1 |  |
| Start Z | number | 0 | step 0.1 |  |
| End X | number | 1 | step 0.1 |  |
| End Y | number | 0 | step 0.1 |  |
| End Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector From Points → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Angle (`vectorAngle`)

- Category: Euclidean
- Purpose: Measure the angle between two vectors.

When to use it:
- Measure the angle between two vectors.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | vector |  | Required |  |
| B | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Deg | number |  |
| Rad | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A X | number | 1 | step 0.1 |  |
| A Y | number | 0 | step 0.1 |  |
| A Z | number | 0 | step 0.1 |  |
| B X | number | 0 | step 0.1 |  |
| B Y | number | 1 | step 0.1 |  |
| B Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Angle → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Lerp (`vectorLerp`)

- Category: Euclidean
- Purpose: Linearly interpolate between two vectors using parameter T.

When to use it:
- Linearly interpolate between two vectors using parameter T.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A | vector |  | Required |  |
| B | vector |  | Required |  |
| T | number | 0.5 | Param: t |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |
| T | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| A X | number | 0 | step 0.1 |  |
| A Y | number | 0 | step 0.1 |  |
| A Z | number | 0 | step 0.1 |  |
| B X | number | 1 | step 0.1 |  |
| B Y | number | 0 | step 0.1 |  |
| B Z | number | 0 | step 0.1 |  |
| T | number | 0.5 | step 0.05 |  |

Examples:
- Example: Vector Construct → Vector Lerp → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Vector Project (`vectorProject`)

- Category: Euclidean
- Purpose: Project a vector onto another vector.

When to use it:
- Project a vector onto another vector.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector | vector |  | Required |  |
| Onto | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Projection | vector |  |
| Scale | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector X | number | 1 | step 0.1 |  |
| Vector Y | number | 0 | step 0.1 |  |
| Vector Z | number | 0 | step 0.1 |  |
| Onto X | number | 0 | step 0.1 |  |
| Onto Y | number | 1 | step 0.1 |  |
| Onto Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Project → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Point Attractor (`pointAttractor`)

- Category: Euclidean
- Purpose: Generate attraction vectors toward a target point.

When to use it:
- Generate attraction vectors toward a target point.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Point | vector |  | Required |  |
| Attractor | vector |  | Required |  |
| Strength | number | 1 | Param: strength |  |
| Radius | number | 10 | Param: radius |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |
| Distance | number |  |
| Falloff | number |  |
| Strength | number |  |
| Radius | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Point X | number | 0 | step 0.1 |  |
| Point Y | number | 0 | step 0.1 |  |
| Point Z | number | 0 | step 0.1 |  |
| Attractor X | number | 0 | step 0.1 |  |
| Attractor Y | number | 0 | step 0.1 |  |
| Attractor Z | number | 0 | step 0.1 |  |
| Strength | number | 1 | step 0.1 |  |
| Radius | number | 10 | min 0, step 0.1 |  |

Examples:
- Example: Vector Construct → Point Attractor → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Move Point (`movePoint`)

- Category: Euclidean
- Purpose: Move a point along a direction vector by a distance.

When to use it:
- Move a point along a direction vector by a distance.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Point | vector |  | Required |  |
| Direction | vector |  | Required |  |
| Distance | number | 1 | Param: distance |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Point | vector |  |
| Direction | vector |  |
| Distance | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Point X | number | 0 | step 0.1 |  |
| Point Y | number | 0 | step 0.1 |  |
| Point Z | number | 0 | step 0.1 |  |
| Direction X | number | 1 | step 0.1 |  |
| Direction Y | number | 0 | step 0.1 |  |
| Direction Z | number | 0 | step 0.1 |  |
| Distance | number | 1 | step 0.1 |  |

Examples:
- Example: Vector Construct → Move Point → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Move Point By Vector (`movePointByVector`)

- Category: Euclidean
- Purpose: Move a point directly by an offset vector.

When to use it:
- Move a point directly by an offset vector.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Point | vector |  | Required |  |
| Offset | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Point | vector |  |
| Offset | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Point X | number | 0 | step 0.1 |  |
| Point Y | number | 0 | step 0.1 |  |
| Point Z | number | 0 | step 0.1 |  |
| Offset X | number | 1 | step 0.1 |  |
| Offset Y | number | 0 | step 0.1 |  |
| Offset Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Move Point By Vector → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Rotate Vector (`rotateVectorAxis`)

- Category: Euclidean
- Purpose: Rotate a vector around an axis by an angle in degrees.

When to use it:
- Rotate a vector around an axis by an angle in degrees.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector | vector |  | Required |  |
| Axis | vector |  | Required |  |
| Angle | number | 45 | Param: angleDeg |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |
| Angle | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector X | number | 1 | step 0.1 |  |
| Vector Y | number | 0 | step 0.1 |  |
| Vector Z | number | 0 | step 0.1 |  |
| Axis X | number | 0 | step 0.1 |  |
| Axis Y | number | 1 | step 0.1 |  |
| Axis Z | number | 0 | step 0.1 |  |
| Angle Degrees | number | 45 | step 1 |  |

Examples:
- Example: Vector Construct → Rotate Vector → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

### Mirror Vector (`mirrorVector`)

- Category: Euclidean
- Purpose: Reflect a vector across a plane defined by a normal.

When to use it:
- Reflect a vector across a plane defined by a normal.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector | vector |  | Required |  |
| Normal | vector |  | Required |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |
| Normal | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector X | number | 1 | step 0.1 |  |
| Vector Y | number | 0 | step 0.1 |  |
| Vector Z | number | 0 | step 0.1 |  |
| Normal X | number | 0 | step 0.1 |  |
| Normal Y | number | 1 | step 0.1 |  |
| Normal Z | number | 0 | step 0.1 |  |

Examples:
- Example: Vector Construct → Mirror Vector → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Euclidean category for adjacent workflows.

---

## Transforms

### Vector Scale (`vectorScale`)

- Category: Transforms
- Purpose: Scale a vector by a scalar multiplier.

When to use it:
- Scale a vector by a scalar multiplier.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector | vector |  | Required |  |
| Scale | number | 1 | Param: scale |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Vector | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vector X | number | 1 | step 0.1 |  |
| Vector Y | number | 0 | step 0.1 |  |
| Vector Z | number | 0 | step 0.1 |  |
| Scale | number | 1 | step 0.1 |  |

Examples:
- Example: Vector Construct → Vector Scale → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Transforms category for adjacent workflows.

---

### Move (`move`)

- Category: Transforms
- Purpose: Translate geometry by world-space XYZ offsets.

When to use it:
- Translate geometry by world-space XYZ offsets.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required, Param: geometryId |  |
| World X | number | 0 | Param: worldX |  |
| World Y | number | 0 | Param: worldY |  |
| World Z | number | 0 | Param: worldZ |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Offset | vector |  |
| World X | number |  |
| World Y | number |  |
| World Z | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| World X | number | 0 | step 0.1 |  |
| World Y | number | 0 | step 0.1 |  |
| World Z | number | 0 | step 0.1 |  |

Examples:
- Example: Geometry Reference → Move → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Transforms category for adjacent workflows.

---

### Rotate (`rotate`)

- Category: Transforms
- Purpose: Rotate geometry around an axis.

When to use it:
- Rotate geometry around an axis.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required, Param: geometryId |  |
| Axis | vector |  | Required |  |
| Pivot | vector |  |  |  |
| Angle | number | 0 | Param: angle |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Axis | vector |  |
| Pivot | vector |  |
| Angle | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Axis X | number | 0 | step 0.1 |  |
| Axis Y | number | 1 | step 0.1 |  |
| Axis Z | number | 0 | step 0.1 |  |
| Pivot X | number | 0 | step 0.1 |  |
| Pivot Y | number | 0 | step 0.1 |  |
| Pivot Z | number | 0 | step 0.1 |  |
| Angle | number | 0 | step 5 |  |

Examples:
- Example: Geometry Reference → Rotate → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Transforms category for adjacent workflows.

---

### Scale (`scale`)

- Category: Transforms
- Purpose: Scale geometry around a pivot point.

When to use it:
- Scale geometry around a pivot point.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required, Param: geometryId |  |
| Scale | vector |  | Required |  |
| Pivot | vector |  |  |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Scale | vector |  |
| Pivot | vector |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Scale X | number | 1 | step 0.1 |  |
| Scale Y | number | 1 | step 0.1 |  |
| Scale Z | number | 1 | step 0.1 |  |
| Pivot X | number | 0 | step 0.1 |  |
| Pivot Y | number | 0 | step 0.1 |  |
| Pivot Z | number | 0 | step 0.1 |  |

Examples:
- Example: Geometry Reference → Scale → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Using zero-length vectors for direction inputs.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Transforms category for adjacent workflows.

---

### Field Transformation (`fieldTransformation`)

- Category: Transforms
- Purpose: Transform geometry using a scalar or vector field.

When to use it:
- Transform geometry using a scalar or vector field.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Required |  |
| Field | any |  |  |  |
| Strength | number | 1 | Param: strength |  |
| Falloff | number | 1 | Param: falloff |  |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Geometry | geometry |  |
| Field | any |  |
| Strength | number |  |
| Falloff | number |  |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Strength | number | 1 | step 0.1 |  |
| Falloff | number | 1 | min 0, step 0.1 |  |

Examples:
- Example: Geometry Reference → Field Transformation → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Transforms category for adjacent workflows.

---

## Goal

### Σκληρότης (`stiffnessGoal`)

- Category: Goal / Physics Goals
- Display: Greek: Σκληρότης | English: Stiffness | Romanization: Sklērótēs
- Purpose: Defines resistance to deformation for structural elements.

When to use it:
- Defines resistance to deformation for structural elements.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Elements | any |  | Required, Multi | Element indices (edges, faces, or volumes) to constrain. |
| Young's Modulus | number |  |  | Material stiffness in Pascals. |
| Poisson Ratio | number |  |  | Material lateral strain response. |
| Target Stiffness | number |  |  | Optional target stiffness value. |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Stiffness goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Young's Modulus (Pa) | number | 200000000000 | min 1000000, max 1000000000000, step 1000000 |  |
| Poisson Ratio | number | 0.3 | min -1, max 0.5, step 0.01 |  |
| Target Stiffness | number | 0 | min 0 |  |
| Weight | number | 1 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Panel → Σκληρότης → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Ὄγκος (`volumeGoal`)

- Category: Goal / Physics Goals
- Display: Greek: Ὄγκος | English: Volume | Romanization: Ónkos
- Purpose: Constrains or targets material volume.

When to use it:
- Constrains or targets material volume.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Target Volume | number |  |  | Target volume (m³). |
| Max Volume | number |  |  | Maximum allowed volume (m³). |
| Min Volume | number |  |  | Minimum allowed volume (m³). |
| Density | number |  |  | Material density (kg/m³). |
| Deviation | number |  |  | Allowed deviation (0-1). |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Volume goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Target Volume (m³) | number | 0 | min 0 |  |
| Max Volume (m³) | number | 0 | min 0 |  |
| Min Volume (m³) | number | 0 | min 0 |  |
| Material Density (kg/m³) | number | 7850 | min 1, max 30000 |  |
| Allowed Deviation | number | 0.05 | min 0, max 0.5, step 0.01 |  |
| Weight | number | 1 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Number or Slider → Ὄγκος → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Βάρος (`loadGoal`)

- Category: Goal / Physics Goals
- Display: Greek: Βάρος | English: Load | Romanization: Báros
- Purpose: Defines external forces applied to the structure.

When to use it:
- Defines external forces applied to the structure.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Force | vector |  |  | Force vector (N). |
| Magnitude | number |  |  | Force magnitude (N) overrides vector if provided. |
| Direction | vector |  |  | Direction for magnitude-based loads. |
| Application Points | any |  | Multi | Vertex indices where the load is applied. |
| Distributed | boolean |  |  | Distribute load across points. |
| Load Type | string |  |  | Static, dynamic, or cyclic loading. |
| Time Profile | any |  |  | Time-varying load profile for dynamic loads. |
| Frequency | number |  |  | Frequency in Hz for cyclic loads. |
| Weight | number |  |  | Relative importance. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Load goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Force X | number | 0 | step 0.1 |  |
| Force Y | number | 0 | step 0.1 |  |
| Force Z | number | -1000 | step 0.1 |  |
| Force Magnitude (N) | number | 0 | min 0 |  |
| Direction X | number | 0 | step 0.1 |  |
| Direction Y | number | 0 | step 0.1 |  |
| Direction Z | number | -1 | step 0.1 |  |
| Distributed | boolean | false |  |  |
| Load Type | select | static | options 3 |  |
| Frequency (Hz) | number | 0 | min 0 |  |
| Weight | number | 1 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Vector Construct → Βάρος → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Ἄγκυρα (`anchorGoal`)

- Category: Goal / Physics Goals
- Display: Greek: Ἄγκυρα | English: Anchor | Romanization: Ágkyra
- Purpose: Defines fixed boundary conditions and supports.

When to use it:
- Defines fixed boundary conditions and supports.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Vertices | any |  | Required, Multi | Vertex indices to anchor. |
| Anchor Type | string |  |  | Fixed, pinned, roller, or custom. |
| Fix X | boolean |  |  |  |
| Fix Y | boolean |  |  |  |
| Fix Z | boolean |  |  |  |
| Fix Rot X | boolean |  |  |  |
| Fix Rot Y | boolean |  |  |  |
| Fix Rot Z | boolean |  |  |  |
| Spring Stiffness | number |  |  | Spring stiffness (N/m) for elastic anchors. |
| Weight | number |  |  | Relative importance. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Anchor goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Anchor Type | select | fixed | options 4 |  |
| Fix X | boolean | true |  |  |
| Fix Y | boolean | true |  |  |
| Fix Z | boolean | true |  |  |
| Fix Rot X | boolean | false |  |  |
| Fix Rot Y | boolean | false |  |  |
| Fix Rot Z | boolean | false |  |  |
| Spring Stiffness (N/m) | number | 0 | min 0 |  |
| Weight | number | 1 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Panel → Ἄγκυρα → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Genome Collector (`genomeCollector`)

- Category: Goal / Biological Evolution Goals
- Display: English: Genome Collector
- Purpose: Collects slider genes into a genome specification.

When to use it:
- Collects slider genes into a genome specification.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Sliders | number |  | Multi | Slider values to include in the genome. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Genome | genomeSpec | Genome specification for the Biological Solver. |

Examples:
- Example: Number or Slider → Genome Collector → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Geometry Phenotype (`geometryPhenotype`)

- Category: Goal
- Display: English: Geometry Phenotype
- Purpose: Captures geometry outputs as a phenotype specification.

When to use it:
- Captures geometry outputs as a phenotype specification.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Geometry | geometry |  | Multi | Geometry outputs that define the phenotype. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Phenotype | phenotypeSpec | Phenotype specification for the Biological Solver. |

Examples:
- Example: Geometry Reference → Geometry Phenotype → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Performs Fitness (`performsFitness`)

- Category: Goal / Biological Evolution Goals
- Display: English: Performs Fitness
- Purpose: Aggregates metric outputs into a fitness specification.

When to use it:
- Aggregates metric outputs into a fitness specification.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Metrics | number |  | Multi | Metric outputs used to compute fitness. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Fitness | fitnessSpec | Fitness specification for the Biological Solver. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Default Mode | select | maximize | options 2 |  |
| Default Weight | number | 1 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Number or Slider → Performs Fitness → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Αὔξησις (`growthGoal`)

- Category: Goal / Biological Goals
- Display: Greek: Αὔξησις | English: Growth | Romanization: Auxēsis
- Purpose: Promotes biomass accumulation and growth intensity.

When to use it:
- Promotes biomass accumulation and growth intensity.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Elements | any |  | Required, Multi | Element or cell indices to target. |
| Growth Rate | number |  |  | Relative growth rate multiplier. |
| Target Biomass | number |  |  | Desired biomass fraction (0 to 1). |
| Carrying Capacity | number |  |  | Upper biomass capacity multiplier. |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Growth goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Growth Rate | number | 0.6 | min 0, max 3, step 0.05 |  |
| Target Biomass | number | 0.7 | min 0, max 1, step 0.05 |  |
| Carrying Capacity | number | 1 | min 0.1, max 5, step 0.1 |  |
| Weight | number | 1 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Panel → Αὔξησις → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Θρέψις (`nutrientGoal`)

- Category: Goal / Biological Goals
- Display: Greek: Θρέψις | English: Nutrient | Romanization: Thrépsis
- Purpose: Defines nutrient availability and uptake behavior.

When to use it:
- Defines nutrient availability and uptake behavior.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Elements | any |  | Required, Multi | Element or cell indices to target. |
| Source Strength | number |  |  | Nutrient source strength multiplier. |
| Uptake Rate | number |  |  | Nutrient uptake rate. |
| Diffusion Rate | number |  |  | Nutrient diffusion multiplier. |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Nutrient goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Source Strength | number | 1 | min 0, max 5, step 0.1 |  |
| Uptake Rate | number | 0.4 | min 0, max 2, step 0.05 |  |
| Diffusion Rate | number | 0.6 | min 0, max 2, step 0.05 |  |
| Weight | number | 1 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Panel → Θρέψις → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Μορφογένεσις (`morphogenesisGoal`)

- Category: Goal / Biological Goals
- Display: Greek: Μορφογένεσις | English: Morphogenesis | Romanization: Morphogénesis
- Purpose: Shapes branching density and pattern formation.

When to use it:
- Shapes branching density and pattern formation.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Elements | any |  | Required, Multi | Element or cell indices to target. |
| Branching Factor | number |  |  | Controls branching intensity. |
| Pattern Scale | number |  |  | Spatial scale of patterns. |
| Anisotropy | number |  |  | Directional bias (-1 to 1). |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Morphogenesis goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Branching Factor | number | 0.6 | min 0, max 2, step 0.05 |  |
| Pattern Scale | number | 1 | min 0.2, max 3, step 0.05 |  |
| Anisotropy | number | 0 | min -1, max 1, step 0.05 |  |
| Weight | number | 1 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Panel → Μορφογένεσις → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Ὁμοιόστασις (`homeostasisGoal`)

- Category: Goal / Biological Goals
- Display: Greek: Ὁμοιόστασις | English: Homeostasis | Romanization: Homoiostasis
- Purpose: Maintains stability and penalizes excessive stress.

When to use it:
- Maintains stability and penalizes excessive stress.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Elements | any |  | Required, Multi | Element or cell indices to target. |
| Stability Target | number |  |  | Desired stability target (0 to 1). |
| Damping | number |  |  | Damping factor for instability. |
| Stress Limit | number |  |  | Maximum allowable stress. |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Homeostasis goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Stability Target | number | 0.6 | min 0, max 1, step 0.05 |  |
| Damping | number | 0.5 | min 0, max 1, step 0.05 |  |
| Stress Limit | number | 1 | min 0.1, max 10, step 0.1 |  |
| Weight | number | 1 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Panel → Ὁμοιόστασις → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Material (`chemistryMaterialGoal`)

- Category: Goal / Chemistry Goals
- Display: Greek: Ὕλη | English: Material | Romanization: Hýlē
- Purpose: Assigns materials to connected solver geometry inputs.

When to use it:
- Assigns materials to connected solver geometry inputs.

Inputs:
- None

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Materials Text | string | Line-based material assignment text for the solver. |

Examples:
- Example: Material → Panel

Common mistakes:
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Τέλος Σκληρότητος (`chemistryStiffnessGoal`)

- Category: Goal / Chemistry Goals
- Display: Greek: Τέλος Σκληρότητος | English: Stiffness Goal | Romanization: Télos Sklērótētos
- Purpose: Biases high-stiffness materials toward stress-aligned regions.

When to use it:
- Biases high-stiffness materials toward stress-aligned regions.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Region | geometry |  | Multi | Optional geometry region to focus stiffness bias. |
| Load Vector | vector |  |  | Principal load direction used to bias stiffness. |
| Penalty | number |  |  | Scaling factor applied to stiffness bias. |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Chemistry stiffness goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Load X | number | 0 | step 0.1 |  |
| Load Y | number | -1 | step 0.1 |  |
| Load Z | number | 0 | step 0.1 |  |
| Structural Penalty | number | 1 | min 0, max 10, step 0.05 |  |
| Weight | number | 0.7 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Geometry Reference → Τέλος Σκληρότητος → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Using zero-length vectors for direction inputs.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Τέλος Ἐλαχίστου Ὄγκου (`chemistryMassGoal`)

- Category: Goal / Chemistry Goals
- Display: Greek: Τέλος Ἐλαχίστου Ὄγκου | English: Minimum Mass Goal | Romanization: Télos Elachístou Ónkou
- Purpose: Encourages minimum mass while respecting other goals.

When to use it:
- Encourages minimum mass while respecting other goals.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Target Mass | number |  |  | Target mass fraction (0 to 1). |
| Density Penalty | number |  |  | Penalty applied to higher density materials. |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Chemistry mass goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Target Mass Fraction | number | 0.6 | min 0, max 1, step 0.05 |  |
| Density Penalty | number | 1 | min 0, max 5, step 0.05 |  |
| Weight | number | 0.4 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Number or Slider → Τέλος Ἐλαχίστου Ὄγκου → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Τέλος Κράσεως (`chemistryBlendGoal`)

- Category: Goal / Chemistry Goals
- Display: Greek: Τέλος Κράσεως | English: Blend Goal | Romanization: Télos Kráseōs
- Purpose: Encourages smooth material gradients and diffusion.

When to use it:
- Encourages smooth material gradients and diffusion.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Smoothness | number |  |  | Gradient smoothness (0 = sharp, 1 = very smooth). |
| Diffusivity | number |  |  | Additional diffusion multiplier for material mixing. |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Chemistry blend goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Smoothness | number | 0.7 | min 0, max 1, step 0.05 |  |
| Diffusivity | number | 1 | min 0, max 4, step 0.05 |  |
| Weight | number | 0.6 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Number or Slider → Τέλος Κράσεως → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Τέλος Διαφανείας (`chemistryTransparencyGoal`)

- Category: Goal / Chemistry Goals
- Display: Greek: Τέλος Διαφανείας | English: Transparency Goal | Romanization: Télos Diaphaneías
- Purpose: Biases transparent materials toward view corridors.

When to use it:
- Biases transparent materials toward view corridors.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Region | geometry |  | Multi | Optional geometry region for transparency bias. |
| Optical Weight | number |  |  | Scaling factor for optical transmission bias. |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Chemistry transparency goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Optical Weight | number | 1 | min 0, max 5, step 0.05 |  |
| Weight | number | 0.4 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Geometry Reference → Τέλος Διαφανείας → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---

### Τέλος Ῥοῆς Θερμότητος (`chemistryThermalGoal`)

- Category: Goal / Chemistry Goals
- Display: Greek: Τέλος Ῥοῆς Θερμότητος | English: Thermal Goal | Romanization: Télos Rhoês Thermótētos
- Purpose: Biases materials to conduct or insulate heat.

When to use it:
- Biases materials to conduct or insulate heat.

Inputs:

| Input | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Region | geometry |  | Multi | Optional geometry region for thermal bias. |
| Mode | string |  |  | Thermal mode: conduct or insulate. |
| Thermal Weight | number |  |  | Scaling factor for thermal conductivity bias. |
| Weight | number |  |  | Relative importance of this goal. |

Outputs:

| Output | Type | Semantics |
| --- | --- | --- |
| Goal | goal | Chemistry thermal goal specification. |

Parameters:

| Parameter | Type | Default | Constraints | Semantics |
| --- | --- | --- | --- | --- |
| Mode | select | conduct | options 2 |  |
| Thermal Weight | number | 1 | min 0, max 5, step 0.05 |  |
| Weight | number | 0.4 | min 0, max 1, step 0.05 |  |

Examples:
- Example: Geometry Reference → Τέλος Ῥοῆς Θερμότητος → Panel

Common mistakes:
- Leaving required inputs unconnected.
- Feeding non-geometry data into geometry ports.
- Sending strings without numeric values.
- Forgetting to re-run or re-evaluate after parameter changes.

Related nodes:
- See other nodes in the Goal category for adjacent workflows.

---
