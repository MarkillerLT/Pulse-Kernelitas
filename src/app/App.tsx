import { lazy, Suspense } from 'react'
import { NavLink, Outlet } from 'react-router'
import {
  Activity,
  ArrowRight,
  Brain,
  ChevronRight,
  Download,
  Radio,
  RotateCcw,
  Save,
  ShieldCheck,
  VolumeX,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'motion/react'
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
import { Button } from '../components/ui/button'
const GameCanvas = lazy(() =>
  import('../game/GameCanvas').then((module) => ({ default: module.GameCanvas })),
)
import { parameters } from '../simulation/parameters/defaults'

export function App() {
  const { mission, orders, advance, busy, save, load, reset, notice } = useMissionStore()
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
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-symbol">
            <Activity size={26} strokeWidth={2.5} />
          </span>
          <div>
            <strong>
              PULSE<span>▮</span>
            </strong>
            <small>MISSION CONTROL</small>
          </div>
        </NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Crew
          </NavLink>
          <NavLink to="/mission">Mission</NavLink>
          <NavLink to="/research">
            Research <span>↗</span>
          </NavLink>
        </nav>
        <div className="mission-clock">
          <small>MISSION DAY</small>
          <strong>
            {String(mission.day).padStart(3, '0')}
            <span> / {mission.duration}</span>
          </strong>
        </div>
        <Button onClick={() => void advance()} disabled={busy || mission.status !== 'active'}>
          Execute next day <ArrowRight size={16} />
        </Button>
      </header>
      <div className="subbar">
        <span>
          <i className="status-light" /> ARES–01 <b>/</b> EARTH → MARS TRANSFER
        </span>
        <span className="subbar-right">
          <Radio size={13} /> LOCAL SIMULATION <b>•</b>{' '}
          <span className={mission.status === 'failed' ? 'critical-text' : ''}>
            {mission.status === 'active' ? 'MISSION ACTIVE' : mission.status.toUpperCase()}
          </span>
        </span>
      </div>
      <main>
        <div className="page-heading">
          <div>
            <span className="eyebrow">HUMAN SYSTEMS OPERATIONS</span>
            <h1>A long way from home.</h1>
            <p>Three lives. One mission. Every shift matters.</p>
          </div>
          <div className="session-tools">
            <Button variant="ghost" size="sm" onClick={() => void save()} disabled={busy}>
              <Save size={14} /> Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void load()} disabled={busy}>
              <Download size={14} /> Load
            </Button>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button variant="ghost" size="sm" disabled={busy}>
                  <RotateCcw size={14} /> New
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">
                  <Dialog.Title>Start a new mission?</Dialog.Title>
                  <Dialog.Description>
                    Your current mission and local save will be removed. This cannot be undone.
                  </Dialog.Description>
                  <div>
                    <Dialog.Close asChild>
                      <Button variant="outline">Cancel</Button>
                    </Dialog.Close>
                    <Dialog.Close asChild>
                      <Button onClick={() => void reset()}>Start mission</Button>
                    </Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
        <Outlet />
        <section className="mission-strip panel">
          <div className="progress-section">
            <span className="eyebrow">MARS TRANSFER READINESS</span>
            <div>
              <strong>
                {mission.progress.toFixed(1)}
                <small>%</small>
              </strong>
              <span>
                {mission.status === 'active'
                  ? `${Math.max(0, mission.duration - mission.day + 1)} shifts to transfer window`
                  : `Mission ${mission.status}`}
              </span>
            </div>
            <div className="progress-track">
              <i style={{ width: `${mission.progress}%` }} />
            </div>
          </div>
          <div className="resource">
            <span className="resource-icon">OP</span>
            <div>
              <small>Operational reserves</small>
              <strong>
                {mission.resources.operations}
                <em>units</em>
              </strong>
              <span>−{opCost} next shift</span>
            </div>
          </div>
          <div className="resource">
            <span className="resource-icon medical">+</span>
            <div>
              <small>Medical supplies</small>
              <strong>
                {mission.resources.medical}
                <em>units</em>
              </strong>
              <span>−{medCost} next shift</span>
            </div>
          </div>
          <div className="shift-summary">
            <span className="eyebrow">NEXT SHIFT</span>
            <strong>
              {orders.length} new {orders.length === 1 ? 'order' : 'orders'}
            </strong>
            <small>Unassigned crew continue routines</small>
          </div>
        </section>
        <div className="save-notice" role="status">
          <ShieldCheck size={13} />
          {notice}
        </div>
      </main>
      <footer>
        <span>
          PULSE <b>/</b> NASA SPACE APPS CHALLENGE CONCEPT
        </span>
        <span>
          ILLUSTRATIVE MODEL · NOT A MEDICAL DEVICE <VolumeX size={12} />
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
  return (
    <div className="dashboard-grid">
      <CrewList />
      <div className="center-column">
        <section className="station-panel panel">
          <div className="panel-heading">
            <h2>
              <span className="status-light" /> Habitat overview
            </h2>
            <span>
              DECK 01 <b>/</b> SIDE VIEW
            </span>
          </div>
          <Suspense fallback={<div className="renderer-message">Establishing station uplink…</div>}>
            <GameCanvas />
          </Suspense>
          <div className="station-caption">
            <span>
              <i style={{ background: selected.color }} />
              {selected.name.split(' ')[1]} selected
            </span>
            <small>Click crew to inspect · Click a room to assign</small>
            <span className="pixel-badge">480 × 270</span>
          </div>
        </section>
        <section className="telemetry-panel panel">
          <div className="panel-heading">
            <h2>Crew readiness trend</h2>
            <div className="chart-legend">
              <span>
                <i />
                Cognition
              </span>
              <span>
                <i />
                Fatigue
              </span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={mission.telemetry}
                margin={{ top: 8, right: 16, bottom: 0, left: -24 }}
              >
                <defs>
                  <linearGradient id="cognition" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4de1d4" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#4de1d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#263849" strokeDasharray="3 5" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#8096a8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `D${v}`}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tick={{ fill: '#8096a8', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#142537',
                    border: '1px solid #365267',
                    color: '#e7f0f6',
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => `Mission day ${v}`}
                />
                <Area
                  type="linear"
                  dataKey="cognition"
                  stroke="#4de1d4"
                  strokeWidth={2}
                  fill="url(#cognition)"
                  isAnimationActive={false}
                  dot={{ r: 2 }}
                />
                <Area
                  type="linear"
                  dataKey="fatigue"
                  stroke="#f0c477"
                  fill="transparent"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  dot={{ r: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-note">Crew averages · game-model scores / 100 · one sample per day</p>
        </section>
        <motion.section
          key={event.id}
          initial={{ opacity: 0.5, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`event-panel ${event.severity}`}
        >
          <div className="event-marker">!</div>
          <div>
            <span className="eyebrow">
              MISSION LOG <b> / DAY {String(event.day).padStart(3, '0')}</b>
            </span>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
          </div>
          <NavLink to="/mission" aria-label="View mission log">
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
        <h2>Flight operations / Mission journal</h2>
        <span>{mission.events.length} REPORTS</span>
      </div>
      <div className="mission-brief">
        <h2>Secure the Mars transfer window.</h2>
        <p>
          Reach 100% transfer readiness within 30 shifts. Only duty assignments produce progress.
          Recovery, assessments, and treatment consume shifts and reserves. Assignments repeat until
          changed.
        </p>
        <p>
          Abort conditions: all crew critical, operational reserves below daily upkeep, or an
          expired transfer window. Assessments report existing model scores; they do not cure
          fatigue.
        </p>
        <strong>
          {mission.pending.length} delayed effects pending · {mission.history.length} completed
          shifts · {orders.length} queued orders
        </strong>
      </div>
      <div className="journal">
        {[...mission.events].reverse().map((e) => (
          <article key={e.id} className={`journal-entry ${e.severity}`}>
            <span className="eyebrow">
              DAY {e.day} / {e.severity}
            </span>
            <h3>{e.title}</h3>
            <p>{e.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
export function ResearchPage() {
  return (
    <section className="full-page panel research-page">
      <div className="panel-heading">
        <h2>Research / Model transparency</h2>
        <span>PROTOTYPE 0.1</span>
      </div>
      <div className="mission-brief">
        <span className="eyebrow">SCIENCE-INFORMED, NOT SCIENCE-VALIDATED</span>
        <h2>
          A simulation of trade-offs.
          <br />
          Not a prediction of human health.
        </h2>
        <p>
          No NASA datasets have been processed or integrated in this version. Health scores are
          abstract game variables. All coefficients are illustrative and have no clinical
          interpretation. Do not use this software for medical or operational decisions.
        </p>
        <div className="research-grid">
          <article>
            <Brain />
            <h3>What we model</h3>
            <p>
              Sleep recovery, fatigue, cognition, stress, resource scarcity, and delayed workload
              consequences. No diagnosis, physiology, radiation, nutrition, or individual medical
              variability.
            </p>
          </article>
          <article>
            <Radio />
            <h3>Where we go next</h3>
            <p>
              Review dataset provenance, consent and reuse requirements; map validated findings to
              documented parameters; calibrate, analyze uncertainty, and seek domain expert review.
            </p>
          </article>
        </div>
        <h3>Primary research portals</h3>
        <a href="https://osdr.nasa.gov/" target="_blank" rel="noreferrer">
          NASA Open Science Data Repository ↗
        </a>
        <a href="https://www.nasa.gov/hrp/" target="_blank" rel="noreferrer">
          NASA Human Research Program ↗
        </a>
        <p className="muted">
          These links are starting points for future research, not citations validating the current
          equations. Full assumptions and coefficients: docs/SCIENTIFIC_SOURCES.md.
        </p>
      </div>
    </section>
  )
}
