import { expect, it } from 'vitest'
import { CREW_IDS, type CrewId } from '../../src/domain/content/crew'
import { getEvent } from '../../src/domain/content/events'
import { getMission } from '../../src/domain/content/missions'
import { createGame } from '../../src/domain/engine/createGame'
import { assignTask, orderCrew, previewAssignment } from '../../src/domain/engine/commands'
import { advanceHours } from '../../src/domain/engine/tick'
import type { GameState } from '../../src/domain/model/game'
import { getAvailability, getWorkWarnings } from '../../src/domain/rules/availability'
import type { DifficultyMode } from '../../src/domain/rules/difficulty'

/** Simple competent policy: care for exhausted crew, grant requests, send the best available specialist. */
function act(s: GameState): GameState {
  for (const id of CREW_IDS) {
    const c = s.crew[id]
    if (c.activity !== 'duty') continue
    if (c.stats.health < 40) {
      const r = orderCrew(s, id, 'medical')
      if (r.ok) s = r.state
    } else if (c.stats.stress > 70) {
      const r = orderCrew(s, id, 'leisure')
      if (r.ok) s = r.state
    }
  }
  for (const task of s.tasks.filter((t) => t.status === 'open')) {
    const free = CREW_IDS.filter(
      (id) => getAvailability(s.crew[id]).available && !getWorkWarnings(s.crew[id]).length,
    )
    let best = null as { optionId: string; crewIds: CrewId[]; chance: number } | null
    const consider = (optionId: string, crewIds: CrewId[]) => {
      const p = previewAssignment(s, { taskId: task.id, optionId, crewIds })
      if (p.errors.length) return
      const chance = p.chance?.chance ?? 1
      if (!best || chance > best.chance) best = { optionId, crewIds, chance }
    }
    if (task.kind === 'request') consider('grant', [])
    else if (task.kind === 'mission') {
      const m = getMission(task.refId)!
      for (const r of m.routes) {
        const team = r.optimalCrew.filter((id) => free.includes(id))
        if (team.length) consider(r.id, team)
      }
    } else {
      for (const o of getEvent(task.refId)!.options) {
        if (o.kind === 'auto') consider(o.id, [])
        else for (const id of free) consider(o.id, [id])
      }
    }
    if (best) {
      const r = assignTask(s, { taskId: task.id, optionId: best.optionId, crewIds: best.crewIds })
      if (r.ok) s = r.state
    }
  }
  return s
}

/** Plays a whole run with a simple policy to catch balance regressions. Deterministic. */
function play(
  seed: number,
  active: boolean,
  mode: DifficultyMode = 'easy',
  maxDays = 60,
): GameState {
  let s = createGame({ now: 'x', seed, mode })
  while (s.status === 'active' && s.hour < maxDays * 24) {
    if (active) s = act(s)
    s = advanceHours(s, 1).state
  }
  return s
}

const day = (s: GameState) => Math.floor(s.hour / 24) + 1

it('a passive N0VA-7 loses the ship', () => {
  for (const seed of [1, 2, 3, 4]) expect(play(seed, false).status).toBe('lost')
})

it('a competent N0VA-7 survives into the Medio phase and outlasts a passive one', () => {
  const seeds = [1, 2, 3, 5, 9, 12]
  const runs = seeds.map((seed) => play(seed, true))
  expect(runs.filter((s) => s.difficulty.level >= 5).length).toBeGreaterThanOrEqual(5)
  for (const [i, seed] of seeds.entries())
    expect(day(runs[i])).toBeGreaterThan(day(play(seed, false)))
}, 20_000)

it('the difficulty curve is progressive: harder modes end sooner', () => {
  const total = (mode: DifficultyMode) =>
    [1, 2, 3].reduce((sum, seed) => sum + day(play(seed, true, mode)), 0)
  const easy = total('easy')
  const medium = total('medium')
  const hard = total('hard')
  expect(easy).toBeGreaterThan(medium)
  expect(medium).toBeGreaterThan(hard)
}, 20_000)
