import { lazy, Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import {
  ArrowRight,
  ChevronRight,
  Download,
  Radio,
  RotateCcw,
  Save,
  ShieldCheck,
  VolumeX,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, useReducedMotion } from 'motion/react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMissionStore } from '../store/missionStore'
import { CrewList } from '../components/crew/CrewList'
import { CrewInspector } from '../components/crew/CrewInspector'
import { MissionJournal } from '../components/mission/MissionJournal'
import { Button } from '../components/ui/button'
const GameCanvas = lazy(() =>
  import('../game/GameCanvas').then((module) => ({ default: module.GameCanvas })),
)
import { parameters } from '../simulation/parameters/defaults'
import {
  formatNumber,
  missionStatusLabels,
  severityLabels,
  translateMessage,
} from '../lib/localization'

export function App() {
  const { mission, orders, advance, busy, save, load, reset, notice } = useMissionStore()
  const { pathname } = useLocation()
  const heading =
    pathname === '/research'
      ? {
          label: 'BIBLIOTECA CIENTÍFICA / PULSE',
          title: 'La ciencia detrás de cada decisión.',
          description: 'Fuentes abiertas. Supuestos transparentes. Límites claros.',
        }
      : pathname === '/mission'
        ? {
            label: 'OPERACIONES DE VUELO / ARES–01',
            title: 'Cada turno deja huella.',
            description: 'Revisa las consecuencias. Prepara el siguiente paso.',
          }
        : {
            label: 'EXPLORACIÓN HUMANA / ARES–01',
            title: 'Lejos de casa.',
            description: 'Tres vidas. Una misión. Cada turno cuenta.',
          }
  const opCost =
    parameters.dailyOperations +
    mission.crew.reduce(
      (sum, a) =>
        sum +
        parameters.activityCosts[
          orders.find((d) => d.astronautId === a.id)?.activity ?? a.activity
        ],
      0,
    )
  const medCost =
    mission.crew.filter(
      (a) => (orders.find((d) => d.astronautId === a.id)?.activity ?? a.activity) === 'medical',
    ).length * parameters.medicalCost
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-symbol">
            <img src="/assets/pixel-art/ui/pulse-mission-patch.svg" alt="" />
          </span>
          <div>
            <strong>
              PULSE<span>▮</span>
            </strong>
            <small>CONTROL DE MISIÓN</small>
          </div>
        </NavLink>
        <nav aria-label="Navegación principal">
          <NavLink to="/" end>
            Tripulación
          </NavLink>
          <NavLink to="/mission">Misión</NavLink>
          <NavLink to="/research">
            Investigación <span>↗</span>
          </NavLink>
        </nav>
        <div className="mission-clock">
          <small>DÍA DE MISIÓN</small>
          <strong>
            {String(mission.day).padStart(3, '0')}
            <span> / {mission.duration}</span>
          </strong>
        </div>
        <Button
          onClick={() => void advance()}
          disabled={busy || mission.status !== 'active'}
          aria-describedby="turn-impact"
          aria-busy={busy}
        >
          Avanzar un día <ArrowRight size={16} />
        </Button>
      </header>
      <div className="subbar">
        <span>
          <i className="status-light" /> ARES–01 <b>/</b> TRANSFERENCIA TIERRA → MARTE
        </span>
        <span className="subbar-right">
          <Radio size={13} /> SIMULACIÓN LOCAL <b>•</b>{' '}
          <span className={mission.status === 'failed' ? 'critical-text' : ''}>
            {missionStatusLabels[mission.status].toLocaleUpperCase('es-ES')}
          </span>
        </span>
      </div>
      <main id="main-content" tabIndex={-1}>
        <div className="page-heading">
          <div>
            <span className="eyebrow">{heading.label}</span>
            <h1>{heading.title}</h1>
            <p>{heading.description}</p>
          </div>
          <div className="session-tools">
            <Button variant="ghost" size="sm" onClick={() => void save()} disabled={busy}>
              <Save size={14} /> Guardar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void load()} disabled={busy}>
              <Download size={14} /> Cargar
            </Button>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button variant="ghost" size="sm" disabled={busy}>
                  <RotateCcw size={14} /> Nueva
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">
                  <Dialog.Title>¿Iniciar una nueva misión?</Dialog.Title>
                  <Dialog.Description>
                    Se eliminarán la misión actual y la partida guardada en este dispositivo. Esta
                    acción no se puede deshacer.
                  </Dialog.Description>
                  <div>
                    <Dialog.Close asChild>
                      <Button variant="outline">Cancelar</Button>
                    </Dialog.Close>
                    <Dialog.Close asChild>
                      <Button onClick={() => void reset()}>Iniciar misión</Button>
                    </Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
        <div className="turn-preview" id="turn-impact">
          <strong>
            {mission.status === 'active'
              ? `${orders.length} ${orders.length === 1 ? 'orden pendiente' : 'órdenes pendientes'} · Día ${mission.day}`
              : missionStatusLabels[mission.status]}
          </strong>
          <span>
            {mission.status === 'active'
              ? 'Al avanzar: se aplican las órdenes, se consumen reservas y se actualiza la salud.'
              : 'La misión ha finalizado. Puedes revisar los informes o iniciar una nueva misión.'}
          </span>
          {mission.status === 'active' && (
            <b>
              −{opCost} OP / −{medCost} MED
            </b>
          )}
        </div>
        <Outlet />
        <section className="mission-strip panel">
          <div className="progress-section">
            <span className="eyebrow">PREPARACIÓN PARA LA TRANSFERENCIA A MARTE</span>
            <div>
              <strong>
                {formatNumber(mission.progress, 1)}
                <small>%</small>
              </strong>
              <span>
                {mission.status === 'active'
                  ? `${Math.max(0, mission.duration - mission.day + 1)} turnos hasta la ventana de transferencia`
                  : missionStatusLabels[mission.status]}
              </span>
            </div>
            <div className="progress-track">
              <i style={{ width: `${mission.progress}%` }} />
            </div>
          </div>
          <div className="resource">
            <span className="resource-icon">OP</span>
            <div>
              <small>Reservas operativas</small>
              <strong>
                {mission.resources.operations}
                <em>unidades</em>
              </strong>
              <span>−{opCost} el próximo turno</span>
            </div>
          </div>
          <div className="resource">
            <span className="resource-icon medical">+</span>
            <div>
              <small>Suministros médicos</small>
              <strong>
                {mission.resources.medical}
                <em>unidades</em>
              </strong>
              <span>−{medCost} el próximo turno</span>
            </div>
          </div>
          <div className="shift-summary">
            <span className="eyebrow">PRÓXIMO TURNO</span>
            <strong>
              {orders.length} {orders.length === 1 ? 'orden nueva' : 'órdenes nuevas'}
            </strong>
            <small>Sin nuevas órdenes, las rutinas continúan</small>
          </div>
        </section>
        <div className="save-notice" role="status">
          <ShieldCheck size={13} />
          {translateMessage(notice)}
        </div>
      </main>
      <footer>
        <span>
          PULSE <b>/</b> PROPUESTA PARA NASA SPACE APPS CHALLENGE
        </span>
        <span>
          MODELO ILUSTRATIVO · NO ES UN DISPOSITIVO MÉDICO <VolumeX size={12} />
        </span>
      </footer>
    </div>
  )
}
export function CrewPage() {
  const mission = useMissionStore((s) => s.mission)
  const selectedId = useMissionStore((s) => s.selectedId)
  const event = mission.events[mission.events.length - 1]
  const selected = mission.crew.find((a) => a.id === selectedId)!
  const reducedMotion = useReducedMotion()
  return (
    <div className="dashboard-grid">
      <CrewList />
      <div className="center-column">
        <section className="station-panel panel">
          <div className="panel-heading">
            <h2>
              <span className="status-light" /> Vista del hábitat
            </h2>
            <span>
              CUBIERTA 01 <b>/</b> VISTA LATERAL
            </span>
          </div>
          <Suspense fallback={<div className="renderer-message">Conectando con la estación…</div>}>
            <GameCanvas />
          </Suspense>
          <div className="station-caption">
            <span>
              <i />
              Selección: {selected.name.split(' ')[1]}
            </span>
            <small>
              Pulsa un astronauta para inspeccionar · Una sala para asignar
              <span className="pan-hint">Desliza el hábitat para ver todas las salas.</span>
            </small>
            <span className="pixel-badge">480 × 270</span>
          </div>
        </section>
        <section className="telemetry-panel panel">
          <div className="panel-heading">
            <h2>Evolución de la tripulación</h2>
            <div className="chart-legend">
              <span>
                <i />
                Cognición
              </span>
              <span>
                <i />
                Fatiga
              </span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                aria-label="Evolución de la cognición y la fatiga de la tripulación"
                data={mission.telemetry}
                margin={{ top: 8, right: 16, bottom: 0, left: -24 }}
              >
                <defs>
                  <linearGradient id="cognition" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-cognition)" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="var(--color-chart-cognition)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="day"
                  tick={{
                    fill: 'var(--color-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `D${v}`}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tick={{
                    fill: 'var(--color-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-foreground)',
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => `Día de misión ${v}`}
                  formatter={(value, name) => [formatNumber(Number(value)), name]}
                />
                <Area
                  type="linear"
                  dataKey="cognition"
                  name="Cognición"
                  stroke="var(--color-chart-cognition)"
                  strokeWidth={2}
                  fill="url(#cognition)"
                  isAnimationActive={false}
                  dot={{ r: 2 }}
                />
                <Area
                  type="linear"
                  dataKey="fatigue"
                  name="Fatiga"
                  stroke="var(--color-chart-fatigue)"
                  strokeDasharray="5 3"
                  fill="transparent"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  dot={{ r: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-note">
            {mission.telemetry.length === 1
              ? 'Primera lectura registrada. Avanza un día para comparar la evolución.'
              : 'Promedios de la tripulación · puntuaciones del modelo / 100 · una muestra por día'}
          </p>
        </section>
        <motion.section
          key={event.id}
          initial={reducedMotion ? false : { opacity: 0.5, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`event-panel ${event.severity}`}
          aria-label={`Último informe: ${severityLabels[event.severity]}`}
        >
          <div className="event-marker" aria-hidden="true">
            {event.severity === 'info' ? 'i' : '!'}
          </div>
          <div>
            <span className="eyebrow">
              REGISTRO DE MISIÓN <b> / DÍA {String(event.day).padStart(3, '0')}</b>
            </span>
            <h3>{translateMessage(event.title)}</h3>
            <p>{translateMessage(event.description)}</p>
          </div>
          <NavLink to="/mission" aria-label="Ver el registro de misión">
            <ChevronRight size={18} />
          </NavLink>
        </motion.section>
      </div>
      <CrewInspector />
    </div>
  )
}
export function MissionPage() {
  const { mission, orders } = useMissionStore()
  return (
    <section className="full-page panel">
      <div className="panel-heading">
        <h2>Operaciones de vuelo / Diario de misión</h2>
        <span>{mission.events.length} INFORMES</span>
      </div>
      <div className="mission-brief">
        <h2>Asegura la ventana de transferencia a Marte.</h2>
        <p>
          Alcanza el 100% de preparación para la transferencia en 30 turnos. Solo el trabajo genera
          progreso. La recuperación, las evaluaciones y los tratamientos consumen turnos y reservas.
          Las asignaciones se repiten hasta que las cambies.
        </p>
        <p>
          La misión se aborta si toda la tripulación está en estado crítico, las reservas no cubren
          el mantenimiento diario o se agota la ventana de transferencia. Las evaluaciones informan
          de las puntuaciones del modelo; no curan la fatiga.
        </p>
        <strong>
          Efectos diferidos pendientes: {mission.pending.length} · Turnos completados:{' '}
          {mission.history.length} · Órdenes en cola: {orders.length}
        </strong>
      </div>
      <MissionJournal events={mission.events} crew={mission.crew} />
    </section>
  )
}
export function ResearchPage() {
  return (
    <section className="full-page panel research-page">
      <div className="panel-heading">
        <h2>Investigación / Transparencia del modelo</h2>
        <span>PROTOTIPO 0.1</span>
      </div>
      <div className="mission-brief">
        <div className="research-intro">
          <span className="eyebrow">INSPIRADO EN LA CIENCIA, SIN VALIDACIÓN CIENTÍFICA</span>
          <h2>
            Una simulación de decisiones y sacrificios.
            <br />
            No una predicción de la salud humana.
          </h2>
          <p>
            Esta versión no ha procesado ni integrado conjuntos de datos de la NASA. Las
            puntuaciones de salud son variables abstractas del juego. Todos los coeficientes son
            ilustrativos y no tienen interpretación clínica. No utilices este programa para tomar
            decisiones médicas u operativas.
          </p>
        </div>
        <div className="research-grid">
          <article>
            <span className="eyebrow">01 / MECÁNICAS DEL JUEGO</span>
            <h3>Qué simulamos</h3>
            <p>
              Recuperación del sueño, fatiga, cognición, estrés, escasez de recursos y consecuencias
              diferidas de la carga de trabajo. No se simulan diagnósticos, fisiología, radiación,
              nutrición ni variabilidad médica individual.
            </p>
          </article>
          <article>
            <span className="eyebrow">02 / INVESTIGACIÓN FUTURA</span>
            <h3>Próximos pasos</h3>
            <p>
              Revisar la procedencia de los datos, el consentimiento y los requisitos de
              reutilización; vincular hallazgos validados con parámetros documentados; calibrar el
              modelo, analizar la incertidumbre y solicitar revisión especializada.
            </p>
          </article>
        </div>
        <h3>Portales de investigación de referencia</h3>
        <div className="source-list">
          <article className="source-card">
            <div>
              <span className="eyebrow">NASA / OSDR · REPOSITORIO</span>
              <a href="https://osdr.nasa.gov/" target="_blank" rel="noreferrer">
                Repositorio de Datos de Ciencia Abierta de la NASA ↗
              </a>
              <p>
                Portal para descubrir estudios de biología espacial y revisar sus metadatos y
                condiciones de reutilización. Sin datos integrados en PULSE.
              </p>
            </div>
            <span className="source-index" aria-hidden="true">
              01
            </span>
          </article>
          <article className="source-card">
            <div>
              <span className="eyebrow">NASA / HRP · PROGRAMA DE INVESTIGACIÓN</span>
              <a href="https://www.nasa.gov/hrp/" target="_blank" rel="noreferrer">
                Programa de Investigación Humana de la NASA ↗
              </a>
              <p>
                Información sobre la investigación de los riesgos del vuelo espacial humano. No
                valida las ecuaciones ni los umbrales de este juego.
              </p>
            </div>
            <span className="source-index" aria-hidden="true">
              02
            </span>
          </article>
        </div>
        <p className="muted">
          Estos enlaces son puntos de partida para futuras investigaciones, no referencias que
          validen las ecuaciones actuales. Consulta los supuestos y coeficientes completos en
          docs/SCIENTIFIC_SOURCES.md.
        </p>
        <aside className="independence-note" aria-label="Independencia y atribución">
          <span className="eyebrow">SOBRE PULSE</span>
          <p>
            PULSE es una simulación educativa independiente desarrollada para el NASA Space Apps
            Challenge. No es un producto oficial de la NASA ni implica su respaldo.
          </p>
          <p>
            La identidad gráfica y los parches de misión son originales de PULSE. No se utilizan
            insignias, sellos ni logotipos de la NASA.{' '}
            <a href="https://www.nasa.gov/nasa-brand-center/" target="_blank" rel="noreferrer">
              Consultar las pautas de marca de la NASA ↗
            </a>
          </p>
          <p>
            Tipografía con licencia SIL OFL 1.1: <a href="/licenses/inter-OFL.txt">Inter</a>,{' '}
            <a href="/licenses/public-sans-OFL.txt">Public Sans</a> y{' '}
            <a href="/licenses/dm-mono-OFL.txt">DM Mono</a>.
          </p>
        </aside>
      </div>
    </section>
  )
}
