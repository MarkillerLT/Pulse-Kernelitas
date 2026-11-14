import type { MissionState } from '../models/mission'

export function createMission(seed = 2049): MissionState {
  return {
    schemaVersion: 1,
    day: 1,
    duration: 30,
    seed: seed >>> 0,
    progress: 0,
    status: 'active',
    crew: [
      {
        id: 'vasquez',
        name: 'Elena Vasquez',
        role: 'Commander',
        color: '#4de1d4',
        activity: 'work',
        location: 'Mission control',
        sleep: 64,
        fatigue: 46,
        cognition: 83,
        stress: 32,
        health: 'nominal',
      },
      {
        id: 'okafor',
        name: 'Idris Okafor',
        role: 'Flight engineer',
        color: '#f0c477',
        activity: 'work',
        location: 'Mission control',
        sleep: 38,
        fatigue: 72,
        cognition: 68,
        stress: 56,
        health: 'strained',
      },
      {
        id: 'park',
        name: 'Mina Park',
        role: 'Medical officer',
        color: '#ac9bf2',
        activity: 'work',
        location: 'Mission control',
        sleep: 78,
        fatigue: 28,
        cognition: 92,
        stress: 24,
        health: 'nominal',
      },
    ],
    resources: { medical: 12, operations: 180 },
    pending: [],
    history: [],
    events: [
      {
        id: 'briefing',
        day: 1,
        severity: 'warning',
        title: 'A quiet warning',
        description:
          'Okafor is carrying a sleep deficit after overnight repairs. Another work shift may trigger delayed strain. Recovery costs time; the transfer window will not wait.',
      },
    ],
    telemetry: [{ day: 1, fatigue: 49, cognition: 81, stress: 37, progress: 0 }],
  }
}
