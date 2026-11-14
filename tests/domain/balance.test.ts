import { expect, it } from 'vitest'
import { CREW_IDS, type CrewId } from '../../src/domain/content/crew'
import { getEvent } from '../../src/domain/content/events'
import { getMission } from '../../src/domain/content/missions'
import { createGame } from '../../src/domain/engine/createGame'
import { assignTask, orderCrew, previewAssignment } from '../../src/domain/engine/commands'
import { advanceHours } from '../../src/domain/engine/tick'
import type { GameState } from '../../src/domain/model/game'
import { getAvailability, getWorkWarnings } from '../../src/domain/rules/availability'

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

/** Plays whole journeys with a simple policy to catch balance regressions. Deterministic. */
function play(seed: number, active: boolean): GameState {
  let s = createGame({ now: 'x', seed })
  while (s.status === 'active') {
    if (active) s = act(s)
    s = advanceHours(s, 1).state
  }
  return s
}

it('a passive N0VA-7 loses the ship', () => {
  for (const seed of [1, 2, 3, 4]) expect(play(seed, false).status).toBe('lost')
})

it('a competent N0VA-7 usually reaches the destination', () => {
  const wins = [1, 2, 3, 5, 9, 12].filter((seed) => play(seed, true).status === 'won').length
  expect(wins).toBeGreaterThanOrEqual(4)
})
