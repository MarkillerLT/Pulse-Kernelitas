import type { LogEntry } from '../../domain/model/game'
import { formatClock } from '../../ui/activity'
import { C } from '../colors'
import { Button, Label, Panel, Rect } from '../kit'
import { clip } from '../text'
import { useVrUi, type LogFilter } from '../vrUi'

const W = 1.0
const PAD = 0.035
const INNER = W - PAD * 2
const ROWS = 5
const ROW_H = 0.056

const FILTERS: { id: LogFilter; label: string; match: (e: LogEntry) => boolean }[] = [
  { id: 'all', label: 'Todo', match: () => true },
  { id: 'decisions', label: 'Decisiones', match: (e) => e.kind === 'task' || e.kind === 'request' },
  { id: 'missions', label: 'Misiones', match: (e) => e.kind === 'mission' },
  { id: 'crisis', label: 'Crisis', match: (e) => e.severity === 'critical' },
]

const SEVERITY: Record<LogEntry['severity'], string> = {
  info: C.dim,
  success: C.good,
  warning: C.warn,
  critical: C.critical,
}

/**
 * N0VA-7's log as a cockpit console at waist height, tilted toward the player: big filter
 * buttons and paging instead of scrolling, which is fiddly with controllers.
 */
export function LogConsole({
  log,
  position,
  tilt,
}: {
  log: readonly LogEntry[]
  position: [number, number, number]
  tilt: number
}) {
  const filter = useVrUi((s) => s.logFilter)
  const offset = useVrUi((s) => s.logOffset)
  const setFilter = useVrUi((s) => s.setLogFilter)
  const scroll = useVrUi((s) => s.scrollLog)
  const active = FILTERS.find((f) => f.id === filter)!
  const entries = [...log].reverse().filter(active.match)
  const start = Math.min(offset, Math.max(0, entries.length - ROWS))
  const page = entries.slice(start, start + ROWS)

  const listTop = -0.13
  const height = -listTop + ROWS * ROW_H + 0.075 + PAD * 0.5
  const fw = 0.13

  return (
    <group position={position} rotation={[tilt, 0, 0]}>
      <Panel width={W} height={height}>
        <Label position={[PAD, -0.028, 0]} size={0.026} bold>
          Registro de N0VA-7
        </Label>
        <Label position={[W - PAD, -0.034, 0]} size={0.015} color={C.dim} anchorX="right">
          {`${entries.length} ENTRADAS`}
        </Label>
        {FILTERS.map((f, i) => (
          <Button
            key={f.id}
            label={f.label}
            size={0.018}
            active={filter === f.id}
            width={fw}
            height={0.048}
            position={[PAD + i * (fw + 0.01), -0.065, 0]}
            onClick={() => setFilter(f.id)}
          />
        ))}
        <Button
          label="Recientes"
          size={0.017}
          disabled={start === 0}
          width={0.15}
          height={0.048}
          position={[W - PAD - 0.31, -0.065, 0]}
          onClick={() => scroll(-ROWS)}
        />
        <Button
          label="Anteriores"
          size={0.017}
          disabled={start + ROWS >= entries.length}
          width={0.15}
          height={0.048}
          position={[W - PAD - 0.15, -0.065, 0]}
          onClick={() => scroll(ROWS)}
        />
        {page.length === 0 && (
          <Label position={[PAD, listTop - 0.01, 0]} size={0.018} color={C.muted}>
            Sin registros en esta categoría.
          </Label>
        )}
        {page.map((e, i) => {
          const y = listTop - i * ROW_H
          return (
            <group key={e.id}>
              <Rect
                position={[PAD, y, 0]}
                width={INNER}
                height={ROW_H - 0.006}
                color={C.button}
                opacity={0.6}
              />
              <Rect
                position={[PAD, y, 0.001]}
                width={0.006}
                height={ROW_H - 0.006}
                color={SEVERITY[e.severity]}
                layer={2}
              />
              <Label position={[PAD + 0.018, y - 0.009, 0.002]} size={0.015} color={C.dim}>
                {formatClock(e.hour).toUpperCase()}
              </Label>
              <Label
                position={[PAD + 0.2, y - 0.007, 0.002]}
                size={0.019}
                bold
                maxWidth={INNER - 0.21}
                color={e.severity === 'critical' ? C.critical : C.text}
              >
                {clip(e.title, 52)}
              </Label>
              <Label
                position={[PAD + 0.2, y - 0.031, 0.002]}
                size={0.015}
                color={C.muted}
                maxWidth={INNER - 0.21}
              >
                {clip(e.text, 78)}
              </Label>
            </group>
          )
        })}
      </Panel>
    </group>
  )
}
