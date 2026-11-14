import { describe, expect, it } from 'vitest'
import {
  activityLabels,
  formatNumber,
  healthLabels,
  locationLabels,
  missionStatusLabels,
  roleLabels,
  translateMessage,
} from '../../src/lib/localization'
import { createMission } from '../../src/simulation/engine/createMission'
import { simulateTurn } from '../../src/simulation/engine/simulateTurn'
import { parameters } from '../../src/simulation/parameters/defaults'

describe('Spanish presentation without changing engine data', () => {
  it('localizes all initial crew labels while preserving English identifiers', () => {
    const mission = createMission()
    for (const a of mission.crew) {
      expect(activityLabels[a.activity]).toBe('Trabajo')
      expect(roleLabels[a.role]).toBeDefined()
      expect(locationLabels[a.location]).toBe('Control de misión')
      expect(healthLabels[a.health]).toBeDefined()
    }
    expect(missionStatusLabels.complete).toBe('Misión completada')
    expect(mission.crew[0].role).toBe('Commander')
    expect(mission.crew[0].activity).toBe('work')
  })
  it('formats decimal values using Spanish conventions', () => {
    expect(formatNumber(12.5, 1)).toBe('12,5')
    expect(formatNumber(0, 1)).toBe('0,0')
  })
  it.each([
    [
      'Idris Okafor: yesterday’s overload has surfaced. Stress +14, fatigue +7.',
      'Idris Okafor: la sobrecarga de ayer ha pasado factura. Estrés +14, fatiga +7.',
    ],
    [
      'Mina Park: exercise adaptation reduced stress by 8.',
      'Mina Park: la adaptación al ejercicio ha reducido el estrés en 8 puntos.',
    ],
    [
      'Elena Vasquez: cognitive readiness 83/100; fatigue 46/100. Consider recovery before another work shift.',
      'Elena Vasquez: preparación cognitiva 83/100; fatiga 46/100. Considera un periodo de recuperación antes de otro turno de trabajo.',
    ],
    [
      'Idris Okafor finished an exhausting shift. A delayed stress response is expected next day.',
      'Idris Okafor ha terminado un turno agotador. Se espera una respuesta de estrés diferida al día siguiente.',
    ],
    [
      'Elena Vasquez is in critical condition. Prioritize recovery or treatment.',
      'Elena Vasquez se encuentra en estado crítico. Prioriza la recuperación o el tratamiento.',
    ],
    [
      'Work completed: +9.5% preparation. Reserves consumed: 3 operations, 0 medical.',
      'Trabajo completado: +9,5% de preparación. Reservas consumidas: 3 operativas, 0 médicas.',
    ],
  ])('translates dynamic event text: %s', (source, translated) => {
    expect(translateMessage(source)).toBe(translated)
  })
  it('translates both current and previously saved English event messages at display time', () => {
    const mission = simulateTurn(createMission(), [], parameters).state
    const saved = JSON.stringify(mission)
    for (const event of mission.events) {
      expect(translateMessage(event.title)).not.toBe(event.title)
      expect(translateMessage(event.description)).not.toBe(event.description)
    }
    expect(JSON.stringify(mission)).toBe(saved)
  })
  it('translates concatenated validation errors and persistence failures', () => {
    expect(translateMessage('Unknown astronaut. Unknown activity.')).toBe(
      'Astronauta desconocido. Actividad desconocida.',
    )
    expect(translateMessage('Save failed. Browser storage may be disabled or full.')).toBe(
      'No se pudo guardar. El almacenamiento del navegador puede estar desactivado o lleno.',
    )
  })
})
