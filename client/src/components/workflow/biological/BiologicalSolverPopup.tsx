import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import WebGLButton from "../../ui/WebGLButton";
import styles from "./BiologicalSolverPopup.module.css";
import WorkflowGeometryViewer from "../WorkflowGeometryViewer";
import {
  DEFAULT_SOLVER_CONFIG,
  clearEvaluationCache,
  getBiologicalSolverState,
  updateBiologicalSolverState,
} from "../../../workflow/nodes/solver/biological/solverState";
import {
  applyGenomeToSliders,
  evaluateIndividuals,
  resolveSolverConnections,
  type ConnectionInfo,
} from "../../../workflow/nodes/solver/biological/evaluation";
import type {
  FitnessMetric,
  GenerationRecord,
  Individual,
  PopulationBests,
  SolverConfig,
  Gallery,
} from "../../../workflow/nodes/solver/biological/types";
import { useProjectStore } from "../../../store/useProjectStore";

type TabId = "setup" | "simulation" | "outputs";

type BiologicalSolverPopupProps = {
  nodeId: string;
  onClose: () => void;
};

const SOLVER_ACCENTS = {
  run: "#2f7a3c",
  runBatch: "#0b8a97",
  pause: "#b56f1f",
  stop: "#dc3545",
  reset: "#3b3b40",
};

const POPUP_ICON_STYLE = "sticker2";

const SOLVER_DESCRIPTION =
  "Evolves populations of genomes, evaluates them against connected fitness goals, and promotes the highest-performing phenotypes through generations. Use it to explore variation, monitor convergence, and commit a selected genome back into the graph.";

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const FALLBACK_THUMBNAIL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAr8B9pTa8wAAAABJRU5ErkJggg==";

const renderThumbnail = (genome: number[], fitness: number, key: string, size = 360) => {
  const scale =
    typeof window !== "undefined" ? Math.max(2, Math.min(5, window.devicePixelRatio || 1)) : 3;
  const canvas = document.createElement("canvas");
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    ctx.imageSmoothingQuality = "high";
  }
  ctx.scale(scale, scale);

  const seed = hashString(key);
  const hue = seed % 360;
  const hue2 = (hue + 40 + (seed % 60)) % 360;
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, `hsla(${hue}, 62%, 74%, 0.95)`);
  gradient.addColorStop(1, `hsla(${hue2}, 64%, 58%, 0.95)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(size * 0.2, size * 0.2, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.8, size * 0.3, size * 0.1, 0, Math.PI * 2);
  ctx.fill();

  const barCount = Math.min(12, genome.length);
  const padding = Math.max(12, Math.round(size * 0.04));
  const labelSize = Math.max(12, Math.round(size * 0.038));
  const barWidth = size / (barCount + 1);
  genome.slice(0, barCount).forEach((value, idx) => {
    const normalized = Number.isFinite(value) ? Math.abs(value) % 1 : 0.5;
    const barHeight = Math.max(12, normalized * (size * 0.5));
    const x = (idx + 0.5) * barWidth + 4;
    const y = size - barHeight - padding;
    ctx.fillStyle = "rgba(31, 31, 34, 0.35)";
    ctx.fillRect(x, y, barWidth * 0.6, barHeight);
  });

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 ${labelSize}px "Montreal Neue", "Space Grotesk", sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(`Fit ${fitness.toFixed(3)}`, padding, size - padding);

  return canvas.toDataURL("image/png");
};

const buildGallery = (
  generations: GenerationRecord[],
  selections: Set<string>,
  thumbnailCache: Map<string, string>
) => {
  const byGeneration: Record<number, Individual[]> = {};
  const allIndividuals: Individual[] = [];
  generations.forEach((generation) => {
    const population = generation.population.map((individual) => {
      const thumbKey = individual.genomeString;
      const thumb =
        thumbnailCache.get(thumbKey) ??
        renderThumbnail(individual.genome, individual.fitness, thumbKey) ??
        null;
      if (thumb && !thumbnailCache.has(thumbKey)) {
        thumbnailCache.set(thumbKey, thumb);
      }
      return {
        ...individual,
        thumbnail: thumb,
      };
    });
    byGeneration[generation.id] = population;
    allIndividuals.push(...population);
  });

  const bestOverall = allIndividuals.reduce<Individual | null>((best, individual) => {
    if (!best) return individual;
    return individual.fitness > best.fitness ? individual : best;
  }, null);

  return {
    allIndividuals,
    byGeneration,
    bestOverall: bestOverall?.id ?? null,
    userSelections: Array.from(selections),
  } satisfies Gallery;
};

const buildPopulationBests = (generations: GenerationRecord[], topK = 3): PopulationBests[] =>
  generations.map((generation) => ({
    generation: generation.id,
    individuals: generation.population.slice(0, topK),
  }));

const ConvergenceChart = ({
  history,
}: {
  history: GenerationRecord[];
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const points = history.map((generation) => ({
    id: generation.id,
    best: generation.statistics.bestFitness,
    mean: generation.statistics.meanFitness,
    worst: generation.statistics.worstFitness,
  }));
  const maxFitness = Math.max(1, ...points.map((point) => point.best));
  const minFitness = Math.min(0, ...points.map((point) => point.worst));
  const range = Math.max(0.0001, maxFitness - minFitness);

  const width = 520;
  const height = 260;
  const padding = 32;

  const xForIndex = (index: number) =>
    padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
  const yForValue = (value: number) =>
    height - padding - ((value - minFitness) / range) * (height - padding * 2);

  const buildPath = (key: "best" | "mean" | "worst") =>
    points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xForIndex(index)} ${yForValue(point[key])}`)
      .join(" ");

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = rect.width / width || 1;
    const x = (event.clientX - rect.left) / scaleX;
    const ratio = (x - padding) / (width - padding * 2);
    const index = Math.round(ratio * (points.length - 1));
    if (index >= 0 && index < points.length) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }
  };

  const hoverPoint = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div className={styles.chartWrapper} title="Hover to read values per generation.">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="bestLine" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#1f1f22" />
            <stop offset="100%" stopColor="#cc5b1a" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        {points.length > 1 && (
          <>
            <path d={buildPath("best")} fill="none" stroke="url(#bestLine)" strokeWidth="2.5" />
            <path
              d={buildPath("mean")}
              fill="none"
              stroke="rgba(31,31,34,0.6)"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <path
              d={buildPath("worst")}
              fill="none"
              stroke="rgba(31,31,34,0.3)"
              strokeWidth="1.5"
              strokeDasharray="2 6"
            />
            {hoverIndex != null && (
              <circle
                cx={xForIndex(hoverIndex)}
                cy={yForValue(points[hoverIndex].best)}
                r={4}
                fill="#cc5b1a"
              />
            )}
          </>
        )}
      </svg>
      {hoverPoint ? (
        <div className={styles.chartTooltip}>
          Gen {hoverPoint.id} · Best {hoverPoint.best.toFixed(3)} · Mean {hoverPoint.mean.toFixed(3)}
        </div>
      ) : null}
    </div>
  );
};

