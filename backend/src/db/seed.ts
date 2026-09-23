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
                positions: [],
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
                positions: [],
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
                positions: [],
            },
            {
                id: 'node-2-4',
                dayNumber: 9,
                title: 'Ajuste por Fricción de Banda Nueva',
                subtitle: 'Compensación de agarre y humedad',
                defaultStatus: 'locked',
                isBoss: false,
                xp: 220,
                orderIndex: 4,
                positions: [],
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
                positions: [],
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
                positions: [],
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
                positions: [],
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
                positions: [],
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
                positions: [],
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
                positions: [],
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
                positions: [],
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
                positions: [],
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
                positions: [],
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
                positions: [],
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
                positions: [],
            },
        ],
    },
];

const SEED_SYSTEMS = [
    {
        id: 'base-50',
        name: 'Base 50 (Sistema Clásico)',
        category: 'Banda Larga-Corta-Larga',
        formula: 'Llegada = Salida - Ataque',
        description:
            'El sistema universal de 3 bandas. Se calcula el punto de llegada deseado en 3ra banda y se resta del punto de salida en banda larga.',
        difficulty: 3,
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
    },
    {
        id: 'bricole-50',
        name: 'Bricoles Banda Corta',
        category: 'Banda Previa',
        formula: 'Ataque = Salida * Factor de Ángulo',
        description:
            'Tiro de banda previa directa a banda corta para carambolas en zona 4. Exige aceleración limpia sin desvío.',
        difficulty: 4,
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
];

export async function seedDatabase() {
    console.log('[seed] Starting database seed...');

    // 1. Seed Classical Billiard Systems
    for (const sys of SEED_SYSTEMS) {
        await db
            .insert(billiardSystems)
            .values(sys)
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
