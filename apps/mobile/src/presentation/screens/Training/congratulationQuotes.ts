export interface CongratulationQuote {
    id: number;
    title: string;
    message: string;
    highlight: string;
}

export const CONGRATULATION_QUOTES: CongratulationQuote[] = [
    {
        id: 1,
        title: '¡Felicitaciones! Sigue así',
        message: 'La maestría sobre el paño se forja carambola tras carambola. Tu constancia te llevará a la cima.',
        highlight: '¡Sigue así, campeón!',
    },
    {
        id: 2,
        title: '¡Extraordinaria Sesión!',
        message: 'Tu control de efecto y velocidad de banda está en otro nivel. Gran temple y concentración.',
        highlight: '¡Nivel de maestro!',
    },
    {
        id: 3,
        title: '¡Gran Tacada de Entrenamiento!',
        message: 'La regularidad y el pulso fino distinguen a los grandes del billar a 3 bandas.',
        highlight: '¡Imparable en la mesa!',
    },
    {
        id: 4,
        title: '¡Precisión Milimétrica!',
        message: 'El ángulo perfecto y la bola atacante respondieron con exactitud a tu visión geométrica.',
        highlight: '¡Geometría pura!',
    },
    {
        id: 5,
        title: '¡Campeón de la Concentración!',
        message: 'Cada repetición afinó tu rutina pre-tiro, respiración y penetración del taco.',
        highlight: '¡Enfoque total!',
    },
    {
        id: 6,
        title: '¡Brillante Desempeño!',
        message: 'Estás dominando los secretos de las bandas como las grandes leyendas de la UMB.',
        highlight: '¡Calidad profesional!',
    },
    {
        id: 7,
        title: '¡Qué Nivel de Juego!',
        message: 'Tu memoria muscular y lectura de diamantes están más afinadas que nunca.',
        highlight: '¡Puntería certera!',
    },
    {
        id: 8,
        title: '¡Inquebrantable en el Paño!',
        message: 'Superaste el reto con disciplina, elegancia deportiva y convicción en cada tacada.',
        highlight: '¡Carácter ganador!',
    },
    {
        id: 9,
        title: '¡Dominio Total de Mesa!',
        message: 'La mesa no guarda secretos cuando tu taco ataca con esta solidez y confianza.',
        highlight: '¡Magia en 3 bandas!',
    },
    {
        id: 10,
        title: '¡Impresionante Eficacia!',
        message: 'Cada carambola ejecutada suma confianza para tu próxima partida de torneo.',
        highlight: '¡Rendimiento sobresaliente!',
    },
    {
        id: 11,
        title: '¡Sesión de Oro!',
        message: 'El esfuerzo diario en la mesa de práctica es el boleto directo al podio de campeones.',
        highlight: '¡Rumbo al título!',
    },
    {
        id: 12,
        title: '¡Gran Pulso y Serenidad!',
        message: 'Convertiste jugadas complejas en carambolas fluidas dignas de aplauso.',
        highlight: '¡Tacto exquisito!',
    },
    {
        id: 13,
        title: '¡Genio del Billar a 3 Bandas!',
        message: 'Mantén este ritmo y consistencia y no habrá rival que frene tu avance.',
        highlight: '¡Determinación absoluta!',
    },
    {
        id: 14,
        title: '¡Felicidades, Maestro!',
        message: 'El deporte de las carambolas premia a quien practica con pasión, estudio y paciencia.',
        highlight: '¡Pura escuela carom!',
    },
    {
        id: 15,
        title: '¡Qué Clase de Tacada!',
        message: 'Tu toque fino, balance y desvío de bolas demuestran un progreso notable.',
        highlight: '¡Orgullo billarista!',
    },
    {
        id: 16,
        title: '¡Poder y Precisión!',
        message: 'La sincronía entre fuerza, efecto horario y rebote en banda fue simplemente perfecta.',
        highlight: '¡Golpe impecable!',
    },
];

let lastCongratulationIndex = -1;

export function getRandomCongratulationQuote(): CongratulationQuote {
    let index: number;
    do {
        index = Math.floor(Math.random() * CONGRATULATION_QUOTES.length);
    } while (index === lastCongratulationIndex && CONGRATULATION_QUOTES.length > 1);

    lastCongratulationIndex = index;
    return CONGRATULATION_QUOTES[index];
}
