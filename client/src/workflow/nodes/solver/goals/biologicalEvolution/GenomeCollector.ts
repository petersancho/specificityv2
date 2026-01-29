import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import { toList, toNumber } from "../../utils";

type GeneSpec = {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  currentValue: number;
  type: "continuous" | "discrete";
};

const normalizeGene = (entry: unknown, index: number): GeneSpec => {
  if (entry && typeof entry === "object") {
    const record = entry as Record<string, unknown>;
    const min = toNumber(record.min, 0);
    const max = toNumber(record.max, 1);
    const step = toNumber(record.step, 0.01);
    const rawValue =
      record.currentValue ??
      record.value ??
      record.defaultValue ??
      (typeof record.current === "number" ? record.current : undefined);
    return {
      id: typeof record.id === "string" ? record.id : `gene_${index}`,
      name: typeof record.name === "string" ? record.name : `Gene ${index + 1}`,
      min,
      max,
      step,
      currentValue: toNumber(rawValue, min),
      type: record.type === "discrete" ? "discrete" : "continuous",
    };
  }

  return {
    id: `gene_${index}`,
    name: `Gene ${index + 1}`,
    min: 0,
    max: 1,
    step: 0.01,
    currentValue: toNumber(entry, 0),
    type: "continuous",
  };
};

export const GenomeCollectorNode: WorkflowNodeDefinition = {
  type: "genomeCollector",
  label: "Genome Collector",
  shortLabel: "Genome",
  description: "Collects slider genes into a genome specification.",
  category: "goal",
  iconId: "goal",
  display: {
    nameEnglish: "Genome Collector",
    description: "Collects slider genes into a genome specification.",
  },
  inputs: [
    {
      key: "sliders",
      label: "Sliders",
      type: "number",
      allowMultiple: true,
      description: "Slider values to include in the genome.",
    },
  ],
  outputs: [
    {
      key: "genome",
      label: "Genome",
      type: "genomeSpec",
      description: "Genome specification for the Biological Solver.",
    },
  ],
  parameters: [],
  primaryOutputKey: "genome",
  compute: ({ inputs }) => {
    const values = toList(inputs.sliders);
    const genes = values.map((entry, index) => normalizeGene(entry, index));
    return {
      genome: {
        genes,
        encodeStrategy: "dash-join",
      },
    };
  },
};
