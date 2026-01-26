import { useMemo, useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import Modal from "./Modal";
import styles from "./TableModal.module.css";

type MaterialsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MaterialsModal = ({ isOpen, onClose }: MaterialsModalProps) => {
  const materials = useProjectStore((state) => state.materials);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "density">("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const tableData = useMemo(() => {
    const filtered = materials.filter((material) =>
      material.name.toLowerCase().includes(query.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      const valueA = sortKey === "density" ? a.density_kg_m3 : a.name;
      const valueB = sortKey === "density" ? b.density_kg_m3 : b.name;
      if (valueA < valueB) return direction === "asc" ? -1 : 1;
      if (valueA > valueB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [materials, query, sortKey, direction]);

  const toggleSort = (key: "name" | "density") => {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Material Density Database">
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
            <th onClick={() => toggleSort("name")}>Material</th>
            <th onClick={() => toggleSort("density")}>Density (kg/m³)</th>
            <th>Category</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.density_kg_m3}</td>
              <td>{row.category}</td>
              <td>{row.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
};

export default MaterialsModal;
