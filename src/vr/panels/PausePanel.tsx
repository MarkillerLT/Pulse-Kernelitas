import { useState } from 'react'
import { useXR } from '@react-three/xr'
import { START_HOUR } from '../../domain/content/ship'
import { DIFFICULTY_MODES, MODE_INFO, type DifficultyMode } from '../../domain/rules/difficulty'
import { useGame, type MenuTab } from '../../store/gameStore'
import { GUIDE } from '../../ui/menu/guide'
import { C } from '../colors'
import { Button, Label, Panel } from '../kit'
import { clip } from '../text'
import { useVrUi } from '../vrUi'

const W = 1.16
const PAD = 0.04
const INNER = W - PAD * 2
const TABS: { id: MenuTab; label: string }[] = [
  { id: 'guide', label: 'Cómo jugar' },
  { id: 'difficulty', label: 'Dificultad' },
  { id: 'settings', label: 'Opciones' },
]
/** Extra tips that only apply with the headset on. */
const VR_TIPS =
  'Apunta con el control y aprieta el gatillo (o pellizca con la mano). Mantén pulsado el botón Meta para recentrar la vista.'

/**
 * VR pause menu, in front of the player and above every other panel. It shares its state with
 * the 2D menu (opening it pauses the clock; closing it resumes). Sections: express guide,
 * difficulty / new game, and options.
 */
export function PausePanel({
  position,
  rotY,
}: {
  position: [number, number, number]
  rotY: number
}) {
  const menu = useGame((s) => s.menu)
  const mustChoose = useGame((s) => s.mustChooseMode)
  const openMenu = useGame((s) => s.openMenu)
  const closeMenu = useGame((s) => s.closeMenu)
  const height = 0.66
  const tabW = 0.2

  return (
    <group position={[position[0], position[1] - height / 2, position[2]]} rotation={[0, rotY, 0]}>
      <Panel width={W} height={height} opacity={0.98}>
        <Label position={[PAD, -0.03, 0]} size={0.016} color={C.accent}>
          {mustChoose ? 'N0VA-7 · ARRANQUE DEL SISTEMA' : 'N0VA-7 · SIMULACIÓN EN PAUSA'}
        </Label>
        <Label position={[PAD, -0.055, 0]} size={0.05} bold>
          {mustChoose ? 'Bienvenido a bordo.' : 'Pausa.'}
        </Label>
        {!mustChoose && (
          <Button
            label="Reanudar"
            tone="primary"
            size={0.022}
            width={0.22}
            height={0.06}
            position={[W - PAD - 0.22, -0.04, 0]}
            onClick={closeMenu}
          />
        )}
        {TABS.map((t, i) => (
          <Button
            key={t.id}
            label={t.label}
            size={0.02}
            active={menu === t.id}
            width={tabW}
            height={0.052}
            position={[PAD + i * (tabW + 0.01), -0.13, 0]}
            onClick={() => openMenu(t.id)}
          />
        ))}
        <group position={[0, -0.2, 0]}>
          {menu === 'guide' && <GuideTab first={mustChoose} />}
          {menu === 'difficulty' && <DifficultyTab />}
          {menu === 'settings' && <OptionsTab />}
        </group>
      </Panel>
    </group>
  )
}

function GuideTab({ first }: { first: boolean }) {
  const openMenu = useGame((s) => s.openMenu)
  const colW = (INNER - 0.03) / 2
  return (
    <>
      {GUIDE.map((step, i) => {
        const x = PAD + (i % 2) * (colW + 0.03)
        const y = -Math.floor(i / 2) * 0.115
        return (
          <group key={step.title} position={[x, y, 0]}>
            <Label size={0.015} color={C.accent}>
              {String(i + 1).padStart(2, '0')}
            </Label>
            <Label position={[0.04, 0.002, 0]} size={0.02} bold>
              {step.title}
            </Label>
            <Label position={[0, -0.03, 0]} size={0.0145} color={C.muted} maxWidth={colW}>
              {clip(step.text, 150)}
            </Label>
          </group>
        )
      })}
      <Label
        position={[PAD, -0.355, 0]}
        size={0.015}
        color={C.dim}
        maxWidth={first ? INNER - 0.32 : INNER}
      >
        {VR_TIPS}
      </Label>
      {first && (
        <Button
          label="Elegir dificultad"
          tone="primary"
          size={0.02}
          width={0.29}
          height={0.055}
          position={[W - PAD - 0.29, -0.345, 0]}
          onClick={() => openMenu('difficulty')}
        />
      )}
    </>
  )
}

