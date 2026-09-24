import React from 'react';
import { G, Rect, Polygon, Circle, Defs, LinearGradient, RadialGradient, Stop, Path } from 'react-native-svg';
import { Vec2 } from '@bandaro/core';
import { CueSkinId } from './tablePreferences';

interface CaromCueGadgetProps {
    cueBallSvgPos: { x: number; y: number };
    aimDirection: Vec2; // Vector unitario en espacio mesa
    tableOrientation: 'horizontal' | 'vertical';
    powerLevel: number; // 0..100%
    isSimulating: boolean;
    visible?: boolean;
    cueSkin?: CueSkinId;
}

/**
 * Taco de billar profesional de élite en 2 piezas auténticas (estilo Venom WS de 8 Ball Pool):
 * - Estructura genuina de 2 piezas (Two-Piece Cue):
 *   1. LA CULATA (The Butt): Una sola pieza continua y esbelta con gráficos geométricos Venom integrados, sin particiones ni bloques cortados.
 *   2. LA JUNTA CENTRAL (The Joint): Un único collar metálico pulido que une las dos mitades.
 *   3. LA FLECHA (The Shaft): Una sola pieza cónica continua que se afina progresivamente hacia la virola y la suela.
 * - Sin textos ni letras en ninguna parte.
 * - Edición Venom Azure: cuerpo negro grafito, colmillos y flechas geométricas en azul cian / neón eléctrico.
 * - Proporciones reales: suela fina de ~12 mm (1/5 del ancho de la bola), culata de la mitad del ancho de la bola.
 */
