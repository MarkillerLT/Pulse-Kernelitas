import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { SIDE_TABS, type SideTab } from './tabs/types'

/**
 * Tabbed side panel next to the ship map. Only this panel changes when switching sections:
 * the map, the crew and the clock stay in view. Arrow keys move between tabs.
 */
export function SidePanel({
  tab,
  onTab,
  counts,
  children,
}: {
  tab: SideTab
  onTab: (tab: SideTab) => void
  counts: Partial<Record<SideTab, number>>
  children: ReactNode
}) {
  const buttons = useRef<Partial<Record<SideTab, HTMLButtonElement | null>>>({})
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = SIDE_TABS.findIndex((t) => t.id === tab)
    const next =
      SIDE_TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + SIDE_TABS.length) % SIDE_TABS.length]
    onTab(next.id)
    buttons.current[next.id]?.focus()
  }
  return (
    <section className="side-panel" aria-label="Panel de N0VA-7">
      <div className="side-tabs" role="tablist" aria-label="Secciones" onKeyDown={onKey}>
        {SIDE_TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              buttons.current[t.id] = el
            }}
            type="button"
            role="tab"
            id={`side-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="side-tabpanel"
            tabIndex={tab === t.id ? 0 : -1}
            className="side-tab"
            onClick={() => onTab(t.id)}
          >
            {t.label}
            {!!counts[t.id] && <span className="side-tab-count">{counts[t.id]}</span>}
          </button>
        ))}
      </div>
      <div
        className="side-body"
        role="tabpanel"
        id="side-tabpanel"
        aria-labelledby={`side-tab-${tab}`}
        tabIndex={0}
      >
        {children}
      </div>
    </section>
  )
}
