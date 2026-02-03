import React, { useMemo, useState } from "react";
import styles from "./ChemistrySimulatorDashboard.module.css";
import { useProjectStore } from "../../../store/useProjectStore";
import { SemanticOpsPanel } from "../SemanticOpsPanel";
import type { ChemistryMaterialSpec } from "../../../data/chemistryMaterials";

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return fallback;
};

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Math.abs(value) > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const formatNumber = (value: unknown, digits = 3) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(digits);
  }
  return "—";
};

const formatPercent = (value: unknown, digits = 2) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${(value * 100).toFixed(digits)}%`;
  }
  return "—";
};

const formatVec3 = (value: unknown, digits = 2) => {
  if (!value || typeof value !== "object") return "—";
  const candidate = value as { x?: number; y?: number; z?: number };
  if (
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.z === "number"
  ) {
    return `(${candidate.x.toFixed(digits)}, ${candidate.y.toFixed(digits)}, ${candidate.z.toFixed(digits)})`;
  }
  return "—";
};

type ChemistrySimulatorDashboardProps = {
  nodeId: string;
  onClose: () => void;
};

export const ChemistrySimulatorDashboard: React.FC<ChemistrySimulatorDashboardProps> = ({
  nodeId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"parameters" | "output" | "semantic">("parameters");
  const [scale, setScale] = useState(100);

  const { nodes, edges, updateNodeData, recalculateWorkflow } = useProjectStore(
    (state) => ({
      nodes: state.workflow.nodes,
      edges: state.workflow.edges,
      updateNodeData: state.updateNodeData,
      recalculateWorkflow: state.recalculateWorkflow,
    })
  );

  const solverNode = useMemo(
    () => nodes.find((node) => node.id === nodeId),
    [nodes, nodeId]
  );

  const parameters = solverNode?.data?.parameters ?? {};
  const outputs = solverNode?.data?.outputs ?? {};
  const evaluationError = solverNode?.data?.evaluationError;
  const diagnostics = outputs.diagnostics as Record<string, unknown> | undefined;
  const validation = diagnostics?.validation as Record<string, unknown> | undefined;
  const analysis = diagnostics?.analysis as Record<string, unknown> | undefined;
  const semantics = diagnostics?.semantics as Record<string, unknown> | undefined;
  const materials = Array.isArray(diagnostics?.materials)
    ? (diagnostics?.materials as ChemistryMaterialSpec[])
    : [];

  const particleCount = toNumber(parameters.particleCount, 5000);
  const iterations = toNumber(parameters.iterations, 500);
  const fieldResolution = toNumber(parameters.fieldResolution, 32);
  const convergenceTolerance = toNumber(parameters.convergenceTolerance, 1e-6);
  const blendStrength = toNumber(parameters.blendStrength, 0.5);
  const isoValue = toNumber(parameters.isoValue, 0.5);
  const enabled = toBoolean(parameters.enabled, true);

  const hasDomain = edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === "domain"
  );
  const materialsCount = edges.filter(
    (edge) => edge.target === nodeId && edge.targetHandle === "materials"
  ).length;
  const goalsCount = edges.filter(
    (edge) => edge.target === nodeId && edge.targetHandle === "goals"
  ).length;

  const handleParameterChange = (key: string, value: number | string | boolean) => {
    updateNodeData(nodeId, { parameters: { [key]: value } });
  };

  const handleRun = () => {
    recalculateWorkflow();
  };

  const particlesArray = Array.isArray(outputs.particles)
    ? (outputs.particles as unknown[])
    : [];
  const historyArray = Array.isArray(outputs.history)
    ? (outputs.history as unknown[])
    : [];
  const finalEnergy = historyArray.length > 0
    ? toNumber((historyArray[historyArray.length - 1] as any)?.energy, 0)
    : 0;
  const convergence = diagnostics?.convergence != null
    ? toNumber(diagnostics.convergence, 0)
    : 0;
  const actualIterations = diagnostics?.iterations != null
    ? toNumber(diagnostics.iterations, 0)
    : 0;
  const conservation = validation?.conservation as Record<string, unknown> | undefined;
  const constraints = validation?.constraints as Record<string, unknown> | undefined;
  const stability = validation?.stability as Record<string, unknown> | undefined;
  const convergenceAnalysis = analysis?.convergence as Record<string, unknown> | undefined;
  const materialDistributions = Array.isArray(analysis?.materialDistributions)
    ? (analysis?.materialDistributions as Array<Record<string, unknown>>)
    : [];
  const gradientFields = Array.isArray(analysis?.gradientFields)
    ? (analysis?.gradientFields as Array<Record<string, unknown>>)
    : [];
  const particleStatistics = analysis?.particleStatistics as Record<string, unknown> | undefined;
  const semanticsOutputs =
    semantics && typeof semantics.outputs === "object"
      ? (semantics.outputs as Record<string, Record<string, unknown>>)
      : {};
  const semanticsFields =
    semantics && typeof semantics.fields === "object"
      ? (semantics.fields as Record<string, Record<string, unknown>>)
      : {};
  const hasValidation = Boolean(validation);
  const hasAnalysis = Boolean(analysis);
  const hasSemantics =
    Object.keys(semanticsOutputs).length > 0 || Object.keys(semanticsFields).length > 0;
  const hasMaterials = materials.length > 0;

  return (
    <div className={styles.dashboard} style={{ fontSize: `${scale}%` }}>
      <div className={styles.header}>
        <div className={styles.headerBar} />
        <div className={styles.headerContent}>
          <div className={styles.title}>
            <span className={styles.titleGreek}>Ἐπιλύτης Χημείας</span>
            <span className={styles.titleEnglish}>Chemistry Solver</span>
            <span className={styles.titleSubtext}>Empedocles · Material Transmutation</span>
          </div>
          <div className={styles.headerControls}>
            <label className={styles.scaleControl}>
              Scale:
              <input
                type="range"
                min="50"
                max="100"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              />
              <span>{scale}%</span>
            </label>
            <button className={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "parameters" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("parameters")}
        >
          Parameters
        </button>
        <button
          className={`${styles.tab} ${activeTab === "output" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("output")}
        >
          Output
        </button>
        <button
          className={`${styles.tab} ${activeTab === "semantic" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("semantic")}
        >
          Semantic Ops
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "parameters" && (
          <div className={styles.parametersTab}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Solver Parameters</h3>
              <div className={styles.materialPropsGrid}>
                <label>
                  Particle Count
                  <input
                    type="number"
                    value={particleCount}
                    onChange={(e) => handleParameterChange("particleCount", Number(e.target.value))}
                    min={100}
                    max={100000}
                    step={100}
                  />
                </label>
                <label>
                  Iterations
                  <input
                    type="number"
                    value={iterations}
                    onChange={(e) => handleParameterChange("iterations", Number(e.target.value))}
                    min={10}
                    max={10000}
                  />
                </label>
                <label>
                  Field Resolution
                  <input
                    type="number"
                    value={fieldResolution}
                    onChange={(e) => handleParameterChange("fieldResolution", Number(e.target.value))}
                    min={8}
                    max={128}
                  />
                </label>
                <label>
                  Convergence Tolerance
                  <input
                    type="number"
                    value={convergenceTolerance}
                    onChange={(e) => handleParameterChange("convergenceTolerance", Number(e.target.value))}
                    step="1e-7"
                  />
                </label>
                <label>
                  Blend Strength
                  <input
                    type="number"
                    value={blendStrength}
                    onChange={(e) => handleParameterChange("blendStrength", Number(e.target.value))}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </label>
                <label>
                  Iso Value
                  <input
                    type="number"
                    value={isoValue}
                    onChange={(e) => handleParameterChange("isoValue", Number(e.target.value))}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </label>
                <label>
                  Enabled
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleParameterChange("enabled", e.target.checked)}
                  />
                </label>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Connected Inputs</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Domain</div>
                  <div className={styles.summaryValue}>{hasDomain ? "Connected" : "Missing"}</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Materials</div>
                  <div className={styles.summaryValue}>{materialsCount}</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Goals</div>
                  <div className={styles.summaryValue}>{goalsCount}</div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.controlPanel}>
                <button className={styles.controlButton} onClick={handleRun}>
                  Run Solver
                </button>
              </div>
              {evaluationError && (
                <div className={styles.warningBanner}>Error: {evaluationError}</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "output" && (
          <div className={styles.outputTab}>
            {evaluationError && (
              <div className={styles.warningBanner}>Error: {evaluationError}</div>
            )}
            <div className={styles.outputGrid}>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Particles</div>
                <div className={styles.outputValue}>{particlesArray.length}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Iterations</div>
                <div className={styles.outputValue}>{actualIterations > 0 ? actualIterations : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Final Energy</div>
                <div className={styles.outputValue}>{finalEnergy > 0 ? finalEnergy.toFixed(2) : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Convergence</div>
                <div className={styles.outputValue}>{convergence > 0 ? convergence.toFixed(6) : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Materials</div>
                <div className={styles.outputValue}>{diagnostics?.materialCount != null ? String(diagnostics.materialCount) : "—"}</div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Compute Time</div>
                <div className={styles.outputValue}>
                  {diagnostics?.computeTime != null ? `${Number(diagnostics.computeTime).toFixed(1)} ms` : "—"}
                </div>
              </div>
              <div className={styles.outputCard}>
                <div className={styles.outputLabel}>Geometry Output</div>
                <div className={styles.outputValue}>
                  {typeof outputs.geometry === "string" ? outputs.geometry : "—"}
                </div>
              </div>
            </div>
            {diagnostics?.warnings && Array.isArray(diagnostics.warnings) && diagnostics.warnings.length > 0 ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Warnings</h3>
                <div className={styles.warningsList}>
                  {(diagnostics.warnings as string[]).map((warning, idx) => (
                    <div key={idx} className={styles.warningItem}>{String(warning)}</div>
                  ))}
                </div>
              </div>
            ) : null}
            {(hasValidation || hasAnalysis || hasSemantics || hasMaterials) && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>PhD Diagnostics</h3>
                <div className={styles.diagnosticsStack}>
                  {hasValidation && (
                    <details className={styles.diagnosticGroup} open>
                      <summary className={styles.diagnosticSummary}>Validation & Conservation</summary>
                      <div className={styles.diagnosticBody}>
                        <div className={styles.metricGrid}>
                          <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Mass</div>
                            <div className={styles.metricValue}>
                              {formatNumber((conservation as any)?.mass?.final)}
                            </div>
                            <div className={styles.metricMeta}>
                              Δ {formatNumber((conservation as any)?.mass?.error)} · {formatPercent((conservation as any)?.mass?.relativeError)}
                            </div>
                            <div
                              className={`${styles.metricStatus} ${
                                (conservation as any)?.mass?.conserved ? styles.metricStatusGood : styles.metricStatusWarn
                              }`}
                            >
                              {(conservation as any)?.mass?.conserved ? "Conserved" : "Drift"}
                            </div>
                          </div>
                          <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Momentum</div>
                            <div className={styles.metricValue}>
                              {formatVec3((conservation as any)?.momentum?.final)}
                            </div>
                            <div className={styles.metricMeta}>
                              Δ {formatVec3((conservation as any)?.momentum?.error)} · {formatPercent((conservation as any)?.momentum?.relativeError)}
                            </div>
                            <div
                              className={`${styles.metricStatus} ${
                                (conservation as any)?.momentum?.conserved ? styles.metricStatusGood : styles.metricStatusWarn
                              }`}
                            >
                              {(conservation as any)?.momentum?.conserved ? "Conserved" : "Drift"}
                            </div>
                          </div>
                          <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Energy</div>
                            <div className={styles.metricValue}>
                              {formatNumber((conservation as any)?.energy?.final)}
                            </div>
                            <div className={styles.metricMeta}>
                              Δ {formatNumber((conservation as any)?.energy?.error)} · {formatPercent((conservation as any)?.energy?.relativeError)}
                            </div>
                            <div
                              className={`${styles.metricStatus} ${
                                (conservation as any)?.energy?.conserved ? styles.metricStatusGood : styles.metricStatusWarn
                              }`}
                            >
                              {(conservation as any)?.energy?.conserved ? "Conserved" : "Drift"}
                            </div>
                          </div>
                        </div>
                        <div className={styles.subSection}>
                          <div className={styles.subTitle}>Physical Constraints</div>
                          <div className={styles.flagGrid}>
                            <div className={styles.flagItem}>
                              <span>Density Positive</span>
                              <span className={(constraints as any)?.densityPositive ? styles.flagGood : styles.flagBad}>
                                {(constraints as any)?.densityPositive ? "OK" : "Fail"}
                              </span>
                            </div>
                            <div className={styles.flagItem}>
                              <span>Concentration Bounded</span>
                              <span className={(constraints as any)?.concentrationBounded ? styles.flagGood : styles.flagBad}>
                                {(constraints as any)?.concentrationBounded ? "OK" : "Fail"}
                              </span>
                            </div>
                            <div className={styles.flagItem}>
                              <span>Concentration Normalized</span>
                              <span className={(constraints as any)?.concentrationNormalized ? styles.flagGood : styles.flagBad}>
                                {(constraints as any)?.concentrationNormalized ? "OK" : "Fail"}
                              </span>
                            </div>
                            <div className={styles.flagItem}>
                              <span>Velocity Finite</span>
                              <span className={(constraints as any)?.velocityFinite ? styles.flagGood : styles.flagBad}>
                                {(constraints as any)?.velocityFinite ? "OK" : "Fail"}
                              </span>
                            </div>
                            <div className={styles.flagItem}>
                              <span>Pressure Finite</span>
                              <span className={(constraints as any)?.pressureFinite ? styles.flagGood : styles.flagBad}>
                                {(constraints as any)?.pressureFinite ? "OK" : "Fail"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={styles.subSection}>
                          <div className={styles.subTitle}>Numerical Stability</div>
                          <div className={styles.metricGrid}>
                            <div className={styles.metricCard}>
                              <div className={styles.metricLabel}>Max Velocity</div>
                              <div className={styles.metricValue}>
                                {formatNumber((stability as any)?.maxVelocity)}
                              </div>
                            </div>
                            <div className={styles.metricCard}>
                              <div className={styles.metricLabel}>Max Acceleration</div>
                              <div className={styles.metricValue}>
                                {formatNumber((stability as any)?.maxAcceleration)}
                              </div>
                            </div>
                            <div className={styles.metricCard}>
                              <div className={styles.metricLabel}>CFL Number</div>
                              <div className={styles.metricValue}>
                                {formatNumber((stability as any)?.cflNumber, 4)}
                              </div>
                              <div
                                className={`${styles.metricStatus} ${
                                  (stability as any)?.stable ? styles.metricStatusGood : styles.metricStatusWarn
                                }`}
                              >
                                {(stability as any)?.stable ? "Stable" : "Unstable"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>
                  )}
                  {hasAnalysis && (
                    <details className={styles.diagnosticGroup}>
                      <summary className={styles.diagnosticSummary}>Analysis & Convergence</summary>
                      <div className={styles.diagnosticBody}>
                        <div className={styles.metricGrid}>
                          <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Converged</div>
                            <div className={styles.metricValue}>
                              {(convergenceAnalysis as any)?.converged ? "Yes" : "No"}
                            </div>
                          </div>
                          <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Final Residual</div>
                            <div className={styles.metricValue}>
                              {formatNumber((convergenceAnalysis as any)?.finalResidual, 6)}
                            </div>
                          </div>
                          <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Convergence Rate</div>
                            <div className={styles.metricValue}>
                              {formatNumber((convergenceAnalysis as any)?.convergenceRate, 4)}
                            </div>
                          </div>
                          <div className={styles.metricCard}>
                            <div className={styles.metricLabel}>Iterations to Converge</div>
                            <div className={styles.metricValue}>
                              {formatNumber((convergenceAnalysis as any)?.iterationsToConvergence, 0)}
                            </div>
                          </div>
                        </div>
                        {materialDistributions.length > 0 && (
                          <div className={styles.subSection}>
                            <div className={styles.subTitle}>Material Distributions</div>
                            <div className={styles.distributionGrid}>
                              {materialDistributions.slice(0, 6).map((entry, index) => (
                                <div key={index} className={styles.distributionCard}>
                                  <div className={styles.distributionTitle}>
                                    {String((entry as any)?.materialName ?? "Material")}
                                  </div>
                                  <div className={styles.distributionMeta}>
                                    Mean: {formatNumber((entry as any)?.statistics?.mean)} · Vol: {formatNumber((entry as any)?.spatialDistribution?.volume)}
                                  </div>
                                  <div className={styles.distributionMeta}>
                                    Centroid: {formatVec3((entry as any)?.spatialDistribution?.centroid)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {gradientFields.length > 0 && (
                          <div className={styles.subSection}>
                            <div className={styles.subTitle}>Gradient Fields</div>
                            <div className={styles.metricGrid}>
                              {gradientFields.slice(0, 3).map((field, index) => (
                                <div key={index} className={styles.metricCard}>
                                  <div className={styles.metricLabel}>Field {index + 1}</div>
                                  <div className={styles.metricValue}>
                                    Mean: {formatNumber((field as any)?.statistics?.mean)}
                                  </div>
                                  <div className={styles.metricMeta}>
                                    Max: {formatNumber((field as any)?.statistics?.max)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {particleStatistics && (
                          <div className={styles.subSection}>
                            <div className={styles.subTitle}>Particle Statistics</div>
                            <div className={styles.metricGrid}>
                              <div className={styles.metricCard}>
                                <div className={styles.metricLabel}>Density Mean</div>
                                <div className={styles.metricValue}>
                                  {formatNumber((particleStatistics as any)?.density?.mean)}
                                </div>
                              </div>
                              <div className={styles.metricCard}>
                                <div className={styles.metricLabel}>Pressure Mean</div>
                                <div className={styles.metricValue}>
                                  {formatNumber((particleStatistics as any)?.pressure?.mean)}
                                </div>
                              </div>
                              <div className={styles.metricCard}>
                                <div className={styles.metricLabel}>Velocity Mean</div>
                                <div className={styles.metricValue}>
                                  {formatVec3((particleStatistics as any)?.velocity?.mean)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                  {hasMaterials && (
                    <details className={styles.diagnosticGroup}>
                      <summary className={styles.diagnosticSummary}>Materials</summary>
                      <div className={styles.diagnosticBody}>
                        <div className={styles.materialList}>
                          {materials.map((material) => (
                            <div key={material.name} className={styles.materialItem}>
                              <div
                                className={styles.materialSwatch}
                                style={{
                                  background: `rgb(${Math.round(material.color[0] * 255)}, ${Math.round(material.color[1] * 255)}, ${Math.round(material.color[2] * 255)})`,
                                }}
                              />
                              <div className={styles.materialDetails}>
                                <div className={styles.materialName}>{material.name}</div>
                                <div className={styles.materialMeta}>
                                  Density {formatNumber(material.density)} · Stiffness {formatNumber(material.stiffness)}
                                </div>
                                <div className={styles.materialMeta}>
                                  Thermal {formatNumber(material.thermalConductivity)} · Optical {formatPercent(material.opticalTransmission)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}
                  {hasSemantics && (
                    <details className={styles.diagnosticGroup}>
                      <summary className={styles.diagnosticSummary}>Semantic Metadata</summary>
                      <div className={styles.diagnosticBody}>
                        <div className={styles.semanticGrid}>
                          {Object.entries(semanticsOutputs).slice(0, 8).map(([key, meta]) => (
                            <div key={key} className={styles.semanticCard}>
                              <div className={styles.semanticTitle}>{(meta as any)?.name ?? key}</div>
                              <div className={styles.semanticMeta}>
                                {(meta as any)?.unit?.symbol ?? "—"} · {(meta as any)?.dataType ?? "scalar"}
                              </div>
                              <div className={styles.semanticDescription}>
                                {(meta as any)?.description ?? ""}
                              </div>
                            </div>
                          ))}
                          {Object.entries(semanticsFields).slice(0, 6).map(([key, meta]) => (
                            <div key={key} className={styles.semanticCard}>
                              <div className={styles.semanticTitle}>{(meta as any)?.field?.name ?? key}</div>
                              <div className={styles.semanticMeta}>
                                {(meta as any)?.field?.unit?.symbol ?? "—"} · {(meta as any)?.field?.dataType ?? "field"}
                              </div>
                              <div className={styles.semanticDescription}>
                                {(meta as any)?.field?.description ?? ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "semantic" && (
          <div className={styles.semanticTab}>
            <SemanticOpsPanel nodeId={nodeId} nodeType="chemistrySolver" />
          </div>
        )}
      </div>
    </div>
  );
};
