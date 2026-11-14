import { SPECIALTY_KEYS, SPECIALTY_LABELS, type Specialties } from '../../domain/content/crew'

export function SpecialtyGrid({
  specialties,
  highlight,
}: {
  specialties: Specialties
  highlight?: boolean
}) {
  return (
    <dl className={`specialties${highlight ? ' is-highlight' : ''}`}>
      {SPECIALTY_KEYS.map((key) => (
        <div key={key} className={specialties[key] >= 8 ? 'is-strong' : undefined}>
          <dt>{SPECIALTY_LABELS[key]}</dt>
          <dd>{specialties[key]}</dd>
        </div>
      ))}
    </dl>
  )
}
