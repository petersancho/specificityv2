import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import styles from "./DocumentationPage.module.css"
import type { CodeSection } from "./documentation/liveCodebaseData"

type DiagramProps = {
  sections: CodeSection[]
  activeSectionId?: string | null
  onSelectSection?: (id: string) => void
}

type Point = { x: number; y: number }

type PositionMap = Record<string, Point>

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const DocumentationCodebaseDiagram = ({ sections, activeSectionId, onSelectSection }: DiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<PositionMap>({})
  const draggingId = useRef<string | null>(null)
  const pointerOffset = useRef<Point>({ x: 0, y: 0 })

  const computeInitialPositions = () => {
    const container = containerRef.current
    const width = container?.clientWidth ?? 640
    const height = container?.clientHeight ?? 420
    const radius = Math.min(width, height) / 2 - 80
    const centerX = width / 2
    const centerY = height / 2
    const next: PositionMap = {}
    sections.forEach((section, index) => {
      const angle = (index / sections.length) * Math.PI * 2 - Math.PI / 2
      next[section.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    })
    setPositions(next)
  }

  useEffect(() => {
    computeInitialPositions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length])

  useEffect(() => {
    const handleResize = () => computeInitialPositions()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  })

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!draggingId.current) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const id = draggingId.current
      setPositions((prev) => {
        const next = { ...prev }
        const x = clamp(event.clientX - rect.left - pointerOffset.current.x, 60, rect.width - 60)
        const y = clamp(event.clientY - rect.top - pointerOffset.current.y, 60, rect.height - 60)
        next[id!] = { x, y }
        return next
      })
    }

    const handlePointerUp = () => {
      draggingId.current = null
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [])

  const handlePointerDown = (sectionId: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const pos = positions[sectionId] ?? { x: rect.width / 2, y: rect.height / 2 }
    draggingId.current = sectionId
    pointerOffset.current = {
      x: event.clientX - (rect.left + pos.x),
      y: event.clientY - (rect.top + pos.y),
    }
  }

  const wires = useMemo(() => {
    const list: Array<{ from: Point; to: Point }> = []
    for (let i = 0; i < sections.length; i += 1) {
      const current = positions[sections[i].id]
      const next = positions[sections[(i + 1) % sections.length].id]
      if (current && next) list.push({ from: current, to: next })
    }
    return list
  }, [positions, sections])

  return (
    <div className={styles.diagramSection}>
      <div className={styles.diagram} ref={containerRef}>
        <svg className={styles.diagramSvg} role="presentation">
          {wires.map((wire, index) => (
            <line
              key={index}
              x1={wire.from.x}
              y1={wire.from.y}
              x2={wire.to.x}
              y2={wire.to.y}
              className={styles.diagramWire}
            />
          ))}
        </svg>
        {sections.map((section) => {
          const pos = positions[section.id] ?? { x: 0, y: 0 }
          const nodeStyle = {
            left: pos.x,
            top: pos.y,
            "--diagram-accent": section.accent,
          } as CSSProperties & Record<string, string | number>
          return (
            <button
              key={section.id}
              type="button"
              className={`${styles.diagramNode} ${
                section.id === activeSectionId ? styles.diagramNodeActive : ""
              }`}
              style={nodeStyle}
              onPointerDown={handlePointerDown(section.id)}
              onClick={() => onSelectSection?.(section.id)}
            >
              <span className={styles.diagramNodeTitle}>{section.title}</span>
              <span className={styles.diagramNodeDesc}>{section.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DocumentationCodebaseDiagram
