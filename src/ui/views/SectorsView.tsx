import { Link } from 'react-router'
import { SECTOR_LIST } from '../../domain/content/sectors'
import { PageHeader } from '../components/PageHeader'
import { SECTOR_ICONS } from '../sectorIcons'

export function SectorsView() {
  return (
    <div className="page">
      <PageHeader eyebrow="Esquema de la nave" title="Sectores de la Elysium">
        Ocho sectores interconectados. Selecciona uno para consultar su función y su equipamiento.
      </PageHeader>
      <ul className="ship-map" aria-label="Mapa de sectores">
        {SECTOR_LIST.map((sector) => {
          const Icon = SECTOR_ICONS[sector.id]
          return (
            <li key={sector.id} className={`ship-cell cell-${sector.id}`}>
              <Link to={`/sectors/${sector.id}`}>
                <span className="ship-cell-head">
                  <Icon size={18} aria-hidden="true" />
                  <span className="mono">{sector.code}</span>
                </span>
                <strong>{sector.name}</strong>
                <span className="small muted">{sector.domain}</span>
                <span className="small">{sector.summary}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
