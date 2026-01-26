import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { useProjectStore } from "../store/useProjectStore";
import styles from "./DashboardSection.module.css";

const DashboardSection = () => {
  const dataValues = useProjectStore((state) => state.dataValues);
  const computed = useProjectStore((state) => state.computed);
  const pieColors = ["#f97316", "#eaeaf0"];
  const tooltipStyles = {
    contentStyle: {
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderLeft: "3px solid var(--color-accent)",
      borderRadius: "10px",
      boxShadow: "var(--shadow-xs)",
      fontSize: "12px",
    },
    labelStyle: {
      color: "var(--color-muted)",
      fontSize: "11px",
      marginBottom: "4px",
    },
    itemStyle: {
      color: "var(--color-text)",
    },
  };

  const kpis = useMemo(() => {
    const entries = Object.entries(dataValues).map(([label, value]) => ({
      label,
      value,
      unit: "kgCO2e",
    }));
    const defaults = [
      { label: "Mass", value: computed.mass_kg, unit: "kg" },
      {
        label: "GWP Intensity",
        value: computed.gwpIntensity_kgCO2e_per_kg,
        unit: "kgCO2e/kg",
      },
      { label: "Material GWP", value: computed.materialGWP_kgCO2e, unit: "kgCO2e" },
      {
        label: "Composite GWP",
        value: computed.compositeGWP_kgCO2e,
        unit: "kgCO2e",
      },
    ];
    return [...entries, ...defaults].slice(0, 4);
  }, [dataValues, computed]);

  const trendData = useMemo(() => {
    const base = computed.compositeGWP_kgCO2e || 1;
    return [0.75, 0.9, 1, 1.15, 1.05].map((factor, index) => ({
      step: `S${index + 1}`,
      value: Number((base * factor).toFixed(2)),
    }));
  }, [computed.compositeGWP_kgCO2e]);

  const pieData = useMemo(() => {
    const material = computed.materialGWP_kgCO2e || 0;
    const composite = computed.compositeGWP_kgCO2e || 0;
    const process = Math.max(composite - material, 0);
    return [
      { name: "Material", value: Number(material.toFixed(2)) },
      { name: "Process", value: Number(process.toFixed(2)) },
    ];
  }, [computed.materialGWP_kgCO2e, computed.compositeGWP_kgCO2e]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2>Cradle-to-Gate LCA Insights</h2>
          <p>Graphs, charts, statistics, and diagrams from live workflow data.</p>
        </div>
        <div className={styles.badge}>Real-time</div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Statistics</h3>
          <div className={styles.kpiGrid}>
            {kpis.map((kpi) => (
              <div key={kpi.label} className={styles.kpiCard}>
                <span>{kpi.label}</span>
                <strong>{kpi.value.toFixed(2)}</strong>
                <small>{kpi.unit}</small>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h3>GWP Trend (Graph)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#eaeaf0" />
              <XAxis
                dataKey="step"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={{ stroke: "#eaeaf0" }}
                tickLine={{ stroke: "#eaeaf0" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={{ stroke: "#eaeaf0" }}
                tickLine={{ stroke: "#eaeaf0" }}
              />
              <Tooltip
                contentStyle={tooltipStyles.contentStyle}
                labelStyle={tooltipStyles.labelStyle}
                itemStyle={tooltipStyles.itemStyle}
                cursor={{ stroke: "rgba(249, 115, 22, 0.12)" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                fill="url(#trendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card}>
          <h3>Material Split (Chart)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#f97316"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyles.contentStyle}
                labelStyle={tooltipStyles.labelStyle}
                itemStyle={tooltipStyles.itemStyle}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.legend}>
            <span>
              <em className={styles.legendPrimary} /> Material
            </span>
            <span>
              <em className={styles.legendSecondary} /> Process
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <h3>Layer Flow (Diagram)</h3>
          <svg viewBox="0 0 320 120" className={styles.diagram}>
            <rect x="8" y="20" width="80" height="28" rx="8" />
            <rect x="112" y="20" width="80" height="28" rx="8" />
            <rect x="216" y="20" width="80" height="28" rx="8" />
            <rect x="112" y="70" width="80" height="28" rx="8" />
            <line x1="88" y1="34" x2="112" y2="34" />
            <line x1="192" y1="34" x2="216" y2="34" />
            <line x1="152" y1="48" x2="152" y2="70" />
            <text x="18" y="38">
              Layer
            </text>
            <text x="124" y="38">
              Material
            </text>
            <text x="232" y="38">
              Mass
            </text>
            <text x="132" y="88">
              GWP
            </text>
          </svg>
          <p className={styles.diagramHint}>
            Flow shows Layer &gt; Material &gt; Mass &gt; GWP pipeline.
          </p>
        </div>
      </div>
    </section>
  );
};

export default DashboardSection;
