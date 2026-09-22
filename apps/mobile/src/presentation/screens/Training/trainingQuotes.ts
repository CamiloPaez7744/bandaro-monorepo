export interface TrainingQuote {
  id: number;
  text: string;
  author?: string;
  category: 'mental' | 'geometric' | 'technique' | 'consistency';
}

export const TRAINING_QUOTES: TrainingQuote[] = [
  {
    id: 1,
    text: 'Listo para tu entrenamiento. Elige o crea tu jugada e iniciemos.',
    category: 'mental',
  },
  {
    id: 2,
    text: '¿Qué tipo de jugadas te han costado trabajo? ¡Vamos a entrenarlas!',
    category: 'mental',
  },
  {
    id: 3,
    text: 'La carambola se gana en la repetición y la memoria muscular.',
    author: 'Torbjörn Blomdahl',
    category: 'consistency',
  },
  {
    id: 4,
    text: 'Cada banda cuenta, cada milímetro importa. Concéntrate en el punto de contacto.',
    category: 'technique',
  },
  {
    id: 5,
    text: 'El billar a 3 bandas es geometría pura: confía en el cálculo del diamante.',
    author: 'Raymond Ceulemans',
    category: 'geometric',
  },
  {
    id: 6,
    text: 'Fuerza controlada y llegada justa: la siguiente carambola depende de la reunión.',
    category: 'technique',
  },
  {
    id: 7,
    text: 'Un tiro bien entrenado no falla bajo presión de torneo.',
    category: 'mental',
  },
  {
    id: 8,
    text: 'Domina el efecto antes del impacto y la mesa trabajará para ti.',
    author: 'Frédéric Caudron',
    category: 'technique',
  },
  {
    id: 9,
    text: 'No practiques hasta acertar una vez; practica hasta que no puedas fallar.',
    category: 'consistency',
  },
  {
    id: 10,
    text: 'La concentración en la rutina pre-tiro es el 80% del éxito de la tacada.',
    category: 'mental',
  },
  {
    id: 11,
    text: 'Ajusta la llegada a la banda corta: la precisión nace en el primer tercio del paño.',
    category: 'geometric',
  },
  {
    id: 12,
    text: 'El secreto del bricole está en la penetración constante del taco.',
    author: 'Dick Jaspers',
    category: 'technique',
  },
  {
    id: 13,
    text: 'Convierte tus posiciones débiles en tus mejores armas de defensa y ataque.',
    category: 'mental',
  },
  {
    id: 14,
    text: 'Un campeón de 3 bandas repite lo básico hasta convertirlo en arte.',
    author: 'Semih Saygıner',
    category: 'consistency',
  },
  {
    id: 15,
    text: 'Cada intento suma experiencia. Respira, visualiza la trayectoria y ejecuta.',
    category: 'mental',
  },
  {
    id: 16,
    text: 'La bola 2 dicta el juego: contrólala para evitar el retruque y asegurar posición.',
    category: 'technique',
  },
  {
    id: 17,
    text: 'En el Sistema Clásico 50: Salida - Llegada = Ataque. La matemática nunca miente.',
    category: 'geometric',
  },
];

export function getRandomTrainingQuote(): TrainingQuote {
  const index = Math.floor(Math.random() * TRAINING_QUOTES.length);
  return TRAINING_QUOTES[index];
}
