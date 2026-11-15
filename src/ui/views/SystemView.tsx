import { useRef, useState, type ChangeEvent } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import { GAME_SCHEMA_VERSION } from '../../domain/model/game'
import { SAVE_KEY } from '../../persistence/saveGame'
import { useGame } from '../../store/gameStore'
import { PageHeader } from '../components/PageHeader'
import { Panel } from '../components/Panel'
import { formatTimestamp, pad } from '../format'
import { formatClock } from '../activity'
import { dayOf } from '../../domain/engine/state'

export function SystemView() {
  const game = useGame((s) => s.game)
  const persistence = useGame((s) => s.persistence)
  const exportSave = useGame((s) => s.exportSave)
  const importSave = useGame((s) => s.importSave)
  const openSetup = useGame((s) => s.openSetup)
  const setSetting = useGame((s) => s.setSetting)
  const fileInput = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)

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
    setImportMessage(result.ok ? 'Partida importada correctamente.' : result.reason)
  }

  return (
    <div className="page">
      <PageHeader eyebrow="S-06 · Núcleo Collins" title="Memoria de N0VA-7">
        Copias de seguridad, configuración y reinicio de la simulación.
      </PageHeader>
      <div className="system-grid">
        <Panel title="Estado de la memoria" code={`v${GAME_SCHEMA_VERSION}`}>
          <dl className="readouts">
            <div>
              <dt>Almacenamiento</dt>
              <dd className={persistence === 'saved' ? 'text-good' : 'text-critical'}>
                {persistence === 'saved' ? 'Local · sincronizado' : 'No disponible'}
              </dd>
            </div>
            <div>
              <dt>Partida iniciada</dt>
              <dd>{formatTimestamp(game.createdAt)}</dd>
            </div>
            <div>
              <dt>Último cambio</dt>
              <dd>{formatTimestamp(game.updatedAt)}</dd>
            </div>
            <div>
              <dt>Reloj de la nave</dt>
              <dd>{formatClock(game.hour)}</dd>
            </div>
          </dl>
          <p className="small muted">
            La partida se guarda automáticamente en este navegador (clave <code>{SAVE_KEY}</code>)
            después de cada operación importante y se restaura al volver a abrir la aplicación.
          </p>
        </Panel>

        <Panel title="Copias de seguridad" code="JSON">
          <p className="small muted">
            Exporta la partida a un archivo o restaura una copia anterior.
          </p>
          <div className="button-row">
            <button type="button" className="btn" onClick={download}>
              <Download size={14} aria-hidden="true" /> Exportar partida
            </button>
            <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
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
          {importMessage && (
            <p className="small" role="status">
              {importMessage}
            </p>
          )}
        </Panel>

        <Panel title="Configuración">
          <label className="toggle">
            <input
              type="checkbox"
              checked={game.settings.autoPause}
              onChange={(e) => setSetting('autoPause', e.target.checked)}
            />
            <span>Pausa automática cuando surge una decisión urgente o una crisis</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={game.settings.reducedMotion}
              onChange={(e) => setSetting('reducedMotion', e.target.checked)}
            />
            <span>Reducir animaciones (los tripulantes aparecen en su destino sin caminar)</span>
          </label>
        </Panel>

        <Panel title="Reinicio" code="!" className="danger-zone">
          <p className="small muted">
            Elige una dificultad y empieza de cero. Se perderá la partida actual (los récords se
            conservan); exporta una copia antes si quieres guardarla.
          </p>
          <button type="button" className="btn btn-danger" onClick={() => openSetup(true)}>
            <RotateCcw size={14} aria-hidden="true" /> Nueva partida
          </button>
        </Panel>
      </div>
    </div>
  )
}