function DifficultyTab() {
  const game = useGame((s) => s.game)
  const records = useGame((s) => s.records)
  const resetGame = useGame((s) => s.resetGame)
  const mustChoose = useGame((s) => s.mustChooseMode)
  const [mode, setMode] = useState<DifficultyMode>(game.difficulty.mode)
  const inProgress = !mustChoose && game.status === 'active' && game.hour > START_HOUR
  return (
    <>
      {DIFFICULTY_MODES.map((m, i) => {
        const info = MODE_INFO[m]
        const record = records[m]
        const y = -i * 0.1
        return (
          <group key={m}>
            <Button
              label={`${info.label} · nivel ${info.startLevel}`}
              active={mode === m}
              width={0.27}
              height={0.085}
              size={0.02}
              position={[PAD, y, 0]}
              onClick={() => setMode(m)}
            />
            <Label position={[PAD + 0.29, y - 0.008, 0]} size={0.017} maxWidth={INNER - 0.29}>
              {info.summary}
            </Label>
            <Label position={[PAD + 0.29, y - 0.06, 0]} size={0.015} color={C.dim}>
              {record ? `Récord: nivel ${record.level}, día ${record.day}` : 'Sin récord'}
            </Label>
          </group>
        )
      })}
      {inProgress && (
        <Label position={[PAD, -0.33, 0]} size={0.016} color={C.warn}>
          Empezar otra partida borra la actual (los récords se conservan).
        </Label>
      )}
      <Button
        label={`Comenzar en modo ${MODE_INFO[mode].label}`}
        tone="primary"
        size={0.021}
        width={0.42}
        height={0.058}
        position={[W - PAD - 0.42, -0.32, 0]}
        onClick={() => resetGame(mode)}
      />
    </>
  )
}

function OptionsTab() {
  const reduced = useGame((s) => s.game.settings.reducedMotion)
  const setSetting = useGame((s) => s.setSetting)
  const sound = useVrUi((s) => s.sound)
  const toggleSound = useVrUi((s) => s.toggleSound)
  const view = useVrUi((s) => s.view)
  const goDiorama = useVrUi((s) => s.goDiorama)
  const goOnboard = useVrUi((s) => s.goOnboard)
  const session = useXR((s) => s.session)
  const bw = 0.34
  const rows: {
    label: string
    text: string
    button: { label: string; on?: boolean; onClick: () => void }
  }[] = [
    {
      label: 'Sonido',
      text: 'Avisos de tareas nuevas, despegue y regreso de la cápsula.',
      button: { label: sound ? 'Activado' : 'Silenciado', on: sound, onClick: toggleSound },
    },
    {
      label: 'Animaciones',
      text: 'Reducidas: la tripulación aparece en su destino sin caminar.',
      button: {
        label: reduced ? 'Reducidas' : 'Completas',
        on: !reduced,
        onClick: () => setSetting('reducedMotion', !reduced),
      },
    },
    {
      label: 'Vista',
      text: 'Maqueta sobre la mesa, o a bordo a tamaño real.',
      button: {
        label: view.mode === 'onboard' ? 'A bordo · cambiar a maqueta' : 'Maqueta · subir a bordo',
        onClick: () => (view.mode === 'onboard' ? goDiorama() : goOnboard(view.sector)),
      },
    },
  ]
  return (
    <>
      {rows.map((r, i) => (
        <group key={r.label} position={[0, -i * 0.085, 0]}>
          <Label position={[PAD, -0.004, 0]} size={0.021} bold>
            {r.label}
          </Label>
          <Label
            position={[PAD, -0.034, 0]}
            size={0.015}
            color={C.muted}
            maxWidth={INNER - bw - 0.04}
          >
            {r.text}
          </Label>
          <Button
            label={r.button.label}
            active={r.button.on}
            size={0.017}
            width={bw}
            height={0.055}
            position={[W - PAD - bw, 0, 0]}
            onClick={r.button.onClick}
          />
        </group>
      ))}
      {session && (
        <Button
          label="Salir de VR"
          tone="danger"
          size={0.019}
          width={bw}
          height={0.055}
          position={[W - PAD - bw, -0.29, 0]}
          onClick={() => void session.end()}
        />
      )}
    </>
  )
}
