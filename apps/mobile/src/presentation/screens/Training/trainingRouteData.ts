import { type TrainingPosition } from './trainingData';

export interface RouteNode {
  id: string;
  dayNumber: number;
  levelId: string;
  title: string;
  subtitle: string;
  category: string;
  status: 'completed' | 'active' | 'locked';
  stars: number;
  positionsCount: number;
  completedCount: number;
  xp: number;
  coachTip: string;
  isBoss?: boolean;
  systemId?: string;
  positions: TrainingPosition[];
}

export interface RouteLevel {
  id: string;
  name: string;
  subtitle: string;
  tag: string;
  color: string;
  description: string;
  nodes: RouteNode[];
}

export const TRAINING_ROUTE_LEVELS: RouteLevel[] = [
  {
    id: 'level-1',
    name: 'Nivel 1: Iniciación & Biomecánica',
    subtitle: 'Postura, Puentes y Limaje Pendular',
    tag: 'FUNDAMENTOS',
    color: '#10b981',
    description:
      'Basado en la escuela de José María Quetglas: anclaje del cuerpo, puente cerrado con anilla, aceleración constante y ataque al centro sin desvío.',
    nodes: [
      {
        id: 'node-1-1',
        dayNumber: 1,
        levelId: 'level-1',
        title: 'Postura y Puente Cerrado',
        subtitle: 'Anclaje de pies a 45° y anilla firme',
        category: 'Técnica & Biomecánica',
        status: 'completed',
        stars: 3,
        positionsCount: 10,
        completedCount: 10,
        xp: 120,
        coachTip:
          '“El pie de apoyo debe descansar exactamente sobre la línea de tiro. El 60% del peso se apoya atrás para que la cabeza no oscile durante el limaje.” — J.M. Quetglas',
        systemId: 'base-50',
        positions: [
          {
            id: 'pos-1-1-1',
            white: { x: 50, y: 71 },
            yellow: { x: 142, y: 71 },
            red: { x: 213, y: 71 },
            trajectory: [
              { x: 50, y: 71 },
              { x: 142, y: 71 },
              { x: 213, y: 71 },
            ],
          },
          {
            id: 'pos-1-1-2',
            white: { x: 60, y: 35 },
            yellow: { x: 142, y: 71 },
            red: { x: 230, y: 105 },
            trajectory: [
              { x: 60, y: 35 },
              { x: 142, y: 71 },
              { x: 230, y: 105 },
            ],
          },
        ],
      },
      {
        id: 'node-1-2',
        dayNumber: 2,
        levelId: 'level-1',
        title: 'Limaje Pendular y Penetración',
        subtitle: 'Ángulo de 90° en antebrazo y soltura en culata',
        category: 'Técnica & Biomecánica',
        status: 'active',
        stars: 2,
        positionsCount: 12,
        completedCount: 6,
        xp: 150,
        coachTip:
          '“No aprietes la culata al impactar la bola. El taco debe penetrar de 15 a 20 cm como si la bola 1 no existiera.” — J.M. Quetglas',
        systemId: 'base-50',
        positions: [
          {
            id: 'pos-1-2-1',
            white: { x: 71, y: 105 },
            yellow: { x: 142, y: 71 },
            red: { x: 213, y: 35 },
            trajectory: [
              { x: 71, y: 105 },
              { x: 142, y: 71 },
              { x: 284, y: 35 },
            ],
          },
        ],
      },
      {
        id: 'node-1-3',
        dayNumber: 3,
        levelId: 'level-1',
        title: 'Golpe al Centro Sin Efecto',
        subtitle: 'Salida neutra a banda corta y rebote paralelo',
        category: 'Alineación Pura',
        status: 'locked',
        stars: 0,
        positionsCount: 10,
        completedCount: 0,
        xp: 140,
        coachTip:
          '“Verifica que el taco retorne al mismo punto de salida. El rebote debe regresar exactamente por la línea trazada si el golpe fue centrado.”',
        systemId: 'base-50',
        positions: [],
      },
      {
        id: 'node-1-4',
        dayNumber: 4,
        levelId: 'level-1',
        title: 'Puentes Especiales: Sobre Banda y Abierto',
        subtitle: 'Bolas pegadas y salvadas delicadas',
        category: 'Biomecánica Especial',
        status: 'locked',
        stars: 0,
        positionsCount: 12,
        completedCount: 0,
        xp: 160,
        coachTip:
          '“En bola pegada a la banda, apoya el pasamanos sobre la madera manteniendo el taco lo más horizontal posible para evitar desvíos por piqué.”',
        systemId: 'pase-bola',
        positions: [],
      },
      {
        id: 'node-1-5',
        dayNumber: 5,
        levelId: 'level-1',
        title: 'Evaluación de Fundamentos Biomecánicos',
        subtitle: 'Prueba de 10 tacadas puras consecutivas',
        category: 'Hito de Evaluación',
        status: 'locked',
        stars: 0,
        positionsCount: 10,
        completedCount: 0,
        xp: 300,
        isBoss: true,
        coachTip:
          '“Examen de maestría: 10 carambolas de control estricto sin desviación de eje ni tensión en hombros.”',
        systemId: 'base-50',
        positions: [],
      },
    ],
  },
  {
    id: 'level-2',
    name: 'Nivel 2: Geometría de 1 y 2 Bandas',
    subtitle: 'Ángulos Naturales, Rotación y Amortiguación',
    tag: 'GEOMETRÍA TÁCTICA',
    color: '#06b6d4',
    description:
      'Dominio de los ángulos de reflexión, choque de bola, efectos horarios y control de velocidad en paños rápidos.',
    nodes: [
      {
        id: 'node-2-1',
        dayNumber: 6,
        levelId: 'level-2',
        title: 'Ángulos Naturales de Reflexión',
        subtitle: 'Llegada de 1 banda sin efecto',
        category: 'Geometría',
        status: 'locked',
        stars: 0,
        positionsCount: 12,
        completedCount: 0,
        xp: 140,
        coachTip:
          '“El ángulo de incidencia es igual al de reflexión únicamente cuando la bola lleva velocidad media y cero lateral.”',
        systemId: 'pase-bola',
        positions: [],
      },
      {
        id: 'node-2-2',
        dayNumber: 7,
        levelId: 'level-2',
        title: 'Efectos Horarios (Rotaciones 1, 2 y 3)',
        subtitle: 'Apertura controlada en bandas de goma',
        category: 'Efectos',
        status: 'locked',
        stars: 0,
        positionsCount: 15,
        completedCount: 0,
        xp: 180,
        coachTip:
          '“Cada punta de efecto modifica la llegada en banda larga en aproximadamente medio diamante. Memoriza la deformación del caucho.”',
        systemId: 'base-50',
        positions: [],
      },
      {
        id: 'node-2-3',
        dayNumber: 8,
        levelId: 'level-2',
        title: 'Amortiguamiento y Rodadas Cortas',
        subtitle: 'Ataques con bola amortiguada y retención',
        category: 'Sensibilidad',
        status: 'locked',
        stars: 0,
        positionsCount: 12,
        completedCount: 0,
        xp: 200,
        isBoss: true,
        coachTip:
          '“El toque seco absorbe la energía viva de la bola 1 y la transfiere a la 2 sin que se descontrole la llegada.”',
        systemId: 'pase-bola',
        positions: [],
      },
    ],
  },
  {
    id: 'level-3',
    name: 'Nivel 3: Sistemas Clásicos a 3 Bandas',
    subtitle: 'Base 50, Pase Bola y Bricoles UMB',
    tag: 'SISTEMAS UMB',
    color: '#f59e0b',
    description:
      'El corazón del billar a 3 bandas: cálculo aritmético de diamantes (Salida - Ataque = Llegada), compensaciones y pase bola.',
    nodes: [
      {
        id: 'node-3-1',
        dayNumber: 9,
        levelId: 'level-3',
        title: 'Sistema Clásico (Base 50)',
        subtitle: 'Fórmula maestra: Salida - Ataque = Llegada a 3ª banda',
        category: 'Sistemas',
        status: 'locked',
        stars: 0,
        positionsCount: 15,
        completedCount: 0,
        xp: 220,
        coachTip:
          '“En Base 50, ataca siempre con 2.5 suelas de efecto corrido y velocidad 2.5. La constancia es más importante que la fuerza.”',
        systemId: 'base-50',
        positions: [],
      },
      {
        id: 'node-3-2',
        dayNumber: 10,
        levelId: 'level-3',
        title: 'Pase Bola Larga-Corta-Larga',
        subtitle: 'Grosor 1/2 bola y desvío limpio',
        category: 'Sistemas',
        status: 'locked',
        stars: 0,
        positionsCount: 14,
        completedCount: 0,
        xp: 220,
        coachTip:
          '“Evita el retruque en la primera banda enviando la bola 2 al centro del cuadro opuesto.”',
        systemId: 'pase-bola',
        positions: [],
      },
      {
        id: 'node-3-3',
        dayNumber: 11,
        levelId: 'level-3',
        title: 'Bricol Clásico de Banda Corta',
        subtitle: 'Ataque directo al diamante y apertura en rincón',
        category: 'Sistemas',
        status: 'locked',
        stars: 0,
        positionsCount: 15,
        completedCount: 0,
        xp: 250,
        isBoss: true,
        coachTip:
          '“El bricol exige máxima concentración en el punto exacto de entrada a la banda antes de tocar cualquier bola.”',
        systemId: 'base-50',
        positions: [],
      },
    ],
  },
  {
    id: 'level-4',
    name: 'Nivel 4: Competición y Control de Rotación',
    subtitle: 'Renversé, Cabaña Tuzul y Juego de Reunión',
    tag: 'ALTA COMPETICIÓN',
    color: '#ef4444',
    description:
      'Soluciones para posiciones de máxima dificultad internacional: inversión de rotación, cabañas largas y construcción de series.',
    nodes: [
      {
        id: 'node-4-1',
        dayNumber: 12,
        levelId: 'level-4',
        title: 'Renversé: Inversión de Efecto',
        subtitle: 'Efecto contrario con tacada penetrada',
        category: 'Competición',
        status: 'locked',
        stars: 0,
        positionsCount: 15,
        completedCount: 0,
        xp: 280,
        coachTip:
          '“El renversé requiere una aceleración limpia sin empujar bruscamente. El efecto contrario actúa con violencia en la segunda banda.”',
        systemId: 'pase-bola',
        positions: [],
      },
      {
        id: 'node-4-2',
        dayNumber: 13,
        levelId: 'level-4',
        title: 'Cabaña Sistema Tuzul',
        subtitle: 'Ángulo cerrado con retención de efecto horario',
        category: 'Competición',
        status: 'locked',
        stars: 0,
        positionsCount: 12,
        completedCount: 0,
        xp: 300,
        isBoss: true,
        coachTip:
          '“El secreto del Tuzul es el punto de impacto bajo y el limaje pausado para que la bola doble en la banda larga.”',
        systemId: 'base-50',
        positions: [],
      },
    ],
  },
];