const BiologicalSolverPopup = ({ nodeId, onClose }: BiologicalSolverPopupProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [uiScale, setUiScale] = useState(0.9);
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [config, setConfig] = useState<SolverConfig>({ ...DEFAULT_SOLVER_CONFIG });
  const [metrics, setMetrics] = useState<FitnessMetric[]>([]);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [best, setBest] = useState<Individual | null>(null);
  const [populationBests, setPopulationBests] = useState<PopulationBests[]>([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [runCount, setRunCount] = useState(5);
  const [selectedGeneration, setSelectedGeneration] = useState("all");
  const [sortMode, setSortMode] = useState("fitness");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [previewGeometryIds, setPreviewGeometryIds] = useState<string[]>([]);
  const [metadataOptions, setMetadataOptions] = useState({
    generation: true,
    rank: true,
    fitness: true,
    sparkline: false,
  });

  const scalePercent = Math.round(uiScale * 100);

  const workerRef = useRef<Worker | null>(null);
  const connectionsRef = useRef<ConnectionInfo | null>(null);
  const historyRef = useRef<GenerationRecord[]>([]);
  const thumbnailCache = useRef<Map<string, string>>(new Map());
  const configRef = useRef<SolverConfig>(config);
  const selectedIdsRef = useRef<Set<string>>(selectedIds);

  const nodeLabel = useProjectStore((state) => {
    const node = state.workflow.nodes.find((entry) => entry.id === nodeId);
    return node?.data?.label ?? "Biological Solver";
  });

  const recalcWorkflow = useProjectStore((state) => state.recalculateWorkflow);

  useEffect(() => {
    const saved = getBiologicalSolverState(nodeId);
    setConfig({ ...saved.config });
    const savedHistory = saved.outputs.history?.generations ?? [];
    setStatus(savedHistory.length > 0 ? "initialized" : "idle");
    setMetrics(saved.metrics ?? []);
    historyRef.current = savedHistory;
    setHistory(savedHistory);
    setGallery(saved.outputs.gallery ?? null);
    setBest(saved.outputs.best ?? null);
    setPopulationBests(saved.outputs.populationBests ?? []);
    if (saved.outputs.gallery?.userSelections) {
      setSelectedIds(new Set(saved.outputs.gallery.userSelections));
    }
  }, [nodeId]);

  useEffect(() => {
    if (metrics.length > 0) return;
    const connections = resolveSolverConnections(nodeId);
    if (connections?.metrics.length) {
      setMetrics(connections.metrics);
    }
  }, [nodeId, metrics.length]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    updateBiologicalSolverState(nodeId, { config });
    configRef.current = config;
  }, [nodeId, config]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    if (!gallery) return;
    const nextSelections = Array.from(selectedIds);
    const currentSelections = new Set(gallery.userSelections ?? []);
    const changed =
      nextSelections.length !== currentSelections.size ||
      nextSelections.some((id) => !currentSelections.has(id));
    if (!changed) return;
    const nextGallery = {
      ...gallery,
      userSelections: nextSelections,
    };
    setGallery(nextGallery);
    updateBiologicalSolverState(nodeId, {
      outputs: {
        best,
        populationBests,
        history: { generations: historyRef.current, config: configRef.current },
        gallery: nextGallery,
      },
    });
    recalcWorkflow();
  }, [selectedIds, gallery, best, populationBests, nodeId, recalcWorkflow]);

  useEffect(() => {
    const worker = new Worker(
      new URL("../../../workflow/nodes/solver/biological/biologicalWorker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    const handleMessage = async (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === "REQUEST_EVALUATION") {
        const connections = connectionsRef.current;
        if (!connections) {
          worker.postMessage({ type: "EVALUATION_RESULTS", results: [] });
          return;
        }
        const results = await evaluateIndividuals(
          nodeId,
          message.individuals ?? [],
          connections,
          (current, total, label) => setProgress({ current, total, label })
        );
        setProgress(null);
        worker.postMessage({ type: "EVALUATION_RESULTS", results });
        return;
      }
      if (message?.type === "INITIALIZED" || message?.type === "GENERATION_COMPLETE") {
        const generationRecord: GenerationRecord = {
          id: message.generation,
          population: message.population ?? [],
          statistics: message.statistics,
          convergenceMetrics: message.convergenceMetrics,
        };
        const nextHistory = historyRef.current
          .filter((record) => record.id !== generationRecord.id)
          .concat(generationRecord)
          .sort((a, b) => a.id - b.id);
        historyRef.current = nextHistory;
        setHistory(nextHistory);
        const nextGallery = buildGallery(nextHistory, selectedIdsRef.current, thumbnailCache.current);
        setGallery(nextGallery);
        const nextPopulationBests = buildPopulationBests(nextHistory, 3);
        setPopulationBests(nextPopulationBests);
        const nextBest = nextGallery.allIndividuals.reduce<Individual | null>(
          (current, individual) => (!current || individual.fitness > current.fitness ? individual : current),
          null
        );
        setBest(nextBest);
        updateBiologicalSolverState(nodeId, {
          outputs: {
            best: nextBest,
            populationBests: nextPopulationBests,
            history: { generations: nextHistory, config: configRef.current },
            gallery: nextGallery,
          },
          status: "initialized",
        });
        recalcWorkflow();
        setStatus("initialized");
        return;
      }
      if (message?.type === "ALL_COMPLETE") {
        const converged = message.converged ?? false;
        const reason = message.convergenceReason ?? null;
        setStatus(converged ? "converged" : "stopped");
        if (converged && reason) {
          setError(`Converged: ${reason}`);
        }
        updateBiologicalSolverState(nodeId, { status: converged ? "converged" : "stopped" });
        return;
      }
      if (message?.type === "PAUSED") {
        setStatus("paused");
        updateBiologicalSolverState(nodeId, { status: "paused" });
        return;
      }
      if (message?.type === "STOPPED") {
        setStatus("stopped");
        updateBiologicalSolverState(nodeId, { status: "stopped" });
        return;
      }
      if (message?.type === "RESET_COMPLETE") {
        historyRef.current = [];
        setHistory([]);
        setGallery(null);
        setBest(null);
        setPopulationBests([]);
        setStatus("idle");
        updateBiologicalSolverState(nodeId, {
          outputs: { best: null, populationBests: [], history: null, gallery: null },
          status: "idle",
          generation: 0,
          progress: null,
        });
        recalcWorkflow();
      }
    };
    worker.addEventListener("message", handleMessage);
    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [nodeId, recalcWorkflow]);

  const isInitialized = history.length > 0;

  const currentStats = history.length > 0 ? history[history.length - 1].statistics : null;

  const filteredIndividuals = useMemo(() => {
    if (!gallery) return [];
    let list = gallery.allIndividuals;
    if (selectedGeneration !== "all") {
      const gen = Number(selectedGeneration);
      if (Number.isFinite(gen)) {
        list = gallery.byGeneration[gen] ?? [];
      }
    }
    if (sortMode === "generation") {
      return [...list].sort((a, b) => a.generation - b.generation || a.rank - b.rank);
    }
    if (sortMode === "rank") {
      return [...list].sort((a, b) => a.rank - b.rank);
    }
    return [...list].sort((a, b) => b.fitness - a.fitness);
  }, [gallery, selectedGeneration, sortMode]);

  const selectedDetail = filteredIndividuals.find((ind) => ind.id === detailId) ?? null;

  const handleInitialize = () => {
    const connections = resolveSolverConnections(nodeId);
    if (!connections || connections.genes.length === 0 || connections.geometrySources.length === 0) {
      setError("Genome Collector and Geometry Phenotype must be connected.");
      return;
    }
    setError(null);
    connectionsRef.current = connections;
    const metricList =
      metrics.length === connections.metrics.length && metrics.length > 0
        ? metrics
        : connections.metrics;
    setMetrics(metricList);
    clearEvaluationCache(nodeId);
    workerRef.current?.postMessage({
      type: "INIT",
      config,
      genes: connections.genes,
      metrics: metricList,
      seedGenome: config.seedFromCurrent ? connections.genes.map((gene) => gene.currentValue) : null,
    });
    setStatus("running");
    updateBiologicalSolverState(nodeId, {
      config,
      metrics: metricList,
      status: "running",
    });
    setActiveTab("simulation");
  };

  const handleRun = (count: number) => {
    if (!workerRef.current || !isInitialized) return;
    setStatus("running");
    updateBiologicalSolverState(nodeId, { status: "running" });
    workerRef.current.postMessage({ type: "EVOLVE", generations: count });
  };

  const handlePause = () => {
    workerRef.current?.postMessage({ type: "PAUSE" });
  };

  const handleStop = () => {
    workerRef.current?.postMessage({ type: "STOP" });
  };

  const handleReset = () => {
    workerRef.current?.postMessage({ type: "RESET" });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exportIndividuals = async (individuals: Individual[], layout: "single" | "grid") => {
    if (individuals.length === 0) return;
    const size = layout === "single" ? 1600 : 480;
    const cols = layout === "single" ? 1 : Math.ceil(Math.sqrt(individuals.length));
    const rows = layout === "single" ? 1 : Math.ceil(individuals.length / cols);
    const canvas = document.createElement("canvas");
    canvas.width = size * cols;
    canvas.height = size * rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) {
      ctx.imageSmoothingQuality = "high";
    }

    const sparklineValues = historyRef.current.map(
      (generation) => generation.statistics.bestFitness
    );
    const drawSparkline = (x: number, y: number, width: number, height: number) => {
      if (sparklineValues.length < 2) return;
      const maxVal = Math.max(...sparklineValues, 1);
      const minVal = Math.min(...sparklineValues, 0);
      const range = Math.max(0.0001, maxVal - minVal);
      ctx.save();
      ctx.strokeStyle = "rgba(31,31,34,0.75)";
      ctx.lineWidth = Math.max(2, Math.round(size * 0.0014));
      ctx.beginPath();
      sparklineValues.forEach((value, index) => {
        const t = index / (sparklineValues.length - 1);
        const sx = x + t * width;
        const sy = y + height - ((value - minVal) / range) * height;
        if (index === 0) {
          ctx.moveTo(sx, sy);
        } else {
          ctx.lineTo(sx, sy);
        }
      });
      ctx.stroke();
      ctx.restore();
    };

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load thumbnail"));
        img.src = src;
      });

    const images = await Promise.all(
      individuals.map(async (individual) => {
        const thumbKey = individual.genomeString;
        const thumb =
          individual.thumbnail ??
          thumbnailCache.current.get(thumbKey) ??
          renderThumbnail(individual.genome, individual.fitness, thumbKey, size) ??
          FALLBACK_THUMBNAIL;
        if (thumb && !thumbnailCache.current.has(thumbKey)) {
          thumbnailCache.current.set(thumbKey, thumb);
        }
        return loadImage(thumb);
      })
    );

    images.forEach((image, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * size;
      const y = row * size;
      ctx.drawImage(image, x, y, size, size);
      ctx.fillStyle = "rgba(31,31,34,0.75)";
      const labelSize = Math.max(12, Math.round(size * 0.014));
      ctx.font = `600 ${labelSize}px "Montreal Neue", "Space Grotesk", sans-serif`;
      const individual = individuals[index];
      if (metadataOptions.generation) {
        ctx.fillText(`Gen ${individual.generation}`, x + 20, y + 34);
      }
      if (metadataOptions.rank) {
        ctx.fillText(`Rank ${individual.rank}`, x + 20, y + 58);
      }
      if (metadataOptions.fitness) {
        ctx.fillText(`Fit ${individual.fitness.toFixed(3)}`, x + 20, y + 82);
      }
      if (metadataOptions.sparkline) {
        drawSparkline(x + size - 140, y + 20, 120, 40);
      }
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `biological_solver_export_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const updatePreviewGeometry = (connections: ConnectionInfo) => {
    const ids = connections.geometrySources
      .map((source) => {
        const node = useProjectStore
          .getState()
          .workflow.nodes.find((entry) => entry.id === source.nodeId);
        return node?.data?.outputs?.[source.portKey];
      })
      .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
      .filter((value): value is string => typeof value === "string");
    setPreviewGeometryIds(ids);
  };

  const handleApplyToCanvas = (individual: Individual) => {
    const connections = connectionsRef.current;
    if (!connections) return;
    applyGenomeToSliders(connections.genes, individual.genome);
    updatePreviewGeometry(connections);
  };

  const panel = (
    <div
      className={`${styles.panel} ${isMinimized ? styles.panelMinimized : ""}`}
      style={{ ["--solver-scale" as string]: uiScale.toString() } as CSSProperties}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={styles.panelContent}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.title}>{nodeLabel}</div>
            <div className={styles.subtitle}>Interactive Evolutionary Solver</div>
            <p className={styles.description}>{SOLVER_DESCRIPTION}</p>
            <div className={styles.statusPill} title="Solver status">
              <span className={styles.statusDot} />
              {status.toUpperCase()}
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.scaleControl} title="Scale the solver UI">
              <span className={styles.scaleLabel}>Scale</span>
              <input
                className={styles.scaleRange}
                type="range"
                min={0.5}
                max={1.05}
                step={0.05}
                value={uiScale}
                onChange={(event) => setUiScale(Number(event.target.value))}
              />
              <span className={styles.scaleValue}>{scalePercent}%</span>
            </div>
            <WebGLButton
              className={styles.minimizeButton}
              onClick={() => setIsMinimized((prev) => !prev)}
              label={isMinimized ? "Restore" : "Minimize"}
              iconId={isMinimized ? "show" : "hide"}
              iconStyle={POPUP_ICON_STYLE}
              variant="ghost"
              shape="rounded"
              hideLabel
              tooltip={isMinimized ? "Restore popup" : "Minimize popup"}
              title={isMinimized ? "Restore popup" : "Minimize popup"}
            />
            <WebGLButton
              className={styles.closeButton}
              onClick={onClose}
              label="Close"
              iconId="close"
              iconStyle={POPUP_ICON_STYLE}
              variant="ghost"
              shape="rounded"
              hideLabel
              tooltip="Close"
              title="Close popup"
            />
          </div>
        </div>

        <div className={styles.tabBar}>
          {(["setup", "simulation", "outputs"] as TabId[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab)}
              title={`Open ${tab} panel`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {activeTab === "setup" && (
            <div className={styles.page}>
              <div className={styles.sectionGrid}>
                <div className={styles.card}>
                  <div
                    className={styles.cardHeader}
                    title="Configure population size and run length."
                  >
                    Population Parameters
                  </div>
                  <div className={styles.fieldGrid}>
                    <label
                      className={styles.field}
                      title="Number of candidate solutions per generation."
                    >
                      Population Size
                      <input
                        className={styles.input}
                        type="number"
                        min={5}
                        max={100}
                        value={config.populationSize}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) {
                            setConfig((prev) => ({
                              ...prev,
                              populationSize: next,
                            }));
                          }
                        }}
                      />
                    </label>
                    <label
                      className={styles.field}
                      title="How many generations to run when initialized."
                    >
                      Generations
                      <input
                        className={styles.input}
                        type="number"
                        min={1}
                        max={100}
                        value={config.generations}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) {
                            setConfig((prev) => ({
                              ...prev,
                              generations: next,
                            }));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className={styles.card}>
                  <div
                    className={styles.cardHeader}
                    title="Tune mutation and crossover operators."
                  >
                    Genetic Operators
                  </div>
                  <div className={styles.fieldGrid}>
                    <label className={styles.field} title="Chance of mutating each gene.">
                      Mutation Rate
                      <input
                        className={styles.input}
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={config.mutationRate}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) {
                            setConfig((prev) => ({
                              ...prev,
                              mutationRate: next,
                            }));
                          }
                        }}
                      />
                    </label>
                    <label className={styles.field} title="Chance of crossover per reproduction.">
                      Crossover Rate
                      <input
                        className={styles.input}
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={config.crossoverRate}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) {
                            setConfig((prev) => ({
                              ...prev,
                              crossoverRate: next,
                            }));
                          }
                        }}
                      />
                    </label>
                    <label
                      className={styles.field}
                      title="Number of top performers carried into the next generation."
                    >
                      Elitism
                      <input
                        className={styles.input}
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        value={config.elitism}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) {
                            setConfig((prev) => ({
                              ...prev,
                              elitism: next,
                            }));
                          }
                        }}
                      />
                    </label>
                    <label className={styles.field} title="Noise model used for mutations.">
                      Mutation Type
                      <select
                        className={styles.select}
                        value={config.mutationType}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            mutationType: event.target.value as SolverConfig["mutationType"],
                          }))
                        }
                      >
                        <option value="gaussian">Gaussian</option>
                        <option value="uniform">Uniform</option>
                      </select>
                    </label>
                    <label className={styles.field} title="How parents are combined during crossover.">
                      Crossover Type
                      <select
                        className={styles.select}
                        value={config.crossoverType}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            crossoverType: event.target.value as SolverConfig["crossoverType"],
                          }))
                        }
                      >
                        <option value="uniform">Uniform</option>
                        <option value="single-point">Single Point</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className={styles.card}>
                  <div
                    className={styles.cardHeader}
                    title="Choose how parents are selected."
                  >
                    Selection Strategy
                  </div>
                  <div className={styles.fieldGrid}>
                    <label className={styles.field} title="Parent selection algorithm.">
                      Method
                      <select
                        className={styles.select}
                        value={config.selectionMethod}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            selectionMethod: event.target.value as SolverConfig["selectionMethod"],
                          }))
                        }
                      >
                        <option value="tournament">Tournament</option>
                        <option value="roulette">Roulette</option>
                        <option value="rank">Rank</option>
                      </select>
                    </label>
                    <label className={styles.field} title="Number of candidates in each tournament.">
                      Tournament Size
                      <input
                        className={styles.input}
                        type="number"
                        min={2}
                        max={10}
                        step={1}
                        value={config.tournamentSize}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) {
                            setConfig((prev) => ({
                              ...prev,
                              tournamentSize: next,
                            }));
                          }
                        }}
                        disabled={config.selectionMethod !== "tournament"}
                      />
                    </label>
                  </div>
                </div>

                <div className={styles.card}>
                  <div
                    className={styles.cardHeader}
                    title="Control how the first generation is seeded."
                  >
                    Initialization
                  </div>
                  <div className={styles.fieldGrid}>
                    <label
                      className={styles.field}
                      title="Seed the initial population from current slider values."
                    >
                      Seed from Current Sliders
                      <select
                        className={styles.select}
                        value={config.seedFromCurrent ? "seed" : "random"}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            seedFromCurrent: event.target.value === "seed",
                          }))
                        }
                      >
                        <option value="random">Random Population</option>
                        <option value="seed">Seed from Current</option>
                      </select>
                    </label>
                    <label className={styles.field} title="Optional random seed for repeatable runs.">
                      Random Seed
                      <input
                        className={styles.input}
                        type="number"
                        value={config.randomSeed ?? ""}
                        onChange={(event) =>
                          setConfig((prev) => ({
                            ...prev,
                            randomSeed: event.target.value === "" ? null : Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>

              {metrics.length > 0 && (
                <div className={styles.card} style={{ marginTop: "18px" }}>
                  <div
                    className={styles.cardHeader}
                    title="Adjust weighting and direction for each metric."
                  >
                    Fitness Metrics
                  </div>
                  <div className={styles.fieldGrid}>
                    {metrics.map((metric, index) => (
                      <div key={metric.id} className={styles.field}>
                        <div>{metric.name || `Metric ${index + 1}`}</div>
                        <div className={styles.fieldGrid} style={{ gridTemplateColumns: "1fr 1fr" }}>
                          <select
                            className={styles.select}
                            value={metric.mode}
                            title="Choose whether this metric is maximized or minimized."
                            onChange={(event) =>
                              setMetrics((prev) =>
                                prev.map((entry) =>
                                  entry.id === metric.id
                                    ? {
                                        ...entry,
                                        mode: event.target.value as FitnessMetric["mode"],
                                      }
                                    : entry
                                )
                              )
                            }
                          >
                            <option value="maximize">Maximize</option>
                            <option value="minimize">Minimize</option>
                          </select>
                          <input
                            className={styles.input}
                            type="number"
                            min={0}
                          max={1}
                          step={0.05}
                          value={metric.weight}
                          title="Relative weight of this metric in the total fitness."
                          onChange={(event) =>
                            setMetrics((prev) =>
                              prev.map((entry) =>
                                entry.id === metric.id
                                  ? {
                                      ...entry,
                                      weight: Number.isFinite(Number(event.target.value))
                                        ? Number(event.target.value)
                                        : entry.weight,
                                    }
                                  : entry
                              )
                            )
                          }
                        />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "simulation" && (
            <div className={styles.page}>
              <div className={styles.simulationGrid}>
                <div className={`${styles.card} ${styles.chartCard}`}>
                  <div
                    className={styles.cardHeader}
                    title="Track best, mean, and worst fitness each generation."
                  >
                    Convergence Chart
                  </div>
                  <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--ink-700)" }}>
                    <span>● Best</span>
                    <span style={{ opacity: 0.7 }}>— Mean</span>
                    <span style={{ opacity: 0.5 }}>··· Worst</span>
                  </div>
                  <ConvergenceChart history={history} />
                </div>
                <div className={styles.statusGrid}>
                  <div className={styles.card}>
                    <div
                      className={styles.cardHeader}
                      title="Live snapshot of the solver state."
                    >
                      Current Status
                    </div>
                    <div className={styles.statusRow}>
                      <span>Generation</span>
                      <span className={styles.statusValue}>
                        {history.length > 0 ? history.length - 1 : 0} / {config.generations}
                      </span>
                    </div>
                    <div className={styles.statusRow}>
                      <span>Best Fitness</span>
                      <span className={styles.statusValue}>
                        {currentStats ? currentStats.bestFitness.toFixed(3) : "—"}
                      </span>
                    </div>
                    <div className={styles.statusRow}>
                      <span>Mean Fitness</span>
                      <span className={styles.statusValue}>
                        {currentStats ? currentStats.meanFitness.toFixed(3) : "—"}
                      </span>
                    </div>
                    <div className={styles.statusRow}>
                      <span>Diversity (σ)</span>
                      <span className={styles.statusValue}>
                        {currentStats ? currentStats.diversityStdDev.toFixed(3) : "—"}
                      </span>
                    </div>
                  </div>
                  <div className={styles.card}>
                    <div
                      className={styles.cardHeader}
                      title="Control solver execution."
                    >
                      Run Controls
                    </div>
                    <div className={styles.controls}>
                      <WebGLButton
                        label="Run Next Generation"
                        iconId="run"
                        iconStyle={POPUP_ICON_STYLE}
                        variant="primary"
                        accentColor={SOLVER_ACCENTS.run}
                        size="sm"
                        className={styles.actionButton}
                        disabled={!isInitialized}
                        onClick={() => handleRun(1)}
                        tooltip="Advance by one generation."
                        title="Run one generation"
                        shape="rounded"
                      />
                      <div className={styles.fieldGrid}>
                        <label className={styles.field} title="Run multiple generations in a batch.">
                          Run N Generations
                          <input
                            className={styles.input}
                            type="number"
                          min={1}
                          max={100}
                          value={runCount}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (Number.isFinite(next) && next > 0) {
                              setRunCount(next);
                            }
                          }}
                          title="How many generations to run in this batch."
                        />
                        </label>
                        <WebGLButton
                          label="Run"
                          iconId="run"
                          iconStyle={POPUP_ICON_STYLE}
                          variant="primary"
                          accentColor={SOLVER_ACCENTS.runBatch}
                          size="sm"
                          className={styles.actionButton}
                          disabled={!isInitialized}
                          onClick={() => handleRun(runCount)}
                          tooltip="Run the specified number of generations."
                          title="Run batch"
                          shape="rounded"
                        />
                      </div>
                      <div className={styles.controlRow}>
                        <WebGLButton
                          label="Pause"
                          iconId="lock"
                          iconStyle={POPUP_ICON_STYLE}
                          variant="primary"
                          accentColor={SOLVER_ACCENTS.pause}
                          size="sm"
                          className={styles.actionButton}
                          onClick={handlePause}
                          tooltip="Pause the solver loop."
                          title="Pause solver"
                          shape="rounded"
                        />
                        <WebGLButton
                          label="Stop"
                          iconId="close"
                          iconStyle={POPUP_ICON_STYLE}
                          variant="primary"
                          accentColor={SOLVER_ACCENTS.stop}
                          size="sm"
                          className={styles.actionButton}
                          onClick={handleStop}
                          tooltip="Stop after the current generation."
                          title="Stop solver"
                          shape="rounded"
                        />
                        <WebGLButton
                          label="Reset"
                          iconId="undo"
                          iconStyle={POPUP_ICON_STYLE}
                          variant="secondary"
                          accentColor={SOLVER_ACCENTS.reset}
                          size="sm"
                          className={styles.actionButton}
                          onClick={handleReset}
                          tooltip="Clear all generations and start over."
                          title="Reset solver"
                          shape="rounded"
                        />
                      </div>
                    </div>
                  </div>
                  {progress && (
                    <div className={styles.card}>
                      <div
                        className={styles.cardHeader}
                        title="Current evaluation progress."
                      >
                        Progress
                      </div>
                      <div className={styles.statusRow}>
                        <span>{progress.label}</span>
                        <span className={styles.statusValue}>
                          {progress.current} / {progress.total}
                        </span>
                      </div>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${Math.round((progress.current / progress.total) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "outputs" && (
            <div className={styles.page}>
              <div className={styles.outputsGrid}>
                <div className={styles.card} style={{ gap: "16px" }}>
                  <div className={styles.cardHeader} title="Browse and select results.">
                    Gallery
                  </div>
                  <div className={styles.galleryControls}>
                    <select
                      className={styles.select}
                      value={selectedGeneration}
                      onChange={(event) => setSelectedGeneration(event.target.value)}
                      title="Filter by generation."
                    >
                      <option value="all">All Generations</option>
                      {history.map((generation) => (
                        <option key={generation.id} value={generation.id}>
                          Generation {generation.id}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.select}
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value)}
                      title="Sort gallery items."
                    >
                      <option value="fitness">Sort: Fitness</option>
                      <option value="generation">Sort: Generation</option>
                      <option value="rank">Sort: Rank</option>
                    </select>
                  </div>
                  <div className={styles.galleryGrid}>
                    {filteredIndividuals.map((individual) => {
                      const isSelected = selectedIds.has(individual.id);
                      return (
                        <div
                          key={individual.id}
                          className={`${styles.galleryCard} ${isSelected ? styles.selected : ""}`}
                          onClick={() => {
                            setDetailId(individual.id);
                            toggleSelection(individual.id);
                            const connections = connectionsRef.current;
                            if (connections) {
                              applyGenomeToSliders(connections.genes, individual.genome);
                              updatePreviewGeometry(connections);
                            }
                          }}
                          title={isSelected ? "Click to deselect" : "Click to select and preview"}
                        >
                          {individual.thumbnail ? (
                            <img
                              className={styles.galleryImage}
                              src={individual.thumbnail}
                              alt={`Generation ${individual.generation}`}
                            />
                          ) : (
                            <div className={styles.galleryImage} />
                          )}
                          <div className={styles.galleryMeta}>
                            <span>Gen {individual.generation}</span>
                            <span>Rank {individual.rank}</span>
                            <span>Fit {individual.fitness.toFixed(3)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.selectionInfo}>
                    {selectedIds.size > 0 ? (
                      <span>{selectedIds.size} design{selectedIds.size !== 1 ? "s" : ""} selected</span>
                    ) : (
                      <span>Click designs to select for export</span>
                    )}
                  </div>
                  <div className={styles.sectionActions}>
                    <WebGLButton
                      label="Export Best Overall PNG"
                      iconId="download"
                      iconStyle={POPUP_ICON_STYLE}
                      variant="primary"
                      onClick={() => best && exportIndividuals([best], "single")}
                      tooltip="Export the best overall design at full resolution."
                      title="Export best overall"
                      shape="rounded"
                      disabled={!best}
                    />
                    <WebGLButton
                      label="Export Generation Bests PNG"
                      iconId="download"
                      iconStyle={POPUP_ICON_STYLE}
                      variant="secondary"
                      onClick={() =>
                        exportIndividuals(
                          populationBests.flatMap((entry) => entry.individuals.slice(0, 1)),
                          "grid"
                        )
                      }
                      tooltip="Export the top individual from each generation."
                      title="Export generation bests"
                      shape="rounded"
                      disabled={populationBests.length === 0}
                    />
                    <WebGLButton
                      label={`Export Selected (${selectedIds.size})`}
                      iconId="download"
                      iconStyle={POPUP_ICON_STYLE}
                      variant="secondary"
                      onClick={() =>
                        exportIndividuals(
                          gallery
                            ? gallery.allIndividuals.filter((ind) => selectedIds.has(ind.id))
                            : [],
                          "grid"
                        )
                      }
                      tooltip="Export only the selected designs."
                      title="Export selected designs"
                      shape="rounded"
                      disabled={selectedIds.size === 0}
                    />
                    <WebGLButton
                      label="Clear Selection"
                      iconId="close"
                      iconStyle={POPUP_ICON_STYLE}
                      variant="ghost"
                      onClick={() => setSelectedIds(new Set())}
                      tooltip="Clear all selections."
                      title="Clear selection"
                      shape="rounded"
                      disabled={selectedIds.size === 0}
                    />
                  </div>
                </div>
                <div className={`${styles.card} ${styles.detailPanel}`}>
                  <div className={styles.cardHeader} title="Inspect a selected candidate.">
                    Detail View
                  </div>
                  {selectedDetail ? (
                    <>
                      {previewGeometryIds.length > 0 ? (
                        <div className={styles.detailImage}>
                          <div style={{ width: "100%", height: "100%" }}>
                            <WorkflowGeometryViewer geometryIds={previewGeometryIds} />
                          </div>
                        </div>
                      ) : selectedDetail.thumbnail ? (
                        <img
                          className={styles.detailImage}
                          src={selectedDetail.thumbnail}
                          alt="Detail preview"
                        />
                      ) : (
                        <div className={styles.detailImage} />
                      )}
                      <div className={styles.detailMeta}>
                        <div>Generation {selectedDetail.generation}</div>
                        <div>Rank {selectedDetail.rank}</div>
                        <div>Fitness {selectedDetail.fitness.toFixed(3)}</div>
                        <div>Genome: [{selectedDetail.genome.map((v) => v.toFixed(2)).join(", ")}]</div>
                      </div>
                      <div className={styles.sectionActions}>
                        <WebGLButton
                          label="Apply to Canvas"
                          iconId="focus"
                          iconStyle={POPUP_ICON_STYLE}
                          variant="primary"
                          onClick={() => handleApplyToCanvas(selectedDetail)}
                          tooltip="Apply this genome to connected sliders."
                          title="Apply to canvas"
                          shape="rounded"
                        />
                        <WebGLButton
                          label="Export Solo"
                          iconId="download"
                          iconStyle={POPUP_ICON_STYLE}
                          variant="secondary"
                          onClick={() => exportIndividuals([selectedDetail], "single")}
                          tooltip="Export this design as a single PNG."
                          title="Export selected design"
                          shape="rounded"
                        />
                      </div>
                    </>
                  ) : (
                    <div className={styles.detailMeta}>Select a design to inspect.</div>
                  )}
                  <div
                    className={styles.cardHeader}
                    title="Toggle metadata overlays for exports."
                  >
                    Metadata Overlay
                  </div>
                  <div className={styles.fieldGrid}>
                    {(Object.keys(metadataOptions) as Array<keyof typeof metadataOptions>).map(
                      (key) => (
                        <label
                          key={key}
                          className={styles.field}
                          title={`Include ${key} in exports.`}
                        >
                          <input
                            type="checkbox"
                            checked={metadataOptions[key]}
                            onChange={(event) =>
                              setMetadataOptions((prev) => ({
                                ...prev,
                                [key]: event.target.checked,
                              }))
                            }
                          />
                          {key}
                        </label>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {error ? <div className={styles.errorText}>{error}</div> : <span />}
          <div className={styles.sectionActions}>
            <WebGLButton
              label="Cancel"
              iconId="close"
              iconStyle={POPUP_ICON_STYLE}
              variant="ghost"
              onClick={onClose}
              tooltip="Close the solver popup."
              title="Close popup"
              shape="rounded"
            />
            <WebGLButton
              label="Initialize"
              iconId="run"
              iconStyle={POPUP_ICON_STYLE}
              variant="primary"
              onClick={handleInitialize}
              disabled={status === "running"}
              tooltip="Initialize the solver with the current setup."
              title="Initialize solver"
              shape="rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const wrapper = isMinimized ? (
    <div className={styles.docked} data-capture-hide="true" role="dialog" aria-modal="false">
      {panel}
    </div>
  ) : (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      data-capture-hide="true"
    >
      {panel}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(wrapper, document.body);
};

export default BiologicalSolverPopup;