export const CaromCueGadget = React.memo(function CaromCueGadget({
    cueBallSvgPos,
    aimDirection,
    tableOrientation,
    powerLevel = 0,
    isSimulating = false,
    visible = true,
    cueSkin = 'venom_azure',
}: CaromCueGadgetProps) {
    if (!visible || isSimulating) return null;

    // Convert aim direction to screen/SVG angle
    let screenDirX = aimDirection.x;
    let screenDirY = aimDirection.y;

    if (tableOrientation === 'vertical') {
        screenDirX = aimDirection.y;
        screenDirY = -aimDirection.x;
    }

    const angleRad = Math.atan2(screenDirY, screenDirX);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Proporciones canónicas de taco de 2 piezas:
    // Longitud total = 175 unidades (aprox. la mitad de la mesa de 284 cm)
    // Pieza 1: Culata desde x = 2 hasta x = 86 (radio 1.55 bajando a 1.10)
    // Junta central: x = 86 a 90
    // Pieza 2: Flecha desde x = 90 hasta x = 172 (radio 1.08 bajando a 0.68)
    // Virola + Suela: x = 172 a 175
    const cueLength = 175;
    const buttR = 1.55;    // Radio base en la culata (la mitad de la bola de 3.075)
    const jointR = 1.10;   // Radio en la junta central
    const tipR = 0.68;     // Radio en la punta (suela de ~12mm en proporción real)

    // Retroceso proporcional a la potencia cargada
    const baseOffset = 3.6;
    const maxPullBack = 28.0;
    const pullDistance = baseOffset + (Math.min(100, Math.max(0, powerLevel)) / 100) * maxPullBack;

    const isVenom = cueSkin === 'venom_azure';
    const isClassic = cueSkin === 'classic_gold';

    return (
        <G
            transform={`translate(${cueBallSvgPos.x}, ${cueBallSvgPos.y}) rotate(${angleDeg}) translate(-${pullDistance + cueLength}, 0)`}>
            <Defs>
                {/* Sombra 3D proyectada sobre el paño */}
                <LinearGradient id="cueShadow2P" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#000000" stopOpacity={0.28} />
                    <Stop offset="80%" stopColor="#000000" stopOpacity={0.16} />
                    <Stop offset="100%" stopColor="#000000" stopOpacity={0.05} />
                </LinearGradient>

                {/* 1. Gradiente cilíndrico de LA CULATA (Pieza 1) */}
                <LinearGradient id="buttBodyGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#475569" stopOpacity={0.8} />
                    <Stop offset="25%" stopColor="#1e293b" />
                    <Stop offset="65%" stopColor="#0f172a" />
                    <Stop offset="100%" stopColor="#020617" />
                </LinearGradient>

                {/* 2. Gradiente cilíndrico de LA FLECHA (Pieza 2) */}
                {isVenom ? (
                    <LinearGradient id="shaftBodyGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#38bdf8" stopOpacity={0.65} />
                        <Stop offset="22%" stopColor="#1e293b" />
                        <Stop offset="65%" stopColor="#0f172a" />
                        <Stop offset="100%" stopColor="#020617" />
                    </LinearGradient>
                ) : isClassic ? (
                    <LinearGradient id="shaftBodyGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.92} />
                        <Stop offset="20%" stopColor="#fef3c7" />
                        <Stop offset="55%" stopColor="#fde047" />
                        <Stop offset="85%" stopColor="#d97706" />
                        <Stop offset="100%" stopColor="#78350f" />
                    </LinearGradient>
                ) : (
                    <LinearGradient id="shaftBodyGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#64748b" />
                        <Stop offset="30%" stopColor="#1e293b" />
                        <Stop offset="80%" stopColor="#09090b" />
                        <Stop offset="100%" stopColor="#000000" />
                    </LinearGradient>
                )}

                {/* 3. Collar metálico de la JUNTA CENTRAL */}
                {isVenom ? (
                    <LinearGradient id="jointMetalGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#e0f2fe" />
                        <Stop offset="30%" stopColor="#38bdf8" />
                        <Stop offset="70%" stopColor="#0284c7" />
                        <Stop offset="100%" stopColor="#0369a1" />
                    </LinearGradient>
                ) : isClassic ? (
                    <LinearGradient id="jointMetalGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#fffbeb" />
                        <Stop offset="30%" stopColor="#fde047" />
                        <Stop offset="70%" stopColor="#ca8a04" />
                        <Stop offset="100%" stopColor="#713f12" />
                    </LinearGradient>
                ) : (
                    <LinearGradient id="jointMetalGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#f8fafc" />
                        <Stop offset="35%" stopColor="#94a3b8" />
                        <Stop offset="75%" stopColor="#475569" />
                        <Stop offset="100%" stopColor="#1e293b" />
                    </LinearGradient>
                )}

                {/* 4. Acento de incrustaciones Venom (azul neón / cian eléctrico) */}
                <LinearGradient id="venomInlayCyan" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#00f0ff" />
                    <Stop offset="50%" stopColor="#38bdf8" />
                    <Stop offset="100%" stopColor="#0284c7" />
                </LinearGradient>

                {/* 5. Suela de tiza azul Master */}
                <LinearGradient id="chalkTipGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#7dd3fc" />
                    <Stop offset="40%" stopColor="#0284c7" />
                    <Stop offset="80%" stopColor="#0369a1" />
                    <Stop offset="100%" stopColor="#0c4a6e" />
                </LinearGradient>

                {/* 6. Virola de titanio pulido */}
                <LinearGradient id="ferruleTitaniumGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#ffffff" />
                    <Stop offset="35%" stopColor="#f1f5f9" />
                    <Stop offset="75%" stopColor="#cbd5e1" />
                    <Stop offset="100%" stopColor="#94a3b8" />
                </LinearGradient>

                {/* Destello de potencia */}
                <RadialGradient id="powerPulseAura" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={isVenom ? '#00f0ff' : '#facc15'} stopOpacity={0.8} />
                    <Stop offset="70%" stopColor={isVenom ? '#0284c7' : '#ca8a04'} stopOpacity={0.2} />
                    <Stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                </RadialGradient>
            </Defs>

            {/* SOMBRA 3D FLOTANTE DEL TACO COMPLETO */}
            <Polygon
                points={`
                    2,${buttR + 0.6}
                    ${cueLength - 2},${tipR + 0.6}
                    ${cueLength - 2},${tipR + 1.8}
                    2,${buttR + 2.0}
                `}
                fill="url(#cueShadow2P)"
            />

            {/* ========================================================= */}
            {/* PIEZA 1: LA CULATA (THE BUTT) - UNA SOLA PIEZA CONTINUA  */}
            {/* ========================================================= */}

            {/* Tope trasero de goma (Bumper) */}
            <Path
                d={`M 2.5,-${buttR * 0.72} Q 0,-${buttR * 0.68} 0,0 Q 0,${buttR * 0.68} 2.5,${buttR * 0.72} Z`}
                fill={isVenom ? '#0284c7' : '#18181b'}
                stroke="#09090b"
                strokeWidth={0.2}
            />

            {/* Anillo fino de culatín metálico */}
            <Rect
                x={2.5}
                y={-buttR * 0.98}
                width={3.0}
                height={buttR * 1.96}
                fill="url(#jointMetalGrad)"
                stroke="#0f172a"
                strokeWidth={0.12}
                rx={0.2}
            />

            {/* CUERPO CONTINUO DE LA CULATA (Sin particiones ni cortes) */}
            <Polygon
                points={`
                    5.5,-${buttR * 0.98}
                    86,-${jointR * 1.04}
                    86,${jointR * 1.04}
                    5.5,${buttR * 0.98}
                `}
                fill="url(#buttBodyGrad)"
                stroke="#020617"
                strokeWidth={0.15}
            />

            {/* ARTE VENOM INTEGRADO EN LA CULATA (Llamas, colmillos y chevrons en azul neón sin letras) */}
            {isVenom && (
                <>
                    {/* Chevrons y colmillos en el tercio trasero */}
                    <Polygon points="12,-0.9 19,0 12,0.9 8,0" fill="url(#venomInlayCyan)" />
                    <Polygon points="22,-0.9 30,0 22,0.9 17,0" fill="url(#venomInlayCyan)" />
                    <Polygon points="33,-0.9 42,0 33,0.9 27,0" fill="url(#venomInlayCyan)" />

                    {/* Líneas geométricas longitudinales Venom (fluyen por toda la culata) */}
                    <Path d="M 8,-1.15 L 82,-0.85" stroke="#00f0ff" strokeWidth={0.2} opacity={0.75} />
                    <Path d="M 8,1.15 L 82,0.85" stroke="#00f0ff" strokeWidth={0.2} opacity={0.75} />

                    {/* Zona de agarre suave integrada en el cuerpo (sin cortes de bloques) */}
                    {Array.from({ length: 12 }).map((_, i) => {
                        const px = 42 + i * 2.8;
                        const ry = buttR * 0.92 - (i / 12) * (buttR * 0.92 - jointR * 1.02);
                        return (
                            <Rect
                                key={`grip-stitch-${i}`}
                                x={px}
                                y={-ry * 0.95}
                                width={0.3}
                                height={ry * 1.9}
                                fill="rgba(0, 240, 255, 0.08)"
                            />
                        );
                    })}

                    {/* Colmillos afilados frontales de la culata apuntando hacia la junta */}
                    <Polygon
                        points="60,-0.9 83,-0.3 75,-0.1 60,-0.3"
                        fill="url(#venomInlayCyan)"
                    />
                    <Polygon
                        points="60,0.9 83,0.3 75,0.1 60,0.3"
                        fill="url(#venomInlayCyan)"
                    />
                    {/* Espina central afilada */}
                    <Polygon
                        points="62,-0.2 84,0 62,0.2"
                        fill="#00f0ff"
                        opacity={0.9}
                    />
                </>
            )}

            {isClassic && (
                <>
                    {/* 4 puntas clásicas de ébano y oro */}
                    <Polygon points="12,-0.8 20,0 12,0.8 6,0" fill="url(#jointMetalGrad)" />
                    <Polygon points="26,-0.8 35,0 26,0.8 19,0" fill="url(#jointMetalGrad)" />
                    <Polygon points="55,-0.6 83,0 55,0.6" fill="url(#jointMetalGrad)" />
                </>
            )}

            {/* Línea especular de brillo sobre la culata */}
            <Path
                d={`M 8,-${buttR * 0.65} L 84,-${jointR * 0.65}`}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth={0.25}
                strokeLinecap="round"
            />

            {/* ========================================================= */}
            {/* LA JUNTA CENTRAL (THE JOINT) - ÚNICA DIVISIÓN CENTRAL     */}
            {/* ========================================================= */}
            <Rect
                x={86}
                y={-jointR * 1.05}
                width={4.2}
                height={jointR * 2.1}
                fill="url(#jointMetalGrad)"
                stroke="#020617"
                strokeWidth={0.15}
            />
            {/* Anillo de separación central */}
            <Rect x={87.8} y={-jointR * 1.05} width={0.7} height={jointR * 2.1} fill="#020617" />

            {/* ========================================================= */}
            {/* PIEZA 2: LA FLECHA (THE SHAFT) - UNA SOLA PIEZA CÓNICA    */}
            {/* ========================================================= */}
            <Polygon
                points={`
                    90.2,-${jointR}
                    172,-${tipR * 1.05}
                    172,${tipR * 1.05}
                    90.2,${jointR}
                `}
                fill="url(#shaftBodyGrad)"
                stroke={isVenom ? '#0284c7' : isClassic ? '#b45309' : '#334155'}
                strokeWidth={0.15}
            />

            {/* Detalle Venom saliendo de la junta hacia la flecha */}
            {isVenom && (
                <Polygon
                    points={`
                        90.2,-${jointR * 0.75}
                        105,0
                        90.2,${jointR * 0.75}
                    `}
                    fill="url(#venomInlayCyan)"
                    opacity={0.88}
                />
            )}

            {/* Línea especular de brillo sobre la flecha */}
            <Path
                d={`M 92,-${jointR * 0.6} L 171,-${tipR * 0.6}`}
                stroke="rgba(255, 255, 255, 0.40)"
                strokeWidth={0.25}
                strokeLinecap="round"
            />

            {/* ========================================================= */}
            {/* VIROLA DE TITANIO Y SUELA (FERRULE & CHALK TIP)          */}
            {/* ========================================================= */}
            {/* Virola fina */}
            <Rect
                x={172}
                y={-tipR * 1.02}
                width={2.2}
                height={tipR * 2.04}
                fill="url(#ferruleTitaniumGrad)"
                stroke="#64748b"
                strokeWidth={0.1}
                rx={0.1}
            />
            {/* Anillo de unión virola */}
            <Rect
                x={172}
                y={-tipR * 1.02}
                width={0.4}
                height={tipR * 2.04}
                fill={isVenom ? '#00f0ff' : '#ca8a04'}
            />

            {/* Suela de cuero con tiza azul Master redondeada */}
            <Path
                d={`
                    M 174.2,-${tipR}
                    L 174.6,-${tipR}
                    Q 175.6,0 174.6,${tipR}
                    L 174.2,${tipR}
                    Z
                `}
                fill="url(#chalkTipGrad)"
                stroke="#0284c7"
                strokeWidth={0.12}
            />
            {/* Destello de tiza en el domo frontal */}
            <Path
                d={`M 174.8,-${tipR * 0.4} Q 175.4,0 174.8,${tipR * 0.4}`}
                stroke="#bae6fd"
                strokeWidth={0.22}
                fill="none"
            />

            {/* AURA DE ENERGÍA CUANDO SE CARGA POTENCIA (>70%) */}
            {powerLevel > 70 && (
                <Circle
                    cx={88}
                    cy={0}
                    r={6.0}
                    fill="url(#powerPulseAura)"
                    opacity={(powerLevel - 70) / 30}
                />
            )}
        </G>
    );
});
