import { SHADOWS } from '../../data/wildlife/attributes'
import './ShadowIndicator.css'

// Tiga oval dari kecil ke besar, dalam viewBox 96×32.
const SIZE_SHAPES = [
  { size: 1, cx: 14, rx: 8, ry: 4.5 },
  { size: 2, cx: 40, rx: 13, ry: 7 },
  { size: 3, cx: 74, rx: 19, ry: 10 },
]

/**
 * Ilustrasi bayangan ikan di air. Small/Medium/Large ditampilkan sebagai skala tiga oval
 * dengan ukuran yang berlaku terisi; Gold dan Blue ditampilkan sebagai satu oval berwarna.
 */
function ShadowIndicator({ shadow }) {
  const meta = SHADOWS[shadow]
  if (!meta) return null

  if (meta.tone) {
    return (
      <svg className={`shadow-indicator shadow-indicator--${meta.tone}`} viewBox="0 0 96 32" aria-hidden="true">
        <ellipse className="shadow-indicator__glow" cx="48" cy="16" rx="30" ry="13" />
        <ellipse className="shadow-indicator__fill" cx="48" cy="16" rx="20" ry="9" />
      </svg>
    )
  }

  return (
    <svg className="shadow-indicator" viewBox="0 0 96 32" aria-hidden="true">
      {SIZE_SHAPES.map((shape) => (
        <ellipse
          key={shape.size}
          className={shape.size === meta.size ? 'shadow-indicator__fill' : 'shadow-indicator__ghost'}
          cx={shape.cx}
          cy="16"
          rx={shape.rx}
          ry={shape.ry}
        />
      ))}
    </svg>
  )
}

export default ShadowIndicator
