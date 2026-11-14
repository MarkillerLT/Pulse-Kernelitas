/** The eight sectors of the Elysium (design doc §5). Informational for now; each can gain mechanics later. */
export const SECTOR_IDS = [
  'armstrong',
  'gagarin',
  'ride',
  'aldrin',
  'tereshkova',
  'collins',
  'habitat',
  'life-support',
] as const
export type SectorId = (typeof SECTOR_IDS)[number]

export interface SectorDefinition {
  id: SectorId
  code: string
  name: string
  domain: string
  summary: string
  contents: string[]
}

export const SECTORS: Readonly<Record<SectorId, SectorDefinition>> = {
  armstrong: {
    id: 'armstrong',
    code: 'S-01',
    name: 'Puente Armstrong',
    domain: 'Mando',
    summary:
      'Centro de comando de la nave y centro principal de operaciones de N0VA-7: alertas, asignación de tareas e historial de decisiones.',
    contents: [
      'Mesa holográfica táctica',
      'Navegación',
      'Comunicaciones',
      'Monitores de la tripulación',
      'Mapa estelar',
      'Alertas',
      'Asignación de tareas',
      'Historial de decisiones',
      'Monitoreo de recursos',
      'Acceso al núcleo de N0VA-7',
    ],
  },
  gagarin: {
    id: 'gagarin',
    code: 'S-02',
    name: 'Complejo Gagarin',
    domain: 'Ingeniería',
    summary: 'Reactor, energía, propulsión y fabricación de componentes de la Elysium.',
    contents: [
      'Reactor',
      'Distribución eléctrica',
      'Motores',
      'Taller de reparaciones',
      'Impresora industrial de componentes',
      'Herramientas',
      'Repuestos',
      'Diagnósticos',
      'Laboratorio de tecnología desconocida',
      'Mantenimiento de soporte vital',
    ],
  },
  ride: {
    id: 'ride',
    code: 'S-03',
    name: 'Centro Médico Ride',
    domain: 'Medicina',
    summary: 'Diagnóstico, tratamiento y expedientes médicos de la tripulación.',
    contents: [
      'Cápsulas médicas automatizadas',
      'Camas de recuperación',
      'Laboratorio farmacéutico',
      'Escáneres corporales',
      'Cirugía',
      'Análisis biológicos',
      'Almacén de medicamentos',
      'Cuarentena',
      'Banco de muestras y ADN',
      'Expedientes médicos de la tripulación',
    ],
  },
  aldrin: {
    id: 'aldrin',
    code: 'S-04',
    name: 'Sector Aldrin',
    domain: 'Seguridad y exploración',
    summary: 'Equipamiento, vigilancia y hangar para operaciones fuera de la nave.',
    contents: [
      'Arsenal',
      'Trajes reforzados',
      'Equipo de rescate',
      'Drones de exploración',
      'Simulador táctico',
      'Monitoreo exterior',
      'Vigilancia',
      'Escáneres de amenazas',
      'Hangar de cápsulas de exploración',
      'Equipamiento para anomalías',
    ],
  },
  tereshkova: {
    id: 'tereshkova',
    code: 'S-05',
    name: 'Invernadero Tereshkova',
    domain: 'Agricultura e hidroponía',
    summary: 'Producción de alimentos, oxígeno vegetal y reciclaje orgánico.',
    contents: [
      'Cultivos',
      'Producción de oxígeno mediante plantas',
      'Tanques de agua reciclada',
      'Banco de semillas',
      'Laboratorio botánico',
      'Cámaras de cultivo especializadas',
      'Drones agrícolas',
      'Reciclaje orgánico',
      'Reservas alimenticias',
      'Nutrientes y fertilizantes',
    ],
  },
  collins: {
    id: 'collins',
    code: 'S-06',
    name: 'Núcleo Collins',
    domain: 'Núcleo de N0VA-7',
    summary:
      'Procesamiento, copias de seguridad e historial de misiones de la inteligencia central.',
    contents: [
      'Procesamiento',
      'Copias de seguridad',
      'Monitoreo global',
      'Administración de recursos',
      'Base de datos de navegación',
      'Historial de misiones',
      'Prioridades de emergencia',
      'Drones auxiliares',
      'Comunicaciones internas',
      'Supervisión de la nave',
    ],
  },
  habitat: {
    id: 'habitat',
    code: 'S-07',
    name: 'Módulo Habitacional',
    domain: 'Convivencia',
    summary:
      'Espacios de vida y área común. Influye en la moral, el estrés y la confianza de la tripulación.',
    contents: [
      'Cabinas',
      'Duchas y baños',
      'Cocina',
      'Comedor',
      'Recreación',
      'Biblioteca digital',
      'Gimnasio',
      'Sala de reuniones',
      'Zona de descanso',
      'Ventana de observación',
    ],
  },
  'life-support': {
    id: 'life-support',
    code: 'S-08',
    name: 'Módulo de Soporte Vital',
    domain: 'Infraestructura ambiental',
    summary: 'Aire, agua, temperatura, presión y gravedad artificial de la nave.',
    contents: [
      'Purificación de aire',
      'Reciclaje de agua',
      'Distribución de oxígeno',
      'Control térmico',
      'Gravedad artificial',
      'Sensores ambientales',
      'Reguladores de presión',
      'Baterías de emergencia',
      'Supresión de incendios',
      'Consola central de soporte vital',
    ],
  },
}

export const SECTOR_LIST: readonly SectorDefinition[] = SECTOR_IDS.map((id) => SECTORS[id])

export function isSectorId(value: string): value is SectorId {
  return (SECTOR_IDS as readonly string[]).includes(value)
}
