import { missionSchema, type MissionState } from '../simulation/models/mission'
import { database } from './database'

export async function saveMission(state: MissionState): Promise<void> {
  const validated = missionSchema.parse(state)
  await database.saves.put({
    id: 'mission',
    version: 1,
    savedAt: new Date().toISOString(),
    state: validated,
  })
}
export async function loadMission(): Promise<MissionState | null> {
  const saved = await database.saves.get('mission')
  if (!saved) return null
  if (saved.version !== 1)
    throw new Error('Unsupported save version. Existing save was not changed.')
  return missionSchema.parse(saved.state)
}
export async function deleteMission(): Promise<void> {
  await database.saves.delete('mission')
}
