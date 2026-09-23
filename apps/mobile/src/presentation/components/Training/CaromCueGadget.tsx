import React from 'react';
import { G, Rect, Polygon, Circle, Defs, LinearGradient, RadialGradient, Stop, Path } from 'react-native-svg';
import { Vec2 } from '@bandaro/core';

interface CaromCueGadgetProps {
    cueBallSvgPos: { x: number; y: number };
    aimDirection: Vec2; // Vector unitario en espacio mesa
    tableOrientation: 'horizontal' | 'vertical';
    powerLevel: number; // 0..100%
    isSimulating: boolean;
    visible?: boolean;
}

/**
 * Taco de billar profesional de élite estilo 8 Ball Pool (8ballpool.com/game):
 * - Dimensiones gruesas, llamativas y proporcionadas con la mesa y bolas.
 * - Suela de cuero de alto agarre con tiza azul Master redondeada.
 * - Virola de marfilina pulida con anillo de ajuste de latón.
 * - Flecha de arce canadiense con brillo cilíndrico 3D y vetas seleccionadas.
 * - Incrustaciones clásicas de 4 puntas vivas (splice inlays / flames) en ébano y oro 24K.
 * - Collar de junta central de oro pulido con espaciadores fenólicos negros.
 * - Empuñadura texturizada de hilo irlandés (Irish Linen) con dobles anillos dorados.
 * - Culata de madera noble laqueada, culatín metálico y tope de goma amortiguadora.
 * - Sombra tridimensional flotante proyectada sobre el paño de la mesa.
 * - Retroceso elástico milimétrico según la potencia cargada (0% a 100%).
 */
