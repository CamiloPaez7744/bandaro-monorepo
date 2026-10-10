import React, { useState, useEffect } from 'react';
import {
    Image,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    IconBook,
    IconCheck,
    IconPlayerPlay,
    IconSparkles,
    IconX,
    IconArrowRight,
    IconBrain,
    IconNumbers,
} from '@/src/presentation/components/icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { apiFetch } from '@/src/infrastructure/security/cryptoClient';

interface PedagogyDrill {
    id: string;
    name: string;
    hint: string;
    xp: number;
}

export interface PedagogyLesson {
    id: string;
    category: string;
    title: string;
    subtitle: string;
    author: string;
    summary: string;
    contentMarkdown: string;
    imageUrl?: string;
    youtubeUrl?: string;
    keyPrinciples: string[];
    drills: PedagogyDrill[];
    orderIndex: number;
}

const LOCAL_FALLBACK_LESSONS: PedagogyLesson[] = [
    {
        id: 'posture-biomechanics',
        category: 'posture_biomechanics',
        title: 'Biomecánica de la Postura Corporal',
        subtitle: 'Anclaje de pies a 45°, eje visual y brazo pendular a 90°',
        author: 'Marco Zanetti & José María Quetglas',
        summary:
            'La estabilidad del tren inferior y el anclaje a 45° son el cimiento de la regularidad en el billar de alta competición: 60% peso atrás, barbilla a 10 cm del taco y brazo pendular puro.',
        contentMarkdown: `### Fundamentos Biomecánicos de la Postura\n1. **Triángulo de sustentación:** Pie derecho sobre la línea de tiro a 45°-60°; pie izquierdo adelantado al ancho de los hombros con rodilla semiflexionada.\n2. **Reparto de masa:** 60% en la pierna retrasada (eje ancla) y 40% en la pierna adelantada (eje de equilibrio).\n3. **Plano visual:** Barbilla situada a 10-15 cm sobre el taco, alineada con el ojo dominante.\n4. **Péndulo del brazo:** Hombro fijo y horizontal; antebrazo oscilando a 90° respecto al taco en el instante exacto del impacto.\n5. **Culata relajada:** Empuñadura elástica entre pulgar, índice y corazón sin estrangular la culata.`,
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
        contentMarkdown: `### Guía Técnica de Puentes de Billar\n- **Puente Cerrado con Anilla:** El dedo índice envuelve la flecha cerrando contra la yema del pulgar. Los otros 3 dedos forman un trípode ancho sobre el paño.\n- **Puente Abierto en V:** Talón apoyado en paño y pulgar pegado al índice creando un canal en V; ideal para rodadas lentas y tiros a distancia.\n- **Puente sobre Banda:** Talón en el pasamanos y taco rasante para evitar trayectorias parabólicas no deseadas.\n- **Distancia bola-puente:** 16 a 22 cm calibrada según la fuerza requerida.`,
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
        contentMarkdown: `### Análisis de Grosor de Bola\n- **1/8 (Fina/Rozada):** Desviación ~12°, cesión de velocidad <10% (bola 2 queda casi estática).\n- **1/4 (Cuarto):** Desviación ~28°, ideal para cabañas estándar y recorridos largos.\n- **1/2 (Media):** Ángulo natural de separación de 90° en golpe seco, 50% de inercia compartida.\n- **3/4:** Desviación ~55°, gran transmisión de inercia a bola 2.\n- **Llena (100%):** Transmisión de casi toda la energía (retros y choques plenos).`,
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
        contentMarkdown: `### Sistema Base 50 (Sistema Clásico Conti)\n- **Fórmula Universal:** Llegada (3ª banda) = Salida (banda larga) - Ataque (1ª banda).\n- **Efecto Recomendado:** Efecto horario natural de 2 a 3 tips (rotación a favor).\n- **Segmentación Cromática:**\n  - 🔵 **Tramo 1 (1ª a 3ª banda):** Cian (#06b6d4) — Geometría base de la fórmula.\n  - 🟡 **Tramo 2 (3ª a 4ª banda):** Ámbar (#f59e0b) — Rebote con rotación natural.\n  - 🟢 **Tramo 3 (4ª a 5ª banda):** Esmeralda (#10b981) — Prolongación hacia la carambola.`,
        imageUrl: '/assets/images/theory/billiard_bridges_guide.jpg',
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
        imageUrl: '/assets/images/theory/billiard_ball_thickness.jpg',
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

const LOCAL_ASSET_IMAGES: Record<string, any> = {
    '/assets/images/theory/billiard_posture_stance.jpg': require('@/assets/images/theory/billiard_posture_stance.jpg'),
    '/assets/images/theory/billiard_bridges_guide.jpg': require('@/assets/images/theory/billiard_bridges_guide.jpg'),
    '/assets/images/theory/billiard_ball_thickness.jpg': require('@/assets/images/theory/billiard_ball_thickness.jpg'),
    '/assets/images/theory/billiard_shot_types.jpg': require('@/assets/images/theory/billiard_shot_types.jpg'),
    '/assets/images/theory/billiard_hoppe_system.jpg': require('@/assets/images/theory/billiard_hoppe_system.jpg'),
    '/assets/images/theory/billiard_stance_multiview.jpg': require('@/assets/images/theory/billiard_stance_multiview.jpg'),
    '/assets/images/theory/billiard_vision_aiming.jpg': require('@/assets/images/theory/billiard_vision_aiming.jpg'),
    '/assets/images/theory/billiard_clock_systems_masters.jpg': require('@/assets/images/theory/billiard_clock_systems_masters.jpg'),
};

interface MasterPedagogyModalProps {
    visible: boolean;
    onClose: () => void;
    initialModuleId?: string;
}

export function MasterPedagogyModal({ visible, onClose, initialModuleId }: MasterPedagogyModalProps) {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const { language } = useI18n();
    const isEn = language === 'en';
    const colorScheme = useColorScheme();
    const palette = getPalette(colorScheme);
    const isWide = width >= 800;

    const [lessons, setLessons] = useState<PedagogyLesson[]>(LOCAL_FALLBACK_LESSONS);
    const [selectedLessonId, setSelectedLessonId] = useState<string>(initialModuleId ?? 'posture-biomechanics');

    useEffect(() => {
        if (initialModuleId) {
            setSelectedLessonId(initialModuleId);
        }
    }, [initialModuleId]);

    useEffect(() => {
        let isMounted = true;
        async function fetchDbLessons() {
            try {
                const res = await apiFetch('/training/pedagogy');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.modules && data.modules.length > 0) {
                        setLessons(data.modules);
                    }
                }
            } catch {
                // Fallback to local lessons
            }
        }
        if (visible) {
            fetchDbLessons();
        }
        return () => {
            isMounted = false;
        };
    }, [visible]);

    const activeLesson = lessons.find((l) => l.id === selectedLessonId) ?? lessons[0];

    const openYoutube = (url?: string) => {
        if (!url) return;
        Linking.openURL(url).catch((err) => console.warn('Could not open YouTube link:', err));
    };

    const imageSource = activeLesson.imageUrl ? LOCAL_ASSET_IMAGES[activeLesson.imageUrl] : null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: palette.border }]}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.headerIconTag, { backgroundColor: `${palette.primary}20` }]}>
                            <IconBrain size={20} color={palette.primary} />
                        </View>
                        <View>
                            <Text style={[styles.headerSubtitle, { color: palette.muted }]}>
                                {isEn ? 'PEDAGOGICAL ACADEMY & BIOMECHANICS' : 'ACADEMIA PEDAGÓGICA & BIOMECÁNICA'}
                            </Text>
                            <Text style={[styles.headerTitle, { color: palette.text }]}>
                                {isEn ? '3-Cushion Master Theory' : 'Teoría Maestra de 3 Bandas'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.closeBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
                        onPress={onClose}
                        accessibilityLabel="Cerrar"
                    >
                        <IconX size={20} color={palette.text} />
                    </TouchableOpacity>
                </View>

                {/* Module Selector Tabs */}
                <View style={[styles.tabsWrap, { borderBottomColor: palette.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                        {lessons.map((lesson) => {
                            const isSelected = lesson.id === activeLesson.id;
                            return (
                                <Pressable
                                    key={lesson.id}
                                    style={[
                                        styles.tabItem,
                                        {
                                            backgroundColor: isSelected ? `${palette.primary}20` : palette.card,
                                            borderColor: isSelected ? palette.primary : palette.border,
                                        },
                                    ]}
                                    onPress={() => setSelectedLessonId(lesson.id)}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            { color: isSelected ? palette.primary : palette.muted, fontWeight: isSelected ? '800' : '600' },
                                        ]}
                                    >
                                        {lesson.title}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Main Content Area */}
                <ScrollView contentContainerStyle={[styles.contentScroll, { paddingBottom: insets.bottom + 40 }]}>
                    <View style={[styles.containerRow, isWide && styles.containerRowWide]}>
                        {/* LEFT COLUMN: Visual Media (Infographic & YouTube Link) */}
                        <View style={[styles.mediaCol, isWide && styles.mediaColWide]}>
                            {imageSource && (
                                <View style={[styles.imageCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                    <Image source={imageSource} style={styles.infographicImage} resizeMode="cover" />
                                    <View style={styles.imageCaptionBar}>
                                        <IconSparkles size={14} color="#38bdf8" />
                                        <Text style={styles.imageCaptionText}>
                                            {isEn ? 'Official Didactic Infographic' : 'Infografía Didáctica Oficial'}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {activeLesson.youtubeUrl && (
                                <TouchableOpacity
                                    style={[styles.youtubeCard, { backgroundColor: '#dc262615', borderColor: '#dc262650' }]}
                                    activeOpacity={0.85}
                                    onPress={() => openYoutube(activeLesson.youtubeUrl)}
                                >
                                    <View style={styles.youtubeLeft}>
                                        <View style={styles.youtubeIconBadge}>
                                            <IconPlayerPlay size={22} color="#ffffff" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.youtubeTag}>
                                                {isEn ? 'VIDEO MASTERCLASS' : 'CLASE MAESTRA EN VIDEO'}
                                            </Text>
                                            <Text style={[styles.youtubeTitle, { color: palette.text }]}>
                                                {isEn ? 'Watch Technique Demonstration' : 'Ver Demostración Técnica'}
                                            </Text>
                                            <Text style={[styles.youtubeSub, { color: palette.muted }]}>
                                                {activeLesson.author}
                                            </Text>
                                        </View>
                                    </View>
                                    <IconArrowRight size={18} color="#dc2626" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* RIGHT COLUMN: Pedagogical Notes, Principles & Drills */}
                        <View style={[styles.infoCol, isWide && styles.infoColWide]}>
                            {/* Author & Header */}
                            <View style={[styles.authorChip, { backgroundColor: `${palette.primary}15` }]}>
                                <Text style={[styles.authorChipText, { color: palette.primary }]}>
                                    📖 {isEn ? 'Authors' : 'Metodología'}: {activeLesson.author}
                                </Text>
                            </View>

                            <Text style={[styles.lessonTitle, { color: palette.text }]}>{activeLesson.title}</Text>
                            <Text style={[styles.lessonSubtitle, { color: palette.muted }]}>{activeLesson.subtitle}</Text>

                            {/* Summary Card */}
                            <View style={[styles.summaryCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                <Text style={[styles.summaryText, { color: palette.text }]}>{activeLesson.summary}</Text>
                            </View>

                            {/* Key Principles */}
                            <Text style={[styles.sectionHeading, { color: palette.text }]}>
                                {isEn ? 'Core Principles & Biomechanics' : 'Principios Fundamentales'}
                            </Text>
                            <View style={styles.principlesList}>
                                {activeLesson.keyPrinciples.map((principle, index) => (
                                    <View
                                        key={`principle-${index}`}
                                        style={[styles.principleRow, { backgroundColor: palette.card, borderColor: palette.border }]}
                                    >
                                        <View style={[styles.principleNumBadge, { backgroundColor: palette.primary }]}>
                                            <Text style={styles.principleNumText}>{index + 1}</Text>
                                        </View>
                                        <Text style={[styles.principleText, { color: palette.text }]}>{principle}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Drills Section */}
                            {activeLesson.drills && activeLesson.drills.length > 0 && (
                                <>
                                    <Text style={[styles.sectionHeading, { color: palette.text, marginTop: 24 }]}>
                                        {isEn ? 'Recommended Practice Drills' : 'Ejercicios de Calibración en Mesa'}
                                    </Text>
                                    <View style={styles.drillsList}>
                                        {activeLesson.drills.map((drill) => (
                                            <View
                                                key={drill.id}
                                                style={[styles.drillCard, { backgroundColor: palette.card, borderColor: palette.border }]}
                                            >
                                                <View style={styles.drillHeader}>
                                                    <Text style={[styles.drillName, { color: palette.text }]}>{drill.name}</Text>
                                                    <View style={[styles.xpBadge, { backgroundColor: `${palette.primary}20` }]}>
                                                        <Text style={[styles.xpBadgeText, { color: palette.primary }]}>+{drill.xp} XP</Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.drillHint, { color: palette.muted }]}>{drill.hint}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerIconTag: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSubtitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabsWrap: {
        borderBottomWidth: 1,
        paddingVertical: 10,
    },
    tabsScroll: {
        paddingHorizontal: 16,
        gap: 10,
    },
    tabItem: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 20,
        borderWidth: 1,
    },
    tabText: {
        fontSize: 13,
    },
    contentScroll: {
        padding: 20,
    },
    containerRow: {
        flexDirection: 'column',
        gap: 20,
    },
    containerRowWide: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    mediaCol: {
        width: '100%',
        gap: 16,
    },
    mediaColWide: {
        width: '48%',
    },
    infoCol: {
        width: '100%',
    },
    infoColWide: {
        width: '50%',
        paddingLeft: 12,
    },
    imageCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    infographicImage: {
        width: '100%',
        aspectRatio: 16 / 9,
    },
    imageCaptionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    imageCaptionText: {
        color: '#f8fafc',
        fontSize: 12,
        fontWeight: '700',
    },
    youtubeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    youtubeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    youtubeIconBadge: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center',
    },
    youtubeTag: {
        fontSize: 10,
        fontWeight: '800',
        color: '#dc2626',
        letterSpacing: 0.5,
    },
    youtubeTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginTop: 2,
    },
    youtubeSub: {
        fontSize: 12,
        marginTop: 1,
    },
    authorChip: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        marginBottom: 8,
    },
    authorChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    lessonTitle: {
        fontSize: 24,
        fontWeight: '900',
    },
    lessonSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
        marginBottom: 16,
    },
    summaryCard: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    summaryText: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '500',
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 12,
    },
    principlesList: {
        gap: 10,
    },
    principleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    principleNumBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    principleNumText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
    principleText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    drillsList: {
        gap: 10,
    },
    drillCard: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    drillHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    drillName: {
        fontSize: 14,
        fontWeight: '800',
    },
    xpBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    xpBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    drillHint: {
        fontSize: 13,
        lineHeight: 18,
    },
});
