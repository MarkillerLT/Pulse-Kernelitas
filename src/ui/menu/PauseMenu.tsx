import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Link } from 'react-router'
import { Download, Glasses, LogOut, Play, Trophy, Upload } from 'lucide-react'
import { START_HOUR } from '../../domain/content/ship'
import { dayOf } from '../../domain/engine/state'
import {
  DIFFICULTY_MODES,
  LEVEL_HOURS,
  MODE_INFO,
  type DifficultyMode,
} from '../../domain/rules/difficulty'
import { useGame, type MenuTab } from '../../store/gameStore'
import { formatClock } from '../activity'
import { pad } from '../format'

const TABS: { id: MenuTab; label: string }[] = [
  { id: 'guide', label: 'Cómo jugar' },
  { id: 'difficulty', label: 'Dificultad' },
  { id: 'settings', label: 'Ajustes' },
]

/** Express tutorial: what the player is and what to watch, in six steps. */
const GUIDE: { title: string; text: string }[] = [
  {
    title: 'Eres N0VA-7',
    text: 'La IA central de la Elysium. No mueves a nadie: decides qué hace cada tripulante y a quién mandas a cada crisis. El tiempo corre siempre; solo se detiene en este menú.',
  },
  {
    title: 'Atiende las tareas',
    text: 'Cada tarea tiene un plazo. Elige una opción y un equipo: verás la probabilidad de éxito y por qué. Si dejas que venza, se aplica su consecuencia.',
  },
  {
    title: 'Cuida a la tripulación',
    text: 'Pulsa a un astronauta en el mapa para ver Salud, Moral, Estrés, Sueño y Confianza, y darle órdenes: descansar, tiempo libre, enfermería o volver a su puesto. De 22:00 a 06:00 descansan solos.',
  },
  {
    title: 'No los quemes',
    text: 'Con Estrés ≥ 76, Sueño ≤ 24 o Salud ≤ 24 aparece una advertencia. Mandarlos de todas formas cuesta Confianza (−5), y tres órdenes forzadas generan Rencor.',
  },
  {
    title: 'Mantén viva la nave',
    text: 'Vigila Soporte vital, Energía, Casco, Comida y Medicinas. El viaje termina si el soporte vital o el casco llegan a 0, o si no queda nadie con vida.',
  },
  {
    title: 'Llega lo más lejos posible',
    text: `Cada ${LEVEL_HOURS} horas de juego sube el nivel: más consumo, más emergencias y tareas más largas. Tu récord se guarda por modo.`,
  },
]

/**
 * Pause menu. Opening it is the only way to stop the clock. It doubles as the express guide,
 * the difficulty picker (new game) and the settings. On first launch it cannot be dismissed
 * until a mode is chosen.
 */
