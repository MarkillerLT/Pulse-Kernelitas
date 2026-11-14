import {
  locationFor,
  type MissionState,
  type PlayerDecision,
  type SimulationParameters,
  type SimulationResult,
} from '../models/mission'
import { nextRandom } from './random'

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** Atomic turn: rejected orders never partially consume resources or modify input. */
export function simulateTurn(
  current: MissionState,
  decisions: PlayerDecision[],
  p: SimulationParameters,
): SimulationResult {
  const errors: string[] = []
  if (current.status !== 'active')
    return { state: current, errors: ['This mission has ended. Start a new mission to continue.'] }
  const ids = new Set<string>()
  for (const d of decisions) {
    if (!current.crew.some((a) => a.id === d.astronautId)) errors.push('Unknown astronaut.')
    if (ids.has(d.astronautId)) errors.push('Only one assignment per astronaut per day.')
    if (!Object.hasOwn(p.activityCosts, d.activity)) errors.push('Unknown activity.')
    ids.add(d.astronautId)
  }
  if (errors.length) return { state: current, errors }
  const state = structuredClone(current)
  const orders = state.crew.map((a) => ({
    astronautId: a.id,
    activity: decisions.find((d) => d.astronautId === a.id)?.activity ?? a.activity,
  }))
  const operations =
    p.dailyOperations + orders.reduce((sum, d) => sum + p.activityCosts[d.activity], 0)
  const medical = orders.filter((d) => d.activity === 'medical').length * p.medicalCost
  if (operations > state.resources.operations)
    errors.push('Insufficient operational reserves. Reassign crew to work or start a new mission.')
  if (medical > state.resources.medical)
    errors.push('Insufficient medical supplies. Cancel a treatment order.')
  if (errors.length) return { state: current, errors }
  state.resources.operations -= operations
  state.resources.medical -= medical
  state.day += 1
  state.history.push({ day: current.day, decisions: orders })
  const event = (
    title: string,
    description: string,
    severity: 'info' | 'warning' | 'critical' = 'info',
  ) => {
    state.events.push({
      id: `${state.day}-${state.events.length}`,
      day: state.day,
      title,
      description,
      severity,
    })
  }
  for (const effect of state.pending.filter((e) => e.dueDay <= state.day)) {
    const a = state.crew.find((a) => a.id === effect.astronautId)!
    if (effect.kind === 'strain') {
      a.stress = clamp(a.stress + effect.magnitude)
      a.fatigue = clamp(a.fatigue + effect.magnitude / 2)
      event(
        'Delayed strain',
        `${a.name}: yesterday’s overload has surfaced. Stress +${effect.magnitude}, fatigue +${effect.magnitude / 2}.`,
        'warning',
      )
    } else if (effect.kind === 'recovery') {
      a.stress = clamp(a.stress - effect.magnitude)
      event(
        'Adaptation benefit',
        `${a.name}: exercise adaptation reduced stress by ${effect.magnitude}.`,
      )
    } else {
      event(
        'Assessment results',
        `${a.name}: cognitive readiness ${a.cognition}/100; fatigue ${a.fatigue}/100. Consider recovery before another work shift.`,
      )
    }
  }
  state.pending = state.pending.filter((e) => e.dueDay > state.day)
  let progress = 0
  for (const a of state.crew) {
    a.activity = orders.find((d) => d.astronautId === a.id)!.activity
    a.location = locationFor[a.activity]
    const [seed, random] = nextRandom(state.seed)
    state.seed = seed
    const variation = Math.floor(random * 5) - 2
    switch (a.activity) {
      case 'work':
        a.fatigue += p.workFatigue + variation
        a.sleep -= 8
        a.stress += 5
        progress += p.progressPerWorker * (a.cognition / 100)
        break
      case 'rest':
        a.fatigue -= p.restRecovery
        a.sleep += 25
        a.stress -= 12
        break
      case 'exercise':
        a.fatigue += 6
        a.sleep += 7
        a.stress -= 6
        state.pending.push({
          dueDay: state.day + 2,
          astronautId: a.id,
          kind: 'recovery',
          magnitude: 8,
        })
        break
      case 'assessment':
        a.fatigue += 3
        a.stress += 2
        state.pending.push({
          dueDay: state.day + 1,
          astronautId: a.id,
          kind: 'assessment',
          magnitude: 0,
        })
        break
      case 'medical':
        a.fatigue -= 16
        a.stress -= 16
        a.sleep += 10
        break
      case 'social':
        a.fatigue -= 6
        a.stress -= 18
        a.sleep += 3
        break
    }
    a.fatigue = clamp(a.fatigue)
    a.sleep = clamp(a.sleep)
    a.stress = clamp(a.stress)
    a.cognition = clamp(100 - a.fatigue * 0.4 - a.stress * 0.2 + a.sleep * 0.08)
    a.health =
      a.fatigue >= 90 || a.stress >= 90
        ? 'critical'
        : a.fatigue >= 65 || a.stress >= 65
          ? 'strained'
          : 'nominal'
    if (a.activity === 'work' && a.fatigue >= p.strainThreshold) {
      state.pending.push({
        dueDay: state.day + 1,
        astronautId: a.id,
        kind: 'strain',
        magnitude: 14,
      })
      event(
        'Overload detected',
        `${a.name} finished an exhausting shift. A delayed stress response is expected next day.`,
        'warning',
      )
    }
    if (a.health === 'critical')
      event(
        'Crew health alert',
        `${a.name} is in critical condition. Prioritize recovery or treatment.`,
        'critical',
      )
  }
  state.progress = Math.min(100, Math.round((state.progress + progress) * 10) / 10)
  if (state.progress >= 100) {
    state.status = 'complete'
    event(
      'Transfer preparations complete',
      'The crew secured the Mars transfer window. Mission complete.',
    )
  } else if (
    state.day > state.duration ||
    state.resources.operations < p.dailyOperations ||
    state.crew.every((a) => a.health === 'critical')
  ) {
    state.status = 'failed'
    event(
      'Mission aborted',
      'The transfer window, operational reserves, or crew safety margin was exhausted.',
      'critical',
    )
  }
  const average = (key: 'fatigue' | 'cognition' | 'stress') =>
    Math.round(state.crew.reduce((sum, a) => sum + a[key], 0) / state.crew.length)
  state.telemetry.push({
    day: state.day,
    fatigue: average('fatigue'),
    cognition: average('cognition'),
    stress: average('stress'),
    progress: state.progress,
  })
  if (state.events.length === current.events.length)
    event(
      'Daily report',
      `Work completed: +${Math.round(progress * 10) / 10}% preparation. Reserves consumed: ${operations} operations, ${medical} medical.`,
    )
  return { state, errors: [] }
}
