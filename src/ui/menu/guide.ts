import { LEVEL_HOURS } from '../../domain/rules/difficulty'

/** Express tutorial shared by the 2D pause menu and the VR one: what the player is and does. */
export const GUIDE: { title: string; text: string }[] = [
  {
    title: 'Eres N0VA-7',
    text: 'La IA central de la Elysium. No mueves a nadie: decides qué hace cada tripulante y a quién mandas a cada crisis. El tiempo corre siempre; solo se detiene en este menú.',
  },
  {
    title: 'Atiende las tareas',
    text: 'Cada tarea tiene un plazo. Elige una opción y un equipo: verás la probabilidad de éxito y por qué. Si dejas que venza, se aplica su consecuencia.',
  },
  {
    title: 'Cuida a la tripulación',
    text: 'Pulsa a un astronauta para ver Salud, Moral, Estrés, Sueño y Confianza, y darle órdenes: descansar, tiempo libre, enfermería o volver a su puesto. De 22:00 a 06:00 descansan solos.',
  },
  {
    title: 'No los quemes',
    text: 'Con Estrés ≥ 76, Sueño ≤ 24 o Salud ≤ 24 aparece una advertencia. Mandarlos de todas formas cuesta Confianza (−5), y tres órdenes forzadas generan Rencor.',
  },
  {
    title: 'Mantén viva la nave',
    text: 'Vigila Soporte vital, Energía, Casco, Comida y Medicinas. El viaje termina si el soporte vital o el casco llegan a 0, o si no queda nadie con vida.',
  },
  {
    title: 'Llega lo más lejos posible',
    text: `Cada ${LEVEL_HOURS} horas de juego sube el nivel: más consumo, más emergencias y tareas más largas. Tu récord se guarda por modo.`,
  },
]
