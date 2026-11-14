import type { Activity, Astronaut, MissionState } from '../simulation/models/mission'

// Localize only the presentation layer; saved data and engine identifiers stay in English.
export const activityLabels: Record<Activity, string> = {
  work: 'Trabajo',
  rest: 'Descanso',
  exercise: 'Ejercicio',
  assessment: 'Evaluación',
  medical: 'Tratamiento',
  social: 'Convivencia',
}
export const healthLabels: Record<Astronaut['health'], string> = {
  nominal: 'Estable',
  strained: 'Sobrecarga',
  critical: 'Crítico',
}
export const missionStatusLabels: Record<MissionState['status'], string> = {
  active: 'Misión activa',
  complete: 'Misión completada',
  failed: 'Misión abortada',
}
export const severityLabels = { info: 'Información', warning: 'Advertencia', critical: 'Crítico' }
export const roleLabels: Record<string, string> = {
  Commander: 'Comandante',
  'Flight engineer': 'Ingeniero de vuelo',
  'Medical officer': 'Oficial médica',
}
export const locationLabels: Record<string, string> = {
  'Mission control': 'Control de misión',
  'Sleeping quarters': 'Dormitorios',
  'Exercise area': 'Zona de ejercicio',
  'Medical bay': 'Enfermería',
  'Crew common': 'Sala común',
}
export const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

const messages: Record<string, string> = {
  'Awaiting your orders.': 'A la espera de tus órdenes.',
  'Assignment queued. Execute next day to apply.':
    'Asignación en cola. Avanza al día siguiente para aplicarla.',
  'Orders cleared. Current routines will continue.':
    'Órdenes canceladas. Las rutinas actuales continuarán.',
  'Saving daily report…': 'Guardando el informe diario…',
  'Daily report saved locally.': 'Informe diario guardado en este dispositivo.',
  'Autosave unavailable. Mission continues in memory; use Save to retry.':
    'Guardado automático no disponible. La misión continúa en memoria; pulsa Guardar para reintentar.',
  'Mission saved on this device. Queued orders are not saved.':
    'Misión guardada en este dispositivo. Las órdenes en cola no se guardan.',
  'Save failed. Browser storage may be disabled or full.':
    'No se pudo guardar. El almacenamiento del navegador puede estar desactivado o lleno.',
  'Local mission restored.': 'Misión local restaurada.',
  'No saved mission on this device.': 'No hay ninguna misión guardada en este dispositivo.',
  'Cannot load save: storage unavailable or save incompatible. Current mission preserved.':
    'No se pudo cargar: el almacenamiento no está disponible o la partida es incompatible. Se conserva la misión actual.',
  'New mission initialized. Previous local save removed.':
    'Nueva misión iniciada. Se ha eliminado la partida anterior.',
  'Reset failed: could not remove local save. Current mission preserved.':
    'No se pudo reiniciar: no se pudo eliminar la partida guardada. Se conserva la misión actual.',
  'This mission has ended. Start a new mission to continue.':
    'Esta misión ha terminado. Inicia una nueva misión para continuar.',
  'Unknown astronaut.': 'Astronauta desconocido.',
  'Only one assignment per astronaut per day.':
    'Solo se permite una asignación por astronauta y día.',
  'Unknown activity.': 'Actividad desconocida.',
  'Insufficient operational reserves. Reassign crew to work or start a new mission.':
    'Reservas operativas insuficientes. Asigna trabajo a la tripulación o inicia una nueva misión.',
  'Insufficient medical supplies. Cancel a treatment order.':
    'Suministros médicos insuficientes. Cancela una orden de tratamiento.',
  'A quiet warning': 'Una advertencia silenciosa',
  'Okafor is carrying a sleep deficit after overnight repairs. Another work shift may trigger delayed strain. Recovery costs time; the transfer window will not wait.':
    'Okafor acumula falta de sueño tras las reparaciones nocturnas. Otro turno de trabajo podría provocar una sobrecarga diferida. Recuperarse requiere tiempo; la ventana de transferencia no espera.',
  'Delayed strain': 'Sobrecarga diferida',
  'Adaptation benefit': 'Beneficio de adaptación',
  'Assessment results': 'Resultados de la evaluación',
  'Overload detected': 'Sobrecarga detectada',
  'Crew health alert': 'Alerta de salud de la tripulación',
  'Transfer preparations complete': 'Preparativos de transferencia completados',
  'The crew secured the Mars transfer window. Mission complete.':
    'La tripulación ha asegurado la ventana de transferencia a Marte. Misión completada.',
  'Mission aborted': 'Misión abortada',
  'The transfer window, operational reserves, or crew safety margin was exhausted.':
    'Se ha agotado la ventana de transferencia, las reservas operativas o el margen de seguridad de la tripulación.',
  'Daily report': 'Informe diario',
}
const templates: [string, string][] = [
  [
    '{name}: yesterday’s overload has surfaced. Stress +{stress}, fatigue +{fatigue}.',
    '{name}: la sobrecarga de ayer ha pasado factura. Estrés +{stress}, fatiga +{fatigue}.',
  ],
  [
    '{name}: exercise adaptation reduced stress by {amount}.',
    '{name}: la adaptación al ejercicio ha reducido el estrés en {amount} puntos.',
  ],
  [
    '{name}: cognitive readiness {cognition}/100; fatigue {fatigue}/100. Consider recovery before another work shift.',
    '{name}: preparación cognitiva {cognition}/100; fatiga {fatigue}/100. Considera un periodo de recuperación antes de otro turno de trabajo.',
  ],
  [
    '{name} finished an exhausting shift. A delayed stress response is expected next day.',
    '{name} ha terminado un turno agotador. Se espera una respuesta de estrés diferida al día siguiente.',
  ],
  [
    '{name} is in critical condition. Prioritize recovery or treatment.',
    '{name} se encuentra en estado crítico. Prioriza la recuperación o el tratamiento.',
  ],
  [
    'Work completed: +{progress}% preparation. Reserves consumed: {operations} operations, {medical} medical.',
    'Trabajo completado: +{progress}% de preparación. Reservas consumidas: {operations} operativas, {medical} médicas.',
  ],
]
const compiledTemplates = templates.map(([source, translation]) => {
  const keys: string[] = []
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = escaped.replace(/\\\{(\w+)\\\}/g, (_, key: string) => {
    keys.push(key)
    return '(.*?)'
  })
  return { pattern: new RegExp(`^${pattern}$`), keys, translation }
})

export function translateMessage(message: string): string {
  if (messages[message]) return messages[message]
  for (const { pattern, keys, translation } of compiledTemplates) {
    const match = message.match(pattern)
    if (!match) continue
    return translation.replace(/\{(\w+)\}/g, (_, key: string) => {
      const value = match[keys.indexOf(key) + 1]
      return /^\d+(\.\d+)?$/.test(value)
        ? formatNumber(Number(value), value.includes('.') ? 1 : 0)
        : value
    })
  }
  // Validation can concatenate multiple errors into one notice.
  return Object.entries(messages).reduce(
    (text, [source, translated]) => text.split(source).join(translated),
    message,
  )
}
