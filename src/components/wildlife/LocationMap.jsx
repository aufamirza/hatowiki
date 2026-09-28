import { useId } from 'react'
import { MapPin, MapPinned } from 'lucide-react'
import { LOCATION_ZONES, MAP_SIZE } from '../../data/wildlife/locationZones'
import { zoneViewBox } from '../../data/wildlife/zoneViewBox'
import './LocationMap.css'

const formatNames = new Intl.ListFormat('id', { type: 'conjunction' })

// Potongan peta di sekitar pin: lebar 400 unit (40% peta), rasio sama dengan kotak peta (1,08), tidak keluar peta.
const SPOT_VIEW_WIDTH = 400
const SPOT_VIEW_HEIGHT = Math.round(SPOT_VIEW_WIDTH / 1.08)
const clamp = (value, max) => Math.min(Math.max(value, 0), max)
function spotViewBox({ x, y }) {
  const left = clamp(x - SPOT_VIEW_WIDTH / 2, MAP_SIZE - SPOT_VIEW_WIDTH)
  const top = clamp(y - SPOT_VIEW_HEIGHT / 2, MAP_SIZE - SPOT_VIEW_HEIGHT)
  return `${left} ${top} ${SPOT_VIEW_WIDTH} ${SPOT_VIEW_HEIGHT}`
}

/**
 * Gambar peta statis (bukan peta interaktif). `locations` = [{ name, zone }]. Semua zona yang ada datanya
 * disorot memakai poligon dari sumber; lokasi tanpa zona tetap tampil sebagai teks di kotak lokasi.
 * Satu zona memakai potongan peta zona itu; beberapa zona memakai potongan yang mencakup semuanya.
 * Kalau ada `spot` ({ x, y }, mis. titik tempat makan hewan), yang ditampilkan pin di titik itu, bukan zona;
 * `spotLabel` menjelaskan pin untuk pembaca layar dan keterangan di bawah peta.
 * Kalau gambar peta tidak ada, tampil placeholder.
 * Kredit peta dan zona (Heartodex) ada di footer situs.
 */
function LocationMap({ locations, image, spot = null, spotLabel = 'Titik tempat makan' }) {
  const maskId = `zone-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const zoned = locations.filter((location) => location.zone && LOCATION_ZONES[location.zone])
  const zones = zoned.map((location) => LOCATION_ZONES[location.zone])

  if (!image) {
    return (
      <div className="location-map location-map--empty">
        <MapPinned aria-hidden="true" />
        <p>Gambar peta untuk lokasi ini belum tersedia.</p>
      </div>
    )
  }

  if (spot) {
    return (
      <figure className="location-map">
        <svg className="location-map__svg" viewBox={spotViewBox(spot)} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Peta Heartopia dengan pin: ${spotLabel}`}>
          <image
            className="location-map__base"
            href={image}
            width={MAP_SIZE}
            height={MAP_SIZE}
            preserveAspectRatio="xMidYMid slice"
          />
          <g className="location-map__pin" transform={`translate(${spot.x} ${spot.y})`}>
            <circle className="location-map__pin-halo" r="16" />
            <ellipse className="location-map__pin-shadow" rx="6" ry="2.5" />
            <path className="location-map__pin-body" d="M0 0C-3.5-8-12-13.5-12-23a12 12 0 1 1 24 0c0 9.5-8.5 15-12 23Z" />
            <circle className="location-map__pin-dot" cy="-23" r="4.5" />
          </g>
        </svg>
        <figcaption className="location-map__caption">
          <MapPin aria-hidden="true" />
          {spotLabel}
        </figcaption>
      </figure>
    )
  }

  const viewBox =
    zones.length === 1 ? zones[0].viewBox : zones.length ? zoneViewBox(zones.map((zone) => zone.polygons)) : `0 0 ${MAP_SIZE} ${MAP_SIZE}`
  const label = zones.length
    ? `Peta Heartopia dengan area ${formatNames.format(zoned.map((location) => location.name))} disorot`
    : `Peta Heartopia untuk lokasi ${formatNames.format(locations.map((location) => location.name))}`

  return (
    <figure className="location-map">
      <svg className="location-map__svg" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
        <image
          className="location-map__base"
          href={image}
          width={MAP_SIZE}
          height={MAP_SIZE}
          preserveAspectRatio="xMidYMid slice"
        />
        {zones.length > 0 && (
          <>
            <defs>
              <mask id={maskId}>
                <rect width={MAP_SIZE} height={MAP_SIZE} fill="white" />
                {zones.map((zone, z) => zone.polygons.map((points, p) => <polygon key={`${z}-${p}`} points={points} fill="black" />))}
              </mask>
            </defs>
            <rect className="location-map__dim" width={MAP_SIZE} height={MAP_SIZE} mask={`url(#${maskId})`} />
            {zones.map((zone, z) =>
              zone.polygons.map((points, p) => <polygon key={`${z}-${p}`} className="location-map__zone" points={points} />),
            )}
          </>
        )}
      </svg>
    </figure>
  )
}

export default LocationMap
