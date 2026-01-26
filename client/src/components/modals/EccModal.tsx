import { useMemo, useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import Modal from "./Modal";
import styles from "./TableModal.module.css";

type EccModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const EccModal = ({ isOpen, onClose }: EccModalProps) => {
  const ecc = useProjectStore((state) => state.ecc);
  const materials = useProjectStore((state) => state.materials);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"material" | "ecc">("material");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const tableData = useMemo(() => {
    const rows = ecc.map((record) => {
      const material = materials.find((item) => item.id === record.materialId);
      return {
        id: record.id,
        material: material?.name ?? record.materialId,
        ecc: record.ecc_kgco2e_per_kg,
        stage: record.stage,
        source: record.source,
      };
    });

    const filtered = rows.filter((row) =>
      row.material.toLowerCase().includes(query.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      const valueA = sortKey === "ecc" ? a.ecc : a.material;
      const valueB = sortKey === "ecc" ? b.ecc : b.material;
      if (valueA < valueB) return direction === "asc" ? -1 : 1;
      if (valueA > valueB) return direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [ecc, materials, query, sortKey, direction]);

  const toggleSort = (key: "material" | "ecc") => {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ECC Database">
      <div className={styles.searchRow}>
        <input
          placeholder="Search materials..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th onClick={() => toggleSort("material")}>Material</th>
            <th onClick={() => toggleSort("ecc")}>ECC (kgCO2e/kg)</th>
            <th>Stage</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.id}>
              <td>{row.material}</td>
              <td>{row.ecc.toFixed(2)}</td>
              <td>{row.stage}</td>
              <td>{row.source}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.formulas}>
        <h3>Formulas Used</h3>
        <ul>
          <li>mass_kg = volume_m3 × density_kg_m3</li>
          <li>materialGWP_kgCO2e = mass_kg × ecc_kgCO2e_per_kg</li>
          <li>gwpIntensity_kgCO2e_per_kg = materialGWP / mass (0-safe)</li>
          <li>compositeGWP_kgCO2e = sum of connected materialGWP inputs</li>
        </ul>
      </div>
    </Modal>
  );
};

export default EccModal;