export function PauseMenu() {
  const menu = useGame((s) => s.menu)
  const mustChoose = useGame((s) => s.mustChooseMode)
  const openMenu = useGame((s) => s.openMenu)
  const closeMenu = useGame((s) => s.closeMenu)
  const tabRefs = useRef<Partial<Record<MenuTab, HTMLButtonElement | null>>>({})
  const onTabKey = (e: KeyboardEvent) => {
    if (!menu || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return
    e.preventDefault()
    const i = TABS.findIndex((t) => t.id === menu)
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length]
    openMenu(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <Dialog.Root open={menu !== null} onOpenChange={(open) => !open && closeMenu()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay pause-overlay" />
        <Dialog.Content
          className="dialog pause-menu"
          onEscapeKeyDown={(e) => mustChoose && e.preventDefault()}
          onPointerDownOutside={(e) => mustChoose && e.preventDefault()}
        >
          <header className="pause-head">
            <div>
              <span className="eyebrow">
                <span className="status-dot" aria-hidden="true" />
                {mustChoose ? 'N0VA-7 · Arranque del sistema' : 'N0VA-7 · Simulación en pausa'}
              </span>
              <Dialog.Title className="pause-title">
                {mustChoose ? (
                  <>
                    Bienvenido a bordo<span className="text-accent">.</span>
                  </>
                ) : (
                  <>
                    Pausa<span className="text-accent">.</span>
                  </>
                )}
              </Dialog.Title>
            </div>
            {!mustChoose && (
              <button type="button" className="btn btn-primary" onClick={closeMenu}>
                <Play size={14} aria-hidden="true" /> Reanudar
              </button>
            )}
          </header>
          <Dialog.Description className="sr-only">
            Menú de pausa: guía rápida, dificultad y ajustes.
          </Dialog.Description>

          <div className="side-tabs" role="tablist" aria-label="Menú" onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el
                }}
                type="button"
                role="tab"
                id={`menu-tab-${t.id}`}
                aria-selected={menu === t.id}
                aria-controls="menu-tabpanel"
                tabIndex={menu === t.id ? 0 : -1}
                className="side-tab"
                onClick={() => openMenu(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            className="pause-body"
            role="tabpanel"
            id="menu-tabpanel"
            aria-labelledby={`menu-tab-${menu}`}
          >
            {menu === 'guide' && <Guide onNext={() => openMenu('difficulty')} first={mustChoose} />}
            {menu === 'difficulty' && <DifficultyPicker />}
            {menu === 'settings' && <Settings />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Guide({ onNext, first }: { onNext: () => void; first: boolean }) {
  return (
    <>
      <ol className="guide-steps">
        {GUIDE.map((step, i) => (
          <li key={step.title}>
            <span className="guide-number">{pad(i + 1, 2)}</span>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
      <dl className="guide-keys">
        <div>
          <dt>Esc</dt>
          <dd>Pausar y abrir este menú</dd>
        </div>
        <div>
          <dt>1× 2× 4×</dt>
          <dd>Velocidad del tiempo (arriba)</dd>
        </div>
        <div>
          <dt>Clic en un sector</dt>
          <dd>Abrirlo en el panel lateral</dd>
        </div>
      </dl>
      {first && (
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Elegir dificultad →
        </button>
      )}
    </>
  )
}

function DifficultyPicker() {
  const game = useGame((s) => s.game)
  const records = useGame((s) => s.records)
  const resetGame = useGame((s) => s.resetGame)
  const mustChoose = useGame((s) => s.mustChooseMode)
  const [mode, setMode] = useState<DifficultyMode>(game.difficulty.mode)
  const inProgress = !mustChoose && game.status === 'active' && game.hour > START_HOUR
  return (
    <>
      <p className="small muted">
        Sobrevive todo lo que puedas. Cada {LEVEL_HOURS} horas de juego sube el nivel: más consumo
        de energía, más emergencias y expediciones, tareas más largas y más choques con las horas de
        sueño.
      </p>
      <div className="mode-grid" role="radiogroup" aria-label="Dificultad">
        {DIFFICULTY_MODES.map((m) => {
          const info = MODE_INFO[m]
          const record = records[m]
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={`mode-card mode-${m}${mode === m ? ' is-selected' : ''}`}
              onClick={() => setMode(m)}
            >
              <span className="eyebrow">
                {info.tierLabel} · nivel {info.startLevel}
                {m === 'hard'
                  ? '+'
                  : `–${MODE_INFO[m === 'easy' ? 'medium' : 'hard'].startLevel - 1}`}
              </span>
              <strong>{info.label}</strong>
              <span className="small">{info.summary}</span>
              <span className="small muted mode-record">
                <Trophy size={12} aria-hidden="true" />{' '}
                {record ? `Récord: nivel ${record.level}, día ${record.day}` : 'Sin récord'}
              </span>
            </button>
          )
        })}
      </div>
      {inProgress && (
        <p className="small text-warn">
          Empezar una partida nueva borra la actual (los récords se conservan).
        </p>
      )}
      <button type="button" className="btn btn-primary btn-block" onClick={() => resetGame(mode)}>
        <Play size={14} aria-hidden="true" /> Comenzar en modo {MODE_INFO[mode].label}
      </button>
    </>
  )
}

function Settings() {
  const game = useGame((s) => s.game)
  const persistence = useGame((s) => s.persistence)
  const exportSave = useGame((s) => s.exportSave)
  const importSave = useGame((s) => s.importSave)
  const setSetting = useGame((s) => s.setSetting)
  const closeMenu = useGame((s) => s.closeMenu)
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const download = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `elysium-dia-${pad(dayOf(game.hour), 2)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = importSave(await file.text())
    setMessage(result.ok ? 'Partida importada correctamente.' : result.reason)
  }

  return (
    <div className="settings-grid">
      <section>
        <h3 className="subhead">Pantalla</h3>
        <label className="toggle">
          <input
            type="checkbox"
            checked={game.settings.reducedMotion}
            onChange={(e) => setSetting('reducedMotion', e.target.checked)}
          />
          <span>Reducir animaciones (los tripulantes aparecen en su destino sin caminar)</span>
        </label>
      </section>
      <section>
        <h3 className="subhead">Memoria</h3>
        <p className="small">
          <span className={persistence === 'saved' ? 'text-good' : 'text-critical'}>
            {persistence === 'saved' ? 'Guardado automático activo' : 'Sin almacenamiento local'}
          </span>{' '}
          · {formatClock(game.hour)}
        </p>
        <div className="button-row">
          <button type="button" className="btn btn-sm" onClick={download}>
            <Download size={14} aria-hidden="true" /> Exportar partida
          </button>
          <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()}>
            <Upload size={14} aria-hidden="true" /> Importar partida
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Archivo de partida"
            onChange={(e) => void onFile(e)}
          />
        </div>
        {message && (
          <p className="small" role="status">
            {message}
          </p>
        )}
      </section>
      <section>
        <h3 className="subhead">Ir a</h3>
        <div className="button-row">
          <Link to="/vr" className="btn btn-sm" onClick={closeMenu}>
            <Glasses size={14} aria-hidden="true" /> Modo VR
          </Link>
          <a href="/" className="btn btn-sm">
            <LogOut size={14} aria-hidden="true" /> Salir a la portada
          </a>
        </div>
      </section>
    </div>
  )
}
