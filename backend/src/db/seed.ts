import 'dotenv/config';
import { scryptSync, randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from './index.js';
import {
    users,
    trainingLevels,
    trainingNodes,
    trainingNodePositions,
    userNodeProgress,
    billiardSystems,
    pedagogyModules,
} from './schema.js';

function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

const SEED_LEVELS = [
    {
        id: 'level-1',
        orderIndex: 1,
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
                title: 'Postura y Puente Cerrado',
                subtitle: 'Anclaje de pies a 45° y anilla firme',
                defaultStatus: 'completed',
                isBoss: false,
                xp: 120,
                orderIndex: 1,
                positions: [
                    {
                        id: 'pos-1-1-1',
                        name: 'Alineación Pura en Línea Recta',
                        category: 'Biomecánica',
                        hint: 'Anclaje firme a 45°, barbilla a 12 cm del taco.',
                        difficulty: 2,
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
                        name: 'Tiro Diagonal con Penetración Suave',
                        category: 'Biomecánica',
                        hint: 'Acelera suavemente desde el codo sin mover el hombro.',
                        difficulty: 3,
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
                title: 'Limaje Pendular y Penetración',
                subtitle: 'Ángulo de 90° en antebrazo y soltura en culata',
                defaultStatus: 'active',
                isBoss: false,
                xp: 150,
                orderIndex: 2,
                positions: [
                    {
                        id: 'pos-1-2-1',
                        name: 'Penetración de 18 cm al Centro',
                        category: 'Limaje',
                        hint: 'El antebrazo debe quedar vertical a 90° en el impacto.',
                        difficulty: 3,
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
                title: 'Golpe al Centro Sin Efecto',
                subtitle: 'Salida neutra a banda corta y rebote paralelo',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 140,
                orderIndex: 3,
                positions: [
                    {
                        id: 'pos-1-3-1',
                        name: 'Rebote Paralelo Banda Corta',
                        category: 'Alineación Pura',
                        hint: 'La bola debe retornar exactamente por la misma línea.',
                        difficulty: 2,
                        white: { x: 50, y: 71 },
                        yellow: { x: 6, y: 71 },
                        red: { x: 213, y: 71 },
                        trajectory: [
                            { x: 50, y: 71 },
                            { x: 6, y: 71 },
                            { x: 213, y: 71 },
                        ],
                    },
                ],
            },
            {
                id: 'node-1-4',
                dayNumber: 4,
                title: 'Puentes Especiales: Sobre Banda y Abierto',
                subtitle: 'Bolas pegadas y salvadas delicadas',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 160,
                orderIndex: 4,
                positions: [
                    {
                        id: 'pos-1-4-1',
                        name: 'Ataque con Bola Pegada a Pasamanos',
                        category: 'Puente Sobre Banda',
                        hint: 'Mantén el taco horizontal apoyando la muñeca sobre la madera.',
                        difficulty: 4,
                        white: { x: 80, y: 10 },
                        yellow: { x: 180, y: 50 },
                        red: { x: 240, y: 110 },
                        trajectory: [
                            { x: 80, y: 10 },
                            { x: 180, y: 50 },
                            { x: 240, y: 110 },
                        ],
                    },
                ],
            },
            {
                id: 'node-1-5',
                dayNumber: 5,
                title: 'Evaluación de Fundamentos Biomecánicos',
                subtitle: 'Prueba de 10 tacadas puras consecutivas',
                defaultStatus: 'locked',
                isBoss: true,
                xp: 300,
                orderIndex: 5,
                positions: [
                    {
                        id: 'pos-1-5-1',
                        name: 'Examen de Maestría Quetglas',
                        category: 'Hito de Evaluación',
                        hint: 'Control absoluto del cuerpo: 10 carambolas de control estricto.',
                        difficulty: 4,
                        white: { x: 71, y: 105 },
                        yellow: { x: 213, y: 35 },
                        red: { x: 248, y: 105 },
                        trajectory: [
                            { x: 71, y: 105 },
                            { x: 142, y: 138 },
                            { x: 279, y: 70 },
                            { x: 213, y: 6 },
                            { x: 248, y: 105 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'level-2',
        orderIndex: 2,
        name: 'Nivel 2: Geometría de 1 y 2 Bandas',
        subtitle: 'Ángulos Naturales, Reflexión y Espejos',
        tag: 'GEOMETRÍA',
        color: '#06b6d4',
        description:
            'Descubre las leyes ópticas y simétricas de la mesa: punto medio, cálculo de espejos para 1 banda y desvíos naturales por grosor de bola.',
        nodes: [
            {
                id: 'node-2-1',
                dayNumber: 6,
                title: 'Reflexión Natural a 1 Banda',
                subtitle: 'Ley de Snell aplicada al paño',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 180,
                orderIndex: 1,
                positions: [
                    {
                        id: 'pos-2-1-1',
                        name: 'Ángulo Natural de 45° a Banda Larga',
                        category: 'Geometría Natural',
                        hint: 'Sin efecto lateral, ángulo de entrada = ángulo de salida.',
                        difficulty: 2,
                        white: { x: 71, y: 105 },
                        yellow: { x: 142, y: 35 },
                        red: { x: 213, y: 105 },
                        trajectory: [
                            { x: 71, y: 105 },
                            { x: 142, y: 6 },
                            { x: 213, y: 105 },
                        ],
                    },
                    {
                        id: 'pos-2-1-2',
                        name: 'Reflexión en Banda Corta',
                        category: 'Geometría Natural',
                        hint: 'Golpe centrado a media altura sobre banda corta.',
                        difficulty: 3,
                        white: { x: 40, y: 71 },
                        yellow: { x: 100, y: 35 },
                        red: { x: 40, y: 35 },
                        trajectory: [
                            { x: 40, y: 71 },
                            { x: 6, y: 35 },
                            { x: 40, y: 35 },
                        ],
                    },
                ],
            },
            {
                id: 'node-2-2',
                dayNumber: 7,
                title: 'El Método del Espejo Virtual',
                subtitle: 'Proyección imaginaria detrás de la banda',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 190,
                orderIndex: 2,
                positions: [
                    {
                        id: 'pos-2-2-1',
                        name: 'Proyección Simétrica de 1 Banda',
                        category: 'Geometría Visual',
                        hint: 'Apunta al punto reflejado imaginario en el plano exterior.',
                        difficulty: 3,
                        white: { x: 100, y: 110 },
                        yellow: { x: 142, y: 60 },
                        red: { x: 184, y: 110 },
                        trajectory: [
                            { x: 100, y: 110 },
                            { x: 142, y: 6 },
                            { x: 184, y: 110 },
                        ],
                    },
                    {
                        id: 'pos-2-2-2',
                        name: 'Espejo en Banda Larga Opuesta',
                        category: 'Geometría Visual',
                        hint: 'Alinea la visual con el vértice virtual externo.',
                        difficulty: 3,
                        white: { x: 50, y: 90 },
                        yellow: { x: 177, y: 20 },
                        red: { x: 240, y: 90 },
                        trajectory: [
                            { x: 50, y: 90 },
                            { x: 145, y: 6 },
                            { x: 240, y: 90 },
                        ],
                    },
                ],
            },
            {
                id: 'node-2-3',
                dayNumber: 8,
                title: 'Banda Corta a Banda Larga (2B)',
                subtitle: 'El retorno simétrico en el rincón',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 210,
                orderIndex: 3,
                positions: [
                    {
                        id: 'pos-2-3-1',
                        name: 'Entrada de Rincón a 2 Bandas',
                        category: 'Geometría Multibanda',
                        hint: 'Ataque suave de banda corta a banda larga.',
                        difficulty: 3,
                        white: { x: 71, y: 120 },
                        yellow: { x: 100, y: 30 },
                        red: { x: 180, y: 120 },
                        trajectory: [
                            { x: 71, y: 120 },
                            { x: 10, y: 6 },
                            { x: 6, y: 80 },
                            { x: 180, y: 120 },
                        ],
                    },
                    {
                        id: 'pos-2-3-2',
                        name: 'Retorno Invertido a 2 Bandas',
                        category: 'Geometría Multibanda',
                        hint: 'Amortiguación suave para retener la bola 2.',
                        difficulty: 4,
                        white: { x: 120, y: 110 },
                        yellow: { x: 160, y: 40 },
                        red: { x: 80, y: 110 },
                        trajectory: [
                            { x: 120, y: 110 },
                            { x: 270, y: 10 },
                            { x: 278, y: 80 },
                            { x: 80, y: 110 },
                        ],
                    },
                ],
            },
            {
                id: 'node-2-4',
                dayNumber: 9,
                title: 'Ajuste por Fricción y Efectos Horarios',
                subtitle: 'Apertura con efectos 1, 2 y 3',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 220,
                orderIndex: 4,
                positions: [
                    {
                        id: 'pos-2-4-1',
                        name: 'Efecto 1 a Favor (Medio Diamante)',
                        category: 'Efectos',
                        hint: 'Impacto a las 2:00 / 10:00 para abrir la trayectoria.',
                        difficulty: 3,
                        white: { x: 71, y: 105 },
                        yellow: { x: 142, y: 40 },
                        red: { x: 230, y: 105 },
                        trajectory: [
                            { x: 71, y: 105 },
                            { x: 142, y: 6 },
                            { x: 230, y: 105 },
                        ],
                    },
                    {
                        id: 'pos-2-4-2',
                        name: 'Efecto 2 y 3 Máxima Apertura',
                        category: 'Efectos',
                        hint: 'Impacto lateral pleno sin perder penetración.',
                        difficulty: 3,
                        white: { x: 50, y: 120 },
                        yellow: { x: 120, y: 50 },
                        red: { x: 260, y: 120 },
                        trajectory: [
                            { x: 50, y: 120 },
                            { x: 120, y: 6 },
                            { x: 260, y: 120 },
                        ],
                    },
                ],
            },
            {
                id: 'node-2-5',
                dayNumber: 10,
                title: 'Desafío Maestro: Carambolas de 2 Bandas',
                subtitle: 'Examen de precisión angular',
                defaultStatus: 'locked',
                isBoss: true,
                xp: 350,
                orderIndex: 5,
                positions: [
                    {
                        id: 'pos-2-5-1',
                        name: 'Carambola de 2 Bandas de Precisión',
                        category: 'Hito de Evaluación',
                        hint: 'Control estricto de fuerza 2.5 bandas.',
                        difficulty: 4,
                        white: { x: 80, y: 100 },
                        yellow: { x: 180, y: 40 },
                        red: { x: 250, y: 100 },
                        trajectory: [
                            { x: 80, y: 100 },
                            { x: 180, y: 6 },
                            { x: 278, y: 50 },
                            { x: 250, y: 100 },
                        ],
                    },
                    {
                        id: 'pos-2-5-2',
                        name: 'Carambola Corta con Toque Seco',
                        category: 'Hito de Evaluación',
                        hint: 'Toque seco amortiguado sin acompañamiento largo.',
                        difficulty: 4,
                        white: { x: 60, y: 60 },
                        yellow: { x: 140, y: 20 },
                        red: { x: 200, y: 120 },
                        trajectory: [
                            { x: 60, y: 60 },
                            { x: 140, y: 6 },
                            { x: 278, y: 90 },
                            { x: 200, y: 120 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'level-3',
        orderIndex: 3,
        name: 'Nivel 3: Sistemas Clásicos UMB',
        subtitle: 'Fórmulas Numéricas: Base 50, Bricoles y Tuzul',
        tag: 'SISTEMAS',
        color: '#8b5cf6',
        description:
            'Aprende a calcular matemáticamente cada carambola de 3 bandas mediante las fórmulas universales: Llegada = Salida - Ataque.',
        nodes: [
            {
                id: 'node-3-1',
                dayNumber: 11,
                title: 'Sistema Clásico Base 50',
                subtitle: 'Llegada = Salida - Ataque',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 250,
                orderIndex: 1,
                positions: [
                    {
                        id: 'pos-3-1-1',
                        name: 'Salida 50 al Ataque 30 (Llegada 20)',
                        category: 'Base 50 Conti',
                        hint: 'Efecto 3 corrido constante. Retorno exacto por el rincón opuesto.',
                        difficulty: 3,
                        white: { x: 20, y: 132 },
                        yellow: { x: 106.5, y: 10 },
                        red: { x: 260, y: 71 },
                        trajectory: [
                            { x: 20, y: 132 },
                            { x: 106.5, y: 10 },
                            { x: 278, y: 71 },
                            { x: 142, y: 138 },
                            { x: 260, y: 71 },
                        ],
                    },
                    {
                        id: 'pos-3-1-2',
                        name: 'Salida 50 al Ataque 20 (Llegada 30)',
                        category: 'Base 50 Conti',
                        hint: 'Ataque profundo al diamante 20, llegada al diamante 30 en 3ª banda.',
                        difficulty: 3,
                        white: { x: 20, y: 132 },
                        yellow: { x: 142, y: 10 },
                        red: { x: 200, y: 132 },
                        trajectory: [
                            { x: 20, y: 132 },
                            { x: 142, y: 10 },
                            { x: 278, y: 105 },
                            { x: 180, y: 138 },
                            { x: 200, y: 132 },
                        ],
                    },
                ],
            },
            {
                id: 'node-3-2',
                dayNumber: 12,
                title: 'Bricoles Maestros con Efecto Favor',
                subtitle: 'Ataque directo a banda previa',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 260,
                orderIndex: 2,
                positions: [
                    {
                        id: 'pos-3-2-1',
                        name: 'Bricol de Rincón Previo',
                        category: 'Bricoles UMB',
                        hint: 'Ataque al diamante 2.5 de banda larga previa.',
                        difficulty: 4,
                        white: { x: 20, y: 120 },
                        yellow: { x: 213, y: 35 },
                        red: { x: 248, y: 105 },
                        trajectory: [
                            { x: 20, y: 120 },
                            { x: 71, y: 6 },
                            { x: 278, y: 70 },
                            { x: 213, y: 138 },
                            { x: 248, y: 105 },
                        ],
                    },
                    {
                        id: 'pos-3-2-2',
                        name: 'Bricol a 4ª Banda de Llegada',
                        category: 'Bricoles UMB',
                        hint: 'Cálculo de retorno directo en banda larga.',
                        difficulty: 4,
                        white: { x: 40, y: 130 },
                        yellow: { x: 180, y: 40 },
                        red: { x: 100, y: 130 },
                        trajectory: [
                            { x: 40, y: 130 },
                            { x: 140, y: 6 },
                            { x: 278, y: 105 },
                            { x: 100, y: 138 },
                            { x: 100, y: 130 },
                        ],
                    },
                ],
            },
            {
                id: 'node-3-3',
                dayNumber: 13,
                title: 'Sistema Tuzul para Ángulos Cortos',
                subtitle: 'Fórmula de ataque cerrado',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 270,
                orderIndex: 3,
                positions: [
                    {
                        id: 'pos-3-3-1',
                        name: 'Tuzul Clásico de Rincón',
                        category: 'Sistema Tuzul',
                        hint: 'Punto de impacto bajo con limaje pausado.',
                        difficulty: 4,
                        white: { x: 80, y: 30 },
                        yellow: { x: 140, y: 30 },
                        red: { x: 60, y: 110 },
                        trajectory: [
                            { x: 80, y: 30 },
                            { x: 140, y: 30 },
                            { x: 278, y: 30 },
                            { x: 190, y: 138 },
                            { x: 6, y: 80 },
                            { x: 60, y: 110 },
                        ],
                    },
                    {
                        id: 'pos-3-3-2',
                        name: 'Tuzul Invertido de Contratiempo',
                        category: 'Sistema Tuzul',
                        hint: 'Control estricto de fuerza sin acelerar bruscamente.',
                        difficulty: 4,
                        white: { x: 200, y: 30 },
                        yellow: { x: 140, y: 30 },
                        red: { x: 220, y: 110 },
                        trajectory: [
                            { x: 200, y: 30 },
                            { x: 140, y: 30 },
                            { x: 6, y: 30 },
                            { x: 90, y: 138 },
                            { x: 278, y: 80 },
                            { x: 220, y: 110 },
                        ],
                    },
                ],
            },
            {
                id: 'node-3-4',
                dayNumber: 14,
                title: 'Pase Bola a 3 Bandas Larga-Corta-Larga',
                subtitle: 'Control de retención de efecto',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 280,
                orderIndex: 4,
                positions: [
                    {
                        id: 'pos-3-4-1',
                        name: 'Pase Bola Clásico de Caudron',
                        category: 'Pase Bola',
                        hint: 'Grosor 1/2 bola, efecto corrido a las 1:30 sin retruque.',
                        difficulty: 4,
                        white: { x: 50, y: 70 },
                        yellow: { x: 100, y: 70 },
                        red: { x: 230, y: 110 },
                        trajectory: [
                            { x: 50, y: 70 },
                            { x: 100, y: 70 },
                            { x: 180, y: 6 },
                            { x: 278, y: 55 },
                            { x: 210, y: 138 },
                            { x: 230, y: 110 },
                        ],
                    },
                    {
                        id: 'pos-3-4-2',
                        name: 'Pase Bola Abierto en Diagonal',
                        category: 'Pase Bola',
                        hint: 'Desvía la bola 2 al centro del cuadro opuesto.',
                        difficulty: 4,
                        white: { x: 60, y: 90 },
                        yellow: { x: 120, y: 90 },
                        red: { x: 240, y: 40 },
                        trajectory: [
                            { x: 60, y: 90 },
                            { x: 120, y: 90 },
                            { x: 200, y: 6 },
                            { x: 278, y: 75 },
                            { x: 190, y: 138 },
                            { x: 240, y: 40 },
                        ],
                    },
                ],
            },
            {
                id: 'node-3-5',
                dayNumber: 15,
                title: 'Examen de Sistemas Clásicos UMB',
                subtitle: '10 jugadas maestras cronometradas',
                defaultStatus: 'locked',
                isBoss: true,
                xp: 450,
                orderIndex: 5,
                positions: [
                    {
                        id: 'pos-3-5-1',
                        name: 'Base 50 con Salida Desplazada 40',
                        category: 'Hito de Evaluación',
                        hint: 'Salida 40: resta 10 puntos de compensación al ataque.',
                        difficulty: 5,
                        white: { x: 71, y: 132 },
                        yellow: { x: 142, y: 10 },
                        red: { x: 240, y: 100 },
                        trajectory: [
                            { x: 71, y: 132 },
                            { x: 142, y: 10 },
                            { x: 278, y: 60 },
                            { x: 180, y: 138 },
                            { x: 240, y: 100 },
                        ],
                    },
                    {
                        id: 'pos-3-5-2',
                        name: 'Bricol de 5 Bandas Maestro',
                        category: 'Hito de Evaluación',
                        hint: 'Ataque profundo para recorrido largo de 5 bandas.',
                        difficulty: 5,
                        white: { x: 30, y: 130 },
                        yellow: { x: 142, y: 71 },
                        red: { x: 270, y: 20 },
                        trajectory: [
                            { x: 30, y: 130 },
                            { x: 142, y: 71 },
                            { x: 278, y: 40 },
                            { x: 200, y: 138 },
                            { x: 270, y: 20 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'level-4',
        orderIndex: 4,
        name: 'Nivel 4: Competición Internacional',
        subtitle: 'Defensa, Posicionamiento y Series Largas',
        tag: 'COMPETICIÓN',
        color: '#f59e0b',
        description:
            'Tácticas avanzadas de Copas del Mundo: control de velocidad para preparar la siguiente carambola y defensa estratégica para dejar la mesa cerrada.',
        nodes: [
            {
                id: 'node-4-1',
                dayNumber: 16,
                title: 'Control de la Bola 2 (Reunión)',
                subtitle: 'Hacer carambola y dejar juego abierto',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 320,
                orderIndex: 1,
                positions: [
                    {
                        id: 'pos-4-1-1',
                        name: 'Renversé Clásico a Contragefecto',
                        category: 'Competición UMB',
                        hint: 'Aceleración limpia con efecto contrario y penetración.',
                        difficulty: 5,
                        white: { x: 60, y: 100 },
                        yellow: { x: 120, y: 40 },
                        red: { x: 200, y: 100 },
                        trajectory: [
                            { x: 60, y: 100 },
                            { x: 120, y: 40 },
                            { x: 160, y: 6 },
                            { x: 6, y: 50 },
                            { x: 200, y: 100 },
                        ],
                    },
                    {
                        id: 'pos-4-1-2',
                        name: 'Renversé Forzado en Banda Corta',
                        category: 'Competición UMB',
                        hint: 'Impacto vivo para reacción agresiva en 2ª banda.',
                        difficulty: 5,
                        white: { x: 40, y: 80 },
                        yellow: { x: 90, y: 30 },
                        red: { x: 160, y: 120 },
                        trajectory: [
                            { x: 40, y: 80 },
                            { x: 90, y: 30 },
                            { x: 130, y: 6 },
                            { x: 6, y: 90 },
                            { x: 160, y: 120 },
                        ],
                    },
                ],
            },
            {
                id: 'node-4-2',
                dayNumber: 17,
                title: 'La Defensa Activa (Mesa Cerrada)',
                subtitle: 'Pegar bolas a bandas opuestas',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 340,
                orderIndex: 2,
                positions: [
                    {
                        id: 'pos-4-2-1',
                        name: 'Reunión en Rincón Opuesto',
                        category: 'Táctica de Serie',
                        hint: 'Control de la bola 2 para dejar posición abierta.',
                        difficulty: 4,
                        white: { x: 60, y: 70 },
                        yellow: { x: 130, y: 70 },
                        red: { x: 250, y: 25 },
                        trajectory: [
                            { x: 60, y: 70 },
                            { x: 130, y: 70 },
                            { x: 200, y: 6 },
                            { x: 278, y: 40 },
                            { x: 250, y: 25 },
                        ],
                    },
                    {
                        id: 'pos-4-2-2',
                        name: 'Retorno de Bola 2 al Centro',
                        category: 'Táctica de Serie',
                        hint: 'Calcula el choque para que ambas bolas reposen cerca.',
                        difficulty: 4,
                        white: { x: 70, y: 100 },
                        yellow: { x: 150, y: 50 },
                        red: { x: 220, y: 100 },
                        trajectory: [
                            { x: 70, y: 100 },
                            { x: 150, y: 50 },
                            { x: 220, y: 6 },
                            { x: 278, y: 70 },
                            { x: 220, y: 100 },
                        ],
                    },
                ],
            },
            {
                id: 'node-4-3',
                dayNumber: 18,
                title: 'Gestión de Presión y Reloj de 40s',
                subtitle: 'Rutina de tiro y visualización',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 360,
                orderIndex: 3,
                positions: [
                    {
                        id: 'pos-4-3-1',
                        name: 'Carambola Defensiva con Deje Largo',
                        category: 'Estrategia',
                        hint: 'Separa la bola 2 hacia la banda opuesta.',
                        difficulty: 4,
                        white: { x: 80, y: 110 },
                        yellow: { x: 140, y: 30 },
                        red: { x: 240, y: 120 },
                        trajectory: [
                            { x: 80, y: 110 },
                            { x: 140, y: 30 },
                            { x: 200, y: 6 },
                            { x: 278, y: 80 },
                            { x: 240, y: 120 },
                        ],
                    },
                    {
                        id: 'pos-4-3-2',
                        name: 'Mesa Cerrada en Diagonal Extrema',
                        category: 'Estrategia',
                        hint: 'Si no hay anotación, deja las tres bolas a máxima distancia.',
                        difficulty: 4,
                        white: { x: 50, y: 50 },
                        yellow: { x: 120, y: 100 },
                        red: { x: 260, y: 20 },
                        trajectory: [
                            { x: 50, y: 50 },
                            { x: 120, y: 100 },
                            { x: 180, y: 138 },
                            { x: 278, y: 40 },
                            { x: 260, y: 20 },
                        ],
                    },
                ],
            },
            {
                id: 'node-4-4',
                dayNumber: 19,
                title: 'Series de 5+ Carambolas',
                subtitle: 'Construcción sistemática de tacadas',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 400,
                orderIndex: 4,
                positions: [
                    {
                        id: 'pos-4-4-1',
                        name: 'Cabaña Larga a 4 Bandas de Competición',
                        category: 'Competición',
                        hint: 'Punto fino a bola 2 sin retruque frontal.',
                        difficulty: 5,
                        white: { x: 90, y: 30 },
                        yellow: { x: 160, y: 30 },
                        red: { x: 80, y: 120 },
                        trajectory: [
                            { x: 90, y: 30 },
                            { x: 160, y: 30 },
                            { x: 278, y: 30 },
                            { x: 220, y: 138 },
                            { x: 80, y: 120 },
                        ],
                    },
                    {
                        id: 'pos-4-4-2',
                        name: 'Cabaña Amortiguada con Descenso',
                        category: 'Competición',
                        hint: 'Golpe seco amortiguado a bola 2.',
                        difficulty: 5,
                        white: { x: 70, y: 40 },
                        yellow: { x: 150, y: 40 },
                        red: { x: 50, y: 100 },
                        trajectory: [
                            { x: 70, y: 40 },
                            { x: 150, y: 40 },
                            { x: 278, y: 40 },
                            { x: 180, y: 138 },
                            { x: 50, y: 100 },
                        ],
                    },
                ],
            },
            {
                id: 'node-4-5',
                dayNumber: 20,
                title: 'Graduación: Gran Maestro UMB',
                subtitle: 'Simulación de final de campeonato mundial',
                defaultStatus: 'locked',
                isBoss: true,
                xp: 600,
                orderIndex: 5,
                positions: [
                    {
                        id: 'pos-4-5-1',
                        name: 'Carambola Magistral a 5 Bandas',
                        category: 'Gran Maestría',
                        hint: 'Aceleración progresiva con respiración pausada.',
                        difficulty: 5,
                        white: { x: 30, y: 125 },
                        yellow: { x: 110, y: 60 },
                        red: { x: 250, y: 70 },
                        trajectory: [
                            { x: 30, y: 125 },
                            { x: 110, y: 60 },
                            { x: 220, y: 6 },
                            { x: 278, y: 50 },
                            { x: 160, y: 138 },
                            { x: 6, y: 90 },
                            { x: 250, y: 70 },
                        ],
                    },
                    {
                        id: 'pos-4-5-2',
                        name: 'Rodada Monumental con Efecto Máximo',
                        category: 'Gran Maestría',
                        hint: 'Efecto 3 profundo con recorrido completo de mesa.',
                        difficulty: 5,
                        white: { x: 50, y: 110 },
                        yellow: { x: 140, y: 80 },
                        red: { x: 230, y: 30 },
                        trajectory: [
                            { x: 50, y: 110 },
                            { x: 140, y: 80 },
                            { x: 240, y: 6 },
                            { x: 278, y: 60 },
                            { x: 190, y: 138 },
                            { x: 230, y: 30 },
                        ],
                    },
                ],
            },
        ],
    },
];

const SEED_PEDAGOGY_MODULES = [
    {
        id: 'posture-biomechanics',
        category: 'posture_biomechanics',
        title: 'Biomecánica de la Postura Corporal',
        subtitle: 'Anclaje de pies a 45°, eje visual y brazo pendular a 90°',
        author: 'Marco Zanetti & José María Quetglas',
        summary:
            'La estabilidad del tren inferior y el anclaje a 45° son el cimiento de la regularidad en el billar de alta competición: 60% peso atrás, barbilla a 10 cm del taco y brazo pendular puro.',
        contentMarkdown: `### Fundamentos Biomecánicos de la Postura
1. **Triángulo de sustentación:** Pie derecho sobre la línea de tiro a 45°-60°; pie izquierdo adelantado al ancho de los hombros con rodilla semiflexionada.
2. **Reparto de masa:** 60% en la pierna retrasada (eje ancla) y 40% en la pierna adelantada (eje de equilibrio).
3. **Plano visual:** Barbilla situada a 10-15 cm sobre el taco, alineada con el ojo dominante.
4. **Péndulo del brazo:** Hombro fijo y horizontal; antebrazo oscilando a 90° respecto al taco en el instante exacto del impacto.
5. **Culata relajada:** Empuñadura elástica entre pulgar, índice y corazón sin estrangular la culata.`,
        imageUrl: '/assets/images/theory/billiard_posture_stance.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=gjLRHztVPGc',
        keyPrinciples: [
            'Pie de apoyo sobre la línea de tiro con apertura de 45° a 60°.',
            '60% del peso en pierna retrasada; cero balanceo durante el limaje.',
            'Barbilla fija a 10-15 cm del taco alineada con el ojo dominante.',
            'Antebrazo vertical a 90° en el punto de contacto.',
            'Culata sostenida con suavidad: soltura elástica en la penetración.',
        ],
        drills: [
            { id: 'drill-p1', name: 'Línea Pura de Ida y Vuelta', hint: 'Tiro a banda corta contraria sin efecto; la bola debe retornar al centro del taco.', xp: 120 },
            { id: 'drill-p2', name: 'Inmovilidad tras Impacto', hint: 'Mantener la postura y barbilla estables 3 segundos tras soltar el tiro.', xp: 130 },
        ],
        orderIndex: 1,
    },
    {
        id: 'bridges-technique',
        category: 'bridges',
        title: 'Tipos de Puentes Canónicos',
        subtitle: 'Puente cerrado con anilla vs. puente abierto en V',
        author: 'Marco Zanetti & José María Quetglas',
        summary:
            'La mano guía determina la altura y estabilidad del ataque. El 85% de las jugadas de 3 bandas requieren puente cerrado con anilla firme apoyado en trípode de 4 dedos.',
        contentMarkdown: `### Guía Técnica de Puentes de Billar
- **Puente Cerrado con Anilla:** El dedo índice envuelve la flecha cerrando contra la yema del pulgar. Los otros 3 dedos forman un trípode ancho sobre el paño.
- **Puente Abierto en V:** Talón apoyado en paño y pulgar pegado al índice creando un canal en V; ideal para rodadas lentas y tiros a distancia.
- **Puente sobre Banda:** Talón en el pasamanos y taco rasante para evitar trayectorias parabólicas no deseadas.
- **Distancia bola-puente:** 16 a 22 cm calibrada según la fuerza requerida.`,
        imageUrl: '/assets/images/theory/billiard_bridges_guide.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=JRHH0i9uGzI',
        keyPrinciples: [
            'Puente cerrado con anilla cilíndrica firme para jugadas de aceleración.',
            'Trípode de sustentación con dedos corazón, anular y meñique bien abiertos.',
            'Puente abierto en V para tiros de toque fino o bolas intermedias.',
            'Puente sobre banda con taco perfectamente horizontal.',
        ],
        drills: [
            { id: 'drill-b1', name: 'Deslizamiento en Anilla', hint: '10 limajes continuos sintiendo el paso suave del taco sin fricción excesiva.', xp: 110 },
            { id: 'drill-b2', name: 'Ataque sobre Banda Rasante', hint: 'Bola a 4 cm de banda larga, golpe al centro con taco paralelo.', xp: 140 },
        ],
        orderIndex: 2,
    },
    {
        id: 'ball-thickness',
        category: 'ball_thickness',
        title: 'Tomas de Bola y Geometría de Contacto',
        subtitle: 'Fracciones 1/8, 1/4, 1/2, 3/4 y Bola Llena',
        author: 'Raymond Ceulemans (Mister 100) & Xavier Gretillat',
        summary:
            'Cálculo matemático de la transferencia de masa y ángulo de separación natural entre la bola jugadora y la bola objetivo.',
        contentMarkdown: `### Análisis de Grosor de Bola
- **1/8 (Fina/Rozada):** Desviación ~12°, cesión de velocidad <10% (bola 2 queda casi estática).
- **1/4 (Cuarto):** Desviación ~28°, ideal para cabañas estándar y recorridos largos.
- **1/2 (Media):** Ángulo natural de separación de 90° en golpe seco, 50% de inercia compartida.
- **3/4:** Desviación ~55°, gran transmisión de inercia a bola 2.
- **Llena (100%):** Transmisión de casi toda la energía (retros y choques plenos).`,
        imageUrl: '/assets/images/theory/billiard_ball_thickness.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=JRHH0i9uGzI',
        keyPrinciples: [
            '1/8 Fina: desvío suave de 12°, la bola 2 avanza menos de 1 diamante.',
            '1/4 Cuarto: ángulo estable de 28° para cabañas y rodadas.',
            '1/2 Media: regla de oro para pasabolas canónicos y sistema Conti.',
            '3/4 y Llena: para retrocesos y amortiguamientos de fuerza viva.',
        ],
        drills: [
            { id: 'drill-t1', name: 'Calibración de Media Bola', hint: 'Impactar en el hemisferio derecho logrando desviación exacta de 40°.', xp: 140 },
            { id: 'drill-t2', name: 'Corte Fino 1/8', hint: 'Rozar bola 2 sin moverla más de 40 cm mientras bola 1 recorre 3 bandas.', xp: 160 },
        ],
        orderIndex: 3,
    },
    {
        id: 'systems-geometry',
        category: 'systems_geometry',
        title: 'Sistema Base 50 y Geometría de Diamantes',
        subtitle: 'Fórmula Conti: Llegada = Salida - Ataque',
        author: 'AM Billiard Academy & Frédéric Caudron',
        summary:
            'El sistema universal de 3 bandas: lectura de diamantes, cheat sheet de salidas y proyecciones tramo a tramo hacia 4ª y 5ª banda con códigos cromáticos.',
        contentMarkdown: `### Sistema Base 50 (Sistema Clásico Conti)
- **Fórmula Universal:** Llegada (3ª banda) = Salida (banda larga) - Ataque (1ª banda).
- **Efecto Recomendado:** Efecto horario natural de 2 a 3 tips (rotación a favor).
- **Segmentación Cromática:**
  - 🔵 **Tramo 1 (1ª a 3ª banda):** Cian (#06b6d4) — Geometría base de la fórmula.
  - 🟡 **Tramo 2 (3ª a 4ª banda):** Ámbar (#f59e0b) — Rebote con rotación natural.
  - 🟢 **Tramo 3 (4ª a 5ª banda):** Esmeralda (#10b981) — Prolongación hacia la carambola.`,
        imageUrl: '/assets/images/theory/billiard_base50_conti.jpg',
        youtubeUrl: 'https://www.youtube.com/@ambilliardacademy',
        keyPrinciples: [
            'Llegada en 3ª banda = Salida - Ataque.',
            'Rotación natural de 2 a 3 puntas (tips).',
            'Líneas tramo a tramo coloreadas: 1ª-3ª (Cian), 3ª-4ª (Ámbar), 4ª-5ª (Verde).',
            'Cheat sheet de salidas: Salida 50, Salida 40, Salida 30, Salida 60.',
        ],
        drills: [
            { id: 'drill-s1', name: 'Llegada 20 desde 50', hint: 'Salida 50, ataque al diamante 30, llegada al 20 en 3ª banda.', xp: 150 },
            { id: 'drill-s2', name: 'Salida 40 al Diamante 20', hint: 'Salida 40, ataque al diamante 20, llegada al 20 en 3ª banda.', xp: 160 },
        ],
        orderIndex: 4,
    },
    {
        id: 'strike-types',
        category: 'strike_types',
        title: 'Tipos de Golpe de Billar & Biomecánica de Ataque',
        subtitle: 'Corrido, Semicorrido, Mate de Bola, Retroceso, Masé, Piqué y Penetración',
        author: 'José María Quetglas, Marco Zanetti & Raymond Ceulemans',
        summary:
            'El comportamiento de la bola blanca no depende solo de la fuerza: la altura del impacto, la inclinación del taco y el tiempo de contacto definen la acción dinámica tras el choque.',
        contentMarkdown: `### Los 7 Golpes Fundamentales del Billar a Tres Bandas\n1. **Corrido (Follow Through):** Impacto en el polo superior. Taco horizontal, limaje largo y aceleración continua hacia adelante. La tacadora continúa avanzando tras el choque.\n2. **Semicorrido:** Impacto entre el ecuador y el polo superior (1 punta arriba). Avance moderado y controlado para rodadas naturales.\n3. **Mate de Bola (Bola Muerta / Stun Shot):** Impacto plano en el centro o 2 mm debajo. Golpe seco frenando la muñeca al contacto. Transfiere casi toda la energía viva a la bola 2; la tacadora se desplaza suave por la tangente de 90°.\n4. **Retroceso (Jale / Draw Shot):** Impacto en el tercio inferior con taco estrictamente paralelo a la mesa y muñeca relajada. Backspin puro que hace retroceder la bola hacia atrás.\n5. **Piqué:** Taco inclinado a 40°-60° de arriba hacia abajo para generar retroceso o curva inmediata en distancias ultracortas sin reteñido.\n6. **Masé (Massé):** Taco casi vertical (75°-85°) con efecto lateral. La fricción contra el paño produce una parábola cerrada sin necesidad de bandas.\n7. **Penetración de la Bola:** Atravesar la esfera 15 a 25 cm después del impacto para transferir aceleración uniforme sin vibración del taco.`,
        imageUrl: '/assets/images/theory/billiard_shot_types.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=gjLRHztVPGc',
        keyPrinciples: [
            'Corrido: impacto alto y seguimiento para mantener inercia de avance.',
            'Mate de bola: golpe seco frenando la muñeca para transferir la fuerza viva.',
            'Retroceso: taco estrictamente paralelo a la mesa y muñeca libre.',
            'Piqué y Masé: inclinación del taco a 45°-85° para generar rotación curva.',
            'Penetración: atravesar la bola 15-20 cm después del punto de impacto.',
        ],
        drills: [
            { id: 'drill-st1', name: 'El Golpe Muerto a Media Mesa', hint: 'Impactar bola 2 frenando el taco en seco; bola 1 debe quedar casi inmóvil.', xp: 150 },
            { id: 'drill-st2', name: 'Retroceso Puro a Banda Corta', hint: 'Ataque bajo con taco plano, la bola debe retroceder 1.5 metros.', xp: 160 },
            { id: 'drill-st3', name: 'Penetración sin Frenado', hint: 'Limaje continuo pasando 20 cm a través de la bola imaginaria.', xp: 140 },
        ],
        orderIndex: 5,
    },
    {
        id: 'carom-figures-colombia',
        category: 'figures_nomenclature',
        title: 'Nomenclatura Tradicional de Carambolas en Colombia & Latinoamérica',
        subtitle: 'Rodadas, Cajones, Pase Bola, Renversé, Serrucho, Zigzag, Tornillo y Tiki',
        author: 'Jaime Carrasco (El Flaco Billarista) & Maestros Tradicionales',
        summary:
            'Guía completa de las figuras clásicas del billar a tres bandas tal como se denominan en Colombia y el circuito hispanohablante.',
        contentMarkdown: `### Familias de Carambolas en el Billar Colombiano\n1. **Rodada (Larga-Corta-Larga):** Jugada fundamental hacia adelante rodando naturalmente a medio cuerpo o 3/4.\n2. **Cajón (Cabaña / Corta-Larga-Corta):** Figura reina del cuadro pequeño, atacando la banda corta más próxima con mate o efecto 4.\n3. **Pase Bola (Alrededor de la Mesa):** Corrido perimétrico de 4 o 5 bandas pasando por delante de la bola 2.\n4. **Renversé (Contrabanda / Inversión de Efecto):** Efecto contrario al giro natural para invertir el ángulo de rebote en la primera banda.\n5. **Serrucho (Cerrucho):** Vaivén continuo entre bandas paralelas con efecto pronunciado.\n6. **Zigzag (Zik-Zak):** Recorrido en Z entre bandas opuestas cruzando la mesa.\n7. **Tornillo:** Efecto rotacional extremo con taco elevado donde la bola muerde y se enrosca en el paño.\n8. **Tiki (Tiki-Taki / Banda y Bola):** Sistema para bola 2 pegada a banda larga con doble contacto controlado.\n9. **Bricole (Banda Previa):** Impacto primero en bandas antes de tocar ninguna bola.`,
        imageUrl: '/assets/images/theory/billiard_carom_figures.jpg',
        youtubeUrl: 'https://www.youtube.com/@elflacobillarista',
        keyPrinciples: [
            'Rodada: Larga-Corta-Larga hacia adelante con bola rodando naturalmente.',
            'Cajón: Corta-Larga-Corta en el cuadro corto.',
            'Pase Bola: Recorrido perimétrico de 4 o 5 bandas rodeando la bola 2.',
            'Renversé: Inversión angular con efecto contrario.',
            'Tiki: Sistema de banda y bola corta cuando la bola 2 está pegada a la banda.',
        ],
        drills: [
            { id: 'drill-fig1', name: 'Cajón Clásico con Efecto 4', hint: 'Entrada por banda corta cerrando en cuadro pequeño.', xp: 150 },
            { id: 'drill-fig2', name: 'Rodada Canónica de Desahogo', hint: 'Recorrido fluido L-C-L con velocidad 3.', xp: 150 },
            { id: 'drill-fig3', name: 'Pase Bola a 4 Bandas', hint: 'Media bola con efecto +2 para rodear la mesa.', xp: 160 },
        ],
        orderIndex: 6,
    },
    {
        id: 'willie-hoppe-system',
        category: 'willie_hoppe',
        title: 'Sistema Larga-Larga-Corta (LLK) & Reloj de Willie Hoppe',
        subtitle: 'Cálculo de Suma y Resta según Willie Hope (Ep. 130 El Flaco Billarista)',
        author: 'Willie Hoppe & Jaime Carrasco (El Flaco Billarista)',
        summary:
            'El sistema de cruce de dos bandas largas y llegada a banda corta con numeración de 2 en 2 en banda larga (Suma) y restas en cabeceras.',
        contentMarkdown: `### Sistema Larga - Larga - Corta (LLK) de Willie Hope\n- **Objetivo:** Resolver posiciones de cruce entre bandas largas opuestas con llegada precisa a la banda corta contraria.\n- **Numeración de la Mesa (Método Hoppe):**\n  - **Banda Larga Superior (Suma):** Diamantes contados de 2 en 2: **2, 4, 6, 8...**\n  - **Banda Corta Izquierda (Resta):** Valores **-1, -2, -3** (llegada o salida).\n  - **Banda Corta Derecha (Resta):** Valores **-4, -5, -6** (salidas desde cabecera).\n  - **Banda Larga Inferior (Resta):** Ajustes **-1, -2, -3**.\n- **Fórmula de Llegada:**\n  - \`Llegada = Suma (Banda Larga) - Resta (Cabecera / Salida)\`\n  - Ejemplo canónico del video: Bola 2 en Suma 4, salida en Resta -4, llegada en Resta -2.\n- **Reloj de Efectos de Willie Hoppe:**\n  - \`0\`: Efecto 12:00 (arriba al centro, corrido puro sin rotación lateral).\n  - \`+1 a +4\`: Efectos a favor a la derecha (+4 es el ecuador derecho pleno a las 3:00).\n  - \`+5 a +7\`: Efectos bajos con retención (+7 es máximo jale a las 6:00).\n  - \`-1 a -5\`: Efectos contrarios a la izquierda (-3 es ecuador izquierdo a las 9:00).\n- **Ejecución Técnica:**\n  - Golpe penetrado a 1/4 de bola sin forzar comba en el paño, permitiendo que la rotación trabaje uniformemente en la segunda y tercera banda.`,
        imageUrl: '/assets/images/theory/billiard_hoppe_system.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=jeAREkYyN3A',
        keyPrinciples: [
            'Banda larga superior: diamantes de 2 en 2 (Suma 2, 4, 6, 8).',
            'Bandas cortas y larga inferior: restas (-1 a -6).',
            'Fórmula de llegada: Llegada = Suma - Resta.',
            'Reloj de efectos Hoppe: 0 al centro, 1 a 7 a favor, -1 a -5 contrarios.',
            'Golpe penetrado a 1/4 de bola con taco plano.',
        ],
        drills: [
            { id: 'drill-hop1', name: 'Cálculo de Llegada -2 desde Suma 4', hint: 'Salida en -4, ataque a bola 2 en Suma 4, llegada al diamante -2.', xp: 160 },
            { id: 'drill-hop2', name: 'Ajuste de Efecto Hoppe +2 en Cruce Largo', hint: 'Efecto 2:00 con golpe penetrado atravesando la bola.', xp: 170 },
        ],
        orderIndex: 7,
    },
    {
        id: 'posture-multiview',
        category: 'posture_biomechanics',
        title: 'Biomecánica Multivista de la Postura Corporal',
        subtitle: 'Vistas Frontal, Dorsal y Cenital para Alineación Perfecta',
        author: 'Marco Zanetti & Torbjörn Blomdahl',
        summary:
            'Análisis tridimensional del cuerpo en la posición de tiro: vista frontal (ojo dominante y barbilla), vista dorsal (plano pendular de 90°) y vista cenital (base de sustentación de pies).',
        contentMarkdown: `### Análisis Biomecánico Multivista\n1. **Vista Frontal (Front View):**\n   - Barbilla a 4 cm sobre el eje del taco sin tensión cervical.\n   - Ojo dominante centrado milimétricamente sobre la línea de visión.\n   - Hombros relajados y horizontales; mano de puente firme en trípode sobre la mesa de carambola sin huecos.\n2. **Vista Dorsal / Espalda (Rear / Back View):**\n   - Brazo ejecutor alineado en un plano pendular vertical estricto a 90°.\n   - Hombro, codo y muñeca en el mismo plano láser vertical.\n   - Pie retrasado angulado a 45° respecto a la línea de tiro como pilar de anclaje.\n3. **Vista Cenital / Desde Arriba (Top / Overhead View):**\n   - Base triangular de sustentación podal.\n   - Taco perfectamente recto y paralelo sobre la banda de carambola sin troneras.\n   - Cero cabeceo o balanceo del tronco durante el limaje y el ataque.`,
        imageUrl: '/assets/images/theory/billiard_stance_multiview.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=gjLRHztVPGc',
        keyPrinciples: [
            'Vista frontal: barbilla a 4 cm sobre el taco y ojo dominante centrado.',
            'Vista de espalda: codo, muñeca y taco en plano pendular vertical a 90°.',
            'Vista cenital: triángulo de sustentación podal y taco recto.',
            'Mesa de carambola reglamentaria de bandas continuas sin troneras.',
        ],
        drills: [
            { id: 'drill-mv1', name: 'Verificación del Plano Láser de 90°', hint: 'Filmar limaje desde atrás comprobando que el codo no oscile lateralmente.', xp: 150 },
            { id: 'drill-mv2', name: 'Triángulo de Equilibrio Podal', hint: 'Mantener la base podal sin perder el centro de gravedad durante 10 tiros.', xp: 140 },
        ],
        orderIndex: 8,
    },
    {
        id: 'vision-aiming-routine',
        category: 'aiming_vision',
        title: 'Línea de Visión, Ojo Dominante & Rutina de Apunte',
        subtitle: 'Ritmo Pendular de 3 Puntos y Regla de Fijación Final',
        author: 'Frédéric Caudron & Dick Jaspers',
        summary:
            'Cómo sincronizar la mirada con el movimiento del taco: determinación del ojo dominante, alternancia visual rítmica y fijación 100% en el punto de contacto de la bola 2 al momento del tiro.',
        contentMarkdown: `### Rutina Visual y Línea de Puntería\n1. **Test del Ojo Dominante:** Formar un triángulo con ambas manos, enfocar un punto distante con ambos ojos abiertos y cerrar un ojo para identificar cuál mantiene centrado el objetivo.\n2. **El Ritmo Visual Pendular de 3 Puntos:** Durante los 3 a 5 limajes preparatorios, los ojos alternan de forma continua y relajada entre:\n   - **Punto 1:** Punto de ataque en la bola tacadora (blanca).\n   - **Punto 2:** Punto de impacto / corte en la bola objetivo (amarilla).\n   - **Punto 3:** Diamante o punto de llegada en la primera banda.\n3. **Regla de Fijación Final (Final Shot Fixation Rule):** En el último limaje de entrega y penetración del golpe, la mirada se queda clavada al 100% en el punto de contacto de la bola 2, NUNCA en la bola blanca ni en el taco.`,
        imageUrl: '/assets/images/theory/billiard_vision_aiming.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=HGfTj9vQTpY',
        keyPrinciples: [
            'Alinear el taco exactamente bajo el ojo dominante del jugador.',
            'Rutina visual de 3 puntos: bola 1 -> bola 2 -> 1ª banda.',
            'Fijación final: en el golpe, los ojos miran la bola 2, no la bola blanca.',
            'Concentración visual sin parpadeo brusco en el instante de contacto.',
        ],
        drills: [
            { id: 'drill-vis1', name: 'Test de Ojo Dominante en Mesa', hint: 'Verificar alineación con el diamante central de cabecera.', xp: 120 },
            { id: 'drill-vis2', name: 'Ritmo Visual de 3 Limajes', hint: '3 limajes rítmicos alternando mirada y fijación final en bola 2.', xp: 160 },
        ],
        orderIndex: 9,
    },
    {
        id: 'master-clock-effects',
        category: 'clock_effects',
        title: 'Sistemas de Reloj & Efectos de los Grandes Maestros',
        subtitle: 'Reloj de 12 Horas, Ceulemans (0-4), Zanetti Micrométrico y Matriz Continental',
        author: 'Raymond Ceulemans, Marco Zanetti & Willie Hoppe',
        summary:
            'Tratado completo de la rotación y efecto lateral: el cuadrante de 12 horas, el sistema de 4 efectos por puntas de suela de Raymond Ceulemans, la escala micrométrica de Zanetti y la matriz de 9 cuadrantes.',
        contentMarkdown: `### Los Sistemas de Efectos de los Maestros\n1. **El Reloj Clásico de 12 Horas:**\n   - **12:00:** Corrido puro en el polo superior sin desvío lateral.\n   - **1:00 y 2:00:** Efecto a favor alto (Running English) para rodadas y pase bolas con avance.\n   - **3:00:** Máximo efecto lateral derecho en el ecuador (máxima apertura en bandas).\n   - **4:00 y 5:00:** Efecto bajo con retención y agarre en el paño para cajones cerrados.\n   - **6:00:** Máximo retroceso (jale puro) en el polo inferior.\n   - **7:00 a 11:00:** Efectos contrarios (Reverse English) para contrabanda y renversé.\n2. **Sistema de 4 Efectos de Raymond Ceulemans:**\n   - Efecto 0: Ataque en el centro vertical (sin giro).\n   - Efecto 1: 1 punta de suela lateral (apertura suave).\n   - Efecto 2: 2 puntas de suela (el efecto natural estándar para rodadas).\n   - Efecto 3: 3 puntas de suela (apertura amplia).\n   - Efecto 4: 4 puntas de suela al borde ecuatorial (máxima reacción).\n3. **Escala Micrométrica de Marco Zanetti:**\n   - Graduación milimétrica de altura (-2.00 a +2.00 mm) que determina el ángulo exacto de rebote en la banda (de 0° a 90°) y el decaimiento de giro tras cada contacto.\n4. **Matriz Continental de 9 Cuadrantes:**\n   - División de la semiesfera en 9 zonas de impacto para memorización táctica inmediata.`,
        imageUrl: '/assets/images/theory/billiard_clock_systems_masters.jpg',
        youtubeUrl: 'https://www.youtube.com/@ambilliardacademy',
        keyPrinciples: [
            'Reloj de 12 horas: mapeo horario completo de ataque rotacional.',
            'Ceulemans: 4 efectos medidos por puntas de suela (1 a 4).',
            'Zanetti: escala micrométrica para calibrar la reacción en goma de banda.',
            'Efecto a favor ensancha el rebote; efecto contrario lo cierra o invierte.',
        ],
        drills: [
            { id: 'drill-clk1', name: 'Calibración de los 4 Efectos Ceulemans', hint: 'Ejecutar 4 tiros con salidas iguales variando solo el efecto (1, 2, 3, 4).', xp: 170 },
            { id: 'drill-clk2', name: 'Dominio de las 12:00 y 6:00', hint: 'Tiro corrido puro y retroceso puro sin desvío lateral sobre la línea central.', xp: 160 },
        ],
        orderIndex: 10,
    },
];

const SEED_SYSTEMS = [
    {
        id: 'base-50',
        name: 'Base 50 (Sistema Clásico Conti)',
        category: 'Banda Larga-Corta-Larga',
        formula: 'Llegada = Salida - Ataque',
        description:
            'El sistema universal de 3 bandas. Se calcula el punto de llegada deseado en 3ra banda y se resta del punto de salida en banda larga.',
        difficulty: 3,
        author: 'Sistema Conti / AM Billiard Academy',
        youtubeUrl: 'https://www.youtube.com/watch?v=HGfTj9vQTpY',
        diagramUrl: '/assets/images/theory/billiard_base50_conti.jpg',
        defaultBalls: [
            { id: 'white', x: 71, y: 105, color: '#f8fafc', border: '#cbd5e1' },
            { id: 'yellow', x: 142, y: 71, color: '#facc15', border: '#ca8a04' },
            { id: 'red', x: 213, y: 35, color: '#dc2626', border: '#991b1b' },
        ],
        defaultTrajectory: [
            { x: 71, y: 105 },
            { x: 142, y: 71 },
            { x: 284, y: 35 },
        ],
        diamondNumbers: {
            attack: [
                { diamond: 1, x: 35.5, y: 0, value: '10' },
                { diamond: 2, x: 71, y: 0, value: '20' },
                { diamond: 3, x: 106.5, y: 0, value: '30' },
                { diamond: 4, x: 142, y: 0, value: '40' },
                { diamond: 5, x: 177.5, y: 0, value: '50' },
                { diamond: 6, x: 213, y: 0, value: '60' },
                { diamond: 7, x: 248.5, y: 0, value: '70' },
                { diamond: 8, x: 284, y: 0, value: '80' },
            ],
            departure: [
                { diamond: 0, x: 0, y: 142, value: '50' },
                { diamond: 1, x: 35.5, y: 142, value: '45' },
                { diamond: 2, x: 71, y: 142, value: '40' },
                { diamond: 3, x: 106.5, y: 142, value: '35' },
                { diamond: 4, x: 142, y: 142, value: '30' },
                { diamond: 5, x: 177.5, y: 142, value: '25' },
                { diamond: 6, x: 213, y: 142, value: '20' },
            ],
            arrival3rd: [
                { diamond: 0, x: 0, y: 0, value: '0' },
                { diamond: 1, x: 0, y: 35.5, value: '10' },
                { diamond: 2, x: 0, y: 71, value: '20' },
                { diamond: 3, x: 0, y: 106.5, value: '30' },
                { diamond: 4, x: 0, y: 142, value: '40' },
            ],
            arrival4th: [
                { diamond: 1, x: 35.5, y: 142, value: '10' },
                { diamond: 2, x: 71, y: 142, value: '20' },
                { diamond: 3, x: 106.5, y: 142, value: '30' },
                { diamond: 4, x: 142, y: 142, value: '40' },
                { diamond: 5, x: 177.5, y: 142, value: '50' },
            ],
        },
        segmentedTrajectories: [
            { id: 'seg-1-3', label: '1ª a 3ª Banda', color: '#06b6d4', description: 'Trayectoria inicial de la fórmula matemática' },
            { id: 'seg-3-4', label: '3ª a 4ª Banda', color: '#f59e0b', description: 'Rebote con rotación a favor hacia banda larga' },
            { id: 'seg-4-5', label: '4ª a 5ª Banda', color: '#10b981', description: 'Recorrido final de llegada hacia la carambola' },
        ],
        cheatSheets: [
            {
                origin: 50,
                name: 'Partiendo de Salida 50 (Esquina)',
                shots: [
                    {
                        attack: 10,
                        arrival: 40,
                        points1to3: [{ x: 12, y: 135 }, { x: 35.5, y: 0 }, { x: 284, y: 24 }, { x: 12, y: 138 }],
                        points3to4: [{ x: 12, y: 138 }, { x: 142, y: 142 }],
                        points4to5: [{ x: 142, y: 142 }, { x: 278, y: 10 }],
                    },
                    {
                        attack: 20,
                        arrival: 30,
                        points1to3: [{ x: 12, y: 135 }, { x: 71, y: 0 }, { x: 284, y: 45 }, { x: 0, y: 106.5 }],
                        points3to4: [{ x: 0, y: 106.5 }, { x: 106.5, y: 142 }],
                        points4to5: [{ x: 106.5, y: 142 }, { x: 260, y: 25 }],
                    },
                    {
                        attack: 30,
                        arrival: 20,
                        points1to3: [{ x: 12, y: 135 }, { x: 106.5, y: 0 }, { x: 284, y: 71 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 230, y: 40 }],
                    },
                    {
                        attack: 40,
                        arrival: 10,
                        points1to3: [{ x: 12, y: 135 }, { x: 142, y: 0 }, { x: 284, y: 100 }, { x: 0, y: 35.5 }],
                        points3to4: [{ x: 0, y: 35.5 }, { x: 35.5, y: 142 }],
                        points4to5: [{ x: 35.5, y: 142 }, { x: 200, y: 55 }],
                    },
                ],
            },
            {
                origin: 40,
                name: 'Partiendo de Salida 40 (Diamante 2)',
                shots: [
                    {
                        attack: 10,
                        arrival: 30,
                        points1to3: [{ x: 71, y: 135 }, { x: 35.5, y: 0 }, { x: 284, y: 40 }, { x: 0, y: 106.5 }],
                        points3to4: [{ x: 0, y: 106.5 }, { x: 106.5, y: 142 }],
                        points4to5: [{ x: 106.5, y: 142 }, { x: 260, y: 30 }],
                    },
                    {
                        attack: 20,
                        arrival: 20,
                        points1to3: [{ x: 71, y: 135 }, { x: 71, y: 0 }, { x: 284, y: 68 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 230, y: 45 }],
                    },
                    {
                        attack: 30,
                        arrival: 10,
                        points1to3: [{ x: 71, y: 135 }, { x: 106.5, y: 0 }, { x: 284, y: 95 }, { x: 0, y: 35.5 }],
                        points3to4: [{ x: 0, y: 35.5 }, { x: 35.5, y: 142 }],
                        points4to5: [{ x: 35.5, y: 142 }, { x: 200, y: 60 }],
                    },
                ],
            },
            {
                origin: 30,
                name: 'Partiendo de Salida 30 (Diamante 4)',
                shots: [
                    {
                        attack: 10,
                        arrival: 20,
                        points1to3: [{ x: 142, y: 135 }, { x: 35.5, y: 0 }, { x: 284, y: 60 }, { x: 0, y: 71 }],
                        points3to4: [{ x: 0, y: 71 }, { x: 71, y: 142 }],
                        points4to5: [{ x: 71, y: 142 }, { x: 230, y: 50 }],
                    },
                    {
                        attack: 20,
                        arrival: 10,
                        points1to3: [{ x: 142, y: 135 }, { x: 71, y: 0 }, { x: 284, y: 90 }, { x: 0, y: 35.5 }],
                        points3to4: [{ x: 0, y: 35.5 }, { x: 35.5, y: 142 }],
                        points4to5: [{ x: 35.5, y: 142 }, { x: 200, y: 65 }],
                    },
                ],
            },
            {
                origin: 60,
                name: 'Partiendo de Salida 60 (Banda Corta)',
                shots: [
                    {
                        attack: 20,
                        arrival: 40,
                        points1to3: [{ x: 0, y: 106.5 }, { x: 71, y: 0 }, { x: 284, y: 25 }, { x: 12, y: 138 }],
                        points3to4: [{ x: 12, y: 138 }, { x: 142, y: 142 }],
                        points4to5: [{ x: 142, y: 142 }, { x: 278, y: 15 }],
                    },
                    {
                        attack: 30,
                        arrival: 30,
                        points1to3: [{ x: 0, y: 106.5 }, { x: 106.5, y: 0 }, { x: 284, y: 50 }, { x: 0, y: 106.5 }],
                        points3to4: [{ x: 0, y: 106.5 }, { x: 106.5, y: 142 }],
                        points4to5: [{ x: 106.5, y: 142 }, { x: 260, y: 35 }],
                    },
                ],
            },
        ],
    },
    {
        id: 'bricole-50',
        name: 'Bricoles Banda Corta',
        category: 'Banda Previa',
        formula: 'Ataque = Salida * Factor de Ángulo',
        description:
            'Tiro de banda previa directa a banda corta para carambolas en zona 4. Exige aceleración limpia sin desvío.',
        difficulty: 4,
        author: 'Frédéric Caudron',
        youtubeUrl: 'https://www.youtube.com/watch?v=HGfTj9vQTpY',
        diagramUrl: '/assets/images/theory/billiard_bridges_guide.jpg',
        defaultBalls: [
            { id: 'white', x: 71, y: 105, color: '#f8fafc', border: '#cbd5e1' },
            { id: 'yellow', x: 213, y: 35, color: '#facc15', border: '#ca8a04' },
            { id: 'red', x: 248, y: 105, color: '#dc2626', border: '#991b1b' },
        ],
        defaultTrajectory: [
            { x: 71, y: 105 },
            { x: 142, y: 138 },
            { x: 279, y: 70 },
            { x: 213, y: 6 },
            { x: 248, y: 105 },
        ],
    },
    {
        id: 'cabana-tuzul',
        name: 'Cabaña Sistema Tuzul',
        category: 'Cabañas & Rodadas',
        formula: 'Ataque Cerrado con Efecto Horario',
        description:
            'Fórmula de cálculo para carambolas de ángulo cerrado rodeando la mesa por bandas largas y cortas.',
        difficulty: 3,
        author: 'Murat Naci Çoklu / Tuzul',
        youtubeUrl: 'https://www.youtube.com/watch?v=JRHH0i9uGzI',
        diagramUrl: '/assets/images/theory/billiard_ball_thickness.jpg',
        defaultBalls: [
            { id: 'white', x: 80, y: 30, color: '#f8fafc', border: '#cbd5e1' },
            { id: 'yellow', x: 140, y: 30, color: '#facc15', border: '#ca8a04' },
            { id: 'red', x: 60, y: 110, color: '#dc2626', border: '#991b1b' },
        ],
        defaultTrajectory: [
            { x: 80, y: 30 },
            { x: 140, y: 30 },
            { x: 278, y: 30 },
            { x: 190, y: 138 },
            { x: 6, y: 80 },
            { x: 60, y: 110 },
        ],
    },
    {
        id: 'pase-bola',
        name: 'Pase Bola Caudron',
        category: 'Pase Bola',
        formula: 'Grosor 1/2 bola, Efecto corrido a las 1:30',
        description:
            'Pase de bola controlado a 3 bandas sin choque (libre de retache) para descolgar la bola 2 hacia el centro.',
        difficulty: 4,
        author: 'Frédéric Caudron',
        youtubeUrl: 'https://www.youtube.com/watch?v=JRHH0i9uGzI',
        diagramUrl: '/assets/images/theory/billiard_ball_thickness.jpg',
        defaultBalls: [
            { id: 'white', x: 50, y: 70, color: '#f8fafc', border: '#cbd5e1' },
            { id: 'yellow', x: 100, y: 70, color: '#facc15', border: '#ca8a04' },
            { id: 'red', x: 230, y: 110, color: '#dc2626', border: '#991b1b' },
        ],
        defaultTrajectory: [
            { x: 50, y: 70 },
            { x: 100, y: 70 },
            { x: 180, y: 6 },
            { x: 278, y: 55 },
            { x: 210, y: 138 },
            { x: 230, y: 110 },
        ],
    },
    {
        id: 'llk-hoppe',
        name: 'Sistema Larga-Larga-Corta (LLK) Willie Hope',
        category: 'Larga-Larga-Corta',
        formula: 'Llegada = Suma (Banda Larga) - Resta (Salida)',
        description:
            'Sistema de Willie Hoppe para resolver cruces entre bandas largas con llegada a corta. Numeración de 2 en 2 en banda larga (Suma) y restas en cabeceras.',
        difficulty: 3,
        author: 'Willie Hoppe & Jaime Carrasco (El Flaco Billarista)',
        youtubeUrl: 'https://www.youtube.com/watch?v=jeAREkYyN3A',
        diagramUrl: '/assets/images/theory/billiard_hoppe_system.jpg',
        defaultBalls: [
            { id: 'white', x: 71, y: 12, color: '#f8fafc', border: '#cbd5e1' },
            { id: 'yellow', x: 250, y: 80, color: '#facc15', border: '#ca8a04' },
            { id: 'red', x: 18, y: 71, color: '#dc2626', border: '#991b1b' },
        ],
        defaultTrajectory: [
            { x: 250, y: 80 },
            { x: 71, y: 12 },
            { x: 142, y: 138 },
            { x: 6, y: 71 },
            { x: 18, y: 71 },
        ],
        diamondNumbers: {
            attack: [
                { diamond: 1, x: 35.5, y: 0, value: '2' },
                { diamond: 2, x: 71, y: 0, value: '4' },
                { diamond: 3, x: 106.5, y: 0, value: '6' },
                { diamond: 4, x: 142, y: 0, value: '8' },
            ],
            departure: [
                { diamond: 1, x: 284, y: 35.5, value: '-4' },
                { diamond: 2, x: 284, y: 71, value: '-5' },
                { diamond: 3, x: 284, y: 106.5, value: '-6' },
            ],
            arrival3rd: [
                { diamond: 1, x: 0, y: 35.5, value: '-1' },
                { diamond: 2, x: 0, y: 71, value: '-2' },
                { diamond: 3, x: 0, y: 106.5, value: '-3' },
            ],
        },
    },
];

export async function seedDatabase() {
    console.log('[seed] Starting database seed...');

    // 0. Seed Master Pedagogy Modules
    for (const mod of SEED_PEDAGOGY_MODULES) {
        await db
            .insert(pedagogyModules)
            .values(mod as any)
            .onConflictDoUpdate({
                target: pedagogyModules.id,
                set: {
                    category: mod.category,
                    title: mod.title,
                    subtitle: mod.subtitle,
                    author: mod.author,
                    summary: mod.summary,
                    contentMarkdown: mod.contentMarkdown,
                    imageUrl: mod.imageUrl,
                    youtubeUrl: mod.youtubeUrl,
                    keyPrinciples: mod.keyPrinciples,
                    drills: mod.drills,
                    orderIndex: mod.orderIndex,
                },
            });
    }
    console.log(`[seed] Seeded ${SEED_PEDAGOGY_MODULES.length} master pedagogy modules.`);

    // 1. Seed Classical Billiard Systems with Cheat Sheets & Segments
    for (const sys of SEED_SYSTEMS) {
        await db
            .insert(billiardSystems)
            .values(sys as any)
            .onConflictDoUpdate({
                target: billiardSystems.id,
                set: {
                    name: sys.name,
                    category: sys.category,
                    formula: sys.formula,
                    description: sys.description,
                    difficulty: sys.difficulty,
                    defaultBalls: sys.defaultBalls,
                    defaultTrajectory: sys.defaultTrajectory,
                    author: (sys as any).author,
                    youtubeUrl: (sys as any).youtubeUrl,
                    diagramUrl: (sys as any).diagramUrl,
                    diamondNumbers: (sys as any).diamondNumbers,
                    segmentedTrajectories: (sys as any).segmentedTrajectories,
                    cheatSheets: (sys as any).cheatSheets,
                },
            });
    }
    console.log(`[seed] Seeded ${SEED_SYSTEMS.length} classical billiard systems.`);


    // 2. Seed Learning Route Levels & Nodes
    for (const lvl of SEED_LEVELS) {
        await db
            .insert(trainingLevels)
            .values({
                id: lvl.id,
                orderIndex: lvl.orderIndex,
                name: lvl.name,
                tag: lvl.tag,
                subtitle: lvl.subtitle,
                description: lvl.description,
                color: lvl.color,
            })
            .onConflictDoUpdate({
                target: trainingLevels.id,
                set: {
                    orderIndex: lvl.orderIndex,
                    name: lvl.name,
                    tag: lvl.tag,
                    subtitle: lvl.subtitle,
                    description: lvl.description,
                    color: lvl.color,
                },
            });

        for (const node of lvl.nodes) {
            await db
                .insert(trainingNodes)
                .values({
                    id: node.id,
                    levelId: lvl.id,
                    dayNumber: node.dayNumber,
                    title: node.title,
                    subtitle: node.subtitle,
                    defaultStatus: node.defaultStatus,
                    isBoss: node.isBoss,
                    xp: node.xp,
                    orderIndex: node.orderIndex,
                })
                .onConflictDoUpdate({
                    target: trainingNodes.id,
                    set: {
                        dayNumber: node.dayNumber,
                        title: node.title,
                        subtitle: node.subtitle,
                        defaultStatus: node.defaultStatus,
                        isBoss: node.isBoss,
                        xp: node.xp,
                        orderIndex: node.orderIndex,
                    },
                });

            // Seed Node Positions
            if (node.positions && node.positions.length > 0) {
                let pIndex = 1;
                for (const pos of node.positions) {
                    await db
                        .insert(trainingNodePositions)
                        .values({
                            id: pos.id,
                            nodeId: node.id,
                            name: pos.name,
                            category: pos.category,
                            hint: pos.hint,
                            difficulty: pos.difficulty,
                            whitePos: pos.white,
                            yellowPos: pos.yellow,
                            redPos: pos.red,
                            trajectory: pos.trajectory,
                            orderIndex: pIndex++,
                        })
                        .onConflictDoUpdate({
                            target: trainingNodePositions.id,
                            set: {
                                name: pos.name,
                                category: pos.category,
                                hint: pos.hint,
                                difficulty: pos.difficulty,
                                whitePos: pos.white,
                                yellowPos: pos.yellow,
                                redPos: pos.red,
                                trajectory: pos.trajectory,
                            },
                        });
                }
            }
        }
    }
    console.log(`[seed] Seeded 4 Quetglas levels and 20 daily practice stations.`);

    // 3. Seed Default Demo User
    const demoEmail = 'demo@bandaro.app';
    const demoPasswordHash = hashPassword('Password123!');
    const demoUserId = '00000000-0000-0000-0000-000000000001';

    const [user] = await db
        .insert(users)
        .values({
            id: demoUserId,
            email: demoEmail,
            name: 'Camilo Quetglas',
            alias: 'Maestro_Bandaro',
            passwordHash: demoPasswordHash,
            avatarUrl: 'avatar-01',
            nationality: 'Colombia',
            countryCode: 'CO',
            emailVerified: true,
            currentStreak: 14,
            maxStreak: 21,
            totalXp: 1450,
            accuracyAvg: '68.50',
            lastActivityDate: new Date().toISOString().split('T')[0],
        })
        .onConflictDoUpdate({
            target: users.email,
            set: {
                currentStreak: 14,
                maxStreak: 21,
                totalXp: 1450,
                accuracyAvg: '68.50',
                lastActivityDate: new Date().toISOString().split('T')[0],
            },
        })
        .returning();

    // Seed progress for Demo User: Day 1 completed (3 stars), Day 2 in progress
    await db
        .insert(userNodeProgress)
        .values({
            userId: user.id,
            nodeId: 'node-1-1',
            status: 'completed',
            stars: 3,
            completedCount: 10,
            bestAccuracy: '90.00',
        })
        .onConflictDoUpdate({
            target: [userNodeProgress.userId, userNodeProgress.nodeId],
            set: {
                status: 'completed',
                stars: 3,
                completedCount: 10,
                bestAccuracy: '90.00',
            },
        });

    await db
        .insert(userNodeProgress)
        .values({
            userId: user.id,
            nodeId: 'node-1-2',
            status: 'active',
            stars: 2,
            completedCount: 6,
            bestAccuracy: '75.00',
        })
        .onConflictDoUpdate({
            target: [userNodeProgress.userId, userNodeProgress.nodeId],
            set: {
                status: 'active',
                stars: 2,
                completedCount: 6,
                bestAccuracy: '75.00',
            },
        });

    console.log(`[seed] Seeded Demo User '${demoEmail}' (Password123!) with 14-day streak and active route progress.`);
    console.log('[seed] Database seed completed successfully!');
}

seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('[seed] Database seed failed:', err);
        process.exit(1);
    });