export const CaromCueGadget = React.memo(function CaromCueGadget({
    cueBallSvgPos,
    aimDirection,
    tableOrientation,
    powerLevel = 0,
    isSimulating = false,
    visible = true,
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

    // Distancia de retroceso según la potencia cargada (estilo 8 Ball Pool)
    const baseOffset = 6.0; // Distancia en reposo desde la superficie de la bola
    const maxPullBack = 45.0; // Retroceso elástico máximo al 100% de potencia
    const pullDistance = baseOffset + (Math.min(100, Math.max(0, powerLevel)) / 100) * maxPullBack;

    // Dimensiones estilizadas estilo 8 Ball Pool (mucho más largo para que salga de la mesa con presencia)
    const cueLength = 260; // Longitud del taco visible (abarca casi toda la mesa)
    const tipR = 1.4; // Radio en la punta (diámetro 2.8)
    const jointR = 2.3; // Radio en la junta central (diámetro 4.6)
    const buttR = 3.3; // Radio en la base de la culata (diámetro 6.6)

    return (
        <G
            transform={`translate(${cueBallSvgPos.x}, ${cueBallSvgPos.y}) rotate(${angleDeg}) translate(-${pullDistance + cueLength}, 0)`}>
            <Defs>
                {/* 1. Sombra flotante proyectada */}
                <LinearGradient id="cueShadowGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#000000" stopOpacity={0.35} />
                    <Stop offset="80%" stopColor="#000000" stopOpacity={0.25} />
                    <Stop offset="100%" stopColor="#000000" stopOpacity={0.10} />
                </LinearGradient>

                {/* 2. Cilíndrico 3D de la flecha de arce canadiense (Shaft) */}
                <LinearGradient id="cueShaft3D" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.88} />
                    <Stop offset="20%" stopColor="#fef3c7" />
                    <Stop offset="50%" stopColor="#fde047" />
                    <Stop offset="78%" stopColor="#d97706" />
                    <Stop offset="100%" stopColor="#78350f" />
                </LinearGradient>

                {/* 3. Oro 24K pulido de anillos y collares */}
                <LinearGradient id="cueGoldCollar" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#fffbeb" />
                    <Stop offset="25%" stopColor="#fef08a" />
                    <Stop offset="55%" stopColor="#ca8a04" />
                    <Stop offset="85%" stopColor="#854d0e" />
                    <Stop offset="100%" stopColor="#451a03" />
                </LinearGradient>

                {/* 4. Madera de ébano / laca negra de la culata */}
                <LinearGradient id="cueEbonyGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#475569" />
                    <Stop offset="30%" stopColor="#1e293b" />
                    <Stop offset="70%" stopColor="#0f172a" />
                    <Stop offset="100%" stopColor="#020617" />
                </LinearGradient>

                {/* 5. Empuñadura texturizada Irish Linen */}
                <LinearGradient id="cueWrapGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#64748b" />
                    <Stop offset="25%" stopColor="#334155" />
                    <Stop offset="60%" stopColor="#1e293b" />
                    <Stop offset="85%" stopColor="#0f172a" />
                    <Stop offset="100%" stopColor="#020617" />
                </LinearGradient>

                {/* 6. Virola de marfilina pulida */}
                <LinearGradient id="cueFerruleGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#ffffff" />
                    <Stop offset="30%" stopColor="#f8fafc" />
                    <Stop offset="75%" stopColor="#e2e8f0" />
                    <Stop offset="100%" stopColor="#94a3b8" />
                </LinearGradient>

                {/* 7. Suela de tiza azul Master (estilo 8 Ball Pool) */}
                <LinearGradient id="cueChalkGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#7dd3fc" />
                    <Stop offset="35%" stopColor="#0284c7" />
                    <Stop offset="70%" stopColor="#0369a1" />
                    <Stop offset="100%" stopColor="#0c4a6e" />
                </LinearGradient>

                {/* 8. Destello de potencia en el taco */}
                <RadialGradient id="cuePowerGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <Stop offset="60%" stopColor="#0284c7" stopOpacity={0.3} />
                    <Stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                </RadialGradient>
            </Defs>

            {/* SOMBRA 3D FLOTANTE DEL TACO SOBRE EL PAÑO */}
            <Polygon
                points={`
                    2,${buttR + 1.2}
                    ${cueLength - 2},${tipR + 1.2}
                    ${cueLength - 2},${tipR + 3.8}
                    2,${buttR + 4.2}
                `}
                fill="url(#cueShadowGrad)"
            />

            {/* 1. TOPE DE GOMA TRASERO (Bumper) */}
            <Path
                d={`M 5,-${buttR * 0.75} Q 0,-${buttR * 0.7} 0,0 Q 0,${buttR * 0.7} 5,${buttR * 0.75} Z`}
                fill="#18181b"
                stroke="#09090b"
                strokeWidth={0.3}
            />

            {/* 2. CULATÍN METÁLICO DORADO (Butt Cap) */}
            <Rect
                x={5}
                y={-buttR * 0.92}
                width={9}
                height={buttR * 1.84}
                fill="url(#cueGoldCollar)"
                stroke="#713f12"
                strokeWidth={0.2}
                rx={0.6}
            />

            {/* 3. MANGA TRASERA DE ÉBANO LAQUEADO (Butt Sleeve) */}
            <Polygon
                points={`
                    14,-${buttR * 0.92}
                    65,-${buttR * 0.84}
                    65,${buttR * 0.84}
                    14,${buttR * 0.92}
                `}
                fill="url(#cueEbonyGrad)"
                stroke="#0f172a"
                strokeWidth={0.2}
            />

            {/* Incrustaciones romboidales en la culata */}
            <Polygon points="26,-1.6 34,0 26,1.6 18,0" fill="url(#cueGoldCollar)" />
            <Polygon points="46,-1.6 54,0 46,1.6 38,0" fill="url(#cueGoldCollar)" />

            {/* 4. ANILLO DE JUNTA INFERIOR */}
            <Rect
                x={65}
                y={-buttR * 0.84}
                width={6}
                height={buttR * 1.68}
                fill="url(#cueGoldCollar)"
                stroke="#713f12"
                strokeWidth={0.2}
            />
            <Rect x={67.5} y={-buttR * 0.84} width={1.2} height={buttR * 1.68} fill="#0f172a" />

            {/* 5. EMPUÑADURA DE HILO IRLANDÉS (Irish Linen Wrap) */}
            <Polygon
                points={`
                    71,-${buttR * 0.84}
                    155,-${jointR * 1.15}
                    155,${jointR * 1.15}
                    71,${buttR * 0.84}
                `}
                fill="url(#cueWrapGrad)"
                stroke="#090d16"
                strokeWidth={0.25}
            />

            {/* Textura de micro-rayas en la empuñadura */}
            {Array.from({ length: 18 }).map((_, i) => {
                const posX = 75 + i * 4.2;
                const rH = buttR * 0.82 - (i / 18) * (buttR * 0.82 - jointR * 1.12);
                return (
                    <Rect
                        key={`wrap-stitch-${i}`}
                        x={posX}
                        y={-rH}
                        width={0.45}
                        height={rH * 2}
                        fill="rgba(255,255,255,0.08)"
                    />
                );
            })}

            {/* 6. ANILLO DE JUNTA SUPERIOR */}
            <Rect
                x={155}
                y={-jointR * 1.15}
                width={6}
                height={jointR * 2.3}
                fill="url(#cueGoldCollar)"
                stroke="#713f12"
                strokeWidth={0.2}
            />
            <Rect x={157.5} y={-jointR * 1.15} width={1.2} height={jointR * 2.3} fill="#0f172a" />

            {/* 7. ANTEBRAZO CON INCRUSTACIONES (Forearm) */}
            <Polygon
                points={`
                    161,-${jointR * 1.12}
                    185,-${jointR * 1.05}
                    185,${jointR * 1.05}
                    161,${jointR * 1.12}
                `}
                fill="url(#cueEbonyGrad)"
                stroke="#0f172a"
                strokeWidth={0.2}
            />

            {/* 8. JUNTA METÁLICA CENTRAL (Joint Collar) */}
            <Rect
                x={185}
                y={-jointR * 1.05}
                width={9}
                height={jointR * 2.1}
                fill="url(#cueGoldCollar)"
                stroke="#854d0e"
                strokeWidth={0.25}
            />
            <Rect x={188.5} y={-jointR * 1.05} width={1.8} height={jointR * 2.1} fill="#09090b" />

            {/* 9. FLECHA DE ARCE CANADIENSE (Shaft) */}
            <Polygon
                points={`
                    194,-${jointR}
                    252,-${tipR * 1.05}
                    252,${tipR * 1.05}
                    194,${jointR}
                `}
                fill="url(#cueShaft3D)"
                stroke="#b45309"
                strokeWidth={0.15}
            />

            {/* PUNTAS VIVAS / FLAMAS CLÁSICAS DE 8 BALL POOL EN LA FLECHA */}
            {/* Llama superior */}
            <Polygon
                points={`
                    194,-${jointR * 0.95}
                    232,-${tipR * 1.25}
                    214,-${jointR * 0.3}
                    194,-${jointR * 0.45}
                `}
                fill="url(#cueEbonyGrad)"
                stroke="#fbbf24"
                strokeWidth={0.25}
            />
            {/* Llama inferior */}
            <Polygon
                points={`
                    194,${jointR * 0.95}
                    232,${tipR * 1.25}
                    214,${jointR * 0.3}
                    194,${jointR * 0.45}
                `}
                fill="url(#cueEbonyGrad)"
                stroke="#fbbf24"
                strokeWidth={0.25}
            />
            {/* Llama central afilada */}
            <Polygon
                points={`
                    194,-${jointR * 0.35}
                    238,0
                    194,${jointR * 0.35}
                `}
                fill="url(#cueEbonyGrad)"
                stroke="#fbbf24"
                strokeWidth={0.3}
            />

            {/* Línea de brillo especular sobre el lomo del taco */}
            <Path
                d={`M 25,-${buttR * 0.65} L 250,-${tipR * 0.65}`}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth={0.45}
                strokeLinecap="round"
            />

            {/* 10. VIROLA DE MARFILINA (Ferrule) */}
            <Rect
                x={252}
                y={-tipR * 1.02}
                width={5.5}
                height={tipR * 2.04}
                fill="url(#cueFerruleGrad)"
                stroke="#cbd5e1"
                strokeWidth={0.2}
                rx={0.2}
            />
            {/* Anillo de unión de virola */}
            <Rect x={252} y={-tipR * 1.02} width={0.9} height={tipR * 2.04} fill="url(#cueGoldCollar)" />

            {/* 11. SUELA DE CUERO CON TIZA AZUL MASTER (Chalk Tip) */}
            <Path
                d={`
                    M 257.5,-${tipR}
                    L 258.8,-${tipR}
                    Q 260.4,0 258.8,${tipR}
                    L 257.5,${tipR}
                    Z
                `}
                fill="url(#cueChalkGrad)"
                stroke="#0284c7"
                strokeWidth={0.2}
            />
            {/* Destello de tiza en el arco frontal */}
            <Path
                d={`M 258.6,-${tipR * 0.5} Q 259.5,0 258.6,${tipR * 0.5}`}
                stroke="#bae6fd"
                strokeWidth={0.35}
                fill="none"
            />

            {/* 12. GLOW DE POTENCIA CUANDO ESTÁ CARGADO (>70%) */}
            {powerLevel > 70 && (
                <Circle
                    cx={189}
                    cy={0}
                    r={10}
                    fill="url(#cuePowerGlow)"
                    opacity={(powerLevel - 70) / 30}
                />
            )}
        </G>
    );
});
